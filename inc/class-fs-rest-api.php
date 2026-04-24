<?php
if (!defined('ABSPATH')) exit;

class FS_REST_API_Manager {

    protected $namespace = 'full-send/v1';

    public function __construct() {
        add_action('rest_api_init', [$this, 'register_routes']);
    }

    public function register_routes() {
        // --- AUTH & IDENTITY ---
        register_rest_route($this->namespace, '/me', [
            'methods'  => 'GET',
            'callback' => ['FS_REST_Handlers', 'get_me'],
            'permission_callback' => '__return_true'
        ]);

        register_rest_route($this->namespace, '/join', [
            'methods'  => 'POST',
            'callback' => ['FS_REST_Handlers', 'handle_join'],
            'permission_callback' => '__return_true'
        ]);

        register_rest_route($this->namespace, '/setup-account', [
            'methods'  => 'POST',
            'callback' => ['FS_REST_Handlers', 'setup_account'],
            'permission_callback' => '__return_true'
        ]);

        // --- MEMBER MANAGEMENT ---
        register_rest_route($this->namespace, '/members', [
            'methods'  => 'GET',
            'callback' => ['FS_REST_Handlers', 'get_all_members'],
            'permission_callback' => function() { return current_user_can('edit_posts'); }
        ]);

        register_rest_route($this->namespace, '/members/self', [
            'methods'  => 'GET',
            'callback' => ['FS_REST_Handlers', 'get_self_member'],
            'permission_callback' => function() { return is_user_logged_in(); }
        ]);

        register_rest_route($this->namespace, '/members/self/onboarding', [
            'methods'  => 'POST',
            'callback' => ['FS_REST_Handlers', 'complete_onboarding'],
            'permission_callback' => function() { return is_user_logged_in(); }
        ]);

        register_rest_route($this->namespace, '/update-me', [
            'methods'  => 'POST',
            'callback' => ['FS_REST_Handlers', 'update_me'],
            'permission_callback' => function() { return is_user_logged_in(); }
        ]);

        // --- SPECIFIC MEMBER ACTIONS ---
        register_rest_route($this->namespace, '/members/(?P<id>\d+)', [
            [
                'methods'  => 'GET',
                'callback' => ['FS_REST_Handlers', 'get_single_member'],
                'permission_callback' => 'fs_check_admin_permissions'
            ],
            [
                'methods'  => 'POST',
                'callback' => ['FS_REST_Handlers', 'update_single_member'],
                'permission_callback' => 'fs_check_admin_permissions'
            ]
        ]);

        // --- SPECIAL LOGIC ---
        register_rest_route($this->namespace, '/parental-consent', [
            'methods'  => 'POST',
            'callback' => ['FS_REST_Handlers', 'handle_parental_consent'],
            'permission_callback' => '__return_true'
        ]);

        // --- DELEGATED ADMIN ENDPOINTS ---
        register_rest_route($this->namespace, '/admin/users', [
            'methods' => 'GET',
            'callback' => ['FS_REST_Handlers', 'fs_admin_get_users'],
            'permission_callback' => 'fs_check_admin_permissions'
        ]);
        register_rest_route($this->namespace, '/admin/users/role', [
            'methods' => 'POST',
            'callback' => ['FS_REST_Handlers', 'fs_admin_update_role'],
            'permission_callback' => 'fs_check_admin_permissions'
        ]);
        register_rest_route($this->namespace, '/admin/send-email', [
            'methods' => 'POST',
            'callback' => ['FS_REST_Handlers', 'fs_admin_send_email'],
            'permission_callback' => 'fs_check_admin_permissions'
        ]);
        register_rest_route($this->namespace, '/admin/users/delete', [
            'methods' => 'POST',
            'callback' => ['FS_REST_Handlers', 'fs_admin_delete_user'],
            'permission_callback' => 'fs_check_admin_permissions'
        ]);

        // --- AGM ENDPOINTS ---
        register_rest_route($this->namespace, '/agm', [
            [
                'methods' => 'GET',
                'callback' => ['FS_REST_Handlers', 'fs_get_agms'],
                'permission_callback' => '__return_true'
            ],
            [
                'methods' => 'POST',
                'callback' => ['FS_REST_Handlers', 'fs_create_agm'],
                'permission_callback' => 'fs_check_admin_permissions'
            ]
        ]);
        register_rest_route($this->namespace, '/agm/(?P<id>\d+)', [
            'methods' => 'POST',
            'callback' => ['FS_REST_Handlers', 'fs_update_agm'],
            'permission_callback' => 'fs_check_admin_permissions'
        ]);
    }
}