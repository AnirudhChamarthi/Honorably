// === PUBLIC AI ENDPOINT (No authentication required) ===
// This allows unauthenticated users to try the service
const handlePublicGpt = async (req, res, { openai, systemInstructions }) => {
  try {
    // === STEP 1: EXTRACT USER INPUT ===
    const { 
      message,                           // The user's question/prompt
      maxTokens = 150,                   // How long the AI response can be
      temperature = 0.7                  // How creative the AI should be
    } = req.body

    // === STEP 2: VALIDATE INPUT ===
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required and must be a string' })
    }

    if (message.trim().length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty' })
    }

    // Validate maxTokens parameter
    if (maxTokens < 1 || maxTokens > 1000) {
      return res.status(400).json({ 
        error: 'maxTokens must be between 1 and 1000'
      })
    }

    // === STEP 3: CONTENT MODERATION ===
    // Check if the message violates our content policy
    const moderationResult = await openai.moderations.create({
      input: message,
      model: 'text-moderation-latest'
    })

    // Check for flagged content (violent/criminal only)
    const flaggedCategories = Object.keys(moderationResult.results[0].categories).filter(
      key => moderationResult.results[0].categories[key]
    )

    if (flaggedCategories.length > 0) {
      const categoryNames = Object.keys(moderationResult.results[0].categories).filter(
        key => moderationResult.results[0].categories[key]
      )
      return res.status(400).json({ 
        error: `Content violates our policy: ${categoryNames.join(', ')}`,
        flagged: true
      })
    }

    // === STEP 4: CALL OPENAI API ===
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',              // Use GPT-4o-mini for cost efficiency
      messages: [
        {
          role: 'system',
          content: systemInstructions
        },
        {
          role: 'user',
          content: message
        }
      ],
      max_tokens: maxTokens,             // Response length limit
      temperature: temperature,           // Creativity level
      stream: false                      // Get complete response at once
    })

    // === STEP 5: SEND RESPONSE ===
    res.json({
      response: completion.choices[0].message.content,
      usage: completion.usage,           // How many tokens were used
      model: completion.model
    })

  } catch (error) {
    console.error('Public GPT endpoint error:', error)
    
    // Handle specific OpenAI errors
    if (error.code === 'invalid_api_key') {
      return res.status(500).json({ 
        error: 'Invalid OpenAI API key'       // Bad API key
      })
    } else if (error.code === 'insufficient_quota') {
      return res.status(500).json({ 
        error: 'OpenAI quota exceeded'        // Out of credits
      })
    } else if (error.code === 'rate_limit_exceeded') {
      return res.status(429).json({ 
        error: 'OpenAI rate limit exceeded'   // Too many requests to OpenAI
      })
    }
    
    // Generic error response
    res.status(500).json({ 
      error: 'An error occurred while processing your request' 
    })
  }
}

module.exports = { handlePublicGpt };
