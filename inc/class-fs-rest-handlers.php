<?php
if (!defined('ABSPATH')) exit;

class FS_REST_Handlers {

    /**
     * GET /me
     */
    public static function get_me() {
        if (!is_user_logged_in()) {
            return rest_ensure_response(['authenticated' => false, 'user' => null]);
        }

        $user = wp_get_current_user();
        $official_member_id = $user->user_login;
        $post_record_id = get_user_meta($user->ID, 'fs_member_id', true);

        if (!$post_record_id) {
            $member_query = new WP_Query([
                'post_type' => 'fs_member',
                'meta_key' => '_email',
                'meta_value' => $user->user_email,
                'posts_per_page' => 1,
                'post_status' => 'any'
            ]);
            if ($member_query->have_posts()) {
                $post_record_id = $member_query->posts[0]->ID;
                update_user_meta($user->ID, 'fs_member_id', $post_record_id);
                update_post_meta($post_record_id, '_wp_user_id', $user->ID);
            }
        }

        $member_details = null;
        $onboarding_complete = false;

        if ($post_record_id) {
            $is_complete = get_post_meta($post_record_id, '_onboarding_complete', true);
            $onboarding_complete = ($is_complete === 'yes');

            $parent_id = get_post_meta($post_record_id, '_parent_id', true);
            $parent_name = get_post_meta($post_record_id, '_parent_name', true);
            $parent_email = get_post_meta($post_record_id, '_parent_email', true);
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
                'meta_query' => [['key' => '_parent_id', 'value' => $post_record_id, 'compare' => '=']],
                'post_status' => 'any'
            ]);
            foreach ($child_query->posts as $cp) {
                $children[] = [
                    'id' => $cp->ID,
                    'name' => get_post_meta($cp->ID, '_first_name', true) . ' ' . get_post_meta($cp->ID, '_last_name', true),
                    'status' => get_post_meta($cp->ID, '_status', true) ?: 'pending'
                ];
            }

            $raw_status = get_post_meta($post_record_id, '_status', true);
            $display_status = (!empty($raw_status)) ? $raw_status : 'pending';

