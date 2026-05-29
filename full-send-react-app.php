<?php
/**
 * Plugin Name: Full Send React App
 * Description: WordPress backend API and loader for the Full Send SimSports React App.
 * Version: 1.2.1
 */

if (!defined('ABSPATH')) exit;

// Define Master Signature
define('FS_MASTER_SIGNATURE', '
<table style="font-size:11.0pt; font-family: \'Roboto\', sans-serif, system-ui; color: #000000; line-height: 1.4;" cellpadding="0" cellspacing="0">
  <tbody>
    <tr>
      <td width="120" valign="top"><img src="https://storage.googleapis.com/revolgy-signatures-prod/icons/fullsendsimsport.com.au/LOGO-b96312c3-d5ab-4250-a71c-9652d867139a.png" alt="Full Send SimSport" width="120" style="display: block;"></td>
      <td width="30"></td>
      <td valign="top">
        <table cellpadding="0" cellspacing="0">
          <tbody>
            <tr><td style="padding-bottom: 2px;"><span>Executive Committee</span></td></tr>
            <tr><td style="padding-bottom: 2px;"><span style="font-size:12.0pt; font-family: \'Russo One\', sans-serif; color: #3a0a59; font-weight: bold;">Official Communication</span></td></tr>
            <tr><td style="font-size:12.0pt; font-family: \'Russo One\', sans-serif; color: #3a0a59; font-weight: bold; padding-bottom: 2px;">Full Send SimSport Inc.</td></tr>
            <tr><td><a href="mailto:info@fullsendsimsport.com.au" style="font-size:10.5pt; color: #4169e1; text-decoration: none;">info@fullsendsimsport.com.au</a></td></tr>
            <tr><td><a href="https://fullsendsimsport.com.au" style="font-size:10.5pt; color: #4169e1; text-decoration: none;">www.fullsendsimsport.com.au</a></td></tr>
          </tbody>
        </table>
      </td>
    </tr>
  </tbody>
</table>
');

// Load our external modules
require_once plugin_dir_path(__FILE__) . 'inc/helpers.php';
require_once plugin_dir_path(__FILE__) . 'inc/shortcodes.php';
require_once plugin_dir_path(__FILE__) . 'inc/class-fs-rest-handlers.php';
require_once plugin_dir_path(__FILE__) . 'inc/class-fs-rest-api.php';

class FullSend_React_App {

    // The Singleton Instance
    private static $instance = null;

    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        // 1. Boot up the API
        new FS_REST_API_Manager();

        // 2. Setup Post Types and Roles
        add_action('init', [$this, 'register_post_types']);
        add_action('init', [$this, 'initialize_custom_roles']);
        add_action('wp_head', [$this, 'add_mobile_viewport_meta']);

        // 3. Asset Management (Scripts/Styles)
        add_action('wp_enqueue_scripts', [$this, 'manage_storefront_scripts'], 999);
        add_action('wp_enqueue_scripts', [$this, 'localize_storefront_urls'], 5);
        // Added specifically to kill theme-enforced white space
        add_action('wp_enqueue_scripts', [$this, 'cleanup_theme_whitespace'], 999);

        // 4. Access Control & Redirects
        add_action('admin_init', [$this, 'restrict_admin_access']);
        add_action('admin_menu', [$this, 'restrict_custom_tables_to_admins'], 999);
		add_action('template_redirect', [$this, 'handle_frontend_redirects']);
        add_action('wp_logout', [$this, 'handle_logout']);
        add_filter('authenticate', [$this, 'check_disabled_account'], 30, 3);

        // 5. Data Modification Hooks
        add_filter('rest_prepare_user', [$this, 'inject_admin_flag_to_rest'], 10, 3);
        add_action('updated_post_meta', [$this, 'catch_member_status_change'], 10, 4);

        // 6. Dev Tools
        add_action('init', [$this, 'dev_reset_member_ids']);
    }

    // --- SETUP METHODS ---

    public function register_post_types() {
        register_post_type('fs_member', [
            'labels' => ['name' => 'FS Members', 'singular_name' => 'Member', 'add_new' => 'Add New Member', 'edit_item' => 'Edit Member'],
            'public' => false, 'show_ui' => true, 'show_in_menu' => true, 'menu_position' => 5, 'menu_icon' => 'dashicons-groups',
            'supports' => ['title', 'custom-fields'], 'has_archive' => false,
        ]);

        register_post_type('agm_meeting', [
            'public' => true, 'show_in_rest' => true, 'label' => 'Meetings',
            'supports' => ['title', 'editor', 'custom-fields'], 'menu_icon' => 'dashicons-groups',
        ]);

        register_post_status('denied', [
            'label' => _x('Denied', 'post'), 'public' => false, 'exclude_from_search' => true,
            'show_in_admin_all_list' => false, 'show_in_admin_status_list' => true,
            'label_count' => _n_noop('Denied <span class="count">(%s)</span>', 'Denied <span class="count">(%s)</span>'),
        ]);
    }

	public function initialize_custom_roles() {
		// 1. Fetch the absolute blueprint capability maps from native roles
		$editor_role_obj = get_role('editor');
		$author_role_obj = get_role('author');
		
		// Fallbacks if roles somehow aren't loaded yet, though they always are in backend init
		$editor_caps = $editor_role_obj ? $editor_role_obj->capabilities : ['read' => true, 'edit_posts' => true];
		$author_caps = $author_role_obj ? $author_role_obj->capabilities : ['read' => true, 'edit_posts' => true];

		// 2. Build the structural dynamic mapping array
		$roles = [
			'executive_committee' => [
				'display' => 'Executive Committee', 
				// Inherit EVERYTHING an Editor can do, then add portal access
				'caps'    => array_merge($editor_caps, ['view_portal_admin' => true])
			],
			'committee' => [
				'display' => 'Committee', 
				// Inherit EVERYTHING an Author can do, then add portal access
				'caps'    => array_merge($author_caps, ['view_portal_admin' => true])
			],
			'fs_member' => [
				'display' => 'FS Member', 
				'caps'    => ['read' => true]
			],
			'fs_junior_member' => [
				'display' => 'FS Junior Member', 
				'caps'    => ['read' => true]
			]
		];

		// 3. Process the sync loop
		foreach ($roles as $role_slug => $data) {
			$role_object = get_role($role_slug);
			
			if (!$role_object) {
				// Create role cleanly if it doesn't exist
				add_role($role_slug, $data['display'], $data['caps']);
			} else {
				// CRITICAL RESET: If it already exists, overwrite capabilities explicitly 
				// to wipe out past database state configuration anomalies.
				
				// First, remove old capabilities that shouldn't be there
				foreach ($role_object->capabilities as $old_cap => $value) {
					if (!isset($data['caps'][$old_cap])) {
						$role_object->remove_cap($old_cap);
					}
				}
				
				// Next, systematically inject the corrected capabilities map
				foreach ($data['caps'] as $cap => $grant) {
					if ($grant) {
						$role_object->add_cap($cap);
					} else {
						$role_object->remove_cap($cap);
					}
				}
			}
		}

		// 4. Grant the portal admin capability to the native editor role
		$editor_role = get_role('editor');
		if ($editor_role) {
			$editor_role->add_cap('view_portal_admin');
		}
	}

    // --- SCRIPT & STYLE MANAGEMENT ---

    public function manage_storefront_scripts() {
        if (is_page('portal')) {
            wp_dequeue_script('ecwid-frontend-js');
            wp_dequeue_script('ecwid-scripts');
        }
        if (is_page('portal') || (defined('REST_REQUEST') && REST_REQUEST)) {
            wp_dequeue_script('storefront-header-cart');
            wp_dequeue_script('storefront-functions');
            wp_dequeue_script('storefront-sticky-payment');
            wp_deregister_script('storefront-functions');
        }
    }

    /**
     * Fixes the "White Space" issue by stripping Storefront theme height constraints
     * and injecting a fix for the content area on the portal page.
     */
    public function cleanup_theme_whitespace() {
        if (!is_page('portal')) return;

        // Force-collapse structural elements via inline CSS injection
        $custom_css = "
            #content .col-full { padding: 0 !important; max-width: none !important; }
            .site-content { padding-bottom: 0 !important; margin-bottom: 0 !important; }
            .site-main { margin-bottom: 0 !important; padding-bottom: 0 !important; }
            #main { min-height: unset !important; }
            .entry-content { margin-top: 0 !important; }
            #primary { margin-bottom: 0 !important; }
        ";
        wp_add_inline_style('storefront-style', $custom_css);
    }

    public function localize_storefront_urls() {
        if (is_page('portal')) {
            wp_localize_script('jquery', 'storefrontUrls', ['home' => home_url('/')]);
        }
    }

    // --- REDIRECTS & ACCESS CONTROL ---

    public function restrict_admin_access() {
        if (defined('DOING_AJAX') && DOING_AJAX) return;
        
        // 1. If they aren't logged in, or are a full site Admin, let standard WP behavior happen
        if (!is_user_logged_in() || current_user_can('manage_options')) return;

        // 2. Allow Editors, Committee, & Exec Committee to access the backend to write posts
        if (current_user_can('edit_posts')) return;

        // 3. If they can manage the portal but don't edit posts, redirect to the portal dashboard
        if (current_user_can('view_portal_admin')) {
            wp_safe_redirect(home_url('/portal/#/admin'));
            exit;
        }
        
        // 4. Standard members get bounced out of wp-admin to their portal profile
        wp_safe_redirect(home_url('/portal/#/my-profile'));
        exit;
    }

	/**
     * Hides the fs_member and agm_meeting CPTs from the sidebar for non-admins.
     */
    public function restrict_custom_tables_to_admins() {
        if ( ! current_user_can('manage_options') ) {
            remove_menu_page('edit.php?post_type=fs_member');
            remove_menu_page('edit.php?post_type=agm_meeting');
        }
    }

    public function handle_frontend_redirects() {
        if (isset($_GET['login_success']) || isset($_GET['setup_done'])) {
            header('X-FS-Debug: Redirect-Triggered');
            if (!is_user_logged_in()) return;

            if (fs_check_admin_permissions()) {
                wp_safe_redirect(home_url('/portal/#/admin'));
            } else {
                wp_safe_redirect(home_url('/portal/#/my-profile'));
            }
            exit;
        }
    }

    public function handle_logout() {
        wp_safe_redirect(home_url('/portal'));
        exit;
    }

    public function check_disabled_account($user, $username, $password) {
        if ($user instanceof WP_User) {
            if (get_user_meta($user->ID, 'fs_account_disabled', true)) {
                return new WP_Error('disabled', 'Your account is currently inactive. Please contact the committee or re-register.');
            }
        }
        return $user;
    }

    // --- DATA HOOKS ---

    public function inject_admin_flag_to_rest($response, $user, $request) {
        $data = $response->get_data();
        $data['isAdmin'] = fs_check_admin_permissions();
        $response->set_data($data);
        return $response;
    }

    public function catch_member_status_change($meta_id, $post_id, $meta_key, $new_status) {
        if ($meta_key !== '_status' || get_post_type($post_id) !== 'fs_member') return;
        fs_handle_status_change_emails($post_id, $new_status, '');
    }

    public function add_mobile_viewport_meta() {
        echo '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">';
    }

    // --- DEV TOOLS ---

    public function dev_reset_member_ids() {
        if (isset($_GET['reset_fss_ids']) && current_user_can('administrator')) {
            global $wpdb;
            $wpdb->query("DELETE FROM {$wpdb->postmeta} WHERE meta_key = '_fs_member_id'");
            echo "Member IDs have been reset. Next ID will be FSS-1000001.";
            exit;
        }
    }
}

// Boot the plugin
FullSend_React_App::get_instance();