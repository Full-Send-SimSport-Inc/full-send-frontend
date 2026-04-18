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
            $membership_type = get_post_meta($member_id, '_member_type', true);
            if ($membership_type === 'junior') {
                $user->set_role('fs_junior_member');
            } else {
                $user->set_role('fs_member');
            }
            
            update_user_meta($user_id, 'fs_member_id', $member_id);
            update_post_meta($member_id, '_wp_user_id', $user_id);

            // FORCE LOGIN: Use 'true' for the second parameter to remember the user
            wp_clear_auth_cookie();
            wp_set_current_user($user_id);
            wp_set_auth_cookie($user_id, true);

            return [
                'status' => 'success',
                'logged_in' => true, // Tell React we logged them in
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
// --- NEW ADMIN ROUTES ADDED HERE --- //

    // GET: List all users for Admin Dashboard
    register_rest_route($namespace, '/admin/users', [
        'methods' => 'GET',
        'callback' => 'fs_admin_get_users',
        'permission_callback' => 'fs_check_admin_permissions'
    ]);

    // POST: Update User Role
    register_rest_route($namespace, '/admin/users/role', [
        'methods' => 'POST',
        'callback' => 'fs_admin_update_role',
        'permission_callback' => 'fs_check_admin_permissions'
    ]);

    // POST: Send Mass Email
    register_rest_route($namespace, '/admin/send-email', [
        'methods' => 'POST',
        'callback' => 'fs_admin_send_email',
        'permission_callback' => 'fs_check_admin_permissions'
    ]);

// --- AGM / Meeting Routes ---
    
    // GET: List all meetings
    register_rest_route($namespace, '/agm', [
        'methods' => 'GET',
        'callback' => 'fs_get_agms',
        'permission_callback' => '__return_true'
    ]);

    // POST: Create a new meeting
    register_rest_route($namespace, '/agm', [
        'methods' => 'POST',
        'callback' => 'fs_create_agm',
        'permission_callback' => 'fs_check_admin_permissions'
    ]);

    // POST: Update an existing meeting (Status, Attendance, etc.)
    register_rest_route($namespace, '/agm/(?P<id>\d+)', [
        'methods' => 'POST',
        'callback' => 'fs_update_agm',
        'permission_callback' => 'fs_check_admin_permissions'
    ]);
});

add_shortcode('full_send_app', function() {
    wp_enqueue_script('fs-react-js', plugin_dir_url(__FILE__) . 'dist/assets/index.js', array(), time(), true);
    wp_enqueue_style('fs-react-css', plugin_dir_url(__FILE__) . 'dist/assets/index.css', array(), time());
    wp_localize_script('fs-react-js', 'appParams', [
        'restUrl'   => esc_url_raw(rest_url('full-send/v1')),
        'nonce'     => wp_create_nonce('wp_rest'),
        'logoutUrl' => wp_logout_url(home_url('/portal/')) // Add this line
    ]);
    return '<div id="root"></div>';
});

/**
 * Smart Redirect System: Routes users to the correct area upon accessing wp-admin
 */
/**
 * 1. Protect the WP Backend (/wp-admin/) from non-admins
 */
add_action('admin_init', function() {
    if (defined('DOING_AJAX') && DOING_AJAX) return;
    if (!is_user_logged_in()) return;

    // If an Administrator navigates to wp-admin, allow them to stay
    if (current_user_can('manage_options')) return;

    // Kick Committee/Editors out to the React Admin
    $user = wp_get_current_user();
    if (in_array('committee', (array)$user->roles) || current_user_can('edit_pages')) {
        wp_safe_redirect(home_url('/portal/#/admin'));
        exit;
    } 
    
    // Kick regular Members/Juniors out to their profile
    wp_safe_redirect(home_url('/portal/#/my-profile'));
    exit;
});

/**
 * Master Traffic Controller
 * Redirects users to the correct React route based on their role.
 */
