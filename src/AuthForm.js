// === AUTHENTICATION FORM COMPONENT ===
// Clean login/signup form with email and password
import React, { useState } from 'react'
import { supabase } from './supabaseClient'
import './AuthForm.css'

const AuthForm = ({ onAuthSuccess }) => {
  // === STATE MANAGEMENT ===
  const [isSignUp, setIsSignUp] = useState(false)  // Toggle between login/signup
  const [email, setEmail] = useState('')           // User email input
  const [password, setPassword] = useState('')     // User password input
  const [loading, setLoading] = useState(false)    // Loading state for form submission
  const [error, setError] = useState('')           // Error message display

  // === EMAIL/PASSWORD AUTHENTICATION ===
  const handleEmailAuth = async (e) => {
    e.preventDefault()                             // Prevent form submission
    setLoading(true)                               // Show loading state
    setError('')                                   // Clear previous errors

    try {
      let result
      
      if (isSignUp) {
        // === SIGN UP PROCESS ===
        result = await supabase.auth.signUp({
          email: email,
          password: password,
        })
      } else {
        // === SIGN IN PROCESS ===
        result = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        })
      }

      // === HANDLE AUTHENTICATION RESULT ===
      if (result.error) {
        setError(result.error.message)             // Display error message
      } else if (result.data.user) {
        onAuthSuccess(result.data.user)            // Pass user to parent component
      }
    } catch (error) {
      setError('An unexpected error occurred')     // Handle unexpected errors
    } finally {
      setLoading(false)                            // Hide loading state
    }
  }

  // === FORM RENDER ===
  return (
    <div className="auth-container">
      <div className="auth-form">
        {/* === HEADER === */}
                            <div className="auth-header">
                      <h2>{isSignUp ? 'Create Account' : 'Honorably'}</h2>
                      <p>{isSignUp ? 'Sign up to get started' : 'Sign in to continue'}</p>
                    </div>

        {/* === AUTHENTICATION FORM === */}
        <form onSubmit={handleEmailAuth}>
          {/* === EMAIL FIELD === */}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          {/* === PASSWORD FIELD === */}
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {/* === ERROR MESSAGE === */}
          {error && <div className="error-message">{error}</div>}

          {/* === SUBMIT BUTTON === */}
          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        {/* === TOGGLE AUTH MODE === */}
        <div className="auth-footer">
          <p>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            <button
              type="button"
              className="toggle-auth"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default AuthForm
