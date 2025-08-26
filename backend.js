// === IMPORTS AND SETUP ===
const express = require('express');      // Web server framework
const OpenAI = require('openai');        // OpenAI API client library
const cors = require('cors');            // Cross-origin resource sharing
const rateLimit = require('express-rate-limit'); // Rate limiting middleware
const session = require('express-session'); // Session management for privacy-friendly rate limiting
const crypto = require('crypto');        // For hashing (privacy protection)
const path = require('path');            // For file path operations
const { createClient } = require('@supabase/supabase-js'); // Supabase client for authentication
const db = require('./database-backend'); // Database operations module
require('dotenv').config({ path: 'project.env' }); // Load environment variables from project.env file

// === SERVER INITIALIZATION ===
const app = express();                   // Create Express app
const PORT = process.env.PORT || 3000;   // Set port from environment or default to 3000

// === PRODUCTION ENVIRONMENT DETECTION ===
const isProduction = process.env.NODE_ENV === 'production';

// === SUPABASE CLIENT SETUP ===
const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

// Validate Supabase environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_ANON_KEY are required in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// === MIDDLEWARE SETUP ===
// These run before every request
app.use(express.json({ limit: '1mb' })); // Parse JSON request bodies with size limit

// === STATIC FILE SERVING ===
// Serve React app from build directory
app.use(express.static('build'));

// === PRIVACY-FIRST SESSION MANAGEMENT ===
app.use(session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'), // Random secret for sessions
  resave: false,                         // Don't save session if unmodified
  saveUninitialized: false,              // Don't create session until something stored
  cookie: { 
    secure: isProduction,                // HTTPS only in production
    httpOnly: true,                      // Prevent XSS attacks
    maxAge: 24 * 60 * 60 * 1000         // 24 hours
  },
  name: 'sessionId'                      // Don't use default session name
}));

app.use(cors({
  origin: isProduction 
    ? [process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://honorably.vercel.app'] 
    : 'http://localhost:3000', // Allow requests from same port
  credentials: true                      // Required for sessions to work
}));

// === PRIVACY-FIRST RATE LIMITING ===
// Uses session ID instead of IP address for privacy
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,              // 15 minutes
  max: 50,                               // 50 requests per session per window
  keyGenerator: (req) => {
    // Use session ID instead of IP for privacy
    if (req.sessionID) {
      return req.sessionID;
    }
    // Fallback: hash IP with daily salt (no permanent tracking)
    const date = new Date().toDateString();
    const salt = process.env.RATE_LIMIT_SALT || 'default-salt';
    return crypto.createHash('sha256')
                 .update(req.ip + date + salt)
                 .digest('hex');
  },
  message: {
    error: 'Too many requests from this session, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: false,                // Don't expose rate limit headers (privacy)
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});
app.use('/api/', limiter); // Apply rate limiting to all API routes

// === PUBLIC RATE LIMITING (More restrictive for unauthenticated users) ===
const publicRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs (more restrictive)
  message: { error: 'Too many requests from this IP. Please sign up for more access.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IP address for public rate limiting
    return req.ip || req.connection.remoteAddress
  }
})

// === AUTHENTICATION MIDDLEWARE ===
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No valid authorization token provided' })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    req.user = user
    next()
  } catch (error) {
    console.error('Authentication error:', error)
    return res.status(401).json({ error: 'Authentication failed' })
  }
}

// === OPENAI CLIENT SETUP ===
// Validate API key exists and has correct format
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is required in project.env file');
  process.exit(1);
}

if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
  console.error('❌ Invalid OPENAI_API_KEY format. Must start with "sk-"');
  process.exit(1);
}

// This connects to OpenAI's servers using your API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,    // Your secret key from project.env file
});