add_action('template_redirect', function() {
    // 1. Only run if one of our flags is present
    if (isset($_GET['login_success']) || isset($_GET['setup_done'])) {
        
        // This is safe and won't break the site
        header('X-FS-Debug: Redirect-Triggered'); 

        if (!is_user_logged_in()) {
            header('X-FS-Debug: Auth-Failed-At-Redirect');
            // If we are here, the cookie wasn't saved or recognized
            return; 
        }

        $user = wp_get_current_user();
        
        // Match React's logic exactly
        $is_admin = in_array('administrator', (array)$user->roles) || 
                    in_array('committee', (array)$user->roles);

        if ($is_admin) {
            header('X-FS-Debug: Routing-To-Admin');
            wp_safe_redirect(home_url('/portal/#/admin'));
            exit;
        } else {
            header('X-FS-Debug: Routing-To-Profile');
            wp_safe_redirect(home_url('/portal/#/my-profile'));
            exit;
        }
    }
});

/**
 * Ensure users are redirected to the portal rather than the default WP login screen on logout
 */
add_action('wp_logout', function(){
    wp_safe_redirect(home_url('/portal'));
    exit;
});

/**
 * Initialize custom roles for Full Send SimSports
 */
function fs_initialize_custom_roles() {
    // 1. Committee Role (Access to Portal Admin)
    if (!get_role('committee')) {
        add_role('committee', 'Committee', [
            'read' => true,
            'view_portal_admin' => true, // Custom capability
            'edit_posts' => true         // Allows access to REST API routes protected by edit_posts
        ]);
    }

    // 2. Adult Member Role
    if (!get_role('fs_member')) {
        add_role('fs_member', 'FS Member', ['read' => true]);
    }

    // 3. Junior Member Role
    if (!get_role('fs_junior_member')) {
        add_role('fs_junior_member', 'FS Junior Member', ['read' => true]);
    }
}
add_action('init', 'fs_initialize_custom_roles');

// ==========================================
// ADMIN DASHBOARD HELPER FUNCTIONS
// ==========================================

// --- Security Check ---
function fs_check_admin_permissions() {
    $user = wp_get_current_user();
    return (in_array('administrator', (array)$user->roles) || in_array('committee', (array)$user->roles));
}

// --- Fetch Users ---
function fs_admin_get_users() {
    $users = get_users();
    $user_data = array();

    foreach ($users as $u) {
        // Find the member post linked to this user to get their status
        $member_id = get_user_meta($u->ID, 'fs_member_id', true);
        $status = 'active'; // Default
        
        if ($member_id) {
            $meta_status = get_post_meta($member_id, '_status', true);
            if (!empty($meta_status)) {
                $status = $meta_status;
            }
        }
        
        $user_data[] = array(
            'id'           => $u->ID,
            'email'        => $u->user_email,
            'display_name' => $u->display_name,
            'roles'        => $u->roles,
            'registered'   => $u->user_registered,
            'status'       => $status
        );
    }
    return rest_ensure_response($user_data);
}

// --- Update Role ---
function fs_admin_update_role($request) {
    $params = $request->get_json_params();
    $user_id = intval($params['user_id']);
    $new_role = sanitize_text_field($params['new_role']);

    $user = new WP_User($user_id);
    if (!$user->exists()) {
        return new WP_Error('no_user', 'User not found', array('status' => 404));
    }
    
    // Safety check: Prevent committee members from accidentally demoting full administrators
    if (in_array('administrator', $user->roles)) {
        return new WP_Error('forbidden', 'Cannot change administrator roles', array('status' => 403));
    }

    // Apply the new role
    $user->set_role($new_role);
    return rest_ensure_response(array('success' => true, 'message' => 'Role updated'));
}

