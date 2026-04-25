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
     * 2. THE FIX: Ecwid mock + Force Footer Up
     */
    $layout_fix = "
        window.ec = window.ec || {};
        window.ec.config = window.ec.config || {};
        window.ec.config.storefrontUrls = window.ec.config.storefrontUrls || {
            'cleanUrls': true,
            'historyApi': true
        };

        /* THE 'FORCE COLLAPSE' SCRIPT */
        (function() {
            const collapseLayout = () => {
                const targets = [
                    document.querySelector('.site-content'),
                    document.querySelector('.site-main'),
                    document.querySelector('#primary'),
                    document.querySelector('#main'),
                    document.querySelector('.entry-content'),
                    document.querySelector('.post-content')
                ];

                targets.forEach(el => {
                    if (el) {
                        el.style.setProperty('min-height', '0px', 'important');
                        el.style.setProperty('padding-bottom', '0px', 'important');
                        el.style.setProperty('margin-bottom', '0px', 'important');
                        el.style.setProperty('padding-top', '0px', 'important');
                    }
                });
            };

            // Run immediately
            collapseLayout();

            // Run when DOM is ready
            document.addEventListener('DOMContentLoaded', collapseLayout);

            // Watch for changes (Theme scripts often re-apply height on resize)
            const observer = new MutationObserver(collapseLayout);
            observer.observe(document.body, { attributes: true, childList: true, subtree: true });

            // Final fallback: resize listener
            window.addEventListener('resize', collapseLayout);
        })();
    ";
    wp_add_inline_script('fs-react-js', $layout_fix, 'before');

    // 3. Return the container with forced zero-out styles
    return '<div id="root" style="display: block !important; min-height: 0 !important; height: auto !important; padding: 0 !important; margin: 0 !important;"></div>';
});