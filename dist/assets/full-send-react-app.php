<?php
/**
 * Plugin Name: Full Send React App
 * Description: WordPress backend API and loader for the Full Send SimSports React App.
 * Version: 1.2
 */

if (!defined('ABSPATH')) exit;

add_filter('authenticate', function($user, $username, $password) {
    if ($user instanceof WP_User) {
        $is_disabled = get_user_meta($user->ID, 'fs_account_disabled', true);
        if ($is_disabled) {
            return new WP_Error('disabled', 'Your account is currently inactive. Please contact the committee or re-register.');
        }
    }
    return $user;
}, 30, 3);

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

            // --- START AUTO-LINK LOGIC ---
            if (!$member_id) {
                $member_query = new WP_Query([
                    'post_type' => 'fs_member',
                    'meta_key' => '_email',
                    'meta_value' => $user->user_email,
                    'posts_per_page' => 1,
                    'post_status' => 'any'
                ]);

                if ($member_query->have_posts()) {
                    $member_id = $member_query->posts[0]->ID;
                    update_user_meta($user->ID, 'fs_member_id', $member_id);
                    update_post_meta($member_id, '_wp_user_id', $user->ID);
                }
            }
            // --- END AUTO-LINK LOGIC ---

            $member_details = null;

            if ($member_id) {
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

                $raw_status = get_post_meta($member_id, '_status', true);
                $display_status = (!empty($raw_status)) ? $raw_status : 'pending';

                $member_details = [
                    'member_id'           => $member_id,
                    'first_name'          => get_post_meta($member_id, '_first_name', true),
                    'last_name'           => get_post_meta($member_id, '_last_name', true),
                    'email'               => get_post_meta($member_id, '_email', true),
                    'phone'               => get_post_meta($member_id, '_phone', true),
                    'street_address'      => get_post_meta($member_id, '_street_address', true),
                    'city'                => get_post_meta($member_id, '_city', true),
                    'state'               => get_post_meta($member_id, '_state', true),
                    'postcode'            => get_post_meta($member_id, '_postcode', true),
                    'region'              => get_post_meta($member_id, '_region', true), // Added
                    'country'             => get_post_meta($member_id, '_country', true), // Added
                    'dob'                 => get_post_meta($member_id, '_dob', true) ?: get_post_meta($member_id, '_date_of_birth', true),
                    'discord_username'    => get_post_meta($member_id, '_discord_username', true),
                    'sim_platforms'       => maybe_unserialize(get_post_meta($member_id, '_sim_platforms', true)) ?: [],
                    'sim_platforms_other' => get_post_meta($member_id, '_sim_platforms_other', true), // Added
                    'membership_type'     => get_post_meta($member_id, '_membership_type', true),
                    'status'              => $display_status,
                    'parent_name'         => $parent_name,
                    'parent_email'        => $parent_email,
                    'children'            => $children
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
            
            $email = sanitize_email($params['email']);
            $first_name = sanitize_text_field($params['first_name']);
            $last_name = sanitize_text_field($params['last_name']);
            $dob = sanitize_text_field($params['dob']);

            // 1. Check if Email already exists as a WordPress User
            if (email_exists($email)) {
                return new WP_Error('registration_conflict', 'An account with this email already exists. Please log in to your portal instead.', ['status' => 409]);
            }

            // 2. Check if a Member record already exists with this Email
            $email_check = new WP_Query([
                'post_type' => 'fs_member',
                'meta_key' => '_email',
                'meta_value' => $email,
                'post_status' => 'any',
                'posts_per_page' => 1
            ]);

            if ($email_check->have_posts()) {
                return new WP_Error('registration_conflict', 'A membership application for this email is already on file or being processed.', ['status' => 409]);
            }

            // 3. Check if Name + DOB already exists (Identifies re-registration attempts)
            $identity_query = new WP_Query([
                'post_type' => 'fs_member',
                'meta_query' => [
                    'relation' => 'AND',
                    ['key' => '_first_name', 'value' => $first_name],
                    ['key' => '_last_name', 'value' => $last_name],
                    ['key' => '_dob', 'value' => $dob]
                ],
                'post_status' => 'any',
                'posts_per_page' => 1
            ]);

            if ($identity_query->have_posts()) {
                return new WP_Error('registration_conflict', 'A member record with this name and date of birth already exists in our system.', ['status' => 409]);
            }

            // 4. Create new FS Member post (No conflicts found)
            $post_id = wp_insert_post([
                'post_title'   => $first_name . ' ' . $last_name,
                'post_type'    => 'fs_member',
                'post_status'  => 'publish',
            ]);

            if (is_wp_error($post_id) || !$post_id) {
                return new WP_Error('db_error', 'Failed to save application', ['status' => 500]);
            }
            
            // Save metadata
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
            return [
                'status' => 'success', 
                'message' => 'Application Submitted!', 
                'id' => $post_id, 
                'email' => $email
            ];
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
                'id'                  => $post->ID,
                'first_name'          => get_post_meta($post->ID, '_first_name', true),
                'last_name'           => get_post_meta($post->ID, '_last_name', true),
                'dob'                 => get_post_meta($post->ID, '_dob', true) ?: get_post_meta($post->ID, '_date_of_birth', true),
                'email'               => get_post_meta($post->ID, '_email', true),
                'phone'               => get_post_meta($post->ID, '_phone', true),
                'street_address'      => get_post_meta($post->ID, '_street_address', true),
                'city'                => get_post_meta($post->ID, '_city', true),
                'state'               => get_post_meta($post->ID, '_state', true),
                'postcode'            => get_post_meta($post->ID, '_postcode', true),
                'region'              => get_post_meta($post->ID, '_region', true), // Added
                'country'             => get_post_meta($post->ID, '_country', true), // Added
                'discord_username'    => get_post_meta($post->ID, '_discord_username', true),
                'member_type'         => get_post_meta($post->ID, '_member_type', true),
                'sim_platforms'       => maybe_unserialize(get_post_meta($post->ID, '_sim_platforms', true)) ?: [],
                'sim_platforms_other' => get_post_meta($post->ID, '_sim_platforms_other', true), // Added
                'status'              => get_post_meta($post->ID, '_status', true) ?: 'pending',
                'created_date'        => $post->post_date,
                'parent_id'           => $parent_id,
                'parent_name'         => $parent_name,
                'parent_email'        => $parent_email,
                'children'            => $children
            ];
        }
    ]);

    register_rest_route($namespace, '/members/(?P<id>\d+)', [
        'methods' => 'POST',
        'permission_callback' => function() { return current_user_can('edit_posts'); },
        'callback' => function($request) {
            $id = $request['id'];
            $params = $request->get_json_params();
            
            $allowed_fields = ['first_name', 'last_name', 'dob', 'email', 'phone', 'street_address', 'city', 'state', 'postcode', 'region', 'country', 'discord_username', 'sim_platforms', 'sim_platforms_other', 'status'];
            $updated = false;

            foreach ($params as $key => $value) {
                if (in_array($key, $allowed_fields)) {
                    if ($key === 'email') {
                        $new_email = sanitize_email($value);
                        if (!empty($new_email)) {
                            update_post_meta($id, '_email', $new_email);
                            $wp_user_id = get_post_meta($id, '_wp_user_id', true);
                            if ($wp_user_id) wp_update_user(['ID' => $wp_user_id, 'user_email' => $new_email]);
                        }
                    } else {
                        $sanitized_value = is_array($value) ? $value : sanitize_text_field($value);
                        update_post_meta($id, '_' . $key, $sanitized_value);
                        
                        if ($key === 'status') {
                            $wp_user_id = get_post_meta($id, '_wp_user_id', true);
                            if ($wp_user_id) {
                                if ($sanitized_value === 'inactive') {
                                    update_user_meta($wp_user_id, 'fs_account_disabled', '1');
                                } else {
                                    delete_user_meta($wp_user_id, 'fs_account_disabled');
                                }
                            }
                        }
                    }
                    $updated = true;
                }
            }

            if ($updated) {
                return ['status' => 'success', 'message' => 'Member updated successfully'];
            }
            return new WP_Error('invalid_data', 'No valid fields provided to update', ['status' => 400]);
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
                return new WP_Error('missing_data', 'Missing required account details.', ['status' => 400]);
            }

            $member_post = get_post($member_id);
            if (!$member_post || $member_post->post_type !== 'fs_member') {
                return new WP_Error('invalid_member', 'Member record not found.', ['status' => 404]);
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

            wp_clear_auth_cookie();
            wp_set_current_user($user_id);
            wp_set_auth_cookie($user_id, true);

            return [
                'status' => 'success',
                'logged_in' => true,
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
            $allowed_fields = ['first_name', 'last_name', 'dob', 'email', 'phone', 'street_address', 'city', 'state', 'postcode', 'region', 'country', 'discord_username', 'sim_platforms', 'sim_platforms_other'];

            foreach ($params as $key => $value) {
                if (in_array($key, $allowed_fields)) {
                    if ($key === 'email') {
                        $new_email = sanitize_email($value);
                        if (!empty($new_email)) {
                            wp_update_user(['ID' => $user_id, 'user_email' => $new_email]);
                            update_post_meta($member_id, '_email', $new_email);
                        }
                    } else {
                        $sanitized_value = is_array($value) ? $value : sanitize_text_field($value);
                        update_post_meta($member_id, '_' . $key, $sanitized_value);
                    }
                }
            }

            return ['status' => 'success', 'message' => 'Profile updated successfully!'];
        }
    ]);

    register_rest_route($namespace, '/admin/users', ['methods' => 'GET', 'callback' => 'fs_admin_get_users', 'permission_callback' => 'fs_check_admin_permissions']);
    register_rest_route($namespace, '/admin/users/role', ['methods' => 'POST', 'callback' => 'fs_admin_update_role', 'permission_callback' => 'fs_check_admin_permissions']);
    register_rest_route($namespace, '/admin/send-email', ['methods' => 'POST', 'callback' => 'fs_admin_send_email', 'permission_callback' => 'fs_check_admin_permissions']);
    register_rest_route($namespace, '/agm', ['methods' => 'GET', 'callback' => 'fs_get_agms', 'permission_callback' => '__return_true']);
    register_rest_route($namespace, '/agm', ['methods' => 'POST', 'callback' => 'fs_create_agm', 'permission_callback' => 'fs_check_admin_permissions']);
    register_rest_route($namespace, '/agm/(?P<id>\d+)', ['methods' => 'POST', 'callback' => 'fs_update_agm', 'permission_callback' => 'fs_check_admin_permissions']);
    register_rest_route($namespace, '/admin/users/delete', ['methods' => 'POST', 'callback' => 'fs_admin_delete_user', 'permission_callback' => 'fs_check_admin_permissions']);
});

