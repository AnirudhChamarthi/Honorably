// === MAIN AI ENDPOINT ===
// This is where the magic happens - handles POST requests to /api/gpt
const handleMainGpt = async (req, res, { openai, systemInstructions }) => {
  try {
    // === STEP 1: EXTRACT USER INPUT ===
    // Get data from the request body (what the user sent)
    const { 
      message,                           // The user's question/prompt
      maxTokens = 150,                   // How long the AI response can be
      temperature = 0.7                  // How creative the AI should be (0-1)
    } = req.body;

    // === STEP 2: VALIDATE AND SANITIZE INPUT ===
    // Make sure the user actually sent a message
    if (!message) {
      return res.status(400).json({ 
        error: 'Message is required' 
      });
    }

    // Validate message length
    if (message.length > 4000) {
      return res.status(400).json({ 
        error: 'Message too long. Maximum 4000 characters allowed.' 
      });
    }

    // Validate maxTokens parameter
    if (maxTokens < 1 || maxTokens > 1000) {
      return res.status(400).json({ 
        error: 'maxTokens must be between 1 and 1000' 
      });
    }

    // Validate temperature parameter
    if (temperature < 0 || temperature > 1) {
      return res.status(400).json({ 
        error: 'temperature must be between 0 and 1' 
      });
    }

    // Basic sanitization - remove potentially harmful characters
    const sanitizedMessage = message.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                                    .replace(/<[^>]*>/g, '')
                                    .trim();

    // === CONTENT MODERATION (OMNI-MODERATION) ===
    // Using latest multimodal moderation model for enhanced safety
    try {
      console.log('🔍 Checking moderation for message...');
      
      const moderation = await openai.moderations.create({
        model: "omni-moderation-latest",
        input: [
          { type: "text", text: sanitizedMessage }
        ],
      });

      const moderationResult = moderation.results[0];
      
      // Always log moderation check (for debugging)
      console.log('✅ Moderation check completed:', {
        flagged: moderationResult.flagged,
        categories: Object.keys(moderationResult.categories).filter(
          key => moderationResult.categories[key]
        ),
        timestamp: new Date().toISOString()
      });

      if (moderationResult.flagged) {
        // Get flagged categories
        const flaggedCategories = Object.keys(moderationResult.categories).filter(
          key => moderationResult.categories[key]
        );

        // Block ALL content flagged by OpenAI moderation
        console.log('🚨 Content flagged by moderation:', {
          categories: flaggedCategories,
          timestamp: new Date().toISOString()
        });

        return res.status(400).json({
          error: 'Your message contains content that violates our usage policies. Please rephrase your question in a respectful and appropriate manner.',
          flagged: true
        });
      }
    } catch (moderationError) {
      console.error('Moderation API error:', moderationError);
      // Continue processing if moderation fails (don't block legitimate users)
    }

    // === STEP 3: BUILD CONVERSATION STRUCTURE ===
    // Create the conversation format that OpenAI expects
    const messages = [
      {
        role: 'system',                  // First message: AI's instructions (personality)
        content: systemInstructions
      },
      {
        role: 'user',                    // Second message: User's actual question
        content: sanitizedMessage        // Use sanitized message instead of raw input
      }
    ];

    // === STEP 4: CALL OPENAI API ===
    // Send everything to OpenAI and wait for response
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',              // Which AI model to use (locked)
      messages: messages,                // The conversation (system + user)
      max_tokens: maxTokens,             // Response length limit
      temperature: temperature,          // Creativity level
    });

    // === STEP 5: EXTRACT AI RESPONSE ===
    // Get the actual text response from OpenAI's complex response object
    const response = completion.choices[0].message.content;

    // === STEP 6: SEND RESPONSE TO USER ===
    // Package everything up and send back to the frontend/user
    res.json({
      success: true,                     // Request worked
      response: response,                // The AI's actual answer
      usage: completion.usage,           // How many tokens were used
      model: completion.model            // Which model was actually used
    });

  } catch (error) {
    // === STEP 7: HANDLE ERRORS ===
    // If something goes wrong, log it and send appropriate error message
    console.error('OpenAI API Error:', error);
    
    // Different error types get different responses
    if (error.code === 'insufficient_quota') {
      res.status(402).json({ 
        error: 'Insufficient OpenAI quota'    // Out of credits
      });
    } else if (error.code === 'invalid_api_key') {
      res.status(401).json({ 
        error: 'Invalid OpenAI API key'       // Bad API key
      });
    } else {
      res.status(500).json({ 
        error: 'Internal server error',       // Something else went wrong
        details: error.message 
      });
    }
  }
}

module.exports = { handleMainGpt };
