<?php
if (!defined('ABSPATH')) exit;

function fs_check_admin_permissions() {
    return current_user_can('view_portal_admin') || current_user_can('manage_options');
}

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

function fs_send_automated_email($to_email, $subject, $body_content) {
    $from_name    = 'Full Send SimSport';
    $system_email = get_option('admin_email');
    $info_email   = 'info@fullsendsimsport.com.au';

    $html_message = '<div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px;">';
    $html_message .= $body_content;

    if (defined('FS_MASTER_SIGNATURE')) {
        $html_message .= '<div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eeeeee;">';
        $html_message .= FS_MASTER_SIGNATURE;
        $html_message .= '</div>';
    }

    $html_message .= '<br><br><p style="font-size: 12px; color: #777; border-top: 1px dashed #eee; pt: 10px;">';
    $html_message .= 'This is an automated message from the Full Send SimSport Inc. Member Portal.</p>';
    $html_message .= '</div>';

    $headers = array(
        'Content-Type: text/html; charset=UTF-8',
        'From: ' . $from_name . ' <' . $system_email . '>',
        'Reply-To: ' . $info_email
    );

    return wp_mail($to_email, $subject, $html_message, $headers);
}

function fs_generate_member_id($fs_member_post_id) {
    $existing_id = get_post_meta($fs_member_post_id, '_fs_member_id', true);
    if (!empty($existing_id)) return $existing_id;

    global $wpdb;
    $highest_id_query = "SELECT meta_value FROM {$wpdb->postmeta} WHERE meta_key = '_fs_member_id' AND meta_value LIKE 'FSS-%' ORDER BY CAST(SUBSTRING(meta_value, 5) AS UNSIGNED) DESC LIMIT 1";
    $highest_id_result = $wpdb->get_var($highest_id_query);

    $new_number = $highest_id_result ? ((int) str_replace('FSS-', '', $highest_id_result)) + 1 : 1000001;
    $new_member_id = 'FSS-' . $new_number;

    update_post_meta($fs_member_post_id, '_fs_member_id', $new_member_id);
    return $new_member_id;
}

function fs_email_on_initial_application($post_id, $params, $skip_parent_email = false) {
    $applicant_first_name = sanitize_text_field($params['first_name'] ?? '');
    $applicant_last_name  = sanitize_text_field($params['last_name'] ?? '');
    $applicant_email      = sanitize_email($params['email'] ?? '');
    $member_type          = strtolower(sanitize_text_field($params['member_type'] ?? 'individual'));
    $parent_email         = sanitize_email($params['parent_email'] ?? '');
    $parent_name          = sanitize_text_field($params['parent_name'] ?? '');
    $member_id_display    = fs_generate_member_id($post_id);

    $subject_applicant = "Welcome to Full Send SimSport - Application Received";
    $body_applicant = "<h2>Hi " . esc_html($applicant_first_name) . ",</h2><p>Thanks for applying to Full Send SimSport! We have received your details.</p>";

    if ($member_type === 'junior') {
        $body_applicant .= "<p><strong>Note:</strong> Since you applied as a Junior Member, we have sent a consent request to your parent/guardian (" . esc_html($parent_email) . "). Your application will be processed once they respond.</p>";
    } else {
        $body_applicant .= "<p>Your account is currently <strong>Pending Review</strong>. Our team is reviewing your application now. You will receive another email once activated.</p>";
        if ($skip_parent_email) $body_applicant .= "<p><strong>Parental Consent:</strong> Your registration has also automatically provided consent for the Junior application(s) linked to your email.</p>";
    }

    fs_send_automated_email($applicant_email, $subject_applicant, $body_applicant);

    if ($member_type === 'junior' && !empty($parent_email) && !$skip_parent_email) {
        $consent_token = wp_hash($post_id . '|' . $parent_email . '|' . time());
        update_post_meta($post_id, '_parental_consent_token', $consent_token);
        $consent_url = home_url('/portal/#/consent/' . $post_id . '/' . $consent_token);
        $is_parent_registered = email_exists($parent_email);
        $subject_parent = "ACTION REQUIRED: Parental Consent for " . esc_html($applicant_first_name);

        $p_body = "<h2>Parental Consent Required</h2><p>Hi " . esc_html($parent_name) . ",</p><p>" . esc_html($applicant_first_name) . " " . esc_html($applicant_last_name) . " has applied to join Full Send SimSport as a Junior Member.</p>";

        if (!$is_parent_registered) {
            $p_body .= "<p>As they are under 18, we require your formal consent before we can process their application.</p><div style='background-color: #3a0a59; color: #FFFFFF; padding: 15px; border-left: 5px solid #dd87fa; margin: 20px 0;'><strong>Notice:</strong> We see that you do not currently have a Full Send account.<br><br>To fully activate your child's membership, you must also <a href='" . home_url('/portal/#/join') . "' style='color: #ffe400; font-weight: bold;'>register as an Adult Member here</a>.<br><br>By registering your own account, you are automatically providing parental consent for this application.</div><p>If you do <strong>not</strong> wish to register but want to decline the junior membership request, please use the link below:</p>";
        } else {
            $p_body .= "<p>As they are under 18, please click below to review and either provide or deny consent for their application.</p>";
        }

        $p_body .= "<div style='margin: 30px 0;'><a href='" . esc_url($consent_url) . "' style='background: #4169e1; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;'>Review Request / Deny Application</a></div><p>Member Reference: " . esc_html($member_id_display) . "</p>";
        fs_send_automated_email($parent_email, $subject_parent, $p_body);
    }
}

