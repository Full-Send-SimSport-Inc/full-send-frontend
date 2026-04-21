<?php
/**
 * Plugin Name: Full Send React App
 * Description: WordPress backend API and loader for the Full Send SimSports React App.
 * Version: 1.2
 */

if (!defined('ABSPATH')) exit;

/**
 * Helper: Returns the numerical weight of a user's roles for hierarchy checks.
 * Admin (40) > Executive (30) > Committee (20) > Member (10)
 */
function fs_get_role_weight($roles) {
    $weights = [
        'administrator'       => 40,
        'executive_committee' => 30,
        'committee'           => 20,
        'fs_member'           => 10,
        'fs_junior_member'    => 10,
        'subscriber'          => 5
    ];
    $max_weight = 0;
    foreach ((array)$roles as $role) {
        if (isset($weights[$role]) && $weights[$role] > $max_weight) {
            $max_weight = $weights[$role];
        }
    }
    return $max_weight;
}

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

/**
 * Prevent Storefront theme scripts from crashing the React Portal
 */
add_action('wp_enqueue_scripts', function() {
    if (is_page('portal')) {
        // This is the common handle for Ecwid's frontend scripts
        wp_dequeue_script('ecwid-frontend-js');
        wp_dequeue_script('ecwid-scripts'); 
    }
}, 999);

add_action('wp_enqueue_scripts', function() {
    if (is_page('portal')) {
        wp_localize_script('jquery', 'storefrontUrls', [
            'home' => home_url('/'),
            // ... rest of the keys as above
        ]);
    }
}, 5); // Priority 5 ensures it runs very early

