// COMPLETELY SEPARATE TEST ROUTE
add_action('rest_api_init', function () {
    // We use a unique namespace 'fs-test/v1' to avoid any collisions
    register_rest_route('fs-test/v1', '/trigger', [
        'methods' => 'POST',
        'permission_callback' => '__return_true',
        'callback' => 'fs_handle_debug_email_trigger'
    ]);
});

function fs_handle_debug_email_trigger($request) {
    $params = $request->get_json_params();
    $flow = $params['flow'] ?? '';
    $post_id = $params['post_id'] ?? 0;

    // Check if the post exists to prevent a crash
    if (!$post_id || !get_post($post_id)) {
        return new WP_Error('no_post', 'Invalid Post ID provided', ['status' => 400]);
    }

    if ($flow === 'initial') {
        // We use the same data structure your join route uses
        $test_data = [
            'first_name' => 'Test',
            'last_name'  => 'User',
            'email'      => 'info@fullsendsimsport.com.au', // Send to yourself for testing
            'member_type'=> 'junior',
            'parent_email'=> 'info@fullsendsimsport.com.au',
            'parent_name' => 'Test Parent'
        ];
        
        // Wrap in a try-catch to prevent a site-wide crash if the function fails
        try {
            fs_email_on_initial_application($post_id, $test_data);
            return rest_ensure_response(['success' => true, 'message' => 'Initial flow sent']);
        } catch (Exception $e) {
            return new WP_Error('crash_prevented', $e->getMessage());
        }
    }

    if ($flow === 'approved') {
        try {
            // Trigger the status change logic
            fs_handle_status_change_emails($post_id, 'active', 'pending');
            return rest_ensure_response(['success' => true, 'message' => 'Approval flow sent']);
        } catch (Exception $e) {
            return new WP_Error('crash_prevented', $e->getMessage());
        }
    }

    return "No valid flow specified. Use 'initial' or 'approved'.";
}