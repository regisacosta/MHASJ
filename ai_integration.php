<?php
/**
 * Mental Health Screener AI Integration
 * 
 * Handles AI-powered processing of mental health screening responses
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

class Mental_Health_Screener_AI_Processor {
    private $api_key;
    private $api_endpoint = 'https://api.anthropic.com/v1/messages';

    public function __construct() {
        $options = get_option('mental_health_screener_options');
        $this->api_key = isset($options['anthropic_api_key']) ? $options['anthropic_api_key'] : '';
    }

    /**
     * Process screening responses using Claude AI
     * 
     * @param array $responses User's screening responses
     * @return array Processed AI analysis
     */
    public function process_screening_responses($responses) {
        // Validate API key
        if (empty($this->api_key)) {
            return $this->generate_fallback_analysis($responses);
        }

        // Prepare prompt for Claude
        $prompt = $this->construct_ai_prompt($responses);

        // Make API request
        $analysis = $this->call_claude_api($prompt);

        // Process and format analysis
        return $this->format_ai_analysis($analysis);
    }

    /**
     * Construct detailed prompt for Claude
     * 
     * @param array $responses User's screening responses
     * @return string Constructed prompt
     */
    private function construct_ai_prompt($responses) {
        $prompt_parts = [
            "You are a compassionate mental health screening assistant specializing in providing supportive, non-diagnostic guidance.",
            "Analyze the following user responses carefully:",
            json_encode($responses, JSON_PRETTY_PRINT),
            "",
            "Please provide a comprehensive, empathetic assessment that includes:",
            "1. A general risk level assessment (Low/Moderate/High)",
            "2. Key observations about the user's mental health state",
            "3. Recommended local South Jersey mental health resources",
            "4. Supportive guidance for next steps",
            "",
            "IMPORTANT GUIDELINES:",
            "- Do NOT provide a clinical diagnosis",
            "- Maintain a compassionate, supportive tone",
            "- Focus on providing constructive, helpful insights",
            "- Recommend professional consultation when appropriate",
            "",
            "Respond in a structured JSON format with the following keys:",
            "risk_level, observations, recommended_resources, guidance"
        ];

        return implode("\n", $prompt_parts);
    }

    /**
     * Call Claude API
     * 
     * @param string $prompt Prepared prompt
     * @return array|false API response or false on failure
     */
    private function call_claude_api($prompt) {
        $args = [
            'method' => 'POST',
            'timeout' => 30,
            'headers' => [
                'Content-Type' => 'application/json',
                'X-API-Key' => $this->api_key,
                'Anthropic-Version' => '2023-06-01'
            ],
            'body' => json_encode([
                'model' => 'claude-3-sonnet-20240229',
                'max_tokens' => 1000,
                'messages' => [
                    [
                        'role' => 'user',
                        'content' => $prompt
                    ]
                ]
            ])
        ];

        $response = wp_remote_post($this->api_endpoint, $args);

        // Check for WordPress HTTP API errors
        if (is_wp_error($response)) {
            error_log('Claude API Request Error: ' . $response->get_error_message());
            return false;
        }

        // Decode response
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        // Validate response
        if (!isset($data['content'][0]['text'])) {
            error_log('Invalid Claude API Response: ' . print_r($data, true));
            return false;
        }

        // Attempt to parse JSON from AI response
        $parsed_analysis = json_decode($data['content'][0]['text'], true);
        return $parsed_analysis ?: $this->generate_fallback_analysis([]);
    }

    /**
     * Generate fallback analysis if AI processing fails
     * 
     * @param array $responses User's screening responses
     * @return array Fallback analysis
     */
    private function generate_fallback_analysis($responses) {
        // Basic risk assessment based on available responses
        $risk_level = $this->determine_risk_level($responses);

        return [
            'risk_level' => $risk_level,
            'observations' => [
                'Screening completed with standard assessment',
                'Professional consultation recommended'
            ],
            'recommended_resources' => [
                'Crisis Support' => [
                    'South Jersey Crisis Helpline: 1-800-273-8255',
                    'National Suicide Prevention Lifeline: 988'
                ],
                'Local Counseling' => [
                    'South Jersey Behavioral Health Innovation Center',
                    'Family Service Association of Southern New Jersey'
                ]
            ],
            'guidance' => 'We recommend speaking with a mental health professional for a comprehensive assessment.'
        ];
    }

    /**
     * Basic risk level determination
     * 
     * @param array $responses User's screening responses
     * @return string Risk level
     */
    private function determine_risk_level($responses) {
        // Simple risk assessment logic
        $risk_indicators = [
            'mood' => isset($responses['mood']) && in_array($responses['mood'], ['1', '2']),
            'stress' => isset($responses['stress_level']) && $responses['stress_level'] > 7,
            'symptoms' => isset($responses['symptoms']) && count($responses['symptoms']) > 1
        ];

        $risk_count = array_filter($risk_indicators);

        if (count($risk_count) >= 2) return 'High';
        if (count($risk_count) === 1) return 'Moderate';
        return 'Low';
    }

    /**
     * Format AI analysis for consistent output
     * 
     * @param array $analysis Raw AI analysis
     * @return array Formatted analysis
     */
    private function format_ai_analysis($analysis) {
        // Ensure consistent structure
        return [
            'risk_level' => $analysis['risk_level'] ?? 'Moderate',
            'observations' => $analysis['observations'] ?? ['No specific observations'],
            'recommended_resources' => $analysis['recommended_resources'] ?? [],
            'guidance' => $analysis['guidance'] ?? 'Consider speaking with a mental health professional.'
        ];
    }
}

// Initialization hook
add_action('plugins_loaded', function() {
    global $mental_health_screener_ai_processor;
    $mental_health_screener_ai_processor = new Mental_Health_Screener_AI_Processor();
});