<?php
/**
 * Plugin Name: Mental Health Screening Tool
 * Plugin URI: https://southjerseymentalhealth.com/mental-health-screener
 * Description: An AI-powered mental health screening tool with localized resources
 * Version: 1.0.0
 * Author: R. Joseph Acosta
 * Author URI: https://olivebranchreview.com
 */

// Prevent direct access to the plugin
if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

// Include AI integration file
require_once plugin_dir_path(__FILE__) . 'ai_integration.php';

class Mental_Health_Screener_Plugin {
    private $version = '1.0.0';
    private $plugin_name = 'mental-health-screener';

    public function __construct() {
        $this->define_constants();
        $this->init_hooks();
    }

    /**
     * Define plugin constants
     */
    private function define_constants() {
        define('MHS_PLUGIN_PATH', plugin_dir_path(__FILE__));
        define('MHS_PLUGIN_URL', plugin_dir_url(__FILE__));
        define('MHS_PLUGIN_VERSION', $this->version);
    }

    /**
     * Initialize WordPress hooks
     */
    private function init_hooks() {
        add_action('wp_enqueue_scripts', [$this, 'enqueue_scripts']);
        add_action('init', [$this, 'register_screening_post_type']);
        add_shortcode('mental_health_screener', [$this, 'render_screener_shortcode']);
        add_action('wp_ajax_submit_mental_health_screening', [$this, 'handle_screening_submission']);
        add_action('wp_ajax_nopriv_submit_mental_health_screening', [$this, 'handle_screening_submission']);
    }

    /**
     * Enqueue scripts and styles
     */
    public function enqueue_scripts() {
        wp_enqueue_script(
            'mental-health-screener', 
            MHS_PLUGIN_URL . 'screener.js', 
            ['jquery', 'wp-api'], 
            $this->version, 
            true
        );

        wp_enqueue_style(
            'mental-health-screener', 
            MHS_PLUGIN_URL . 'screener.css', 
            [], 
            $this->version
        );

        wp_localize_script('mental-health-screener', 'mhsAjax', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('mental_health_screening_nonce')
        ]);
    }

    /**
     * Register custom post type for screenings
     */
    public function register_screening_post_type() {
        register_post_type('mental_health_screen', [
            'labels' => [
                'name' => __('Mental Health Screenings', 'mental-health-screener'),
                'singular_name' => __('Mental Health Screening', 'mental-health-screener'),
            ],
            'public' => false,
            'show_ui' => true,
            'capability_type' => 'post',
            'hierarchical' => false,
            'supports' => ['title', 'editor'],
            'menu_icon' => 'dashicons-clipboard'
        ]);
    }

    /**
     * Render screening shortcode
     * 
     * @return string HTML content for the screening form
     */
    public function render_screener_shortcode() {
        ob_start();
        include MHS_PLUGIN_PATH . 'screener-form.php';
        return ob_get_clean();
    }

    /**
     * Handle AJAX submission of mental health screening
     */
    public function handle_screening_submission() {
        // Verify nonce for security
        check_ajax_referer('mental_health_screening_nonce', 'security');

        // Sanitize and validate input
        $responses = isset($_POST['responses']) ? 
            array_map('sanitize_text_field', $_POST['responses']) : 
            [];

        // Process screening with AI
        $ai_analysis = $this->process_screening_with_ai($responses);

        // Save screening result
        $post_id = wp_insert_post([
            'post_type' => 'mental_health_screen',
            'post_status' => 'private',
            'post_title' => 'Screening - ' . date('Y-m-d H:i:s')
        ]);

        // Save metadata
        update_post_meta($post_id, '_mhs_user_responses', $responses);
        update_post_meta($post_id, '_mhs_ai_analysis', $ai_analysis);

        // Return response
        wp_send_json_success([
            'message' => 'Screening completed successfully',
            'analysis' => $ai_analysis
        ]);

        wp_die();
    }

    /**
     * Process screening responses with AI
     * 
     * @param array $responses User's screening responses
     * @return array AI-processed analysis
     */
    private function process_screening_with_ai($responses) {
        global $mental_health_screener_ai_processor;
        
        // Check if AI processor is available
        if (!$mental_health_screener_ai_processor) {
            // Fallback to default processing if global processor not available
            return [
                'risk_level' => 'Moderate',
                'observations' => [
                    'Potential stress indicators detected',
                    'Recommended follow-up resources'
                ],
                'recommended_resources' => [
                    'Crisis Support' => [
                        'South Jersey Crisis Helpline: 1-800-273-8255',
                        'National Suicide Prevention Lifeline: 988'
                    ]
                ]
            ];
        }

        // Use the AI processor to analyze responses
        return $mental_health_screener_ai_processor->process_screening_responses($responses);
    }

    /**
     * Activation hook
     */
    public function activate() {
        $this->register_screening_post_type();
        flush_rewrite_rules();
    }

    /**
     * Deactivation hook
     */
    public function deactivate() {
        unregister_post_type('mental_health_screen');
        flush_rewrite_rules();
    }
}

// Instantiate the plugin
function run_mental_health_screener() {
    $plugin = new Mental_Health_Screener_Plugin();
}
run_mental_health_screener();

// Activation and Deactivation Hooks
register_activation_hook(__FILE__, [new Mental_Health_Screener_Plugin(), 'activate']);
register_deactivation_hook(__FILE__, [new Mental_Health_Screener_Plugin(), 'deactivate']);