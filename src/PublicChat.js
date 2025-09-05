// === PUBLIC CHAT COMPONENT ===
// Simple chat interface for unauthenticated users
// Maintains same aesthetic as main app but without database features

import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

// === SAFE TEXT FORMATTER COMPONENT (Same as App.js) ===
const FormattedText = ({ text }) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const boldText = part.slice(2, -2);
          return <strong key={index}>{boldText}</strong>;
        }
        return part;
      })}
    </>
  );
};

// === MAIN PUBLIC CHAT COMPONENT ===
function PublicChat({ onSignUp }) {
  // === STATE MANAGEMENT ===
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: 'Hello! I\'m your educational AI assistant. My name is Honorably. I am a GPT-4o model that is designed to help you learn and understand the material, rather than giving you direct solutions. I believe in you!'
  }]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // === AUTO-SCROLL TO BOTTOM ===
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // === SEND MESSAGE FUNCTION ===
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    // Add user message to chat
    const userMessageObj = { role: 'user', content: userMessage };
    setMessages(prev => [...prev, userMessageObj]);
    setIsLoading(true);

    try {
      // Call public GPT endpoint (no authentication required)
      const backendUrl = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000';
      const response = await axios.post(`${backendUrl}/api/public/gpt`, {
        message: userMessage,
        maxTokens: 300,
        temperature: 0.7
      });

      // Add AI response to chat
      const aiMessageObj = { role: 'assistant', content: response.data.response };
      setMessages(prev => [...prev, aiMessageObj]);

    } catch (error) {
      console.error('Error calling backend:', error);
      
      let errorMessage = 'Sorry, I encountered an error. Please try again.';
      
      if (error.response?.status === 400 && error.response?.data?.flagged) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 429) {
        errorMessage = 'Too many requests. Please wait a moment before trying again.';
      }
      
      const errorMessageObj = { role: 'assistant', content: errorMessage };
      setMessages(prev => [...prev, errorMessageObj]);
    } finally {
      setIsLoading(false);
    }
  };

  // === KEYBOARD SHORTCUT HANDLER ===
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // === JSX RETURN ===
  return (
    <div className="app">
      {/* === MAIN CHAT AREA === */}
      <div className="main-chat-area">
        {/* === HEADER SECTION === */}
        <header className="header">
          <div className="logo">
            <span className="logo-icon">🎓</span>
            <a 
              href="https://anirudhchamarthi.substack.com/p/honorably?r=4l7fsq" 
              target="_blank" 
              rel="noopener noreferrer"
              className="logo-text"
              title="Read more here!"
            >
              Honorably
            </a>
          </div>
          

          
          {/* === SIGN IN BUTTON === */}
          <div className="user-menu">
            <button onClick={onSignUp} className="sign-up-button">
              Sign In
            </button>
          </div>
        </header>

        {/* === CHAT MESSAGES SECTION === */}
        <div className="chat-container">
          <div className="messages">
                         {/* === WELCOME MESSAGE === */}
             <div className="welcome-message">
               <div className="welcome-content">
                 <h2>Welcome to Honorably!</h2>
                 <p>Sign up or sign in to save conversations!</p>
               </div>
             </div>

            {/* === LOOP THROUGH ALL MESSAGES === */}
            {messages.map((message, index) => (
              <div key={index} className={`message ${message.role}`}>
                {/* === MESSAGE AVATAR === */}
                <div className="message-avatar">
                  {message.role === 'user' ? '🙋' : '🤖'}
                </div>
                
                {/* === MESSAGE CONTENT === */}
                <div className="message-content">
                  <div className="message-text">
                    <FormattedText text={message.content} />
                  </div>
                </div>
              </div>
            ))}
            
            {/* === TYPING INDICATOR === */}
            {isLoading && (
              <div className="message assistant">
                <div className="message-avatar">🤖</div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            
            {/* === INVISIBLE SCROLL TARGET === */}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* === INPUT AREA SECTION === */}
        <div className="input-container">
          <div className="input-wrapper">
            {/* === TEXT INPUT FIELD === */}
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything! I'll help you learn..."
              disabled={isLoading}
              rows="1"
            />
            
            {/* === SEND BUTTON === */}
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="send-button"
            >
              📤
            </button>
          </div>
          
          {/* === HELP TEXT === */}
          <div className="input-footer">
            <small>Press Enter to send • Shift+Enter for new line</small>
            <div className="privacy-notice">
              <small>🔒 Privacy-first: Your messages are not saved. Sign up to save conversations.</small>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}

export default PublicChat;
