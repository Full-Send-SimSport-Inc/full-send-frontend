<?php
/**
 * Shortcodes for Full Send SimSport
 */

if (!defined('ABSPATH')) exit;

add_shortcode('full_send_app', function() {
    // Enqueue the React assets
    wp_enqueue_script('fs-react-js', plugin_dir_url(dirname(__FILE__)) . 'dist/assets/index.js', array(), time(), true);
    wp_enqueue_style('fs-react-css', plugin_dir_url(dirname(__FILE__)) . 'dist/assets/index.css', array(), time());

    // 1. Pass parameters to the React App
    wp_localize_script('fs-react-js', 'appParams', [
        'restUrl'   => esc_url_raw(rest_url('full-send/v1')),
        'nonce'     => wp_create_nonce('wp_rest'),
        'logoutUrl' => wp_logout_url(home_url('/portal/'))
    ]);

    /**
     * 2. THE FIX: Satisfy the Ecwid plugin requirement.
     * This prevents errors when Ecwid's scripts look for storefront configuration.
     */
    $ecwid_mock = "
        window.ec = window.ec || {};
        window.ec.config = window.ec.config || {};
        window.ec.config.storefrontUrls = window.ec.config.storefrontUrls || {
            'cleanUrls': true,
            'historyApi': true
        };
    ";
    wp_add_inline_script('fs-react-js', $ecwid_mock, 'before');

    // Return the container for React to mount into
    return '<div id="root"></div>';
});