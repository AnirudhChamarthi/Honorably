// === AUTHENTICATION FORM COMPONENT ===
// Clean login/signup form with email and password
import React, { useState } from 'react'
import { supabase } from './supabaseClient'
import './AuthForm.css'

const AuthForm = ({ onAuthSuccess }) => {
  // === STATE MANAGEMENT ===
  const [isSignUp, setIsSignUp] = useState(false)  // Toggle between login/signup
  const [showForgotPassword, setShowForgotPassword] = useState(false)  // Toggle forgot password view
  const [email, setEmail] = useState('')           // User email input
  const [password, setPassword] = useState('')     // User password input
  const [loading, setLoading] = useState(false)    // Loading state for form submission
  const [error, setError] = useState('')           // Error message display
  const [success, setSuccess] = useState('')       // Success message display

  // === EMAIL/PASSWORD AUTHENTICATION ===
  const handleEmailAuth = async (e) => {
    e.preventDefault()                             // Prevent form submission
    setLoading(true)                               // Show loading state
    setError('')                                   // Clear previous errors
    setSuccess('')                                 // Clear previous success messages

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

  // === FORGOT PASSWORD HANDLER ===
  const handleForgotPassword = async (e) => {
    e.preventDefault()                             // Prevent form submission
    setLoading(true)                               // Show loading state
    setError('')                                   // Clear previous errors
    setSuccess('')                                 // Clear previous success messages

    try {
      const result = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
      })

      if (result.error) {
        setError(result.error.message)             // Display error message
      } else {
        setSuccess('Password reset email sent! Check your inbox.')  // Show success message
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
          <h2>
np            {showForgotPassword ? 'Reset Password' : (isSignUp ? 'Create Account' : (
              <a 
                href="https://anirudhchamarthi.substack.com/p/honorably?r=4l7fsq" 
                target="_blank" 
                rel="noopener noreferrer"
                className="logo-text"
                title="Read more here!"
              >
                Honorably
              </a>
            ))}
          </h2>
          <p>
            {showForgotPassword 
              ? 'Enter your email to receive a reset link' 
              : (isSignUp ? 'Sign up to get started' : 'Sign in to continue')
            }
          </p>
        </div>

        {/* === FORGOT PASSWORD FORM === */}
        {showForgotPassword ? (
          <form onSubmit={handleForgotPassword}>
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

            {/* === ERROR/Success MESSAGE === */}
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            {/* === SUBMIT BUTTON === */}
            <button 
              type="submit" 
              className="auth-button"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        ) : (
          /* === REGULAR AUTHENTICATION FORM === */
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
        )}

        {/* === FOOTER LINKS === */}
        <div className="auth-footer">
          {showForgotPassword ? (
            <p>
              Remember your password?
              <button
                type="button"
                className="toggle-auth"
                onClick={() => {
                  setShowForgotPassword(false)
                  setError('')
                  setSuccess('')
                }}
              >
                Back to Sign In
              </button>
            </p>
          ) : (
            <>
              <p>
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                <button
                  type="button"
                  className="toggle-auth"
                  onClick={() => {
                    setIsSignUp(!isSignUp)
                    setError('')
                    setSuccess('')
                  }}
                >
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </button>
              </p>
              {!isSignUp && (
                <p>
                  <button
                    type="button"
                    className="toggle-auth forgot-password-link"
                    onClick={() => {
                      setShowForgotPassword(true)
                      setError('')
                      setSuccess('')
                    }}
                  >
                    Forgot your password?
                  </button>
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuthForm
