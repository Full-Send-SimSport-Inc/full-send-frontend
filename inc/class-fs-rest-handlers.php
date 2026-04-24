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

        update_post_meta($post_id, '_status', 'pending');

        $auto_consented_children = false;
        if ($member_type !== 'junior') {
            $orphaned_juniors = new WP_Query([
                'post_type' => 'fs_member',
                'meta_query' => [
                    'relation' => 'AND',
                    ['key' => '_member_type', 'value' => 'junior'],
                    ['key' => '_parent_email', 'value' => $email],
                    ['key' => '_status', 'value' => 'pending']
                ],
                'posts_per_page' => -1
            ]);
            if ($orphaned_juniors->have_posts()) {
                $auto_consented_children = true;
                foreach ($orphaned_juniors->posts as $junior_post) {
                    update_post_meta($junior_post->ID, '_parental_consent_given', 'yes');
                    update_post_meta($junior_post->ID, '_parental_consent_date', current_time('mysql'));
                    update_post_meta($junior_post->ID, '_parental_consent_method', 'auto_on_parent_registration');
                    update_post_meta($junior_post->ID, '_status', 'awaiting_committee');
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
            ];
        }
        return $members;
    }

    /**
     * POST /parental-consent
     */
    public static function handle_parental_consent($request) {
        $params = $request->get_json_params();
        $post_id = intval($params['id']);
        $token   = sanitize_text_field($params['token']);
        $action  = sanitize_text_field($params['action'] ?? 'approve');

        $stored_token = get_post_meta($post_id, '_parental_consent_token', true);
        if (!$token || $token !== $stored_token) {
            return new WP_Error('invalid_token', 'Invalid consent link.', ['status' => 403]);
        }

        $junior_email = get_post_meta($post_id, '_email', true);
        $junior_name  = get_post_meta($post_id, '_first_name', true);

        if ($action === 'decline') {
            update_post_meta($post_id, '_parental_consent_given', 'no');
            update_post_meta($post_id, '_status', 'denied');
            wp_update_post(['ID' => $post_id, 'post_status' => 'denied']);

            $subject = "Update regarding your Full Send SimSport Application";
            $body = "<h2>Hi " . esc_html($junior_name) . ",</h2><p>Consent declined.</p>";
            fs_send_automated_email($junior_email, $subject, $body);

            return rest_ensure_response(['success' => true, 'message' => 'Consent declined.']);
        }

        update_post_meta($post_id, '_parental_consent_given', 'yes');
        update_post_meta($post_id, '_parental_consent_date', current_time('mysql'));
        update_post_meta($post_id, '_status', 'awaiting_committee');

        return rest_ensure_response(['success' => true, 'message' => 'Consent recorded.']);
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
        if (!$post) return new WP_Error('not_found', 'Member not found', ['status' => 404]);

        $current_user = wp_get_current_user();
        $target_wp_user_id = get_post_meta($post->ID, '_wp_user_id', true);

        if ($target_wp_user_id && $current_user->ID != $target_wp_user_id) {
            $target_user = get_userdata($target_wp_user_id);
            if ($target_user && fs_get_role_weight($current_user->roles) < fs_get_role_weight($target_user->roles)) {
                return new WP_Error('forbidden', 'Permission denied.', ['status' => 403]);
            }
        }

        // Logic for returning full member array (similar to /me logic) goes here...
        return ['id' => $post->ID];
    }

    /**
     * POST /members/(?P<id>\d+)
     */
    public static function update_single_member($request) {
        $id = $request['id'];
        $params = $request->get_json_params();
        $current_user = wp_get_current_user();
        $wp_user_id = get_post_meta($id, '_wp_user_id', true);

        if ($wp_user_id && $current_user->ID != $wp_user_id) {
            $target_user = get_userdata($wp_user_id);
            if ($target_user && fs_get_role_weight($current_user->roles) <= fs_get_role_weight($target_user->roles)) {
                return new WP_Error('forbidden', 'Cannot edit higher rank.', ['status' => 403]);
            }
        }

        if ($current_user->ID == $wp_user_id) {
            unset($params['status']);
            unset($params['onboarding_complete']);
        }

        // Processing loop
        return ['status' => 'success'];
    }

    /**
     * POST /setup-account
     */
    public static function setup_account($request) {
        $params = $request->get_json_params();
        $member_id = $params['member_id'] ?? $params['id'] ?? null;
        $email = $params['email'] ?? null;
        $password = $params['password'] ?? null;

        if (!$member_id || !$password || !$email) {
            return new WP_Error('missing_data', 'Missing details.', ['status' => 400]);
        }

        $user_id = email_exists($email);
        if ($user_id) {
            wp_set_password($password, $user_id);
        } else {
            $user_id = wp_create_user($email, $password, $email);
        }

        // Roles and login
        return ['status' => 'success', 'logged_in' => true];
    }

    /**
     * POST /members/self/onboarding
     */
    public static function complete_onboarding($request) {
        $user_id = get_current_user_id();
        $member_id = get_user_meta($user_id, 'fs_member_id', true);

        if (!$member_id) return new WP_Error('no_record', 'No record.', ['status' => 404]);

        update_post_meta($member_id, '_onboarding_complete', 'yes');
        return ['status' => 'success', 'message' => 'Onboarding complete!'];
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