            $member_details = [
                'member_id'           => $official_member_id,
                'internal_post_id'    => $post_record_id,
                'onboarding_complete' => $onboarding_complete,
                'first_name'          => get_user_meta($user->ID, 'first_name', true) ?: get_post_meta($post_record_id, '_first_name', true),
                'last_name'           => get_user_meta($user->ID, 'last_name', true) ?: get_post_meta($post_record_id, '_last_name', true),
                'email'               => $user->user_email,
                'phone'               => get_post_meta($post_record_id, '_phone', true),
                'street_address'      => get_post_meta($post_record_id, '_street_address', true),
                'city'                => get_post_meta($post_record_id, '_city', true),
                'state'               => get_post_meta($post_record_id, '_state', true),
                'postcode'            => get_post_meta($post_record_id, '_postcode', true),
                'region'              => get_post_meta($post_record_id, '_region', true),
                'country'             => get_post_meta($post_record_id, '_country', true),
                'reason_for_joining'  => get_post_meta($post_record_id, '_reason_for_joining', true),
                'dob'                 => get_post_meta($post_record_id, '_dob', true) ?: get_post_meta($post_record_id, '_date_of_birth', true),
                'discord_username'    => get_post_meta($post_record_id, '_discord_username', true),
                'comm_prefs'          => maybe_unserialize(get_post_meta($post_record_id, '_comm_prefs', true)) ?: ['Email'],
                'sim_environment'     => get_post_meta($post_record_id, '_sim_environment', true),
                'sim_platforms'       => maybe_unserialize(get_post_meta($post_record_id, '_sim_platforms', true)) ?: [],
                'sim_platforms_other' => get_post_meta($post_record_id, '_sim_platforms_other', true),
                'racing_interests'    => maybe_unserialize(get_post_meta($post_record_id, '_racing_interests', true)) ?: [],
                'member_type'         => get_post_meta($post_record_id, '_member_type', true),
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
            'member_id'           => $official_member_id,
            'roles'               => $user->roles,
            'isAdmin'             => fs_check_admin_permissions(),
            'onboarding_complete' => $onboarding_complete,
            'member_details'      => $member_details
        ]);
    }

	/**
     * POST /join
     */
    public static function handle_join($request) {
        $params = $request->get_json_params();
        $email = sanitize_email($params['email']);
        $first_name = sanitize_text_field($params['first_name']);
        $last_name = sanitize_text_field($params['last_name']);
        $dob = sanitize_text_field($params['dob']);
        $member_type = strtolower(sanitize_text_field($params['member_type'] ?? 'individual'));

        if (email_exists($email)) {
            return new WP_Error('registration_conflict', 'An account with this email already exists.', ['status' => 409]);
        }

        $email_check = new WP_Query([
            'post_type' => 'fs_member',
            'meta_key' => '_email',
            'meta_value' => $email,
            'post_status' => 'any',
            'posts_per_page' => 1
        ]);
        if ($email_check->have_posts()) {
            return new WP_Error('registration_conflict', 'A membership application is already on file.', ['status' => 409]);
        }

        $post_id = wp_insert_post([
            'post_title'   => $first_name . ' ' . $last_name,
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
                $sanitized_array = array_map('sanitize_text_field', $value);
                update_post_meta($post_id, $meta_key, $sanitized_array);
            } else {
                update_post_meta($post_id, $meta_key, sanitize_text_field($value));
            }
        }

        if ($member_type === 'junior') {
            $consent_token = wp_generate_password(32, false);
            update_post_meta($post_id, '_parental_consent_token', $consent_token);
            update_post_meta($post_id, '_status', 'awaiting_consent');
        } else {
            update_post_meta($post_id, '_status', 'pending');
        }

        $auto_consented_children = false;
        if ($member_type !== 'junior') {
            $orphaned_juniors = new WP_Query([
                'post_type' => 'fs_member',
                'meta_query' => [
                    'relation' => 'AND',
                    ['key' => '_member_type', 'value' => 'junior'],
                    ['key' => '_parent_email', 'value' => $email],
                    ['key' => '_status', 'value' => 'awaiting_consent']
                ],
                'posts_per_page' => -1
            ]);
            if ($orphaned_juniors->have_posts()) {
                $auto_consented_children = true;
                foreach ($orphaned_juniors->posts as $junior_post) {
                    update_post_meta($junior_post->ID, '_parental_consent_given', 'yes');
                    update_post_meta($junior_post->ID, '_parental_consent_date', current_time('mysql'));
                    update_post_meta($junior_post->ID, '_parental_consent_method', 'auto_on_parent_registration');

                    // Logic: We DO NOT move to 'pending' yet.
                    // We leave them in 'awaiting_consent'.
                    // They will be "released" to pending only when this parent is approved.
                }
            }
        }

        fs_email_on_initial_application($post_id, $params, $auto_consented_children);
        return ['status' => 'success', 'message' => 'Application Submitted!', 'id' => $post_id, 'email' => $email];
    }

