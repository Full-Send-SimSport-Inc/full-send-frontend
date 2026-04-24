<?php
/**
 * Plugin Name: Full Send React App
 * Description: WordPress backend API and loader for the Full Send SimSports React App.
 * Version: 1.2
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

        // 3. Asset Management (Scripts/Styles)
        add_action('wp_enqueue_scripts', [$this, 'manage_storefront_scripts'], 999);
        add_action('wp_enqueue_scripts', [$this, 'localize_storefront_urls'], 5);

        // 4. Access Control & Redirects
        add_action('admin_init', [$this, 'restrict_admin_access']);
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
        $roles = [
            'executive_committee' => ['display' => 'Executive Committee', 'caps' => ['read' => true, 'view_portal_admin' => true, 'edit_posts' => true]],
            'committee' => ['display' => 'Committee', 'caps' => ['read' => true, 'view_portal_admin' => true, 'edit_posts' => true]],
            'fs_member' => ['display' => 'FS Member', 'caps' => ['read' => true]],
            'fs_junior_member' => ['display' => 'FS Junior Member', 'caps' => ['read' => true]]
        ];

        foreach ($roles as $role_slug => $data) {
            $role_object = get_role($role_slug);
            if (!$role_object) {
                add_role($role_slug, $data['display'], $data['caps']);
            } else {
                foreach ($data['caps'] as $cap => $grant) {
                    if ($grant) $role_object->add_cap($cap);
                    else $role_object->remove_cap($cap);
                }
            }
        }
    }

    // --- SCRIPT MANAGEMENT ---

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

    public function localize_storefront_urls() {
        if (is_page('portal')) {
            wp_localize_script('jquery', 'storefrontUrls', ['home' => home_url('/')]);
        }
    }

    // --- REDIRECTS & ACCESS CONTROL ---

    public function restrict_admin_access() {
        if (defined('DOING_AJAX') && DOING_AJAX) return;
        if (!is_user_logged_in() || current_user_can('manage_options')) return;

        if (current_user_can('view_portal_admin')) {
            wp_safe_redirect(home_url('/portal/#/admin'));
            exit;
        }
        wp_safe_redirect(home_url('/portal/#/my-profile'));
        exit;
    }

    public function handle_frontend_redirects() {
        if (isset($_GET['login_success']) || isset($_GET['setup_done'])) {
            header('X-FS-Debug: Redirect-Triggered');
            if (!is_user_logged_in()) return;

            if (fs_check_admin_permissions()) wp_safe_redirect(home_url('/portal/#/admin'));
            else wp_safe_redirect(home_url('/portal/#/my-profile'));
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

        // We get the previous status if we need to check if it was 'pending'
        // But the helper you provided handles current vs old fine.
        fs_handle_status_change_emails($post_id, $new_status, '');
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