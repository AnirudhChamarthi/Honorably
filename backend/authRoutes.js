// === AUTHENTICATION ROUTES ===
const { createClient } = require('@supabase/supabase-js');

// === RESEND CONFIRMATION EMAIL ===
const handleResendConfirmation = async (req, res, { supabase }) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ 
        error: 'Email is required' 
      });
    }

    // Resend confirmation email using Supabase admin API
    const { error: resendError } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email: email,
      options: {
        redirectTo: `${req.protocol}://${req.get('host')}/`
      }
    });

    if (resendError) {
      console.error('Resend confirmation error:', resendError);
      
      // Handle specific Supabase errors
      if (resendError.message.includes('already been registered')) {
        return res.status(400).json({ 
          error: 'Email already registered. Please check your inbox for the confirmation link.' 
        });
      }
      
      return res.status(500).json({ 
        error: 'Failed to resend confirmation email' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Confirmation email sent successfully' 
    });

  } catch (error) {
    console.error('Resend confirmation error:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
};

module.exports = { handleResendConfirmation };
