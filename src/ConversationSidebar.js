// === CONVERSATION SIDEBAR COMPONENT ===
// Sidebar for managing user conversations with add/delete functionality
import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import './ConversationSidebar.css'

const ConversationSidebar = ({ 
  currentConversationId, 
  onConversationSelect, 
  onNewConversation 
}) => {
  // === STATE MANAGEMENT ===
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [canAddConversation, setCanAddConversation] = useState(true)
  const [editingId, setEditingId] = useState(null)

  // === LOAD CONVERSATIONS ON COMPONENT MOUNT ===
  useEffect(() => {
    loadConversations()
  }, [])

  // === LOAD USER'S CONVERSATIONS ===
  const loadConversations = async () => {
    try {
      setLoading(true)
      setError('')

             console.log('Testing database connection...')
       const { data, error } = await supabase
         .from('conversations')
         .select('*')
         .order('updated_at', { ascending: false })

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log('Database connection successful, conversations:', data)
      setConversations(data || [])
      setCanAddConversation((data || []).length < 3)
    } catch (error) {
      console.error('Error loading conversations:', error)
      setError('Failed to load conversations: ' + error.message)
      // Set empty conversations to show the sidebar
      setConversations([])
      setCanAddConversation(true)
    } finally {
      setLoading(false)
    }
  }

  // === CREATE NEW CONVERSATION ===
  const handleNewConversation = async () => {
    try {
      setError('')

      // First, get the current user to ensure authentication
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        console.error('User not authenticated:', userError)
        throw new Error('User not authenticated')
      }

      console.log('Creating conversation for user:', user.id)

      const { data, error } = await supabase
        .from('conversations')
        .insert([
          { 
            title: 'New Conversation',
            user_id: user.id
          }
        ])
        .select()
        .single()

      if (error) {
        console.error('Supabase error:', error)
        if (error.message.includes('Maximum 3 conversations')) {
          setError('Maximum 3 conversations reached')
          setCanAddConversation(false)
        } else {
          throw error
        }
      } else {
        // Add new conversation to list and select it
        setConversations(prev => {
          const newConversations = [data, ...prev]
          setCanAddConversation(newConversations.length < 3)
          return newConversations
        })
        onNewConversation(data)
      }
    } catch (error) {
      console.error('Error creating conversation:', error)
      setError('Failed to create conversation: ' + error.message)
      
      // Create a temporary conversation for testing
      const tempConversation = {
        id: 'temp-' + Date.now(),
        title: 'New Conversation',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: 'temp'
      }
      onNewConversation(tempConversation)
    }
  }

  // === UPDATE CONVERSATION TITLE ===
  const handleUpdateTitle = async (conversationId, newTitle) => {
    try {
      // First, get the current user to ensure authentication
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        console.error('User not authenticated:', userError)
        throw new Error('User not authenticated')
      }

      const { error } = await supabase
        .from('conversations')
        .update({ title: newTitle })
        .eq('id', conversationId)
        .eq('user_id', user.id) // Ensure user owns the conversation

      if (error) {
        throw error
      }

      // Update local state
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, title: newTitle }
            : conv
        )
      )
    } catch (error) {
      console.error('Error updating conversation title:', error)
      setError('Failed to update conversation title')
    }
  }

  // === DELETE CONVERSATION ===
  const handleDeleteConversation = async (conversationId, event) => {
    event.stopPropagation() // Prevent conversation selection

    try {
      setError('')
      console.log('Attempting to delete conversation:', conversationId)

      // First, refresh the session and get the current user
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        console.error('Session error:', sessionError)
        throw new Error('No active session')
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        console.error('User not authenticated:', userError)
        throw new Error('User not authenticated')
      }

      console.log('User authenticated:', user.id)
      console.log('Session valid:', !!session)

      // First, let's test if we can read the conversation
      console.log('Testing conversation access...')
      const { data: testData, error: testError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single()

      if (testError) {
        console.error('Cannot read conversation:', testError)
        throw new Error('Cannot access conversation: ' + testError.message)
      }

      console.log('Conversation found:', testData)

      // Delete the conversation entirely
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)

      if (error) {
        console.error('Supabase delete error:', error)
        throw error
      }

             console.log('Delete successful')

      // Remove from local state and update conversation count
      setConversations(prev => {
        const newConversations = prev.filter(conv => conv.id !== conversationId)
        setCanAddConversation(newConversations.length < 3)
        return newConversations
      })

      // If this was the current conversation, clear it
      if (currentConversationId === conversationId) {
        onConversationSelect(null)
      }
    } catch (error) {
      console.error('Error deleting conversation:', error)
      setError('Failed to delete conversation: ' + error.message)
    }
  }

  // === FORMAT CONVERSATION TITLE ===
  const formatTitle = (title, updatedAt) => {
    if (title && title !== 'New Conversation') {
      return title
    }
    
    // Use date if no custom title
    const date = new Date(updatedAt)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  // === EDITABLE TITLE COMPONENT ===
  const EditableTitle = ({ conversation, isEditing, onEdit, onSave, onCancel }) => {
    const [editValue, setEditValue] = useState(conversation.title === 'New Conversation' ? '' : conversation.title)

    const handleSave = () => {
      const newTitle = editValue.trim() || formatTitle(conversation.title, conversation.updated_at)
      onSave(conversation.id, newTitle)
      onCancel()
    }

    const handleKeyPress = (e) => {
      if (e.key === 'Enter') {
        handleSave()
      } else if (e.key === 'Escape') {
        onCancel()
      }
    }

    if (isEditing) {
      return (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyPress={handleKeyPress}
          onBlur={handleSave}
          autoFocus
          className="editable-title-input"
          placeholder={formatTitle(conversation.title, conversation.updated_at)}
        />
      )
    }

    return (
      <div 
        className="conversation-title"
        onDoubleClick={() => onEdit(conversation.id)}
        title="Double-click to edit title"
      >
        {formatTitle(conversation.title, conversation.updated_at)}
      </div>
    )
  }

    // === RENDER SIDEBAR ===
  return (
    <div className="conversation-sidebar">
      {/* === HEADER === */}
      <div className="sidebar-header">
        <h3>Conversations</h3>
        <button 
          className={`new-conversation-btn ${!canAddConversation ? 'disabled' : ''}`}
          onClick={handleNewConversation}
          disabled={!canAddConversation}
          title={!canAddConversation ? 'Maximum 3 conversations reached' : 'Start new conversation'}
        >
          + New Conversation
        </button>
      </div>

      {/* === ERROR MESSAGE === */}
      {error && (
        <div className="sidebar-error">
          {error}
          <br />
          <small>You can still create new conversations.</small>
        </div>
      )}

      {/* === CONVERSATION LIST === */}
      <div className="conversation-list">
        {loading ? (
          <div className="loading-message">Loading conversations...</div>
        ) : conversations.length === 0 ? (
          <div className="empty-state">
            <p>No conversations yet</p>
            <p>Start your first conversation!</p>
          </div>
        ) : (
          conversations.map(conversation => (
            <div
              key={conversation.id}
              className={`conversation-item ${currentConversationId === conversation.id ? 'active' : ''}`}
              onClick={() => onConversationSelect(conversation)}
            >
              <div className="conversation-content">
                <EditableTitle
                  conversation={conversation}
                  isEditing={editingId === conversation.id}
                  onEdit={setEditingId}
                  onSave={handleUpdateTitle}
                  onCancel={() => setEditingId(null)}
                />
                <div className="conversation-date">
                  {new Date(conversation.updated_at).toLocaleDateString()}
                </div>
              </div>
              <button
                className="delete-conversation-btn"
                onClick={(e) => handleDeleteConversation(conversation.id, e)}
                title="Delete conversation"
              >
                🗑️
              </button>
            </div>
          ))
        )}
      </div>

      {/* === FOOTER === */}
      <div className="sidebar-footer">
        <div className="conversation-count">
          {conversations.length}/3 conversations
        </div>
      </div>
    </div>
  )
}

export default ConversationSidebar
