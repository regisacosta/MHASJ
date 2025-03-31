const { Anthropic } = require('@anthropic-ai/sdk');

// Initialize Anthropic client with API key validation
let anthropic;
try {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ERROR: ANTHROPIC_API_KEY environment variable is not set');
    throw new Error('Missing API key');
  }
  
  anthropic = new Anthropic({
    apiKey: apiKey
  });
  console.log('Claude API client initialized successfully');
} catch (error) {
  console.error('Failed to initialize Claude API client:', error.message);
}

/**
 * Test Claude API connectivity
 * @returns {Promise<boolean>} True if connection successful
 */
async function testClaudeAPI() {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'Hello, Claude. This is a test message.' }]
    });
    console.log("Claude API test successful. Response:", response.content[0].text);
    return true;
  } catch (error) {
    console.error("Claude API test failed:", error);
    return false;
  }
}

/**
 * Process screening responses with adaptive follow-up questions
 * 
 * @param {Object} responses User's screening responses
 * @param {Array} conversationHistory Previous exchanges in the screening
 * @returns {Object} Analysis results and any follow-up questions
 */
async function processScreeningResponses(responses, conversationHistory = []) {
  console.log("Processing screening with responses:", JSON.stringify(responses));
  console.log("Conversation history length:", conversationHistory.length);
  
  try {
    // Check if Claude API is available
    if (!anthropic) {
      console.warn("Claude API client not initialized, using fallback response");
      return generateFallbackResponse(responses, conversationHistory);
    }
    
    // Prepare the current message
    const currentMessage = {
      role: 'user',
      content: constructAIPrompt(responses, conversationHistory)
    };

    // Combine with previous conversation if available
    const messages = [...conversationHistory, currentMessage];
    
    console.log("Sending request to Claude API with message count:", messages.length);
    
    // Call Claude API with conversation context
    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1500,
      temperature: 0.7,
      messages: messages
    });

    // Extract response text
    const responseText = response.content[0].text;
    console.log("Claude API response received, length:", responseText.length);
    
    try {
      // Parse structured response
      const parsedResponse = JSON.parse(responseText);
      console.log("Successfully parsed Claude response as JSON");
      
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
        conversationHistory: updatedHistory,
        rawResponse: parsedResponse // Include raw response for debugging
      };
    } catch (parseError) {
      console.error('Failed to parse Claude response as JSON:', parseError.message);
      console.log('Raw response:', responseText);
      return generateFallbackResponse(responses, conversationHistory);
    }
  } catch (error) {
    console.error('Claude API Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data));
    }
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
      "Example response format:",
      '{',
      '  "risk_level": "Moderate",',
      '  "observations": ["The user reported significant sleep changes", "Stress levels are elevated"],',
      '  "follow_up_questions": ["How long have you been experiencing these sleep changes?"],',
      '  "conversation_complete": false',
      '}',
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
      "Example response format:",
      '{',
      '  "risk_level": "Moderate",',
      '  "observations": ["The user reported significant sleep changes", "Stress levels are elevated"],',
      '  "recommended_resources": {',
      '    "Crisis Support": ["South Jersey Crisis Helpline: 1-800-273-8255"],',
      '    "Local Counseling": ["South Jersey Behavioral Health Center"]',
      '  },',
      '  "guidance": "Based on your responses, we recommend speaking with a therapist about your sleep issues.",',
      '  "follow_up_questions": ["How has your energy level been during the day?"],',
      '  "conversation_complete": false',
      '}',
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
  console.log("Generating fallback response");
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
      ],
      isUsingFallback: true
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
      conversationHistory: conversationHistory,
      isUsingFallback: true
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
  processScreeningResponses,
  testClaudeAPI
};