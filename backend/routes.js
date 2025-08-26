// === MAIN ROUTES SETUP ===
const { authenticateUser } = require('./auth');
const { handlePublicGpt } = require('./publicGpt');
const { handleMainGpt } = require('./mainGpt');
const { systemInstructions } = require('./aiInstructions');
const { handleResendConfirmation } = require('./authRoutes');
const {
  createConversation,
  getUserConversations,
  updateConversationTitle,
  deleteConversation,
  getConversationMessages,
  addMessage
} = require('./databaseRoutes');
const { healthCheck, testModeration } = require('./utilityRoutes');

const setupRoutes = (app, { supabase, supabaseAdmin, openai, db }) => {
  // === PUBLIC AI ENDPOINT ===
  app.post('/api/public/gpt', app.locals.publicRateLimit, (req, res) => {
    handlePublicGpt(req, res, { openai, systemInstructions });
  });

  // === MAIN AI ENDPOINT ===
  app.post('/api/gpt', (req, res, next) => {
    authenticateUser(req, res, next, { supabase });
  }, (req, res) => {
    handleMainGpt(req, res, { openai, systemInstructions });
  });

  // === DATABASE API ENDPOINTS ===
  
  // Create new conversation
  app.post('/api/conversations', (req, res, next) => {
    authenticateUser(req, res, next, { supabase });
  }, (req, res) => {
    createConversation(req, res, { db });
  });

  // Get all conversations for user
  app.get('/api/conversations', (req, res, next) => {
    authenticateUser(req, res, next, { supabase });
  }, (req, res) => {
    getUserConversations(req, res, { db });
  });

  // Update conversation title
  app.put('/api/conversations/:id', (req, res, next) => {
    authenticateUser(req, res, next, { supabase });
  }, (req, res) => {
    updateConversationTitle(req, res, { db });
  });

  // Delete conversation
  app.delete('/api/conversations/:id', (req, res, next) => {
    authenticateUser(req, res, next, { supabase });
  }, (req, res) => {
    deleteConversation(req, res, { db });
  });

  // Get messages for a conversation
  app.get('/api/conversations/:id/messages', (req, res, next) => {
    authenticateUser(req, res, next, { supabase });
  }, (req, res) => {
    getConversationMessages(req, res, { db });
  });

  // Add message to conversation
  app.post('/api/conversations/:id/messages', (req, res, next) => {
    authenticateUser(req, res, next, { supabase });
  }, (req, res) => {
    addMessage(req, res, { db });
  });

  // === UTILITY ENDPOINTS ===
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    healthCheck(req, res);
  });

  // Moderation test endpoint
  app.post('/test-moderation', (req, res) => {
    testModeration(req, res, { openai });
  });

  // === AUTHENTICATION ENDPOINTS ===
  
  // Resend confirmation email
  app.post('/api/auth/resend-confirmation', (req, res) => {
    handleResendConfirmation(req, res, { supabase: supabaseAdmin });
  });
};

module.exports = { setupRoutes };
