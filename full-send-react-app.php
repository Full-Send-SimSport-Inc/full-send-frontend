<?php
/**
 * Plugin Name: Full Send React App
 * Description: WordPress backend API and loader for the Full Send SimSports React App.
 * Version: 1.1
 */

if (!defined('ABSPATH')) exit;

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

    // Get All Members
    register_rest_route($namespace, '/members', [
        'methods' => 'GET',
        'permission_callback' => function() { return current_user_can('edit_posts'); },
        'callback' => function() {
            $users = get_users();
            $members = [];
            foreach ($users as $u) {
                $members[] = [
                    'id' => $u->ID,
                    'email' => $u->user_email,
                    'first_name' => get_user_meta($u->ID, 'first_name', true),
                    'last_name' => get_user_meta($u->ID, 'last_name', true),
                    'status' => get_user_meta($u->ID, 'membership_status', true) ?: 'pending'
                ];
            }
            return $members;
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