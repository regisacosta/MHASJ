<?php
/**
 * Mental Health Screener AI Integration
 * 
 * Handles AI-powered processing of mental health screening responses
 * Provides comprehensive analysis using Anthropic's Claude AI
 * 
 * @package MentalHealthScreener
 * @version 1.0.0
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

/**
 * API Key Storage Class
 * 
 * Provides a centralized location for storing the Anthropic API key
 * Allows easy modification of the API key across the entire plugin
 */
class Mental_Health_Screener_API_Key {
    /**
     * Anthropic API key for Claude AI interactions
     * 
     * @var string $anthropic_api_key Stores the API key for authentication
     */
    public static $anthropic_api_key = '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';
}

/**
 * AI Processor Class
 * 
 * Manages the entire workflow of processing mental health screening responses
 * Includes prompt generation, API communication, and result analysis
 */
class Mental_Health_Screener_AI_Processor {
    /**
     * Stores the API key for authentication
     * 
     * @var string $api_key Authentication token for Anthropic API
     */
    private $api_key;

    /**
     * Anthropic API endpoint for message processing
     * 
     * @var string $api_endpoint URL for Claude AI API
     */
    private $api_endpoint = 'https://api.anthropic.com/v1/messages';

    /**
     * Constructor initializes the API key
     * 
     * Retrieves the API key from the static key storage
     */
    public function __construct() {
        $this->api_key = Mental_Health_Screener_API_Key::$anthropic_api_key;
    }

    /**
     * Primary method for processing screening responses
     * 
     * Orchestrates the entire AI-powered screening analysis
     * 
     * @param array $responses Collected user responses from the screening
     * @return array Comprehensive analysis of the screening responses
     */
    public function process_screening_responses($responses) {
        // Validate API key before processing
        if (empty($this->api_key)) {
            return $this->generate_fallback_analysis($responses);
        }

        // Construct detailed prompt for AI analysis
        $prompt = $this->construct_ai_prompt($responses);

        // Attempt to get AI-powered analysis
        $analysis = $this->call_claude_api($prompt);

        // Format and return the analysis
        return $this->format_ai_analysis($analysis);
    }

    /**
     * Constructs a comprehensive, context-aware prompt for Claude AI
     * 
     * Transforms user responses into a detailed, instructive prompt
     * Ensures consistent and ethical AI interaction
     * 
     * @param array $responses User's screening responses
     * @return string Formatted prompt for AI processing
     */
    private function construct_ai_prompt($responses) {
        // Detailed prompt components
        $prompt_parts = [
            // Persona and core instruction
            "You are a compassionate mental health screening assistant specializing in providing supportive, non-diagnostic guidance.",
            
            // Context and raw data
            "Analyze the following user responses carefully:",
            json_encode($responses, JSON_PRETTY_PRINT),
            
            // Specific analysis requirements
            "",
            "Please provide a comprehensive, empathetic assessment that includes:",
            "1. A general risk level assessment (Low/Moderate/High)",
            "2. Key observations about the user's mental health state",
            "3. Recommended local South Jersey mental health resources",
            "4. Supportive guidance for next steps",
            
            // Ethical guidelines
            "",
            "IMPORTANT GUIDELINES:",
            "- Do NOT provide a clinical diagnosis",
            "- Maintain a compassionate, supportive tone",
            "- Focus on providing constructive, helpful insights",
            "- Recommend professional consultation when appropriate",
            
            // Response structure requirement
            "",
            "Respond in a structured JSON format with the following keys:",
            "risk_level, observations, recommended_resources, guidance"
        ];

        // Combine prompt components
        return implode("\n", $prompt_parts);
    }

    /**
     * Communicates with Claude AI API
     * 
     * Handles the entire API request process, including:
     * - Preparing request arguments
     * - Sending HTTP request
     * - Error handling
     * - Response parsing
     * 
     * @param string $prompt Prepared prompt for AI processing
     * @return array|false Processed AI analysis or false on failure
     */
    private function call_claude_api($prompt) {
        // Prepare API request arguments
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

        // Send API request
        $response = wp_remote_post($this->api_endpoint, $args);

        // Check for WordPress HTTP API errors
        if (is_wp_error($response)) {
            error_log('Claude API Request Error: ' . $response->get_error_message());
            return false;
        }

        // Decode response body
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);

        // Validate API response structure
        if (!isset($data['content'][0]['text'])) {
            error_log('Invalid Claude API Response: ' . print_r($data, true));
            return false;
        }

        // Attempt to parse JSON from AI response
        $parsed_analysis = json_decode($data['content'][0]['text'], true);
        
        // Return parsed analysis or fallback
        return $parsed_analysis ?: $this->generate_fallback_analysis([]);
    }

    /**
     * Generates a standardized fallback analysis
     * 
     * Provides a consistent response when AI processing fails
     * Includes basic risk assessment and resource recommendations
     * 
     * @param array $responses User's screening responses
     * @return array Standardized fallback analysis
     */
    private function generate_fallback_analysis($responses) {
        // Determine basic risk level
        $risk_level = $this->determine_risk_level($responses);

        // Return comprehensive fallback analysis
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
     * Determines risk level based on screening responses
     * 
     * Implements a basic risk assessment algorithm
     * Evaluates multiple indicators to classify risk
     * 
     * @param array $responses User's screening responses
     * @return string Risk level classification
     */
    private function determine_risk_level($responses) {
        // Define risk indicators based on response criteria
        $risk_indicators = [
            'mood' => isset($responses['mood']) && in_array($responses['mood'], ['1', '2']),
            'stress' => isset($responses['stress_level']) && $responses['stress_level'] > 7,
            'symptoms' => isset($responses['symptoms']) && count($responses['symptoms']) > 1
        ];

        // Count active risk indicators
        $risk_count = array_filter($risk_indicators);

        // Classify risk level
        if (count($risk_count) >= 2) return 'High';
        if (count($risk_count) === 1) return 'Moderate';
        return 'Low';
    }

    /**
     * Formats AI analysis to ensure consistent output structure
     * 
     * Provides fallback values for missing analysis components
     * Ensures the returned analysis always has a predictable format
     * 
     * @param array $analysis Raw AI analysis
     * @return array Formatted, consistent analysis
     */
    private function format_ai_analysis($analysis) {
        // Ensure consistent structure with fallback values
        return [
            'risk_level' => $analysis['risk_level'] ?? 'Moderate',
            'observations' => $analysis['observations'] ?? ['No specific observations'],
            'recommended_resources' => $analysis['recommended_resources'] ?? [],
            'guidance' => $analysis['guidance'] ?? 'Consider speaking with a mental health professional.'
        ];
    }
}

// Initialize the AI processor when plugins are loaded
add_action('plugins_loaded', function() {
    /**
     * Global instance of the AI Processor
     * Allows access to the processor throughout the plugin
     * 
     * @global Mental_Health_Screener_AI_Processor $mental_health_screener_ai_processor
     */
    global $mental_health_screener_ai_processor;
    $mental_health_screener_ai_processor = new Mental_Health_Screener_AI_Processor();
});