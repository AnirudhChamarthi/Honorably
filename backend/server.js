// === IMPORTS AND SETUP ===
const express = require('express');      // Web server framework
const OpenAI = require('openai');        // OpenAI API client library
const cors = require('cors');            // Cross-origin resource sharing
const rateLimit = require('express-rate-limit'); // Rate limiting middleware
const session = require('express-session'); // Session management for privacy-friendly rate limiting
const crypto = require('crypto');        // For hashing (privacy protection)
const path = require('path');            // For file path operations
const { createClient } = require('@supabase/supabase-js'); // Supabase client for authentication
const db = require('../database-backend'); // Database operations module
require('dotenv').config({ path: 'project.env' }); // Load environment variables from project.env file

// === SERVER INITIALIZATION ===
const app = express();                   // Create Express app
const PORT = process.env.PORT || 3000;   // Set port from environment or default to 3000

// === PRODUCTION ENVIRONMENT DETECTION ===
const isProduction = process.env.NODE_ENV === 'production';

// === SUPABASE CLIENT SETUP ===
const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Validate Supabase environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_ANON_KEY are required in environment variables');
  process.exit(1);
}

if (!supabaseServiceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

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

// === RATE LIMITING SETUP ===
const { setupRateLimiting } = require('./rateLimiting');
setupRateLimiting(app);

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

// === ROUTE SETUP ===
const { setupRoutes } = require('./routes');
setupRoutes(app, { supabase, supabaseAdmin, openai, db });

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
