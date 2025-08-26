require('dotenv').config({ path: 'project.env' }); // Load environment variables
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_ANON_KEY are required in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// === CONVERSATION ENDPOINTS ===

// Create new conversation
async function createConversation(userId, title, accessToken) {
  try {
    // Create authenticated Supabase client with user's session token
    const authenticatedSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    });

    const { data, error } = await authenticatedSupabase
      .from('conversations')
      .insert([{ 
        title: title, 
        user_id: userId 
      }])
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating conversation:', error);
      throw new Error('Failed to create conversation');
    }

    return { success: true, conversation: data };
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
}

// Get all conversations for user
async function getUserConversations(userId, accessToken) {
  try {
    // Create authenticated Supabase client with user's session token
    const authenticatedSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    });

    const { data, error } = await authenticatedSupabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Supabase error loading conversations:', error);
      throw new Error('Failed to load conversations');
    }

    return data || [];
  } catch (error) {
    console.error('Error loading conversations:', error);
    throw error;
  }
}

// Update conversation title
async function updateConversationTitle(conversationId, userId, newTitle, accessToken) {
  try {
    // Create authenticated Supabase client with user's session token
    const authenticatedSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    });

    const { error } = await authenticatedSupabase
      .from('conversations')
      .update({ title: newTitle })
      .eq('id', conversationId)
      .eq('user_id', userId); // Ensure user owns the conversation

    if (error) {
      console.error('Supabase error updating conversation:', error);
      throw new Error('Failed to update conversation');
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating conversation:', error);
    throw error;
  }
}

// Delete conversation and all its messages
async function deleteConversation(conversationId, userId, accessToken) {
  try {
    // Create authenticated Supabase client with user's session token
    const authenticatedSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    });

    // First delete all messages in the conversation
    const { error: messagesError } = await authenticatedSupabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId);

    if (messagesError) {
      console.error('Supabase error deleting messages:', messagesError);
      throw new Error('Failed to delete conversation messages');
    }

    // Then delete the conversation
    const { error } = await authenticatedSupabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userId); // Ensure user owns the conversation

    if (error) {
      console.error('Supabase error deleting conversation:', error);
      throw new Error('Failed to delete conversation');
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting conversation:', error);
    throw error;
  }
}

// === MESSAGE ENDPOINTS ===

// Get all messages for a conversation
async function getConversationMessages(conversationId, userId, accessToken) {
  try {
    // Create authenticated Supabase client with user's session token
    const authenticatedSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    });

    // First verify user owns the conversation
    const { data: conversation, error: convError } = await authenticatedSupabase
      .from('conversations')
      .select('user_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.user_id !== userId) {
      throw new Error('Unauthorized access to conversation');
    }

    // Get messages
    const { data, error } = await authenticatedSupabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Supabase error loading messages:', error);
      throw new Error('Failed to load messages');
    }

    return data || [];
  } catch (error) {
    console.error('Error loading messages:', error);
    throw error;
  }
}

// Add new message to conversation
async function addMessage(conversationId, userId, role, content, accessToken) {
  try {
    // Create authenticated Supabase client with user's session token
    const authenticatedSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    });

    // First verify user owns the conversation
    const { data: conversation, error: convError } = await authenticatedSupabase
      .from('conversations')
      .select('user_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.user_id !== userId) {
      throw new Error('Unauthorized access to conversation');
    }

    // Add message
    const { data, error } = await authenticatedSupabase
      .from('messages')
      .insert([{
        conversation_id: conversationId,
        role: role,
        content: content
      }])
      .select()
      .single();

    if (error) {
      console.error('Supabase error adding message:', error);
      throw new Error('Failed to add message');
    }

    return { success: true, message: data };
  } catch (error) {
    console.error('Error adding message:', error);
    throw error;
  }
}

module.exports = {
  // Conversation operations
  createConversation,
  getUserConversations,
  updateConversationTitle,
  deleteConversation,
  
  // Message operations
  getConversationMessages,
  addMessage
};