add_shortcode('full_send_app', function() {
    wp_enqueue_script('fs-react-js', plugin_dir_url(__FILE__) . 'dist/assets/index.js', array(), time(), true);
    wp_enqueue_style('fs-react-css', plugin_dir_url(__FILE__) . 'dist/assets/index.css', array(), time());
    wp_localize_script('fs-react-js', 'appParams', [
        'restUrl'   => esc_url_raw(rest_url('full-send/v1')),
        'nonce'     => wp_create_nonce('wp_rest'),
        'logoutUrl' => wp_logout_url(home_url('/portal/'))
    ]);
    return '<div id="root"></div>';
});

add_action('admin_init', function() {
    if (defined('DOING_AJAX') && DOING_AJAX) return;
    if (!is_user_logged_in()) return;
    if (current_user_can('manage_options')) return;

    $user = wp_get_current_user();
    if (in_array('committee', (array)$user->roles) || current_user_can('edit_pages')) {
        wp_safe_redirect(home_url('/portal/#/admin'));
        exit;
    } 
    wp_safe_redirect(home_url('/portal/#/my-profile'));
    exit;
});

add_action('template_redirect', function() {
    if (isset($_GET['login_success']) || isset($_GET['setup_done'])) {
        header('X-FS-Debug: Redirect-Triggered'); 
        if (!is_user_logged_in()) return;

        $user = wp_get_current_user();
        $is_admin = in_array('administrator', (array)$user->roles) || in_array('committee', (array)$user->roles);

        if ($is_admin) {
            wp_safe_redirect(home_url('/portal/#/admin'));
        } else {
            wp_safe_redirect(home_url('/portal/#/my-profile'));
        }
        exit;
    }
});

