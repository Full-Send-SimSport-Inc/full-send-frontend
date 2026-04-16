<?php
/**
 * Plugin Name: Full Send React App
 * Description: WordPress backend API and loader for the Full Send SimSports React App.
 * Version: 1.1
 */

if (!defined('ABSPATH')) exit;

function fs_register_member_post_type() {
    register_post_type('fs_member', [
        'labels' => [
            'name' => 'FS Members',
            'singular_name' => 'Member',
            'add_new' => 'Add New Member',
            'edit_item' => 'Edit Member',
        ],
        'public' => false,
        'show_ui' => true,      // This puts it in the sidebar
        'show_in_menu' => true,
        'menu_position' => 5,
        'menu_icon' => 'dashicons-groups', // A nice group icon
        'supports' => ['title', 'custom-fields'],
        'has_archive' => false,
    ]);
}
add_action('init', 'fs_register_member_post_type');

// 1. Register AGM Meetings (Custom Post Type)
add_action('init', function() {
    register_post_type('agm_meeting', [
        'public' => true,
        'show_in_rest' => true,
        'label' => 'Meetings',
        'supports' => ['title', 'editor', 'custom-fields'],
        'menu_icon' => 'dashicons-groups',
    ]);
});

// 2. Register Custom REST API Endpoints
add_action('rest_api_init', function () {
    $namespace = 'fs/v1';

    // Get Current User (Auth)
    register_rest_route($namespace, '/me', [
        'methods' => 'GET',
        'callback' => function() {
            if (!is_user_logged_in()) return new WP_Error('no_auth', 'Not logged in', ['status' => 401]);
            $user = wp_get_current_user();
            return [
                'id' => $user->ID,
                'email' => $user->user_email,
                'first_name' => get_user_meta($user->ID, 'first_name', true),
                'last_name' => get_user_meta($user->ID, 'last_name', true),
                'status' => get_user_meta($user->ID, 'membership_status', true) ?: 'pending',
                'roles' => $user->roles
            ];
        },
        'permission_callback' => '__return_true'
    ]);

// NEW: Handle Form Submission (Join)
    register_rest_route($namespace, '/join', [
        'methods' => 'POST',
        'permission_callback' => '__return_true',
        'callback' => function($request) {
            $params = $request->get_json_params();
            
            // 1. Create a "Title" for the application entry
            $title = sanitize_text_field($params['first_name'] . ' ' . $params['last_name'] . ' - Application');

            // 2. Insert into the 'agm_meeting' Post Type (or you can create a new 'applications' CPT)
            // Inside your /join callback:
			$post_id = wp_insert_post([
				'post_title'   => sanitize_text_field($params['first_name'] . ' ' . $params['last_name']),
				'post_type'    => 'fs_member', // Changed from agm_meeting
				'post_status'  => 'publish',
				'post_content' => 'New Membership Application received.',
			]);

			if ($post_id) {
				// Basic Info
				update_post_meta($post_id, '_first_name', sanitize_text_field($params['first_name']));
				update_post_meta($post_id, '_last_name', sanitize_text_field($params['last_name']));
				update_post_meta($post_id, '_email', sanitize_email($params['email']));
				update_post_meta($post_id, '_phone', sanitize_text_field($params['phone']));
				
				// Address
				update_post_meta($post_id, '_street_address', sanitize_text_field($params['street_address']));
				update_post_meta($post_id, '_city', sanitize_text_field($params['city']));
				update_post_meta($post_id, '_state', sanitize_text_field($params['state']));
				update_post_meta($post_id, '_postcode', sanitize_text_field($params['postcode']));
				
				// Membership Specifics
				update_post_meta($post_id, '_member_type', sanitize_text_field($params['member_type'])); // adult or junior
				update_post_meta($post_id, '_discord_username', sanitize_text_field($params['discord_username']));
				update_post_meta($post_id, '_status', 'pending');
				
				// Platforms (Array handling)
				if (!empty($params['sim_platforms'])) {
					update_post_meta($post_id, '_sim_platforms', $params['sim_platforms']);
				}

				// Junior specific fields (if they exist)
				if (isset($params['parent_name'])) {
					update_post_meta($post_id, '_parent_name', sanitize_text_field($params['parent_name']));
					update_post_meta($post_id, '_parent_email', sanitize_email($params['parent_email']));
				}
			}

            if (is_wp_error($post_id)) {
                return new WP_Error('db_error', 'Failed to save application', ['status' => 500]);
            }

            // 3. Save all the form data as "Custom Fields" (Metadata)
            foreach ($params as $key => $value) {
                if (is_array($value)) {
                    update_post_meta($post_id, '_' . $key, implode(', ', $value));
                } else {
                    update_post_meta($post_id, '_' . $key, sanitize_text_field($value));
                }
            }

            return [
                'status' => 'success',
                'message' => 'Application Submitted!',
                'id' => $post_id
            ];
        }
    ]);

    // Get All Members
	register_rest_route($namespace, '/members', [
		'methods' => 'GET',
		'permission_callback' => function() { return current_user_can('edit_posts'); },
		'callback' => function() {
			$query = new WP_Query([
				'post_type' => 'fs_member', // Pulling from members now!
				'posts_per_page' => -1,
			]);
			
			$members = [];
			foreach ($query->posts as $post) {
				$members[] = [
					'id'           => $post->ID,
					'first_name'   => get_post_meta($post->ID, '_first_name', true),
					'last_name'    => get_post_meta($post->ID, '_last_name', true),
					'email'        => get_post_meta($post->ID, '_email', true),
					'city'         => get_post_meta($post->ID, '_city', true),   // ADDED
					'state'        => get_post_meta($post->ID, '_state', true),  // ADDED
					'status'       => get_post_meta($post->ID, '_status', true) ?: 'pending',
					'created_date' => $post->post_date,
				];
			}
			return $members;
		}
	]);
	
	// Get Single Member
    register_rest_route($namespace, '/members/(?P<id>\d+)', [
        'methods' => 'GET',
        'permission_callback' => function() { return current_user_can('edit_posts'); },
        'callback' => function($data) {
            $post = get_post($data['id']);
            if (!$post || $post->post_type !== 'fs_member') return new WP_Error('no_member', 'Not found', ['status' => 404]);
            
            $meta = get_post_meta($post->ID);
            return [
                'id' => $post->ID,
                'first_name' => $meta['_first_name'][0] ?? '',
                'last_name' => $meta['_last_name'][0] ?? '',
                'email' => $meta['_email'][0] ?? '',
                'phone' => $meta['_phone'][0] ?? '',
                'city' => $meta['_city'][0] ?? '',
                'state' => $meta['_state'][0] ?? '',
                'status' => $meta['_status'][0] ?? 'pending',
                'member_type' => $meta['_member_type'][0] ?? 'adult',
                'created_date' => $post->post_date,
                'notes' => $meta['_notes'][0] ?? ''
            ];
        }
    ]);
});

// 3. Enqueue the React App on a specific page
add_shortcode('full_send_app', function() {
    // 1. Enqueue the compiled React JS
    wp_enqueue_script(
        'fs-react-js', 
        plugin_dir_url(__FILE__) . 'dist/assets/index.js', 
        array(), 
        filemtime(plugin_dir_path(__FILE__) . 'dist/assets/index.js'), 
        true
    );

    // 2. Enqueue the compiled CSS
    wp_enqueue_style(
        'fs-react-css', 
        plugin_dir_url(__FILE__) . 'dist/assets/index.css', 
        array(), 
        filemtime(plugin_dir_path(__FILE__) . 'dist/assets/index.css')
    );

    // 3. Pass the WordPress URL and Security Nonce to React (Matched to appParams)
    wp_localize_script('fs-react-js', 'appParams', [
        'restUrl' => esc_url_raw(rest_url('fs/v1')),
        'nonce'   => wp_create_nonce('wp_rest')
    ]);

    return '<div id="root"></div>';
});