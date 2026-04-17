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
        'show_ui' => true,
        'show_in_menu' => true,
        'menu_position' => 5,
        'menu_icon' => 'dashicons-groups',
        'supports' => ['title', 'custom-fields'],
        'has_archive' => false,
    ]);
}
add_action('init', 'fs_register_member_post_type');

add_action('init', function() {
    register_post_type('agm_meeting', [
        'public' => true,
        'show_in_rest' => true,
        'label' => 'Meetings',
        'supports' => ['title', 'editor', 'custom-fields'],
        'menu_icon' => 'dashicons-groups',
    ]);
});

add_action('rest_api_init', function () {
    $namespace = 'full-send/v1';

    register_rest_route($namespace, '/me', [
        'methods' => 'GET',
        'callback' => function() {
            if (!is_user_logged_in()) {
                return rest_ensure_response([
                    'authenticated' => false,
                    'user' => null
                ]);
            }

            $user = wp_get_current_user();
            
            $member_id = get_user_meta($user->ID, 'fs_member_id', true);
            $member_details = null;

            if ($member_id) {
                // 1. RELATIONAL LOOKUP (Parent/Child)
                $parent_id = get_post_meta($member_id, '_parent_id', true);
                $parent_name = get_post_meta($member_id, '_parent_name', true);
                $parent_email = get_post_meta($member_id, '_parent_email', true);

                if ($parent_id) {
                    $parent_post = get_post($parent_id);
                    if ($parent_post) {
                        $parent_name = trim(get_post_meta($parent_id, '_first_name', true) . ' ' . get_post_meta($parent_id, '_last_name', true));
                        $parent_email = get_post_meta($parent_id, '_email', true);
                    }
                }

                $children = [];
                $child_query = new WP_Query([
                    'post_type' => 'fs_member',
                    'meta_query' => [['key' => '_parent_id', 'value' => $member_id, 'compare' => '=']],
                    'post_status' => 'any'
                ]);

                foreach ($child_query->posts as $cp) {
                    $children[] = [
                        'id' => $cp->ID,
                        'name' => get_post_meta($cp->ID, '_first_name', true) . ' ' . get_post_meta($cp->ID, '_last_name', true),
                        'status' => get_post_meta($cp->ID, '_status', true) ?: 'pending'
                    ];
                }

                // 1. STATUS FALLBACK: Ensure new members show as 'pending'
                $raw_status = get_post_meta($member_id, '_status', true);
                $display_status = (!empty($raw_status)) ? $raw_status : 'pending';

                $member_details = [
                    'member_id'        => $member_id,
                    'first_name'       => get_post_meta($member_id, '_first_name', true),
                    'last_name'        => get_post_meta($member_id, '_last_name', true),
                    'phone'            => get_post_meta($member_id, '_phone', true),
                    'street_address'   => get_post_meta($member_id, '_street_address', true),
                    'city'             => get_post_meta($member_id, '_city', true),
                    'state'            => get_post_meta($member_id, '_state', true),
                    'postcode'         => get_post_meta($member_id, '_postcode', true),
                    'dob'              => get_post_meta($member_id, '_dob', true) ?: get_post_meta($member_id, '_date_of_birth', true),
                    'discord_username' => get_post_meta($member_id, '_discord_username', true),
                    'sim_platforms'    => maybe_unserialize(get_post_meta($member_id, '_sim_platforms', true)) ?: [],
                    'membership_type'  => get_post_meta($member_id, '_membership_type', true),
                    'status'           => $display_status, // This sends 'pending' to React
                    'parent_name'      => $parent_name,
                    'parent_email'     => $parent_email,
                    'children'         => $children
                ];
            }

            return rest_ensure_response([
                'authenticated'  => true,
                'id'             => $user->ID,
                'email'          => $user->user_email,
                'display_name'   => $user->display_name,
                'roles'          => $user->roles,
                'member_details' => $member_details
            ]);
        },
        'permission_callback' => '__return_true'
    ]);

    register_rest_route($namespace, '/join', [
        'methods' => 'POST',
        'permission_callback' => '__return_true',
        'callback' => function($request) {
            $params = $request->get_json_params();
            
            if (isset($params['member_type']) && $params['member_type'] === 'junior') {
                $raw_email = $params['parent_email'] ?? $params['parent_guardian_email'] ?? $params['guardian_email'] ?? '';
                $parent_email = sanitize_email($raw_email);
                
                if (empty($parent_email)) {
                    return new WP_Error('missing_email', "Parent email required for Juniors.", ['status' => 400]);
                }

                $parent_query = new WP_Query([
                    'post_type' => 'fs_member',
                    'meta_key' => '_email',
                    'meta_value' => $parent_email,
                    'posts_per_page' => 1,
                    'post_status' => 'any'
                ]);

                if (!$parent_query->have_posts()) {
                    return new WP_Error(
                        'parent_not_found', 
                        "No registered member found with email: '{$parent_email}'. Your parent/guardian must register first.", 
                        ['status' => 400]
                    );
                }
                
                $params['parent_id'] = $parent_query->posts[0]->ID;
            }

            $post_id = wp_insert_post([
                'post_title'   => sanitize_text_field($params['first_name'] . ' ' . $params['last_name']),
                'post_type'    => 'fs_member',
                'post_status'  => 'publish',
            ]);

            if (is_wp_error($post_id) || !$post_id) {
                return new WP_Error('db_error', 'Failed to save application', ['status' => 500]);
            }

            foreach ($params as $key => $value) {
                $target_key = $key;
                if ($key === 'parent_guardian_email' || $key === 'guardian_email') $target_key = 'parent_email';
                if ($key === 'parent_guardian_name' || $key === 'guardian_name') $target_key = 'parent_name';

                $meta_key = '_' . $target_key;
                if (is_array($value)) {
                    update_post_meta($post_id, $meta_key, $value);
                } else {
                    update_post_meta($post_id, $meta_key, sanitize_text_field($value));
                }
            }
            
            update_post_meta($post_id, '_status', 'pending');

            return ['status' => 'success', 'message' => 'Application Submitted!', 'id' => $post_id, 'email' => $params['email']];
        }
    ]);

    register_rest_route($namespace, '/members', [
        'methods' => 'GET',
        'permission_callback' => function() { return current_user_can('edit_posts'); },
        'callback' => function() {
            $query = new WP_Query(['post_type' => 'fs_member', 'posts_per_page' => -1]);
            $members = [];
            foreach ($query->posts as $post) {
                $members[] = [
                    'id'           => $post->ID,
                    'first_name'   => get_post_meta($post->ID, '_first_name', true),
                    'last_name'    => get_post_meta($post->ID, '_last_name', true),
                    'email'        => get_post_meta($post->ID, '_email', true),
                    'member_type'  => get_post_meta($post->ID, '_member_type', true),
                    'status'       => get_post_meta($post->ID, '_status', true) ?: 'pending',
                ];
            }
            return $members;
        }
    ]);

    register_rest_route($namespace, '/members/(?P<id>\d+)', [
        'methods' => 'GET',
        'permission_callback' => function() { return current_user_can('edit_posts'); },
        'callback' => function($data) {
            $post = get_post($data['id']);
            if (!$post) return new WP_Error('not_found', 'Member not found', ['status' => 404]);

            $parent_id = get_post_meta($post->ID, '_parent_id', true);
            $parent_name = get_post_meta($post->ID, '_parent_name', true);
            $parent_email = get_post_meta($post->ID, '_parent_email', true);

            if ($parent_id) {
                $parent_name = trim(get_post_meta($parent_id, '_first_name', true) . ' ' . get_post_meta($parent_id, '_last_name', true));
                $parent_email = get_post_meta($parent_id, '_email', true);
            }

            $children = [];
            $child_query = new WP_Query([
                'post_type' => 'fs_member',
                'meta_query' => [['key' => '_parent_id', 'value' => $post->ID, 'compare' => '=']]
            ]);

            foreach ($child_query->posts as $cp) {
                $children[] = [
                    'id' => $cp->ID,
                    'name' => get_post_meta($cp->ID, '_first_name', true) . ' ' . get_post_meta($cp->ID, '_last_name', true),
                    'status' => get_post_meta($cp->ID, '_status', true) ?: 'pending'
                ];
            }

            return [
                'id'                => $post->ID,
                'first_name'        => get_post_meta($post->ID, '_first_name', true),
                'last_name'         => get_post_meta($post->ID, '_last_name', true),
                'email'             => get_post_meta($post->ID, '_email', true),
                'phone'             => get_post_meta($post->ID, '_phone', true),
                'street_address'    => get_post_meta($post->ID, '_street_address', true),
                'city'              => get_post_meta($post->ID, '_city', true),
                'state'             => get_post_meta($post->ID, '_state', true),
                'postcode'          => get_post_meta($post->ID, '_postcode', true),
                'discord_username'  => get_post_meta($post->ID, '_discord_username', true),
                'member_type'       => get_post_meta($post->ID, '_member_type', true),
                'sim_platforms'     => maybe_unserialize(get_post_meta($post->ID, '_sim_platforms', true)) ?: [],
                'status'            => get_post_meta($post->ID, '_status', true) ?: 'pending',
                'created_date'      => $post->post_date,
                'parent_id'         => $parent_id,
                'parent_name'       => $parent_name,
                'parent_email'      => $parent_email,
                'children'          => $children
            ];
        }
    ]);

    register_rest_route($namespace, '/members/(?P<id>\d+)', [
        'methods' => 'POST',
        'permission_callback' => function() { return current_user_can('edit_posts'); },
        'callback' => function($request) {
            $id = $request['id'];
            $params = $request->get_json_params();
            if (isset($params['status'])) {
                update_post_meta($id, '_status', sanitize_text_field($params['status']));
                return ['status' => 'success', 'message' => 'Status updated'];
            }
            return new WP_Error('invalid_data', 'No status provided', ['status' => 400]);
        }
    ]);

    register_rest_route($namespace, '/setup-account', [
        'methods' => 'POST',
        'permission_callback' => '__return_true', 
        'callback' => function($request) {
            $params = $request->get_json_params();
            
            if (empty($params)) {
                $raw_body = $request->get_body();
                $params = json_decode($raw_body, true);
            }

            $member_id = $params['member_id'] ?? $params['id'] ?? $params['memberId'] ?? null;
            $email     = $params['email'] ?? null;
            $password  = $params['password'] ?? null;

            if (!$member_id || !$password || !$email) {
                return new WP_Error('missing_data', 'Missing required account details. Received: ID(' . ($member_id ? 'yes':'no') . ') Email(' . ($email ? 'yes':'no') . ') Pwd(' . ($password ? 'yes':'no') . ')', ['status' => 400]);
            }

            $member_post = get_post($member_id);
            if (!$member_post || $member_post->post_type !== 'fs_member') {
                return new WP_Error('invalid_member', 'Member record not found for ID: ' . $member_id, ['status' => 404]);
            }

            $stored_email = get_post_meta($member_id, '_email', true);
            
            if (empty($stored_email)) {
                update_post_meta($member_id, '_email', sanitize_email($email));
                $stored_email = $email;
            }

            if (strtolower(trim($stored_email)) !== strtolower(trim($email))) {
                return new WP_Error('verification_failed', 'Email does not match our records.', ['status' => 403]);
            }

            if (email_exists($email)) {
                return new WP_Error('user_exists', 'An account with this email already exists.', ['status' => 400]);
            }

            // Create User
            $user_id = wp_create_user($email, $password, $email);
            
            if (is_wp_error($user_id)) {
                return new WP_Error('creation_failed', $user_id->get_error_message(), ['status' => 500]);
            }

            $first_name = get_post_meta($member_id, '_first_name', true);
            $last_name  = get_post_meta($member_id, '_last_name', true);
            $full_name  = trim("$first_name $last_name");

            wp_update_user([
                'ID'           => $user_id,
                'first_name'   => $first_name,
                'last_name'    => $last_name,
                'display_name' => $full_name ? $full_name : $email,
                'nickname'     => $first_name ? $first_name : $email,
            ]);

            $discord = get_post_meta($member_id, '_discord_username', true);
            if ($discord) {
                update_user_meta($user_id, 'discord_username', $discord);
            }

            $user = new WP_User($user_id);
            $user->set_role('subscriber');
            
            update_user_meta($user_id, 'fs_member_id', $member_id);
            update_post_meta($member_id, '_wp_user_id', $user_id);

            return [
                'status' => 'success',
                'message' => 'Account created! Welcome, ' . ($first_name ?: $email)
            ];
        }
    ]);

    register_rest_route($namespace, '/update-me', [
        'methods' => 'POST',
        'permission_callback' => function() { return is_user_logged_in(); },
        'callback' => function($request) {
            $user_id = get_current_user_id();
            $member_id = get_user_meta($user_id, 'fs_member_id', true);
            
            if (!$member_id) return new WP_Error('no_record', 'No member record linked to this user.', ['status' => 404]);

            $params = $request->get_json_params();
            
            // Define exactly which keys are allowed to be updated by the user
            $allowed_fields = ['email', 'phone', 'street_address', 'city', 'state', 'postcode', 'discord_username', 'sim_platforms'];

            foreach ($params as $key => $value) {
                if (in_array($key, $allowed_fields)) {
                    // Special handling for Email to keep WP User in sync
                    if ($key === 'email') {
                        $new_email = sanitize_email($value);
                        if (!empty($new_email)) {
                            wp_update_user(['ID' => $user_id, 'user_email' => $new_email]);
                            update_post_meta($member_id, '_email', $new_email);
                        }
                    } else {
                        // For State and all other text fields
                        $sanitized_value = is_array($value) ? $value : sanitize_text_field($value);
                        update_post_meta($member_id, '_' . $key, $sanitized_value);
                    }
                }
            }

            return ['status' => 'success', 'message' => 'Profile updated successfully!'];
        }
    ]);
});