// --- Send Mass Email ---
function fs_admin_send_email($request) {
    $to_emails_raw = $request->get_param('to_emails');
    $subject       = sanitize_text_field($request->get_param('subject'));
    $body          = wp_kses_post($request->get_param('body')); 
    $from_name_raw = $request->get_param('from_name');
    
    $from_name    = !empty($from_name_raw) ? sanitize_text_field($from_name_raw) : 'Full Send SimSport';
    $system_email = get_option('admin_email');
    $info_email   = 'info@fullsendsimsport.com.au';

    // 1. EXTRACT ALL STRINGS FROM WHATEVER REACT SENT (The "Ironclad" Flattener)
    $flat_emails = [];
    if (is_array($to_emails_raw)) {
        array_walk_recursive($to_emails_raw, function($value) use (&$flat_emails) {
            if (is_string($value)) {
                $flat_emails[] = $value;
            }
        });
    } elseif (is_string($to_emails_raw)) {
        $decoded = json_decode($to_emails_raw, true);
        if (is_array($decoded)) {
            array_walk_recursive($decoded, function($value) use (&$flat_emails) {
                if (is_string($value)) {
                    $flat_emails[] = $value;
                }
            });
        } else {
            $flat_emails = explode(',', $to_emails_raw);
        }
    }

    // 2. SANITIZE AND VALIDATE STRICTLY
    $valid_emails = [];
    foreach ($flat_emails as $e) {
        $clean = sanitize_email(trim($e));
        // Ensure it's not empty AND is actually formatted like an email address
        if (!empty($clean) && is_email($clean)) {
            $valid_emails[] = $clean;
        }
    }
    // Remove duplicates and re-index the array
    $to_emails = array_values(array_unique($valid_emails));

    // 3. Validation Check
    if (empty($to_emails) || empty($subject) || empty($body)) {
        return new WP_Error('missing_data', 'Missing valid email addresses or content.', array('status' => 400));
    }

    $formatted_body = nl2br($body);
    
    // 4. Construct Branded HTML Message
    $html_message = '<div style="font-family: sans-serif; font-size: 11pt; color: #000000;">';
    $html_message .= $formatted_body;
    $html_message .= '<br><br>';
    $html_message .= '<table style="font-size:11.0pt; font-family: Arial, sans-serif; color: #000000; line-height: 1.4;" cellpadding="0" cellspacing="0">';
    $html_message .= '<tbody><tr><td width="120" valign="top">';
    $html_message .= '<img src="https://storage.googleapis.com/revolgy-signatures-prod/icons/fullsendsimsport.com.au/LOGO-b96312c3-d5ab-4250-a71c-9652d867139a.png" alt="Full Send SimSport" width="120" style="display: block;">';
    $html_message .= '</td><td width="30"></td><td valign="top"><table cellpadding="0" cellspacing="0"><tbody>';
    $html_message .= '<tr><td style="padding-bottom: 2px;"><span>Executive Committee</span></td></tr>';
    $html_message .= '<tr><td style="padding-bottom: 2px;"><span style="font-size:12.0pt; font-family: Arial; color: #3a0a59; font-weight: bold;">Official Correspondence</span></td></tr>';
    $html_message .= '<tr><td style="font-size:12.0pt; font-family: Arial; color: #3a0a59; font-weight: bold; padding-bottom: 2px;">Full Send SimSport Inc.</td></tr>';
    $html_message .= '<tr><td><a href="mailto:info@fullsendsimsport.com.au" style="font-size:10.5pt; color: #4169e1; text-decoration: none;">info@fullsendsimsport.com.au</a></td></tr>';
    $html_message .= '<tr><td><a href="https://www.fullsendsimsport.com.au" style="font-size:10.5pt; color: #4169e1; text-decoration: none;">www.fullsendsimsport.com.au</a></td></tr>';
    $html_message .= '<tr><td height="14"></td></tr>';
    $html_message .= '<tr><td><table cellpadding="0" cellspacing="0"><tr>';
    $html_message .= '<td><a href="https://www.instagram.com/fullsendsimsport"><img src="https://storage.googleapis.com/revolgy-signatures-prod/icons/fullsendsimsport.com.au/instagram-40b6aa82-848f-40f1-a104-3ce6b6e06921.png" alt="IG"></a></td><td width="5"></td>';
    $html_message .= '<td><a href="https://www.facebook.com/fullsendsimsport"><img src="https://storage.googleapis.com/revolgy-signatures-prod/icons/fullsendsimsport.com.au/facebook-8d798943-3828-4b0e-bf31-5a1756e13c9f.png" alt="FB"></a></td><td width="5"></td>';
    $html_message .= '<td><a href="https://www.linkedin.com/company/fullsendsimsport"><img src="https://storage.googleapis.com/revolgy-signatures-prod/icons/fullsendsimsport.com.au/linkedin-b16f3da9-d125-4f88-8f61-6882ad2b1388.png" alt="IN"></a></td><td width="5"></td>';
    $html_message .= '<td><a href="https://www.youtube.com/c/fullsendsimsport"><img src="https://storage.googleapis.com/revolgy-signatures-prod/icons/fullsendsimsport.com.au/youtube-9279783f-9bc4-4b5e-9c3d-34ad91df8f7e.png" alt="YT"></a></td>';
    $html_message .= '</tr></table></td></tr></tbody></table></td></tr></tbody></table></div>';

    // 5. Set Headers
    $headers = array(
        'Content-Type: text/html; charset=UTF-8',
        'From: ' . $from_name . ' <' . $system_email . '>',
        'Reply-To: ' . $info_email
    );

    // 6. Recipient Logic
    $to = ''; 

    if (count($to_emails) === 1) {
        // EXACTLY ONE RECIPIENT: Send directly to them
        $to = $to_emails[0];
    } else {
        // MULTIPLE RECIPIENTS: 
        // Set "To" to the branded info email, BCC everyone else
        $to = 'info@fullsendsimsport.com.au'; 
        foreach ($to_emails as $email) {
            $headers[] = 'Bcc: ' . $email;
        }
    }

    // 7. Execute Send
    $sent = wp_mail($to, $subject, $html_message, $headers);

    if ($sent) {
        return rest_ensure_response(array('success' => true));
    } else {
        return new WP_Error('send_failed', 'WP Mail refused to send.', array('status' => 500));
    }
}

