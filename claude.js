const { Anthropic } = require('@anthropic-ai/sdk');

// Initialize Anthropic client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Process screening responses with adaptive follow-up questions
 * 
 * @param {Object} responses User's screening responses
 * @param {Array} conversationHistory Previous exchanges in the screening
 * @returns {Object} Analysis results and any follow-up questions
 */
async function processScreeningResponses(responses, conversationHistory = []) {
    try {
        // Prepare the current message
        const currentMessage = {
            role: 'user',
            content: constructAIPrompt(responses, conversationHistory)
        };

        // Combine with previous conversation if available
        const messages = [...conversationHistory, currentMessage];

        // Call Claude API with conversation context
        const response = await anthropic.messages.create({
            model: 'claude-3-sonnet-20240229',
            max_tokens: 1500,
            temperature: 0.7,
            messages: messages
        });

        // Extract response text
        const responseText = response.content[0].text;
        
        try {
            // Parse structured response
            const parsedResponse = JSON.parse(responseText);
            
            // Add this exchange to conversation history
            const updatedHistory = [
                ...conversationHistory, 
                currentMessage,
                { 
                    role: 'assistant', 
                    content: responseText 
                }
            ];
            
            return {
                analysis: {
                    risk_level: parsedResponse.risk_level || 'Moderate',
                    observations: parsedResponse.observations || [],
                    recommended_resources: parsedResponse.recommended_resources || {},
                    guidance: parsedResponse.guidance || ''
                },
                followUpQuestions: parsedResponse.follow_up_questions || [],
                conversationComplete: parsedResponse.conversation_complete || false,
                conversationHistory: updatedHistory
            };
        } catch (parseError) {
            console.error('Failed to parse Claude response:', parseError);
            return generateFallbackResponse(responses, conversationHistory);
        }
    } catch (error) {
        console.error('Claude API Error:', error);
        return generateFallbackResponse(responses, conversationHistory);
    }
}

/**
 * Construct adaptive prompt for Claude based on conversation stage
 * 
 * @param {Object} responses Current user responses
 * @param {Array} conversationHistory Previous exchanges
 * @returns {string} Constructed prompt
 */
function constructAIPrompt(responses, conversationHistory) {
    // Determine if this is initial screening or follow-up
    const isInitialScreening = conversationHistory.length === 0;
    
    let promptParts = [];
    
    if (isInitialScreening) {
        // Initial screening prompt
        promptParts = [
            "You are a compassionate mental health screening assistant conducting an adaptive interview.",
            "This is the initial screening. Analyze these first responses carefully:",
            JSON.stringify(responses, null, 2),
            "",
            "Your task is to:",
            "1. Assess the information provided so far",
            "2. Determine what additional information would be most valuable",
            "3. Generate 1-3 follow-up questions focusing on the areas of greatest concern",
            "",
            "IMPORTANT GUIDELINES:",
            "- Ask thoughtful, specific follow-up questions based on the user's answers",
            "- Prioritize questions about severity, duration, impact on daily life, and support systems",
            "- If symptoms suggest specific conditions, explore those areas more deeply",
            "- Maintain a compassionate, supportive tone throughout",
            "- Focus on South Jersey resources for recommendations",
            "",
            "Respond in a structured JSON format with these keys:",
            "risk_level, observations, follow_up_questions (array), conversation_complete (boolean)",
            "",
            "Note: Only set conversation_complete to true when you have sufficient information for a comprehensive assessment."
        ];
    } else {
        // Follow-up questions prompt
        promptParts = [
            "You are continuing a mental health screening conversation.",
            "The user has provided additional information:",
            JSON.stringify(responses, null, 2),
            "",
            "Previous conversation context:",
            JSON.stringify(conversationHistory.map(msg => ({
                role: msg.role,
                content: msg.role === 'assistant' ? 'AI Response' : msg.content
            })), null, 2),
            "",
            "Based on all information gathered so far:",
            "1. Update your assessment of the user's mental health state",
            "2. Determine if you need more specific information",
            "3. If needed, ask 1-3 focused follow-up questions",
            "4. If you have gathered sufficient information, provide a final assessment",
            "",
            "IMPORTANT GUIDELINES:",
            "- Integrate new information with previous responses",
            "- Avoid repeating questions already asked",
            "- When sufficient information is gathered, provide a complete assessment",
            "- Recommend specific South Jersey mental health resources",
            "- Provide clear, actionable guidance",
            "",
            "Respond in a structured JSON format with these keys:",
            "risk_level, observations, recommended_resources (object), guidance (string), follow_up_questions (array), conversation_complete (boolean)",
            "",
            "Set conversation_complete to true only when you have enough information for a final assessment."
        ];
    }
    
    return promptParts.join("\n");
}

/**
 * Generate fallback response if AI processing fails
 * 
 * @param {Object} responses User's responses
 * @param {Array} conversationHistory Previous exchanges
 * @returns {Object} Structured fallback response
 */
function generateFallbackResponse(responses, conversationHistory) {
    // Determine if this is initial screening or follow-up
    const isInitialScreening = conversationHistory.length === 0;
    
    if (isInitialScreening) {
        // Initial fallback with follow-up questions
        return {
            analysis: {
                risk_level: determineBasicRiskLevel(responses),
                observations: ['Initial screening completed with standard assessment'],
                recommended_resources: {},
                guidance: ''
            },
            followUpQuestions: [
                "How long have you been experiencing these feelings?",
                "How are these symptoms affecting your daily activities?",
                "Do you have anyone you can talk to about how you're feeling?"
            ],
            conversationComplete: false,
            conversationHistory: [
                ...conversationHistory,
                { 
                    role: 'user', 
                    content: JSON.stringify(responses) 
                }
            ]
        };
    } else {
        // Final fallback with complete assessment
        return {
            analysis: {
                risk_level: determineBasicRiskLevel(responses),
                observations: [
                    'Screening completed with standard assessment',
                    'System processed your responses using standard criteria'
                ],
                recommended_resources: {
                    'Crisis Support': [
                        'South Jersey Crisis Helpline: 1-800-273-8255',
                        'National Suicide Prevention Lifeline: 988'
                    ],
                    'Local Counseling': [
                        'South Jersey Behavioral Health Innovation Center',
                        'Family Service Association of Southern New Jersey'
                    ]
                },
                guidance: 'Based on your responses, we recommend speaking with a mental health professional for a comprehensive assessment. The resources provided can help you get started.'
            },
            followUpQuestions: [],
            conversationComplete: true,
            conversationHistory: conversationHistory
        };
    }
}

/**
 * Basic risk level determination when AI processing fails
 * 
 * @param {Object} responses User's screening responses
 * @returns {string} Risk level classification
 */
function determineBasicRiskLevel(responses) {
    const riskIndicators = {
        mood: responses.mood && ['1', '2'].includes(responses.mood),
        stress: responses.stress_level && parseInt(responses.stress_level) > 7,
        symptoms: responses.symptoms && responses.symptoms.length > 1,
        suicidal: responses.suicidal_thoughts === 'yes',
        sleep: responses.sleep_changes === 'significant',
        isolation: responses.social_support === 'none'
    };

    const riskCount = Object.values(riskIndicators).filter(Boolean).length;

    if (riskIndicators.suicidal) return 'High';
    if (riskCount >= 3) return 'High';
    if (riskCount >= 1) return 'Moderate';
    return 'Low';
}

module.exports = {
    processScreeningResponses
};