add_shortcode('full_send_app', function() {
    wp_enqueue_script('fs-react-js', plugin_dir_url(__FILE__) . 'dist/assets/index.js', array(), time(), true);
    wp_enqueue_style('fs-react-css', plugin_dir_url(__FILE__) . 'dist/assets/index.css', array(), time());
    wp_localize_script('fs-react-js', 'appParams', [
        'restUrl' => esc_url_raw(rest_url('full-send/v1')),
        'nonce'   => wp_create_nonce('wp_rest')
    ]);
    return '<div id="root"></div>';
});

/**
 * Smart Redirect System: Routes users to the correct area upon accessing wp-admin
 */
add_action('admin_init', function() {
    if (defined('DOING_AJAX') && DOING_AJAX) return;
    
    // If the user is logged in but is NOT an Administrator
    if (is_user_logged_in() && !current_user_can('manage_options')) {
        
        // If they have Editor capabilities (Committee), send them to the React Admin Dashboard
        if (current_user_can('edit_pages')) {
            wp_redirect(home_url('/portal/#/admin'));
        } else {
            // Regular Members (Subscribers) go straight to their editable profile
            wp_redirect(home_url('/portal/#/my-profile'));
        }
        exit;
    }
    // Administrators naturally fall through and are allowed to stay in wp-admin
});

/**
 * Ensure users are redirected to the portal rather than the default WP login screen on logout
 */
add_action('wp_logout', function(){
    wp_safe_redirect(home_url('/portal'));
    exit;
});