function fs_handle_status_change_emails($post_id, $new_status, $old_status) {
    if ($new_status === $old_status) return;

    $email = get_post_meta($post_id, '_email', true);
    $first_name = get_post_meta($post_id, '_first_name', true);
    if (!$email) return;

    if ($new_status === 'active') {
        $member_id_code = fs_generate_member_id($post_id);
        $user_id = email_exists($email);

        if (!$user_id) {
            $tmp_pass = wp_generate_password(24, true);
            $user_id = wp_create_user($member_id_code, $tmp_pass, $email);

            // Determine the correct role based on the member type
            $member_type = get_post_meta($post_id, '_member_type', true);
            $target_role = ($member_type === 'junior') ? 'fs_junior_member' : 'fs_member';

            wp_update_user([
                'ID'           => $user_id,
                'first_name'   => $first_name,
                'last_name'    => get_post_meta($post_id, '_last_name', true),
                'display_name' => $member_id_code,
                'role'         => $target_role // Explicitly set custom role to avoid 'Subscriber' default
            ]);

            update_user_meta($user_id, 'fs_member_id', $post_id);
            update_post_meta($post_id, '_wp_user_id', $user_id);
        }

        $setup_link = home_url("/portal/#/setup-account/{$post_id}/" . urlencode($email));
        $subject = "Account Approved - Welcome to Full Send SimSport";
        $body = "<h2>Congratulations {$first_name}!</h2><p>Your membership has been approved. Your official Member ID is: <strong>{$member_id_code}</strong></p><p>Please click below to set your password and complete your profile:</p><div style='margin: 30px 0;'><a href='{$setup_link}' style='background: #3a0a59; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;'>Set Up My Account</a></div>";
        fs_send_automated_email($email, $subject, $body);

        /**
         * RELEASE GATEKEEPER:
         * If this active user is a parent, find any Juniors waiting in 'awaiting_consent'
         * who have already had consent recorded, and move them to 'pending'.
         */
        $waiting_juniors = new WP_Query([
            'post_type'  => 'fs_member',
            'meta_query' => [
                'relation' => 'AND',
                ['key' => '_member_type', 'value' => 'junior'],
                ['key' => '_parent_email', 'value' => $email],
                ['key' => '_status', 'value' => 'awaiting_consent'],
                ['key' => '_parental_consent_given', 'value' => 'yes']
            ],
            'posts_per_page' => -1,
            'post_status'    => 'publish'
        ]);

        if ($waiting_juniors->have_posts()) {
            foreach ($waiting_juniors->posts as $junior) {
                update_post_meta($junior->ID, '_status', 'pending');
            }
        }

    } elseif ($new_status === 'inactive' || $new_status === 'denied') {
        $subject = "Update regarding your Full Send SimSport Application";
        $body = "<h2>Hi " . esc_html($first_name) . ",</h2><p>Thank you for your interest in joining Full Send SimSport.</p><p>After reviewing your application, the committee has decided not to proceed with your membership at this time.</p><p>Your application has been marked as inactive. If you have any questions, please reach out to the committee.</p>";
        fs_send_automated_email($email, $subject, $body);
    }
}