// --- GET: Fetch Meetings ---
function fs_get_agms($request) {
    $id = $request->get_param('id');
    
    $args = [
        'post_type'      => 'agm_meeting', // STRICTLY only meetings
        'posts_per_page' => -1,
        'post_status'    => 'publish',
    ];

    if ($id) {
        $args['p'] = intval($id);
    }

    $query = new WP_Query($args);
    $meetings = [];

    foreach ($query->posts as $post) {
        // Only return if it's actually the right post type (double check)
        if ($post->post_type !== 'agm_meeting') continue;

        $meetings[] = [
            'id'              => $post->ID,
            'title'           => $post->post_title,
            'meeting_date'    => get_post_meta($post->ID, '_meeting_date', true),
            'location'        => get_post_meta($post->ID, '_location', true),
            'status'          => get_post_meta($post->ID, '_status', true) ?: 'upcoming',
            'quorum_minimum'  => get_post_meta($post->ID, '_quorum_minimum', true) ?: 10,
            'notes'           => get_post_meta($post->ID, '_notes', true),
            'attendee_ids'    => maybe_unserialize(get_post_meta($post->ID, '_attendee_ids', true)) ?: [],
        ];
    }
    return rest_ensure_response($meetings);
}

// --- POST: Create Meeting ---
function fs_create_agm($request) {
    $params = $request->get_json_params();
    
    $post_id = wp_insert_post([
        'post_title'  => sanitize_text_field($params['title']),
        'post_type'   => 'agm_meeting',
        'post_status' => 'publish',
    ]);

    if (is_wp_error($post_id)) return $post_id;

    update_post_meta($post_id, '_meeting_date', sanitize_text_field($params['meeting_date']));
    update_post_meta($post_id, '_location', sanitize_text_field($params['location'] ?? ''));
    update_post_meta($post_id, '_quorum_minimum', intval($params['quorum_minimum'] ?? 10));
    update_post_meta($post_id, '_notes', wp_kses_post($params['notes'] ?? ''));
    update_post_meta($post_id, '_status', 'upcoming');
    update_post_meta($post_id, '_attendee_ids', serialize([]));

    return rest_ensure_response(['success' => true, 'id' => $post_id]);
}

// --- POST: Update Meeting ---
function fs_update_agm($request) {
    $id = $request['id'];
    $params = $request->get_json_params();

    if (isset($params['title'])) {
        wp_update_post(['ID' => $id, 'post_title' => sanitize_text_field($params['title'])]);
    }

    // Map React fields to Meta fields
    $fields = ['meeting_date', 'location', 'status', 'quorum_minimum', 'notes', 'attendee_ids'];
    
    foreach ($fields as $field) {
        if (isset($params[$field])) {
            $value = $params[$field];
            if ($field === 'attendee_ids') {
                update_post_meta($id, '_attendee_ids', $value); // Serialized automatically by WP
            } else {
                update_post_meta($id, '_' . $field, sanitize_text_field($value));
            }
        }
    }

    return rest_ensure_response(['success' => true]);
}