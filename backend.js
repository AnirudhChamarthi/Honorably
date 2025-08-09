// === IMPORTS AND SETUP ===
const express = require('express');      // Web server framework
const OpenAI = require('openai');        // OpenAI API client library
const cors = require('cors');            // Cross-origin resource sharing
require('dotenv').config({ path: 'project.env' }); // Load environment variables from project.env file

// === SERVER INITIALIZATION ===
const app = express();                   // Create Express app
const PORT = process.env.PORT || 3000;   // Set port from environment or default to 3000

// === MIDDLEWARE SETUP ===
// These run before every request
app.use(express.json());                 // Parse JSON request bodies
app.use(cors());                         // Allow requests from any origin (frontend)

// === OPENAI CLIENT SETUP ===
// This connects to OpenAI's servers using your API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,    // Your secret key from project.env file
});

// === MAIN AI ENDPOINT ===
// This is where the magic happens - handles POST requests to /api/gpt
app.post('/api/gpt', async (req, res) => {
  try {
    // === STEP 1: EXTRACT USER INPUT ===
    // Get data from the request body (what the user sent)
    const { 
      message,                           // The user's question/prompt
      maxTokens = 150,                   // How long the AI response can be
      temperature = 0.7                  // How creative the AI should be (0-1)
    } = req.body;

    // === STEP 2: SET AI PERSONALITY ===
    // This tells the AI how to behave - LOCKED and cannot be changed by users
    const systemInstructions = `You are an educational AI assistant with STRICT anti-cheating enforcement.

DETECTION TRIGGERS - Refuse complete solutions when requests contain:
- "give me the answer to"
- "solve this for me" 
- "what is the solution"
- "just tell me"
- "the answer is"
- "write a short answer"
- "write a short response"
- "write a short explanation"
- "write a short summary"
- "write a short report"
- "write a short essay"
- "write a short paper"
- "write a short research paper"
- Direct homework/test questions
- Requests for complete code solutions
- "do my homework"
- Mathematical problems asking for final answers


WHEN TRIGGERED: 
1. DO NOT provide the complete solution
2. Respond with EXACTLY: "Unfortunately, I can't provide the complete solution. However, I can help you learn this concept instead. Here are learning resources:"
3. Provide maximum 6 brief items: sources, small examples, or outline steps
4. Keep each item under 30 words - explain debugging steps for code completely
5. If code, provide short code snippets or explain debug steps instead of full solutions.
6. End with: "Try solving it yourself first, then ask specific questions about parts you're stuck on. You can do it!"


NORMAL RESPONSES: For genuine learning questions, concept explanations, or clarifying questions, respond helpfully and completely.

ENFORCEMENT: Apply this rule to EVERY message. No exceptions.`;

    // === STEP 3: VALIDATE INPUT ===
    // Make sure the user actually sent a message
    if (!message) {
      return res.status(400).json({ 
        error: 'Message is required' 
      });
    }

    // === STEP 4: BUILD CONVERSATION STRUCTURE ===
    // Create the conversation format that OpenAI expects
    const messages = [
      {
        role: 'system',                  // First message: AI's instructions (personality)
        content: systemInstructions
      },
      {
        role: 'user',                    // Second message: User's actual question
        content: message
      }
    ];

    // === STEP 5: CALL OPENAI API ===
    // Send everything to OpenAI and wait for response
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',              // Which AI model to use (locked)
      messages: messages,                // The conversation (system + user)
      max_tokens: maxTokens,             // Response length limit
      temperature: temperature,          // Creativity level
    });

    // === STEP 6: EXTRACT AI RESPONSE ===
    // Get the actual text response from OpenAI's complex response object
    const response = completion.choices[0].message.content;

    // === STEP 7: SEND RESPONSE TO USER ===
    // Package everything up and send back to the frontend/user
    res.json({
      success: true,                     // Request worked
      response: response,                // The AI's actual answer
      usage: completion.usage,           // How many tokens were used
      model: completion.model            // Which model was actually used
    });

  } catch (error) {
    // === STEP 8: HANDLE ERRORS ===
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
});

// === HEALTH CHECK ENDPOINT ===
// Simple endpoint to test if server is running - GET /health
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// === START THE SERVER ===
// This actually starts the web server and makes it listen for requests
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`GPT endpoint: http://localhost:${PORT}/api/gpt`);
});

module.exports = app;  // Export for testing purposes
