// === IMPORTS ===
import React, { useState, useRef, useEffect } from 'react';  // React hooks for state and lifecycle
import axios from 'axios';                                   // HTTP client for API calls
import { supabase } from './supabaseClient';                 // Supabase client for authentication
import AuthForm from './AuthForm';                           // Authentication form component
import PasswordReset from './PasswordReset';                 // Password reset component
import ConversationSidebar from './ConversationSidebar';     // Conversation sidebar component
import './App.css';                                          // Styling for this component

// === SAFE TEXT FORMATTER COMPONENT ===
const FormattedText = ({ text }) => {
  // Split text by ** patterns and create elements
  const parts = text.split(/(\*\*.*?\*\*)/g);
  
  return (
    <>
      {parts.map((part, index) => {
        // Check if this part is wrapped in **
        if (part.startsWith('**') && part.endsWith('**')) {
          // Remove the ** and make it bold
          const boldText = part.slice(2, -2);
          return <strong key={index}>{boldText}</strong>;
        }
        // Regular text
        return part;
      })}
    </>
  );
};

// === MAIN CHAT APPLICATION COMPONENT ===
function App() {
  // === STATE MANAGEMENT (React Hooks) ===
  const [user, setUser] = useState(null);                  // Current authenticated user
  const [loading, setLoading] = useState(true);            // Loading state for auth check
  const [showPasswordReset, setShowPasswordReset] = useState(false); // Show password reset form
  const [currentConversation, setCurrentConversation] = useState(null); // Current selected conversation
  const [messages, setMessages] = useState([]);            // Array of all chat messages
  const [inputMessage, setInputMessage] = useState('');    // What user is currently typing
  const [isLoading, setIsLoading] = useState(false);      // True when waiting for AI response
  const messagesEndRef = useRef(null);                    // Reference to scroll to bottom

  // === AUTO-SCROLL TO BOTTOM FUNCTION ===
  const scrollToBottom = () => {
    // Smoothly scroll the chat to the bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // === AUTHENTICATION EFFECTS ===
  useEffect(() => {
    // Check for existing session on app load
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }
    
    checkUser()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event, session)
        
        if (event === 'PASSWORD_RECOVERY') {
          // User clicked password reset link - show password reset form
          setUser(session?.user ?? null)
          setShowPasswordReset(true)
          setLoading(false)
        } else if (event === 'SIGNED_IN') {
          setUser(session?.user ?? null)
          setShowPasswordReset(false)
          setLoading(false)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setShowPasswordReset(false)
          setLoading(false)
        } else {
          setUser(session?.user ?? null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // === AUTHENTICATION HANDLERS ===
  const handleAuthSuccess = (user) => {
    setUser(user)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setCurrentConversation(null)
    setMessages([])
  }

  // === SIDE EFFECT: SCROLL WHEN MESSAGES CHANGE ===
  useEffect(() => {
    scrollToBottom();                                      // Run scrollToBottom every time messages array changes
  }, [messages]);                                          // Dependency array: only run when 'messages' changes

  // === CONVERSATION MANAGEMENT FUNCTIONS ===
  const handleConversationSelect = async (conversation) => {
    setCurrentConversation(conversation)
    setMessages([]) // Clear current messages
    
    if (conversation) {
      await loadConversationMessages(conversation.id)
    }
  }

  const handleNewConversation = (conversation) => {
    setCurrentConversation(conversation)
    setMessages([{
      role: 'assistant',
      content: 'Hello! I\'m your educational AI assistant. My name is Honorably. I am a GPT-4o model that is designed to help you learn and understand the material. I believe in you!'
    }])
  }

  // === LOAD MESSAGES FOR SELECTED CONVERSATION ===
  const loadConversationMessages = async (conversationId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      const backendUrl = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000'
      const response = await fetch(`${backendUrl}/api/conversations/${conversationId}/messages`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()

      if (data && data.length > 0) {
        setMessages(data)
      } else {
        // Show welcome message for empty conversation
        setMessages([{
          role: 'assistant',
          content: 'Hello! I\'m your educational AI assistant. My name is Honorably. I am a GPT-4o model that is designed to help you learn and understand the material. I believe in you!'
        }])
      }
    } catch (error) {
      console.error('Error loading messages:', error)
      setMessages([{
        role: 'assistant',
        content: 'Sorry, I encountered an error loading the conversation. Please try again.'
      }])
    }
  }

  // === MAIN FUNCTION: SEND MESSAGE TO BACKEND ===
  const sendMessage = async () => {
    // Guard clause: Don't send if input is empty, already loading, or no conversation selected
    if (!inputMessage.trim() || isLoading || !currentConversation) return;

    const userMessage = inputMessage.trim();             // Clean up the message
    setInputMessage('');                                 // Clear the input field immediately
    
    // === STEP 1: ADD USER MESSAGE TO CHAT ===
    const userMessageObj = { role: 'user', content: userMessage }
    setMessages(prev => [...prev, userMessageObj]);     // Spread operator adds new message to array
    setIsLoading(true);                                  // Show typing indicator

    try {
      // === STEP 2: SAVE USER MESSAGE TO DATABASE ===
      await saveMessageToDatabase(userMessageObj)

      // === STEP 3: GET AUTHENTICATION TOKEN ===
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      // === STEP 4: CALL YOUR BACKEND API ===
      const backendUrl = process.env.NODE_ENV === 'production' 
        ? '' // In production, use same domain (Vercel handles routing)
        : 'http://localhost:3000'; // In development, use localhost
      const response = await axios.post(`${backendUrl}/api/gpt`, {  // HTTP POST request
        message: userMessage,                            // Send the user's message
        maxTokens: 300,                                  // Limit response length
        temperature: 0.7                                 // Control AI creativity (0-1)
      }, {
        headers: {
          'Authorization': `Bearer ${session.access_token}` // Include auth token
        }
      });

      // === STEP 5: ADD AI RESPONSE TO CHAT ===
      const aiMessageObj = { role: 'assistant', content: response.data.response }
      setMessages(prev => [...prev, aiMessageObj]);     // Add AI response to messages array

      // === STEP 6: SAVE AI MESSAGE TO DATABASE ===
      await saveMessageToDatabase(aiMessageObj)

    } catch (error) {
      // === STEP 7: HANDLE ERRORS GRACEFULLY ===
      console.error('Error calling backend:', error);   // Log error for debugging
      
      let errorMessage = 'Sorry, I encountered an error. Please make sure the backend server is running on port 3000.';
      
      // Handle specific error types
      if (error.response?.status === 400 && error.response?.data?.flagged) {
        // Content moderation rejection (violent/criminal content only)
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 429) {
        // Rate limiting
        errorMessage = 'Too many requests. Please wait a moment before trying again.';
      }
      
      // Show appropriate error message in chat
      const errorMessageObj = { role: 'assistant', content: errorMessage }
      setMessages(prev => [...prev, errorMessageObj]);
      
      // Save error message to database
      await saveMessageToDatabase(errorMessageObj)
    } finally {
      setIsLoading(false);                               // Always hide typing indicator when done
    }
  };

  // === SAVE MESSAGE TO DATABASE ===
  const saveMessageToDatabase = async (messageObj) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      const backendUrl = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000'
      const response = await fetch(`${backendUrl}/api/conversations/${currentConversation.id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: messageObj.role,
          content: messageObj.content
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error saving message to database:', errorData.error)
      } else {
        // Update conversation title if it's still "New Conversation" and this is the first user message
        if (currentConversation.title === 'New Conversation' && messageObj.role === 'user') {
          await updateConversationTitle(currentConversation.id, messageObj.content)
        }
      }
    } catch (error) {
      console.error('Error saving message to database:', error)
    }
  }

  // === UPDATE CONVERSATION TITLE ===
  const updateConversationTitle = async (conversationId, userMessage) => {
    try {
      // Create a title from the first user message (truncate if too long)
      const title = userMessage.length > 50 
        ? userMessage.substring(0, 50) + '...' 
        : userMessage

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      const backendUrl = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000'
      const response = await fetch(`${backendUrl}/api/conversations/${conversationId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: title })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error updating conversation title:', errorData.error)
      } else {
        // Update local state
        setCurrentConversation(prev => prev ? { ...prev, title: title } : null)
      }
    } catch (error) {
      console.error('Error updating conversation title:', error)
    }
  }

  // === KEYBOARD SHORTCUT HANDLER ===
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {             // If Enter pressed (but not Shift+Enter)
      e.preventDefault();                                // Prevent default newline behavior
      sendMessage();                                     // Send the message instead
    }
    // Note: Shift+Enter still creates new lines in textarea
  };

  // === JSX RETURN: THE ACTUAL HTML STRUCTURE ===
  
  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Show password reset form if user is in password recovery mode
  if (showPasswordReset) {
    return <PasswordReset onComplete={() => setShowPasswordReset(false)} />;
  }

  // Show authentication form if user is not logged in
  if (!user) {
    return <AuthForm onAuthSuccess={handleAuthSuccess} />;
  }

  // Show main chat interface if user is authenticated
  return (
    <div className="app">                                {/* Main container for entire app */}
      
       {/* === SIDEBAR SECTION === */}
       <ConversationSidebar
         currentConversationId={currentConversation?.id}
         onConversationSelect={handleConversationSelect}
         onNewConversation={handleNewConversation}
         key={currentConversation?.id} // Force re-render when conversation changes
       />

      {/* === MAIN CHAT AREA === */}
      <div className="main-chat-area">
        {/* === HEADER SECTION === */}
        <header className="header">                        {/* Top navigation bar */}
          <div className="logo">                           {/* Logo container */}
            <span className="logo-icon">🎓</span>          {/* Emoji icon */}
            <span className="logo-text">Honorably</span>   {/* App name */}
          </div>
          
          {/* === USER MENU === */}
          <div className="user-menu">
            <button onClick={handleSignOut} className="sign-out-button">
              Sign Out
            </button>
          </div>
        </header>

        {/* === CHAT MESSAGES SECTION === */}
        <div className="chat-container">                   {/* Scrollable container for all messages */}
          <div className="messages">                       {/* Inner wrapper for message list */}
            
            {/* === NO CONVERSATION SELECTED === */}
            {!currentConversation && (
              <div className="no-conversation-message">
                <div className="no-conversation-content">
                  <h2>Welcome to Honorably!</h2>
                  <p>Select a conversation from the sidebar or create a new one to get started.</p>
                </div>
              </div>
            )}

            {/* === LOOP THROUGH ALL MESSAGES === */}
            {currentConversation && messages.map((message, index) => (            /* .map() creates one div per message */
              <div key={index} className={`message ${message.role}`}>  {/* Dynamic CSS class: "message user" or "message assistant" */}
                
                {/* === MESSAGE AVATAR === */}
                <div className="message-avatar">           {/* Profile picture area */}
                  {message.role === 'user' ? '🙋' : '🤖'}  {/* Conditional emoji: user gets friendly hand-raise, AI gets robot */}
                </div>
                
                {/* === MESSAGE CONTENT === */}
                <div className="message-content">          {/* Container for the actual message */}
                  <div className="message-text">           {/* The speech bubble */}
                    <FormattedText text={message.content} /> {/* Safe formatting component */}
                  </div>
                </div>
              </div>
            ))}
            
            {/* === TYPING INDICATOR (CONDITIONAL) === */}
            {isLoading && (                                /* Only show when AI is "thinking" */
              <div className="message assistant">         {/* Styled like an AI message */}
                <div className="message-avatar">🤖</div>   {/* Robot avatar */}
                <div className="message-content">
                  <div className="typing-indicator">       {/* The animated "..." dots */}
                    <span></span>                          {/* Dot 1 */}
                    <span></span>                          {/* Dot 2 */}
                    <span></span>                          {/* Dot 3 - each animates with delay */}
                  </div>
                </div>
              </div>
            )}
            
            {/* === INVISIBLE SCROLL TARGET === */}
            <div ref={messagesEndRef} />                   {/* This div is used by scrollToBottom() function */}
          </div>
        </div>

        {/* === INPUT AREA SECTION === */}
        <div className="input-container">                  {/* Bottom section for user input */}
          <div className="input-wrapper">                  {/* Container for textarea + send button */}
            
            {/* === TEXT INPUT FIELD === */}
            <textarea                                      /* Multi-line text input */
              value={inputMessage}                         /* Controlled component: React manages the value */
              onChange={(e) => setInputMessage(e.target.value)}  /* Update state when user types */
              onKeyPress={handleKeyPress}                  /* Listen for Enter key presses */
              placeholder={currentConversation ? "Ask me anything! I'll help you learn..." : "Select a conversation to start chatting..."}  /* Hint text when empty */
              disabled={isLoading || !currentConversation}  /* Disable input while AI is responding or no conversation selected */
              rows="1"                                     /* Start with single line (auto-expands) */
            />
            
            {/* === SEND BUTTON === */}
            <button                                        /* Submit button */
              onClick={sendMessage}                        /* Call sendMessage function when clicked */
              disabled={!inputMessage.trim() || isLoading || !currentConversation}  /* Disable if empty message, loading, or no conversation */
              className="send-button"                      /* CSS class for styling */
            >
              📤                                           {/* Send icon emoji */}
            </button>
          </div>
          
          {/* === HELP TEXT === */}
          <div className="input-footer">                   {/* Small instruction text */}
            <small>Press Enter to send • Shift+Enter for new line</small>  {/* User instructions */}
            <div className="privacy-notice">
              <small>🔒 Privacy-first: We use temporary sessions for rate limiting only. No personal data is stored or shared.</small>
            </div>
          </div>
        </div>
      </div>
      {/* Close main app container */}
    </div>
  );
}                                                        /* End of App function */

// === EXPORT FOR USE IN OTHER FILES ===
export default App;                                      /* Make this component available to import */