/**
     * GET /members
     */
    public static function get_all_members() {
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
                'created_date' => $post->post_date,
                'region'       => get_post_meta($post->ID, '_region', true),
                'country'      => get_post_meta($post->ID, '_country', true),
                'state'        => get_post_meta($post->ID, '_state', true),
            ];
        }

        return $members;
    }

	/**
     * POST /parental-consent
     * Handles the decision made by a parent in the React ConsentView
     */
    public static function handle_parental_consent($request) {
        $params = ($request->get_method() === 'POST') ? $request->get_json_params() : $request->get_params();

        $post_id = intval($params['id'] ?? 0);
        $token   = sanitize_text_field($params['token'] ?? '');
        $action  = sanitize_text_field($params['action'] ?? 'approve');

        if (!$post_id) {
            return new WP_Error('missing_id', 'Invalid application ID.', ['status' => 400]);
        }

        $stored_token = get_post_meta($post_id, '_parental_consent_token', true);
        if (!$token || $token !== $stored_token) {
            return new WP_Error('invalid_token', 'Invalid or expired consent link.', ['status' => 403]);
        }

        $junior_email = get_post_meta($post_id, '_email', true);
        $junior_name  = get_post_meta($post_id, '_first_name', true);
        $parent_email = get_post_meta($post_id, '_parent_email', true);

        if ($action === 'decline') {
            // Set a flag to prevent the 'Committee Denied' email from firing
            update_post_meta($post_id, '_denied_by_parent', 'yes');

            update_post_meta($post_id, '_parental_consent_given', 'no');
            update_post_meta($post_id, '_status', 'denied');

            $subject = "Update regarding your Full Send SimSport Application";
            $body = "<h2>Hi " . esc_html($junior_name) . ",</h2><p>Your application was not able to proceed as parental consent was declined.</p>";
            fs_send_automated_email($junior_email, $subject, $body);

            return rest_ensure_response([
                'success' => true,
                'message' => 'Consent declined. The application has been cancelled.'
            ]);
        }

        // 3. Handle 'Approve' Choice
        update_post_meta($post_id, '_parental_consent_given', 'yes');
        update_post_meta($post_id, '_parental_consent_date', current_time('mysql'));

        // GATEKEEPER: Check if the parent is already an ACTIVE member
        $parent_query = new WP_Query([
            'post_type'  => 'fs_member',
            'meta_key'   => '_email',
            'meta_value' => $parent_email,
            'posts_per_page' => 1,
            'post_status' => 'publish'
        ]);

        $parent_is_active = false;
        if ($parent_query->have_posts()) {
            $parent_status = get_post_meta($parent_query->posts[0]->ID, '_status', true);
            if ($parent_status === 'active') {
                $parent_is_active = true;
            }
        }

        if ($parent_is_active) {
            // Parent is already active, so we can send the Junior to the committee immediately
            update_post_meta($post_id, '_status', 'pending');
            $message = 'Thank you! Consent for ' . esc_html($junior_name) . ' has been recorded. The committee will now review the application.';
        } else {
            // Parent is NOT active (likely pending review), so Junior stays in holding pen
            // but is now marked as "consented" so they release once the parent is approved.
            $message = 'Thank you! Consent for ' . esc_html($junior_name) . ' has been recorded. The application will be forwarded to the committee once the Parent/Guardian account is approved.';
        }

        return rest_ensure_response([
            'success' => true,
            'message' => $message
        ]);
    }

	/**
	 * Helper to return HTML for browser clicks, or JSON for API calls
	 */
	private static function render_consent_response($title, $message) {
		if (strpos($_SERVER['HTTP_ACCEPT'], 'text/html') !== false || $_SERVER['REQUEST_METHOD'] === 'GET') {
			header('Content-Type: text/html');
			echo "<html><body style='font-family:sans-serif; text-align:center; padding:50px; background:#f9f9f9;'>";
			echo "<div style='max-width:500px; margin:0 auto; background:white; padding:30px; border-radius:10px; shadow:0 2px 10px rgba(0,0,0,0.1);'>";
			echo "<h1 style='color:#3a0a59;'>$title</h1>";
			echo "<p style='font-size:1.1em; color:#444;'>$message</p>";
			echo "</div></body></html>";
			exit;
		}
		return rest_ensure_response(['success' => true, 'message' => $message]);
	}

    /**
     * GET /members/self
     */
    public static function get_self_member() {
        $user_id = get_current_user_id();
        $member_id = get_user_meta($user_id, 'fs_member_id', true);

        if (!$member_id) {
            return new WP_Error('no_record', 'No member record found.', ['status' => 404]);
        }

        $is_complete = get_post_meta($member_id, '_onboarding_complete', true);

        return [
            'id'                  => $member_id,
            'onboarding_complete' => ($is_complete === 'yes'),
            'first_name'          => get_post_meta($member_id, '_first_name', true),
            'last_name'           => get_post_meta($member_id, '_last_name', true),
            'email'               => get_post_meta($member_id, '_email', true),
            'status'              => get_post_meta($member_id, '_status', true) ?: 'pending',
            'member_type'         => get_post_meta($member_id, '_member_type', true),
            'discord_username'    => get_post_meta($member_id, '_discord_username', true),
        ];
    }

