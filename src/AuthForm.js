// === AUTHENTICATION FORM COMPONENT ===
// Clean login/signup form with email and password
import React, { useState } from 'react'
import { supabase } from './supabaseClient'
import './AuthForm.css'

const AuthForm = ({ onAuthSuccess }) => {
  // === STATE MANAGEMENT ===
  const [isSignUp, setIsSignUp] = useState(false)  // Toggle between login/signup
  const [showForgotPassword, setShowForgotPassword] = useState(false)  // Toggle forgot password view
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false)  // Toggle email confirmation view
  const [email, setEmail] = useState('')           // User email input
  const [password, setPassword] = useState('')     // User password input
  const [loading, setLoading] = useState(false)    // Loading state for form submission
  const [resendLoading, setResendLoading] = useState(false)  // Loading state for resend
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
        // First, clean up any unconfirmed users with this email
        try {
          const response = await fetch('/api/auth/cleanup-unconfirmed', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
          })
          
          if (!response.ok) {
            const errorData = await response.json()
            if (errorData.emailExists) {
              setError('Email already registered. Please sign in instead.')
              setLoading(false)
              return
            } else {
              console.error('Error cleaning up unconfirmed users')
            }
          }
        } catch (error) {
          console.error('Error cleaning up unconfirmed users:', error)
        }
        
        result = await supabase.auth.signUp({
          email: email,
          password: password,
          redirectTo: 'https://www.honorably.art'
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
        if (isSignUp && !result.data.user.email_confirmed_at) {
          // Show email confirmation screen for new signups
          setShowEmailConfirmation(true)
          setSuccess('Account created! Please check your email to confirm your account.')
        } else {
          onAuthSuccess(result.data.user)            // Pass user to parent component
        }
      }
    } catch (error) {
      setError('An unexpected error occurred')     // Handle unexpected errors
    } finally {
      setLoading(false)                            // Hide loading state
    }
  }

  // === RESEND CONFIRMATION EMAIL ===
  const handleResendConfirmation = async () => {
    setResendLoading(true)
    setError('')
    setSuccess('')

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email
      })

      if (resendError) {
        setError(resendError.message)
      } else {
        setSuccess('Confirmation email sent! Please check your inbox.')
      }
    } catch (error) {
      setError('An unexpected error occurred')
    } finally {
      setResendLoading(false)
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
            {showForgotPassword ? 'Reset Password' : (isSignUp ? 'Create Account' : (
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

        {/* === EMAIL CONFIRMATION SCREEN === */}
        {showEmailConfirmation ? (
          <div className="email-confirmation">
            <div className="confirmation-message">
              <h3>Check Your Email</h3>
              <p>We've sent a confirmation link to:</p>
              <p className="email-display">{email}</p>
              <p>Click the link in your email to activate your account.</p>
            </div>
            
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            
            <button 
              type="button" 
              className="auth-button resend-button"
              onClick={handleResendConfirmation}
              disabled={resendLoading}
            >
              {resendLoading ? 'Sending...' : 'Resend Confirmation Email'}
            </button>
            
            <button
              type="button"
              className="toggle-auth"
              onClick={() => {
                setShowEmailConfirmation(false)
                setError('')
                setSuccess('')
              }}
            >
              Back to Sign In
            </button>
          </div>
        ) : showForgotPassword ? (
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
