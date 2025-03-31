const { Anthropic } = require('@anthropic-ai/sdk');

// Initialize Anthropic client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Construct detailed prompt for Claude AI
 * 
 * @param {Object} responses User's screening responses
 * @returns {string} Formatted prompt for AI processing
 */
function constructAIPrompt(responses) {
    const promptParts = [
        "You are a compassionate mental health screening assistant specializing in providing supportive, non-diagnostic guidance.",
        "Analyze the following user responses carefully:",
        JSON.stringify(responses, null, 2),
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

    return promptParts.join("\n");
}

/**
 * Determine risk level based on screening responses
 * 
 * @param {Object} responses User's screening responses
 * @returns {string} Risk level classification
 */
function determineRiskLevel(responses) {
    const riskIndicators = {
        mood: responses.mood && ['1', '2'].includes(responses.mood),
        stress: responses.stress_level && responses.stress_level > 7,
        symptoms: responses.symptoms && responses.symptoms.length > 1
    };

    const riskCount = Object.values(riskIndicators).filter(Boolean).length;

    if (riskCount >= 2) return 'High';
    if (riskCount === 1) return 'Moderate';
    return 'Low';
}

/**
 * Generate fallback analysis if AI processing fails
 * 
 * @param {Object} responses User's screening responses
 * @returns {Object} Fallback analysis
 */
function generateFallbackAnalysis(responses) {
    const riskLevel = determineRiskLevel(responses);

    return {
        risk_level: riskLevel,
        observations: [
            'Screening completed with standard assessment',
            'Professional consultation recommended'
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
        guidance: 'We recommend speaking with a mental health professional for a comprehensive assessment.'
    };
}

/**
 * Process screening responses using Claude AI
 * 
 * @param {Object} responses User's screening responses
 * @returns {Object} Processed AI analysis
 */
async function processScreeningResponses(responses) {
    try {
        // Prepare prompt
        const prompt = constructAIPrompt(responses);

        // Call Claude API
        const response = await anthropic.messages.create({
            model: 'claude-3-sonnet-20240229',
            max_tokens: 1000,
            messages: [{ role: 'user', content: prompt }]
        });

        // Extract and parse text response
        const analysisText = response.content[0].text;
        
        try {
            // Attempt to parse JSON from AI response
            const analysis = JSON.parse(analysisText);
            return analysis;
        } catch (parseError) {
            console.error('Failed to parse AI response:', parseError);
            return generateFallbackAnalysis(responses);
        }
    } catch (error) {
        console.error('Claude API Error:', error);
        return generateFallbackAnalysis(responses);
    }
}

module.exports = {
    processScreeningResponses
};