/**
     * GET /members/(?P<id>\d+)
     */
    public static function get_single_member($data) {
        $post = get_post($data['id']);
        if (!$post || $post->post_type !== 'fs_member') {
            return new WP_Error('not_found', 'Member not found', ['status' => 404]);
        }

        $current_user = wp_get_current_user();
        $target_wp_user_id = get_post_meta($post->ID, '_wp_user_id', true);

        // Find the "Member Reference" (user_login)
        $official_member_id = '';
        if ($target_wp_user_id) {
            $target_user_obj = get_userdata($target_wp_user_id);
            if ($target_user_obj) {
                $official_member_id = $target_user_obj->user_login;
            }
        }

        // Fallback: If no user is linked, use the post title as the reference
        if (empty($official_member_id)) {
            $official_member_id = $post->post_title;
        }

        // Permissions Check
        if ($target_wp_user_id && $current_user->ID != $target_wp_user_id) {
            $target_user = get_userdata($target_wp_user_id);
            if ($target_user && fs_get_role_weight($current_user->roles) < fs_get_role_weight($target_user->roles)) {
                return new WP_Error('forbidden', 'Permission denied.', ['status' => 403]);
            }
        }

        // Return the full data set
        return [
            'id'                  => $post->ID,
            'member_id'           => $official_member_id, // Now matches get_me logic
            'first_name'          => get_post_meta($post->ID, '_first_name', true),
            'last_name'           => get_post_meta($post->ID, '_last_name', true),
            'email'               => get_post_meta($post->ID, '_email', true),
            'dob'                 => get_post_meta($post->ID, '_dob', true) ?: get_post_meta($post->ID, '_date_of_birth', true),
            'status'              => get_post_meta($post->ID, '_status', true) ?: 'pending',
            'phone'               => get_post_meta($post->ID, '_phone', true),
            'street_address'      => get_post_meta($post->ID, '_street_address', true),
            'city'                => get_post_meta($post->ID, '_city', true),
            'state'               => get_post_meta($post->ID, '_state', true),
            'postcode'            => get_post_meta($post->ID, '_postcode', true),
            'region'              => get_post_meta($post->ID, '_region', true),
            'country'             => get_post_meta($post->ID, '_country', true),
            'discord_username'    => get_post_meta($post->ID, '_discord_username', true),
            'comm_prefs'          => maybe_unserialize(get_post_meta($post->ID, '_comm_prefs', true)) ?: ['Email'],
            'sim_environment'     => get_post_meta($post->ID, '_sim_environment', true),
            'racing_interests'    => maybe_unserialize(get_post_meta($post->ID, '_racing_interests', true)) ?: [],
            'sim_platforms'       => maybe_unserialize(get_post_meta($post->ID, '_sim_platforms', true)) ?: [],
            'sim_platforms_other' => get_post_meta($post->ID, '_sim_platforms_other', true),
            'member_type'         => get_post_meta($post->ID, '_member_type', true),
            'parent_name'         => get_post_meta($post->ID, '_parent_name', true),
            'parent_email'        => get_post_meta($post->ID, '_parent_email', true),
            'reason_for_joining'  => get_post_meta($post->ID, '_reason_for_joining', true),
            'onboarding_complete' => get_post_meta($post->ID, '_onboarding_complete', true) === 'yes',
            'roles'               => $target_wp_user_id ? get_userdata($target_wp_user_id)->roles : ['fs_member']
        ];
    }

	 /**
     * POST /members/(?P<id>\d+)
     * Triggered when Admin changes status to "Active"
     */
    public static function update_single_member($request) {
        $id = intval($request['id']);
        $params = $request->get_json_params();

        $old_status = get_post_meta($id, '_status', true);

        // 1. Update the status (This triggers the catch_member_status_change hook)
        if (isset($params['status'])) {
            $new_status = sanitize_text_field($params['status']);
            update_post_meta($id, '_status', $new_status);

            // Explicitly call the email/user-creation handler to ensure zero delay
            fs_handle_status_change_emails($id, $new_status, $old_status);
        }

        // 2. Update other meta fields
        foreach ($params as $key => $value) {
            if ($key === 'status' || $key === 'id') continue;
            update_post_meta($id, '_' . sanitize_key($key), sanitize_text_field($value));
        }

        return rest_ensure_response(['status' => 'success']);
    }

	/**
     * POST /setup-account
     * Triggered when the User finishes their onboarding
     */
    public static function setup_account($request) {
        $params = $request->get_json_params();
        if (empty($params)) {
            $params = json_decode($request->get_body(), true);
        }

        $member_id = $params['member_id'] ?? $params['id'] ?? $params['memberId'] ?? null;
        $email     = $params['email'] ?? null;
        $password  = $params['password'] ?? null;

        if (!$member_id || !$password || !$email) {
            return new WP_Error('missing_data', 'Missing details.', ['status' => 400]);
        }

        $stored_email = get_post_meta($member_id, '_email', true);
        if (strtolower(trim($stored_email)) !== strtolower(trim($email))) {
            return new WP_Error('verification_failed', 'Email mismatch.', ['status' => 403]);
        }

        // Check if user shell exists (created by Admin activation)
        $user_id = email_exists($email);

        if ($user_id) {
            wp_set_password($password, $user_id);
        } else {
            // If for some reason the shell wasn't created, we use the Member ID as the username
            $member_id_code = fs_generate_member_id($member_id);
            $user_id = wp_create_user($member_id_code, $password, $email);
            if (is_wp_error($user_id)) return $user_id;
        }

        // Sync details to WP User
        $first_name = get_post_meta($member_id, '_first_name', true);
        $last_name  = get_post_meta($member_id, '_last_name', true);

        // Construct the Name-based display name
        $full_name = trim($first_name . ' ' . $last_name);
        if (empty($full_name)) {
            $full_name = $email; // Absolute fallback
        }

        wp_update_user([
            'ID'           => $user_id,
            'first_name'   => $first_name,
            'last_name'    => $last_name,
            'display_name' => $full_name, // UPDATED: Sets display name to "First Last"
            'nickname'     => $first_name ?: $email,
        ]);

        // Assign Role
        $user = new WP_User($user_id);
        $member_type = get_post_meta($member_id, '_member_type', true);
        $user->set_role($member_type === 'junior' ? 'fs_junior_member' : 'fs_member');

        // Link and Login
        update_user_meta($user_id, 'fs_member_id', $member_id);
        update_post_meta($member_id, '_wp_user_id', $user_id);
        delete_user_meta($user_id, 'fs_account_disabled');

        wp_clear_auth_cookie();
        wp_set_current_user($user_id);
        wp_set_auth_cookie($user_id, true);

        return rest_ensure_response([
            'status' => 'success',
            'logged_in' => true,
            'onboarding_complete' => false
        ]);
    }

	/**
     * POST /members/self/onboarding
     */
    public static function complete_onboarding($request) {
        $user_id = get_current_user_id();
        $member_id = get_user_meta($user_id, 'fs_member_id', true);

        if (!$member_id) return new WP_Error('no_record', 'No record.', ['status' => 404]);

        $params = $request->get_json_params();
        $onboarding_fields = [
            'discord_username', 'comm_prefs', 'sim_environment',
            'racing_interests', 'sim_platforms', 'sim_platforms_other'
        ];

        // Capture and save the data payload
        if (!empty($params)) {
            foreach ($params as $key => $value) {
                if (in_array($key, $onboarding_fields)) {
                    $sanitized = is_array($value) ? array_map('sanitize_text_field', $value) : sanitize_text_field($value);
                    update_post_meta($member_id, '_' . $key, $sanitized);
                }
            }
        }

        // Mark onboarding as complete
        update_post_meta($member_id, '_onboarding_complete', 'yes');

        return ['status' => 'success', 'message' => 'Onboarding complete!'];
    }

	/**
     * POST /update-me
     */
    public static function update_me($request) {
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

        if (!empty($params)) {
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
        }

        return ['status' => 'success', 'message' => 'Profile updated successfully!'];
    }

    // ==========================================
    // DELEGATED ADMIN & AGM METHODS (NEW)
    // ==========================================

    /**
     * GET /admin/users
     */
    public static function fs_admin_get_users() {
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

    /**
     * POST /admin/users/role
     */
    public static function fs_admin_update_role($request) {
        $params = $request->get_json_params();
        $target_user_id = intval($params['user_id']);
        $new_role = sanitize_text_field($params['new_role']);

        $current_user = wp_get_current_user();
        $target_user = get_userdata($target_user_id);

        if (!$target_user) {
            return new WP_Error('not_found', 'User not found', ['status' => 404]);
        }

        $my_weight = fs_get_role_weight($current_user->roles);
        $target_current_weight = fs_get_role_weight($target_user->roles);
        $new_role_weight = fs_get_role_weight([$new_role]);

        if (!in_array('administrator', (array)$current_user->roles)) {
            if ($target_current_weight >= $my_weight) {
                return new WP_Error('denied', 'Permission Denied: You cannot modify a user of equal or higher rank.', ['status' => 403]);
            }
            if ($new_role_weight >= $my_weight) {
                return new WP_Error('denied', 'Permission Denied: You cannot promote a user to your own rank or higher.', ['status' => 403]);
            }
        }

        $allowed_roles = ['fs_member', 'fs_junior_member', 'committee', 'executive_committee'];
        if (!in_array($new_role, $allowed_roles)) {
            return new WP_Error('invalid_role', 'Invalid role selection.', ['status' => 400]);
        }

        $target_user->set_role($new_role);

        return [
            'success' => true,
            'message' => 'Role updated to ' . $new_role,
            'new_role' => $new_role
        ];
    }

    /**
     * POST /admin/send-email
     */
    public static function fs_admin_send_email($request) {
        $to_emails_raw = $request->get_param('to_emails');
        $subject       = sanitize_text_field($request->get_param('subject'));
        $body          = wp_kses_post($request->get_param('body'));

        $custom_sig    = $request->get_param('signature');
        $signature_html = !empty($custom_sig) ? wp_kses_post($custom_sig) : FS_MASTER_SIGNATURE;

        $from_name    = 'Full Send SimSport Inc.';
        $system_email = get_option('admin_email');
        $info_email   = 'info@fullsendsimsport.com.au';

        $flat_emails = [];
        if (is_array($to_emails_raw)) {
            array_walk_recursive($to_emails_raw, function($v) use (&$flat_emails) {
                if(is_string($v)) $flat_emails[] = $v;
                if(is_array($v) && isset($v['email'])) $flat_emails[] = $v['email'];
            });
        }

        $valid_emails = [];
        foreach ($flat_emails as $e) {
            $clean = sanitize_email(trim($e));
            if (!empty($clean) && is_email($clean)) $valid_emails[] = $clean;
        }
        $to_emails = array_values(array_unique($valid_emails));

        if (empty($to_emails) || empty($subject) || empty($body)) {
            return new WP_Error('fail', 'Missing data', ['status' => 400]);
        }

        $formatted_body = nl2br($body);

        $html_message = '
        <div style="font-family: sans-serif; color: #000000; line-height: 1.5; font-size: 14px;">
            <div class="message-content">
                ' . $formatted_body . '
            </div>
            <br><br>
            <div class="signature-section">
                ' . $signature_html . '
            </div>
        </div>';

        $headers = array(
            'Content-Type: text/html; charset=UTF-8',
            'From: ' . $from_name . ' <' . $system_email . '>',
            'Reply-To: ' . $info_email
        );

        $to = $info_email;
        if (count($to_emails) === 1) {
            $to = $to_emails[0];
        } else {
            foreach ($to_emails as $email) {
                $headers[] = 'Bcc: ' . $email;
            }
        }

        $sent = wp_mail($to, $subject, $html_message, $headers);

        return rest_ensure_response(array('success' => $sent));
    }

    /**
     * POST /admin/users/delete
     */
    public static function fs_admin_delete_user($request) {
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

    /**
     * GET /agm
     */
    public static function fs_get_agms($request) {
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

    /**
     * POST /agm
     */
    public static function fs_create_agm($request) {
        $params = $request->get_json_params();
        $post_id = wp_insert_post(['post_title' => sanitize_text_field($params['title']), 'post_type' => 'agm_meeting', 'post_status' => 'publish']);
        if (is_wp_error($post_id)) return $post_id;
        update_post_meta($post_id, '_meeting_date', sanitize_text_field($params['meeting_date']));
        update_post_meta($post_id, '_location', sanitize_text_field($params['location'] ?? ''));
        update_post_meta($post_id, '_status', 'upcoming');
        return rest_ensure_response(['success' => true, 'id' => $post_id]);
    }

    /**
     * POST /agm/(?P<id>\d+)
     */
    public static function fs_update_agm($request) {
        $id = $request['id'];
        $params = $request->get_json_params();
        if (isset($params['title'])) wp_update_post(['ID' => $id, 'post_title' => sanitize_text_field($params['title'])]);
        $fields = ['meeting_date', 'location', 'status', 'quorum_minimum', 'notes', 'attendee_ids'];
        foreach ($fields as $field) if (isset($params[$field])) update_post_meta($id, '_' . $field, $params[$field]);
        return rest_ensure_response(['success' => true]);
    }
}