add_action('wp_enqueue_scripts', function() {
    // Only target the portal page
    if (is_page('portal') || (defined('REST_REQUEST') && REST_REQUEST)) {
        
        // Dequeue the specific scripts that look for 'storefrontUrls'
        wp_dequeue_script('storefront-header-cart');
        wp_dequeue_script('storefront-functions');
        wp_dequeue_script('storefront-sticky-payment');
        
        // Sometimes themes use different handles, let's catch the main one
        wp_deregister_script('storefront-functions');
    }
}, 999); // Priority 999 ensures we run AFTER the theme has enqueued them

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

            // --- START AUTO-LINK LOGIC (Preserved) ---
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
            $onboarding_complete = false; // Default for safety

            if ($member_id) {
                // --- ADDED: Onboarding Check ---
                $is_complete = get_post_meta($member_id, '_onboarding_complete', true);
                $onboarding_complete = ($is_complete === 'yes');

                // --- START PARENT/CHILD LOGIC (Preserved) ---
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

                // --- START MEMBER DETAILS (Preserved) ---
                $member_details = [
                    'member_id'           => $member_id,
                    'onboarding_complete' => $onboarding_complete, // Added inside details
                    'first_name'          => get_post_meta($member_id, '_first_name', true),
                    'last_name'           => get_post_meta($member_id, '_last_name', true),
                    'email'               => get_post_meta($member_id, '_email', true),
                    'phone'               => get_post_meta($member_id, '_phone', true),
                    'street_address'      => get_post_meta($member_id, '_street_address', true),
                    'city'                => get_post_meta($member_id, '_city', true),
                    'state'               => get_post_meta($member_id, '_state', true),
                    'postcode'            => get_post_meta($member_id, '_postcode', true),
                    'region'              => get_post_meta($member_id, '_region', true),
                    'country'             => get_post_meta($member_id, '_country', true),
                    'dob'                 => get_post_meta($member_id, '_dob', true) ?: get_post_meta($member_id, '_date_of_birth', true),
                    'discord_username'    => get_post_meta($member_id, '_discord_username', true),
                    'comm_prefs'          => maybe_unserialize(get_post_meta($member_id, '_comm_prefs', true)) ?: ['Email'],
                    'sim_environment'     => get_post_meta($member_id, '_sim_environment', true),
                    'sim_platforms'       => maybe_unserialize(get_post_meta($member_id, '_sim_platforms', true)) ?: [],
                    'sim_platforms_other' => get_post_meta($member_id, '_sim_platforms_other', true),
                    'racing_interests'    => maybe_unserialize(get_post_meta($member_id, '_racing_interests', true)) ?: [],
                    'membership_type'     => get_post_meta($member_id, '_membership_type', true),
                    'status'              => $display_status,
                    'parent_name'         => $parent_name,
                    'parent_email'        => $parent_email,
                    'children'            => $children
                ];
            }

            return rest_ensure_response([
                'authenticated'       => true,
                'id'                  => $user->ID,
                'email'               => $user->user_email,
                'display_name'        => $user->display_name,
                'member_id'           => $member_id,
                'roles'               => $user->roles,
                'onboarding_complete' => $onboarding_complete, // Added to top level for React Gate
                'member_details'      => $member_details
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
            return new WP_Error('registration_conflict', 'An account with this email already exists. Please log in to your existing account.', ['status' => 409]);
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

        // 3. Check if Name + DOB already exists
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

        // 4. Create new FS Member post
        $post_id = wp_insert_post([
            'post_title'   => $first_name . ' ' . $last_name,
            'post_type'    => 'fs_member',
            'post_status'  => 'publish',
        ]);

        if (is_wp_error($post_id) || !$post_id) {
            return new WP_Error('db_error', 'Failed to save application', ['status' => 500]);
        }
        
        // Save metadata with array handling
        foreach ($params as $key => $value) {
            $target_key = $key;
            if ($key === 'parent_guardian_email' || $key === 'guardian_email') $target_key = 'parent_email';
            if ($key === 'parent_guardian_name' || $key === 'guardian_name') $target_key = 'parent_name';

            $meta_key = '_' . $target_key;
            if (is_array($value)) {
                $sanitized_array = array_map('sanitize_text_field', $value);
                update_post_meta($post_id, $meta_key, $sanitized_array);
            } else {
                update_post_meta($post_id, $meta_key, sanitize_text_field($value));
            }
        }
        
        fs_email_on_initial_application($post_id, $params);

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

    /**
    * GET CURRENT LOGGED-IN MEMBER DATA
    * Used by the React App to determine if the user is onboarded or not.
    */
    register_rest_route($namespace, '/members/self', [
        'methods' => 'GET',
        'permission_callback' => function() { return is_user_logged_in(); },
        'callback' => function() {
            $user_id = get_current_user_id();
            $member_id = get_user_meta($user_id, 'fs_member_id', true);
            
            if (!$member_id) {
                return new WP_Error('no_record', 'No member record found for this user.', ['status' => 404]);
            }

            $is_complete = get_post_meta($member_id, '_onboarding_complete', true);

            return [
                'id'                  => $member_id,
                'onboarding_complete' => ($is_complete === 'yes'), // The critical flag for React
                'first_name'          => get_post_meta($member_id, '_first_name', true),
                'last_name'           => get_post_meta($member_id, '_last_name', true),
                'email'               => get_post_meta($member_id, '_email', true),
                'status'              => get_post_meta($member_id, '_status', true) ?: 'pending',
                'member_type'         => get_post_meta($member_id, '_member_type', true),
                'discord_username'    => get_post_meta($member_id, '_discord_username', true),
            ];
        }
    ]);
    
    register_rest_route($namespace, '/members/(?P<id>\d+)', [
        'methods' => 'GET',
        'permission_callback' => 'fs_check_admin_permissions',
        'callback' => function($data) {
            $post = get_post($data['id']);
            if (!$post) return new WP_Error('not_found', 'Member not found', ['status' => 404]);

            // --- NEW: HIERARCHY CHECK ---
            $current_user = wp_get_current_user();
            $target_wp_user_id = get_post_meta($post->ID, '_wp_user_id', true);
            
            // If the record belongs to a WP User and it's NOT the person viewing it...
            if ($target_wp_user_id && $current_user->ID != $target_wp_user_id) {
                $target_user = get_userdata($target_wp_user_id);
                // Check if the person we are looking at has a higher rank than us
                if ($target_user && fs_get_role_weight($current_user->roles) < fs_get_role_weight($target_user->roles)) {
                    return new WP_Error('forbidden', 'You do not have permission to view this account level.', ['status' => 403]);
                }
            }
            // --- END HIERARCHY CHECK ---

            // Existing parent/children logic (PRESERVED)
            $parent_id = get_post_meta($post->ID, '_parent_id', true);
            $parent_name = get_post_meta($post->ID, '_parent_name', true);
            $parent_email = get_post_meta($post->ID, '_parent_email', true);

            if ($parent_id) {
                $p_first = get_post_meta($parent_id, '_first_name', true);
                $p_last = get_post_meta($parent_id, '_last_name', true);
                $parent_name = trim($p_first . ' ' . $p_last);
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

            // Construct the response
            return [
                'id'                  => $post->ID,
                'wp_user_id'          => $target_wp_user_id, // Needed for React "Self" check
                'onboarding_complete' => (get_post_meta($post->ID, '_onboarding_complete', true) === 'yes'),
                'first_name'          => get_post_meta($post->ID, '_first_name', true),
                'last_name'           => get_post_meta($post->ID, '_last_name', true),
                'dob'                 => get_post_meta($post->ID, '_dob', true) ?: get_post_meta($post->ID, '_date_of_birth', true),
                'email'               => get_post_meta($post->ID, '_email', true),
                'phone'               => get_post_meta($post->ID, '_phone', true),
                'street_address'      => get_post_meta($post->ID, '_street_address', true),
                'city'                => get_post_meta($post->ID, '_city', true),
                'state'               => get_post_meta($post->ID, '_state', true),
                'postcode'            => get_post_meta($post->ID, '_postcode', true),
                'region'              => get_post_meta($post->ID, '_region', true),
                'country'             => get_post_meta($post->ID, '_country', true),
                'discord_username'    => get_post_meta($post->ID, '_discord_username', true),
                'member_type'         => get_post_meta($post->ID, '_member_type', true),
                'comm_prefs'          => maybe_unserialize(get_post_meta($post->ID, '_comm_prefs', true)) ?: [],
                'sim_environment'     => get_post_meta($post->ID, '_sim_environment', true),
                'racing_interests'    => maybe_unserialize(get_post_meta($post->ID, '_racing_interests', true)) ?: [],
                'sim_platforms'       => maybe_unserialize(get_post_meta($post->ID, '_sim_platforms', true)) ?: [],
                'sim_platforms_other' => get_post_meta($post->ID, '_sim_platforms_other', true),
                'status'              => get_post_meta($post->ID, '_status', true) ?: 'pending',
                'created_date'        => $post->post_date,
                'parent_id'           => $parent_id,
                'parent_name'         => $parent_name,
                'parent_email'        => $parent_email,
                'children'            => $children,
                // Needed for React to calculate hierarchy weights
                'roles'               => $target_wp_user_id ? get_userdata($target_wp_user_id)->roles : ['fs_member']
            ];
        }
    ]);

    register_rest_route($namespace, '/members/(?P<id>\d+)', [
        'methods' => 'POST',
        'permission_callback' => 'fs_check_admin_permissions',
        'callback' => function($request) {
            $id = $request['id']; 
            $params = $request->get_json_params();
            $current_user = wp_get_current_user();
            $wp_user_id = get_post_meta($id, '_wp_user_id', true);
            
            // --- 1. NEW: HIERARCHY CHECK ---
            // If editing someone else, verify the editor has a higher rank
            if ($wp_user_id && $current_user->ID != $wp_user_id) {
                $target_user = get_userdata($wp_user_id);
                if ($target_user && fs_get_role_weight($current_user->roles) <= fs_get_role_weight($target_user->roles)) {
                    return new WP_Error('forbidden', 'You cannot edit a user of equal or higher rank.', ['status' => 403]);
                }
            }

            // --- 2. NEW: SELF-EDIT GUARDRAIL ---
            // If editing yourself, remove status and onboarding flags from the request
            // This prevents an Admin from accidentally deactivating themselves.
            if ($current_user->ID == $wp_user_id) {
                unset($params['status']);
                unset($params['onboarding_complete']);
            }

            $allowed_fields = [
                'first_name', 'last_name', 'dob', 'email', 'phone', 
                'street_address', 'city', 'state', 'postcode', 
                'region', 'country', 'discord_username', 
                'comm_prefs', 'sim_environment', 'racing_interests',
                'sim_platforms', 'sim_platforms_other', 'status',
                'onboarding_complete'
            ];
            
            $old_status = get_post_meta($id, '_status', true);
            $updated = false;

            foreach ($params as $key => $value) {
                if (in_array($key, $allowed_fields)) {
                    if ($key === 'email') {
                        $new_email = sanitize_email($value);
                        if (!empty($new_email)) {
                            update_post_meta($id, '_email', $new_email);
                            if ($wp_user_id) wp_update_user(['ID' => $wp_user_id, 'user_email' => $new_email]);
                        }
                    } elseif ($key === 'onboarding_complete') {
                        // Handle the boolean/string conversion for onboarding
                        $val = ($value === true || $value === 'yes') ? 'yes' : 'no';
                        update_post_meta($id, '_onboarding_complete', $val);
                    } else {
                        $sanitized_value = is_array($value) ? $value : sanitize_text_field($value);
                        update_post_meta($id, '_' . $key, $sanitized_value);
                        
                        // Handle status-specific logic (Member ID generation & activation)
                        if ($key === 'status') {
                            $new_status = $sanitized_value;
                            if ($new_status === 'active') {
                                // Preserving your existing Member ID generation logic
                                $member_id_code = fs_generate_member_id($id);
                                if ($wp_user_id) {
                                    wp_update_user(['ID' => $wp_user_id, 'display_name' => $member_id_code]);
                                    delete_user_meta($wp_user_id, 'fs_account_disabled');
                                }
                            }
                            if ($new_status === 'inactive' && $wp_user_id) {
                                update_user_meta($wp_user_id, 'fs_account_disabled', '1');
                            }
                        }
                    }
                    $updated = true;
                }
            }

            // Fire status change emails if status was modified
            if (isset($params['status']) && $params['status'] !== $old_status) {
                fs_handle_status_change_emails($id, $params['status'], $old_status);
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

        // --- UPDATED LOGIC START ---
        $user_id = email_exists($email);

        if ($user_id) {
            // User exists (likely created during Admin Approval). Update password.
            wp_set_password($password, $user_id);
        } else {
            // User truly doesn't exist yet. Create them.
            $user_id = wp_create_user($email, $password, $email);
            if (is_wp_error($user_id)) {
                return new WP_Error('creation_failed', $user_id->get_error_message(), ['status' => 500]);
            }
        }
        // --- UPDATED LOGIC END ---

        $first_name = get_post_meta($member_id, '_first_name', true);
        $last_name  = get_post_meta($member_id, '_last_name', true);
        $member_id_code = get_post_meta($member_id, '_fs_member_id', true); // FSS-1000...
        
        // Ensure the display name is the Member ID (or full name)
        $display_name = $member_id_code ? $member_id_code : (trim("$first_name $last_name") ?: $email);

        wp_update_user([
            'ID'           => $user_id,
            'first_name'   => $first_name,
            'last_name'    => $last_name,
            'display_name' => $display_name,
            'nickname'     => $first_name ? $first_name : $email,
        ]);

        $discord = get_post_meta($member_id, '_discord_username', true);
        if ($discord) {
            update_user_meta($user_id, 'discord_username', $discord);
        }

        // Set roles and metadata
        $user = new WP_User($user_id);
        $membership_type = get_post_meta($member_id, '_member_type', true);
        if ($membership_type === 'junior') {
            $user->set_role('fs_junior_member');
        } else {
            $user->set_role('fs_member');
        }
        
        update_user_meta($user_id, 'fs_member_id', $member_id);
        update_post_meta($member_id, '_wp_user_id', $user_id);
        
        // Ensure account is not disabled if it was flagged during pending status
        delete_user_meta($user_id, 'fs_account_disabled');

        // Log the user in
        wp_clear_auth_cookie();
        wp_set_current_user($user_id);
        wp_set_auth_cookie($user_id, true);

        return [
            'status' => 'success',
            'logged_in' => true,
            'onboarding_complete' => false, // Explicitly tell React to trigger onboarding
            'message' => 'Account setup complete! Welcome, ' . ($first_name ?: $email)
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
            $allowed_fields = [
                'first_name', 'last_name', 'dob', 'email', 'phone', 
                'street_address', 'city', 'state', 'postcode', 
                'region', 'country', 'discord_username', 
                'comm_prefs', 'sim_environment', 'racing_interests',
                'sim_platforms', 'sim_platforms_other'
            ];

            foreach ($params as $key => $value) {
                if (in_array($key, $allowed_fields)) {
                    if ($key === 'email') {
                        $new_email = sanitize_email($value);
                        if (!empty($new_email)) {
                            wp_update_user(['ID' => $user_id, 'user_email' => $new_email]);
                            update_post_meta($member_id, '_email', $new_email);
                        }
                    } else {
                        $sanitized_value = is_array($value) ? array_map('sanitize_text_field', $value) : sanitize_text_field($value);
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

    register_rest_route($namespace, '/members/self/onboarding', [
    'methods' => 'POST',
    'permission_callback' => function() { return is_user_logged_in(); },
    'callback' => function($request) {
        $user_id = get_current_user_id();
        $member_id = get_user_meta($user_id, 'fs_member_id', true);
        
        if (!$member_id) return new WP_Error('no_record', 'No record found.', ['status' => 404]);

        $params = $request->get_json_params();
        $onboarding_fields = [
            'discord_username', 'comm_prefs', 'sim_environment', 
            'racing_interests', 'sim_platforms', 'sim_platforms_other'
        ];

        foreach ($params as $key => $value) {
            if (in_array($key, $onboarding_fields)) {
                $sanitized = is_array($value) ? array_map('sanitize_text_field', $value) : sanitize_text_field($value);
                update_post_meta($member_id, '_' . $key, $sanitized);
            }
        }

        // CRITICAL: Mark onboarding as complete in the database
        update_post_meta($member_id, '_onboarding_complete', 'yes');

        return ['status' => 'success', 'message' => 'Onboarding complete!'];
    }
  ]);
});

add_shortcode('full_send_app', function() {
    wp_enqueue_script('fs-react-js', plugin_dir_url(__FILE__) . 'dist/assets/index.js', array(), time(), true);
    wp_enqueue_style('fs-react-css', plugin_dir_url(__FILE__) . 'dist/assets/index.css', array(), time());
    
    // 1. Your existing App Params
    wp_localize_script('fs-react-js', 'appParams', [
        'restUrl'   => esc_url_raw(rest_url('full-send/v1')),
        'nonce'     => wp_create_nonce('wp_rest'),
        'logoutUrl' => wp_logout_url(home_url('/portal/'))
    ]);

    // 2. THE FIX: Satisfy the Ecwid plugin's specific object requirement
    // We create the window.ec.config object structure it expects.
    $ecwid_mock = "
        window.ec = window.ec || {};
        window.ec.config = window.ec.config || {};
        window.ec.config.storefrontUrls = window.ec.config.storefrontUrls || {
            'cleanUrls': true,
            'historyApi': true
        };
    ";
    wp_add_inline_script('fs-react-js', $ecwid_mock, 'before');

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
    $roles = [
        'executive_committee' => [
            'display' => 'Executive Committee',
            'caps' => ['read' => true, 'view_portal_admin' => true, 'edit_posts' => true]
        ],
        'committee' => [
            'display' => 'Committee',
            'caps' => ['read' => true, 'view_portal_admin' => true, 'edit_posts' => true]
        ],
        'fs_member' => [
            'display' => 'FS Member', 'caps' => ['read' => true]
        ],
        'fs_junior_member' => [
            'display' => 'FS Junior Member', 'caps' => ['read' => true]
        ]
    ];

    foreach ($roles as $role_slug => $data) {
        if (!get_role($role_slug)) {
            add_role($role_slug, $data['display'], $data['caps']);
        }
    }
}

function fs_check_admin_permissions() {
    $user = wp_get_current_user();
    $admin_roles = ['administrator', 'executive_committee', 'committee'];
    foreach ($admin_roles as $role) {
        if (in_array($role, (array)$user->roles)) return true;
    }
    return false;
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

/**
 * REUSABLE EMAIL HELPER
 * Based on your existing fs_admin_send_email logic
 */
function fs_send_automated_email($to_email, $subject, $body_content) {
    $from_name    = 'Full Send SimSport';
    $system_email = get_option('admin_email');
    $info_email   = 'info@fullsendsimsport.com.au';

    // Wrap in the same styling as your ad-hoc emails
    $html_message = '<div style="font-family: sans-serif; line-height: 1.6; color: #333;">';
    $html_message .= $body_content;
    $html_message .= '<br><br><p style="font-size: 12px; color: #777;">This is an automated message from the Full Send SimSport Member Portal.</p>';
    $html_message .= '</div>';
    
    $headers = array(
        'Content-Type: text/html; charset=UTF-8',
        'From: ' . $from_name . ' <' . $system_email . '>',
        'Reply-To: ' . $info_email
    );

    return wp_mail($to_email, $subject, $html_message, $headers);
}

/**
 * TRIGGER 1: ON REGISTRATION (WELCOME/PENDING)
 */
function fs_email_on_initial_application($post_id, $params) {
    $first_name = sanitize_text_field($params['first_name']);
    $email = sanitize_email($params['email']);
    
    // Generate the FSS-ID immediately so we can include it in the email
    $member_id_display = fs_generate_member_id($post_id);

    $subject = "Welcome to Full Send SimSport - Application Received";
    
    $body = "<h2>Hi " . esc_html($first_name) . ",</h2>";
    $body .= "<p>Thanks for applying to Full Send SimSport! We have received your details and your application is now being processed.</p>";
    $body .= "<p>Your account is currently <strong>Pending Review</strong>. Our team is currently reviewing your application to ensure it aligns with our values and mission. We appreciate your patience while we take a look.You will receive another email after account activation.</p>";

    fs_send_automated_email($email, $subject, $body);
}

function fs_generate_member_id($fs_member_post_id) {
    // 1. Check if they already have an ID to prevent overwriting
    $existing_id = get_post_meta($fs_member_post_id, '_fs_member_id', true);
    if (!empty($existing_id)) {
        return $existing_id;
    }

    // 2. Find the highest existing Member ID in the database
    global $wpdb;
    $highest_id_query = "
        SELECT meta_value 
        FROM {$wpdb->postmeta} 
        WHERE meta_key = '_fs_member_id' 
        AND meta_value LIKE 'FSS-%'
        ORDER BY CAST(SUBSTRING(meta_value, 5) AS UNSIGNED) DESC 
        LIMIT 1
    ";
    
    $highest_id_result = $wpdb->get_var($highest_id_query);
    
    // 3. Increment the ID
    if ($highest_id_result) {
        $number_part = (int) str_replace('FSS-', '', $highest_id_result);
        $new_number = $number_part + 1;
    } else {
        $new_number = 1000001; // The starting point you requested
    }

    $new_member_id = 'FSS-' . $new_number;
    
    // 4. Save it
    update_post_meta($fs_member_post_id, '_fs_member_id', $new_member_id);
    
    return $new_member_id;
}

/**
 * TRIGGER 2 & 3: ON STATUS CHANGE (ACTIVE / INACTIVE)
 * This logic should be called inside your existing member update function
 * where the status meta is updated.
 */
/**
 * TRIGGER: When status changes to 'active', perform the heavy lifting.
 */
function fs_handle_status_change_emails($post_id, $new_status, $old_status) {
    if ($new_status === $old_status) return;

    $email = get_post_meta($post_id, '_email', true);
    $first_name = get_post_meta($post_id, '_first_name', true);

    if ($new_status === 'active') {
        // 1. Generate Member ID (FSS-100000X)
        $member_id_code = fs_generate_member_id($post_id);

        // 2. Check if WP User exists, if not, create one using Member ID as Username
        $user_id = email_exists($email);
        if (!$user_id) {
            // We create a random temporary password; they will reset it via the magic link
            $tmp_pass = wp_generate_password(24, true);
            $user_id = wp_create_user($member_id_code, $tmp_pass, $email);
            
            // Set basic user data
            wp_update_user([
                'ID' => $user_id,
                'first_name' => $first_name,
                'last_name'  => get_post_meta($post_id, '_last_name', true),
                'display_name' => $member_id_code // Sign-in via ID
            ]);
            
            update_user_meta($user_id, 'fs_member_id', $post_id);
            update_post_meta($post_id, '_wp_user_id', $user_id);
        }

        // 3. Send the "Magic Link" for Password Setup
        $setup_link = home_url("/portal/#/setup-account/{$post_id}/" . urlencode($email));
        
        $subject = "Account Approved - Welcome to Full Send SimSport";
        $body = "<h2>Congratulations {$first_name}!</h2>";
        $body .= "<p>Your membership has been approved. We’re thrilled to have you onboard!</p>";
        $body .= "<p>Your official Member ID is: <strong>{$member_id_code}</strong></p>";
        $body .= "<p>Please click the button below to set your password and complete your racing profile:</p>";
        $body .= "<div style='margin: 30px 0;'><a href='{$setup_link}' style='background: #e11d48; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;'>Set Up My Account</a></div>";
        $body .= "<p>Once set up, you can log in using either your email or your Member ID.</p>";

        fs_send_automated_email($email, $subject, $body);
    }
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

/**
 * DEV ONLY: Run this once to reset Member ID sequencing
 * You can trigger this by visiting yourdomain.com/?reset_fss_ids=true
 */
add_action('init', function() {
    if (isset($_GET['reset_fss_ids']) && current_user_can('administrator')) {
        global $wpdb;
        // Remove all member ID meta entries
        $wpdb->query("DELETE FROM {$wpdb->postmeta} WHERE meta_key = '_fs_member_id'");
        echo "Member IDs have been reset. Next ID will be FSS-1000001.";
        exit;
    }
});