// === PUBLIC AI ENDPOINT (No authentication required) ===
// This allows unauthenticated users to try the service
app.post('/api/public/gpt', publicRateLimit, async (req, res) => {
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

    // === STEP 4: SET AI PERSONALITY (Same as authenticated version) ===
    const systemInstructions = `You are an educational AI assistant with STRICT anti-cheating enforcement. Your name is Honorably.

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

    // === STEP 5: CALL OPENAI API ===
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
})

// === MAIN AI ENDPOINT ===
// This is where the magic happens - handles POST requests to /api/gpt
app.post('/api/gpt', authenticateUser, async (req, res) => {
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
    const systemInstructions = `You are an educational AI assistant with STRICT anti-cheating enforcement. Your name is Honorably.

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

    // === STEP 3: VALIDATE AND SANITIZE INPUT ===
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

    

    // === STEP 4: BUILD CONVERSATION STRUCTURE ===
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

// === DATABASE API ENDPOINTS ===

// Create new conversation
app.post('/api/conversations', authenticateUser, async (req, res) => {
  console.log('🔵 POST /api/conversations called');
  try {
    const { title } = req.body;
    const userId = req.user.id;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const accessToken = req.headers.authorization.substring(7); // Remove 'Bearer ' prefix
    const result = await db.createConversation(userId, title, accessToken);
    res.json(result);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all conversations for user
app.get('/api/conversations', authenticateUser, async (req, res) => {
  console.log('🔵 GET /api/conversations called');
  try {
    const userId = req.user.id;
    const accessToken = req.headers.authorization.substring(7); // Remove 'Bearer ' prefix
    const conversations = await db.getUserConversations(userId, accessToken);
    res.json(conversations);
  } catch (error) {
    console.error('Error loading conversations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update conversation title
app.put('/api/conversations/:id', authenticateUser, async (req, res) => {
  console.log('🔵 PUT /api/conversations/:id called');
  try {
    const { title } = req.body;
    const conversationId = req.params.id;
    const userId = req.user.id;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const accessToken = req.headers.authorization.substring(7); // Remove 'Bearer ' prefix
    const result = await db.updateConversationTitle(conversationId, userId, title, accessToken);
    res.json(result);
  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete conversation
app.delete('/api/conversations/:id', authenticateUser, async (req, res) => {
  console.log('🔵 DELETE /api/conversations/:id called');
  try {
    const conversationId = req.params.id;
    const userId = req.user.id;

    const accessToken = req.headers.authorization.substring(7); // Remove 'Bearer ' prefix
    const result = await db.deleteConversation(conversationId, userId, accessToken);
    res.json(result);
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get messages for a conversation
app.get('/api/conversations/:id/messages', authenticateUser, async (req, res) => {
  console.log('🔵 GET /api/conversations/:id/messages called');
  try {
    const conversationId = req.params.id;
    const userId = req.user.id;

    const accessToken = req.headers.authorization.substring(7); // Remove 'Bearer ' prefix
    const messages = await db.getConversationMessages(conversationId, userId, accessToken);
    res.json(messages);
  } catch (error) {
    console.error('Error loading messages:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add message to conversation
app.post('/api/conversations/:id/messages', authenticateUser, async (req, res) => {
  console.log('🔵 POST /api/conversations/:id/messages called');
  try {
    const { role, content } = req.body;
    const conversationId = req.params.id;
    const userId = req.user.id;
    
    if (!role || !content) {
      return res.status(400).json({ error: 'Role and content are required' });
    }

    const accessToken = req.headers.authorization.substring(7); // Remove 'Bearer ' prefix
    const result = await db.addMessage(conversationId, userId, role, content, accessToken);
    res.json(result);
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: error.message });
  }
});

// === HEALTH CHECK ENDPOINT ===
// Simple endpoint to test if server is running - GET /health
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// === MODERATION TEST ENDPOINT ===
app.post('/test-moderation', async (req, res) => {
  try {
    const testMessage = req.body.message || "This is a test message";
    
    console.log('🧪 Testing moderation with:', testMessage);
    
    const moderation = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: [
        { type: "text", text: testMessage }
      ],
    });

    const result = moderation.results[0];
    
    res.json({
      message: testMessage,
      flagged: result.flagged,
      categories: Object.keys(result.categories).filter(key => result.categories[key]),
      scores: result.category_scores
    });
  } catch (error) {
    res.status(500).json({ error: 'Moderation test failed', details: error.message });
  }
});

// === CATCH-ALL ROUTE FOR REACT APP ===
// Serve React app for any non-API routes (SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'build', 'index.html'));
});

// === START THE SERVER ===
// This actually starts the web server and makes it listen for requests
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Frontend: http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`GPT endpoint: http://localhost:${PORT}/api/gpt`);
});

module.exports = app;  // Export for testing purposes
