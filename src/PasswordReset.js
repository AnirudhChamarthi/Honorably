// === PASSWORD RESET COMPONENT ===
// Component for users who clicked password reset link from email
import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import './AuthForm.css'

const PasswordReset = ({ onComplete }) => {
  // === STATE MANAGEMENT ===
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // === PASSWORD RESET HANDLER ===
  const handlePasswordReset = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    // Validate password strength
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    try {
      const result = await supabase.auth.updateUser({
        password: newPassword
      })

      if (result.error) {
        setError(result.error.message)
      } else {
        setSuccess('Password updated successfully!')
        // Call the completion handler after a short delay
        setTimeout(() => {
          onComplete()
        }, 2000)
      }
    } catch (error) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-form">
        {/* === HEADER === */}
        <div className="auth-header">
          <h2>Reset Your Password</h2>
          <p>Enter your new password below</p>
        </div>

        {/* === PASSWORD RESET FORM === */}
        <form onSubmit={handlePasswordReset}>
          {/* === NEW PASSWORD FIELD === */}
          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter your new password"
              required
            />
          </div>

          {/* === CONFIRM PASSWORD FIELD === */}
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your new password"
              required
            />
          </div>

          {/* === ERROR/SUCCESS MESSAGE === */}
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          {/* === SUBMIT BUTTON === */}
          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>

        {/* === FOOTER === */}
        <div className="auth-footer">
          <p>
            Remember your password?
            <button
              type="button"
              className="toggle-auth"
              onClick={() => {
                supabase.auth.signOut()
                onComplete()
              }}
            >
              Back to Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default PasswordReset
