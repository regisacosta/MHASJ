<?php
if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

class Mental_Health_Screener_Shortcodes {
    public function __construct() {
        add_shortcode('mental_health_screener', [$this, 'render_full_screener']);
        add_shortcode('mhs_resources', [$this, 'render_resources']);
        add_shortcode('mhs_risk_assessment', [$this, 'render_risk_assessment_widget']);
        add_shortcode('mhs_quick_check', [$this, 'render_quick_check']);
    }

    /**
     * Full Screening Tool Shortcode
     * Usage: [mental_health_screener]
     */
    public function render_full_screener($atts) {
        // Parse attributes with defaults
        $atts = shortcode_atts([
            'title' => 'Mental Health Screening',
            'description' => 'A comprehensive screening to understand your current mental health status.',
            'style' => 'default' // Potential for multiple display styles
        ], $atts, 'mental_health_screener');

        // Start output buffering
        ob_start();
        ?>
        <div class="mhs-screener-container <?php echo esc_attr($atts['style']); ?>">
            <div class="mhs-screener-header">
                <h2><?php echo esc_html($atts['title']); ?></h2>
                <p><?php echo esc_html($atts['description']); ?></p>
            </div>
            
            <?php 
            // Include the main screening form template
            include MHS_PLUGIN_PATH . 'templates/screener-form.php'; 
            ?>
        </div>
        <?php
        
        // Return the buffered content
        return ob_get_clean();
    }

    /**
     * Resources Shortcode
     * Usage: [mhs_resources category="crisis"]
     */
    public function render_resources($atts) {
        // Parse attributes
        $atts = shortcode_atts([
            'category' => 'all',
            'limit' => -1
        ], $atts, 'mhs_resources');

        // Retrieve resources from plugin settings
        $options = get_option('mental_health_screener_options');
        $resources = isset($options['crisis_resources']) ? $options['crisis_resources'] : [];

        // Filter resources if a specific category is requested
        if ($atts['category'] !== 'all') {
            $resources = array_filter($resources, function($resource) use ($atts) {
                return isset($resource['category']) && $resource['category'] === $atts['category'];
            });
        }

        // Limit resources if specified
        if ($atts['limit'] > 0) {
            $resources = array_slice($resources, 0, $atts['limit']);
        }

        // Start output buffering
        ob_start();
        ?>
        <div class="mhs-resources-container">
            <h3>Mental Health Resources</h3>
            <?php if (!empty($resources)): ?>
                <ul class="mhs-resources-list">
                    <?php foreach ($resources as $resource): ?>
                        <li class="mhs-resource-item">
                            <strong><?php echo esc_html($resource['name']); ?></strong>
                            <span class="mhs-resource-phone"><?php echo esc_html($resource['phone']); ?></span>
                        </li>
                    <?php endforeach; ?>
                </ul>
            <?php else: ?>
                <p>No resources currently available.</p>
            <?php endif; ?>
        </div>
        <?php
        
        return ob_get_clean();
    }

    /**
     * Risk Assessment Widget Shortcode
     * Usage: [mhs_risk_assessment]
     */
    public function render_risk_assessment_widget($atts) {
        // Parse attributes
        $atts = shortcode_atts([
            'mode' => 'simple' // Could have different complexity levels
        ], $atts, 'mhs_risk_assessment');

        ob_start();
        ?>
        <div class="mhs-risk-assessment-widget">
            <h3>Quick Mental Health Check</h3>
            <form id="mhs-quick-risk-assessment">
                <div class="form-group">
                    <label for="mood-rating">How would you rate your mood today?</label>
                    <select id="mood-rating" name="mood_rating">
                        <option value="">Select</option>
                        <option value="1">Very Poor</option>
                        <option value="2">Poor</option>
                        <option value="3">Neutral</option>
                        <option value="4">Good</option>
                        <option value="5">Very Good</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="stress-level">Current Stress Level</label>
                    <input type="range" id="stress-level" name="stress_level" 
                           min="0" max="10" step="1">
                </div>
                
                <div class="form-group">
                    <label>Have you experienced any of the following recently?</label>
                    <div class="checkbox-group">
                        <label>
                            <input type="checkbox" name="symptoms[]" value="sleep_changes">
                            Significant Sleep Changes
                        </label>
                        <label>
                            <input type="checkbox" name="symptoms[]" value="appetite_changes">
                            Appetite Changes
                        </label>
                        <label>
                            <input type="checkbox" name="symptoms[]" value="concentration_issues">
                            Difficulty Concentrating
                        </label>
                    </div>
                </div>
                
                <button type="button" id="submit-quick-assessment">
                    Get Quick Assessment
                </button>
            </form>
            
            <div id="quick-assessment-results" class="hidden">
                <!-- Dynamic results will be populated here -->
            </div>
        </div>
        <?php
        
        return ob_get_clean();
    }

    /**
     * Quick Check Shortcode
     * Usage: [mhs_quick_check]
     */
    public function render_quick_check($atts) {
        ob_start();
        ?>
        <div class="mhs-quick-check-widget">
            <div class="mhs-quick-check-content">
                <h3>Are You Okay?</h3>
                <p>Take a moment to check in with yourself.</p>
                <button id="mhs-start-quick-check" class="mhs-button">
                    Start Quick Check
                </button>
            </div>
            
            <div id="mhs-quick-check-modal" class="mhs-modal hidden">
                <div class="mhs-modal-content">
                    <span class="mhs-close-modal">&times;</span>
                    <div id="mhs-quick-check-questions">
                        <!-- Dynamic questions will be loaded here -->
                    </div>
                </div>
            </div>
        </div>
        <?php
        
        return ob_get_clean();
    }
}

// Initialize shortcodes
new Mental_Health_Screener_Shortcodes();