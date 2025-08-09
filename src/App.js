// === IMPORTS ===
import React, { useState, useRef, useEffect } from 'react';  // React hooks for state and lifecycle
import axios from 'axios';                                   // HTTP client for API calls
import './App.css';                                          // Styling for this component

// === MAIN CHAT APPLICATION COMPONENT ===
function App() {
  // === STATE MANAGEMENT (React Hooks) ===
  const [messages, setMessages] = useState([               // Array of all chat messages
    {
      role: 'assistant',                                   // Who sent it: 'user' or 'assistant'
      content: 'Hello! I\'m your educational AI assistant. My name is Honorably.'  // The actual message text
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');    // What user is currently typing
  const [isLoading, setIsLoading] = useState(false);      // True when waiting for AI response
  const messagesEndRef = useRef(null);                    // Reference to scroll to bottom

  // === AUTO-SCROLL TO BOTTOM FUNCTION ===
  const scrollToBottom = () => {
    // Smoothly scroll the chat to the bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // === SIDE EFFECT: SCROLL WHEN MESSAGES CHANGE ===
  useEffect(() => {
    scrollToBottom();                                      // Run scrollToBottom every time messages array changes
  }, [messages]);                                          // Dependency array: only run when 'messages' changes

  // === MAIN FUNCTION: SEND MESSAGE TO BACKEND ===
  const sendMessage = async () => {
    // Guard clause: Don't send if input is empty or already loading
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();             // Clean up the message
    setInputMessage('');                                 // Clear the input field immediately
    
    // === STEP 1: ADD USER MESSAGE TO CHAT ===
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);  // Spread operator adds new message to array
    setIsLoading(true);                                  // Show typing indicator

    try {
      // === STEP 2: CALL YOUR BACKEND API ===
      const backendUrl = process.env.NODE_ENV === 'production' 
        ? '' // In production, use same domain (Vercel handles routing)
        : 'http://localhost:3000'; // In development, use localhost
      const response = await axios.post(`${backendUrl}/api/gpt`, {  // HTTP POST request
        message: userMessage,                            // Send the user's message
        maxTokens: 300,                                  // Limit response length
        temperature: 0.7                                 // Control AI creativity (0-1)
      });

      // === STEP 3: ADD AI RESPONSE TO CHAT ===
      setMessages(prev => [...prev, {                   // Add AI response to messages array
        role: 'assistant', 
        content: response.data.response                  // Extract response text from API result
      }]);

    } catch (error) {
      // === STEP 4: HANDLE ERRORS GRACEFULLY ===
      console.error('Error calling backend:', error);   // Log error for debugging
      
      // Show user-friendly error message in chat
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please make sure the backend server is running on port 3000.' 
      }]);
    } finally {
      setIsLoading(false);                               // Always hide typing indicator when done
    }
  };

  // === KEYBOARD SHORTCUT HANDLER ===
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {             // If Enter pressed (but not Shift+Enter)
      e.preventDefault();                                // Prevent default newline behavior
      sendMessage();                                     // Send the message instead
    }
    // Note: Shift+Enter still creates new lines in textarea
  };

  // === JSX RETURN: THE ACTUAL HTML STRUCTURE ===
  return (
    <div className="app">                                {/* Main container for entire app */}
      
      {/* === HEADER SECTION === */}
      <header className="header">                        {/* Top navigation bar */}
        <div className="logo">                           {/* Logo container */}
          <span className="logo-icon">🎓</span>          {/* Emoji icon */}
          <span className="logo-text">Honorably</span>   {/* App name */}
        </div>
      </header>

      {/* === CHAT MESSAGES SECTION === */}
      <div className="chat-container">                   {/* Scrollable container for all messages */}
        <div className="messages">                       {/* Inner wrapper for message list */}
          
          {/* === LOOP THROUGH ALL MESSAGES === */}
          {messages.map((message, index) => (            /* .map() creates one div per message */
            <div key={index} className={`message ${message.role}`}>  {/* Dynamic CSS class: "message user" or "message assistant" */}
              
              {/* === MESSAGE AVATAR === */}
              <div className="message-avatar">           {/* Profile picture area */}
                {message.role === 'user' ? ':)' : '🤖'}  {/* Conditional emoji: user gets smiley, AI gets robot */}
              </div>
              
              {/* === MESSAGE CONTENT === */}
              <div className="message-content">          {/* Container for the actual message */}
                <div className="message-text">           {/* The speech bubble */}
                  {message.content}                      {/* The actual text of the message */}
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
            placeholder="Ask me anything! I'll help you learn..."  /* Hint text when empty */
            disabled={isLoading}                         /* Disable input while AI is responding */
            rows="1"                                     /* Start with single line (auto-expands) */
          />
          
          {/* === SEND BUTTON === */}
          <button                                        /* Submit button */
            onClick={sendMessage}                        /* Call sendMessage function when clicked */
            disabled={!inputMessage.trim() || isLoading}  /* Disable if empty message or loading */
            className="send-button"                      /* CSS class for styling */
          >
            📤                                           {/* Send icon emoji */}
          </button>
        </div>
        
        {/* === HELP TEXT === */}
        <div className="input-footer">                   {/* Small instruction text */}
          <small>Press Enter to send • Shift+Enter for new line</small>  {/* User instructions */}
        </div>
      </div>
      {/* Close main app container */}
    </div>
  );
}                                                        /* End of App function */

// === EXPORT FOR USE IN OTHER FILES ===
export default App;                                      /* Make this component available to import */