add_action('wp_logout', function(){
    wp_safe_redirect(home_url('/portal'));
    exit;
});

function fs_initialize_custom_roles() {
    if (!get_role('committee')) {
        add_role('committee', 'Committee', [
            'read' => true,
            'view_portal_admin' => true,
            'edit_posts' => true
        ]);
    }
    if (!get_role('fs_member')) {
        add_role('fs_member', 'FS Member', ['read' => true]);
    }
    if (!get_role('fs_junior_member')) {
        add_role('fs_junior_member', 'FS Junior Member', ['read' => true]);
    }
}
add_action('init', 'fs_initialize_custom_roles');

function fs_check_admin_permissions() {
    $user = wp_get_current_user();
    return (in_array('administrator', (array)$user->roles) || in_array('committee', (array)$user->roles));
}

function fs_admin_get_users() {
    $users = get_users();
    $user_data = array();
    foreach ($users as $u) {
        $member_id = get_user_meta($u->ID, 'fs_member_id', true);
        $status = 'active';
        if ($member_id) {
            $meta_status = get_post_meta($member_id, '_status', true);
            if (!empty($meta_status)) $status = $meta_status;
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

function fs_admin_update_role($request) {
    $params = $request->get_json_params();
    $user_id = intval($params['user_id']);
    $new_role = sanitize_text_field($params['new_role']);
    $user = new WP_User($user_id);
    if (!$user->exists()) return new WP_Error('no_user', 'User not found', array('status' => 404));
    if (in_array('administrator', $user->roles)) return new WP_Error('forbidden', 'Forbidden', array('status' => 403));
    $user->set_role($new_role);
    return rest_ensure_response(array('success' => true));
}

function fs_admin_send_email($request) {
    $to_emails_raw = $request->get_param('to_emails');
    $subject       = sanitize_text_field($request->get_param('subject'));
    $body          = wp_kses_post($request->get_param('body')); 
    $from_name    = 'Full Send SimSport';
    $system_email = get_option('admin_email');
    $info_email   = 'info@fullsendsimsport.com.au';

    $flat_emails = [];
    if (is_array($to_emails_raw)) {
        array_walk_recursive($to_emails_raw, function($v) use (&$flat_emails) { if(is_string($v)) $flat_emails[] = $v; });
    }

    $valid_emails = [];
    foreach ($flat_emails as $e) {
        $clean = sanitize_email(trim($e));
        if (!empty($clean) && is_email($clean)) $valid_emails[] = $clean;
    }
    $to_emails = array_values(array_unique($valid_emails));

    if (empty($to_emails) || empty($subject) || empty($body)) return new WP_Error('fail', 'Missing data', ['status' => 400]);

    $formatted_body = nl2br($body);
    $html_message = '<div style="font-family: sans-serif;">' . $formatted_body . '</div>';
    
    $headers = array('Content-Type: text/html; charset=UTF-8', 'From: ' . $from_name . ' <' . $system_email . '>', 'Reply-To: ' . $info_email);
    $to = 'info@fullsendsimsport.com.au';
    if (count($to_emails) === 1) { $to = $to_emails[0]; } else { foreach ($to_emails as $email) { $headers[] = 'Bcc: ' . $email; } }

    $sent = wp_mail($to, $subject, $html_message, $headers);
    return rest_ensure_response(array('success' => $sent));
}

function fs_admin_delete_user($request) {
    $params = $request->get_json_params();
    $user_id = intval($params['user_id']);
    if ($user_id === get_current_user_id()) return new WP_Error('denied', 'You cannot delete your own account.', ['status' => 403]);
    $user = get_userdata($user_id);
    if (!$user) return new WP_Error('not_found', 'User not found.', ['status' => 404]);
    if (in_array('administrator', (array)$user->roles)) return new WP_Error('denied', 'Administrators cannot be deleted via the portal.', ['status' => 403]);
    $member_id = get_user_meta($user_id, 'fs_member_id', true);
    if ($member_id) delete_post_meta($member_id, '_wp_user_id');
    require_once(ABSPATH . 'wp-admin/includes/user.php');
    $deleted = wp_delete_user($user_id);
    if ($deleted) return rest_ensure_response(['success' => true]);
    return new WP_Error('delete_failed', 'Failed to delete user.', ['status' => 500]);
}

function fs_get_agms($request) {
    $args = ['post_type' => 'agm_meeting', 'posts_per_page' => -1, 'post_status' => 'publish'];
    if ($request->get_param('id')) $args['p'] = intval($request->get_param('id'));
    $query = new WP_Query($args);
    $meetings = [];
    foreach ($query->posts as $post) {
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

function fs_create_agm($request) {
    $params = $request->get_json_params();
    $post_id = wp_insert_post(['post_title' => sanitize_text_field($params['title']), 'post_type' => 'agm_meeting', 'post_status' => 'publish']);
    if (is_wp_error($post_id)) return $post_id;
    update_post_meta($post_id, '_meeting_date', sanitize_text_field($params['meeting_date']));
    update_post_meta($post_id, '_location', sanitize_text_field($params['location'] ?? ''));
    update_post_meta($post_id, '_status', 'upcoming');
    return rest_ensure_response(['success' => true, 'id' => $post_id]);
}

function fs_update_agm($request) {
    $id = $request['id'];
    $params = $request->get_json_params();
    if (isset($params['title'])) wp_update_post(['ID' => $id, 'post_title' => sanitize_text_field($params['title'])]);
    $fields = ['meeting_date', 'location', 'status', 'quorum_minimum', 'notes', 'attendee_ids'];
    foreach ($fields as $field) if (isset($params[$field])) update_post_meta($id, '_' . $field, $params[$field]);
    return rest_ensure_response(['success' => true]);
}