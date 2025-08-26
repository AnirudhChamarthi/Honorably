// === DATABASE API ENDPOINTS ===

// Create new conversation
const createConversation = async (req, res, { db }) => {
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
};

// Get all conversations for user
const getUserConversations = async (req, res, { db }) => {
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
};

// Update conversation title
const updateConversationTitle = async (req, res, { db }) => {
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
};

// Delete conversation
const deleteConversation = async (req, res, { db }) => {
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
};

// Get messages for a conversation
const getConversationMessages = async (req, res, { db }) => {
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
};

// Add message to conversation
const addMessage = async (req, res, { db }) => {
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
};

module.exports = {
  createConversation,
  getUserConversations,
  updateConversationTitle,
  deleteConversation,
  getConversationMessages,
  addMessage
};
