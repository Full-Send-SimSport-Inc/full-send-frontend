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
    $namespace = 'fs/v1';

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

    register_rest_route($namespace, '/join', [
        'methods' => 'POST',
        'permission_callback' => '__return_true',
        'callback' => function($request) {
            $params = $request->get_json_params();
            
            // --- STRICT PARENT VALIDATION ---
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

            return ['status' => 'success', 'message' => 'Application Submitted!', 'id' => $post_id];
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
});

add_shortcode('full_send_app', function() {
    wp_enqueue_script('fs-react-js', plugin_dir_url(__FILE__) . 'dist/assets/index.js', array(), time(), true);
    wp_enqueue_style('fs-react-css', plugin_dir_url(__FILE__) . 'dist/assets/index.css', array(), time());
    wp_localize_script('fs-react-js', 'appParams', [
        'restUrl' => esc_url_raw(rest_url('fs/v1')),
        'nonce'   => wp_create_nonce('wp_rest')
    ]);
    return '<div id="root"></div>';
});