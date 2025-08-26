// === AUTHENTICATION ROUTES ===
const { createClient } = require('@supabase/supabase-js');

// === CLEANUP UNCONFIRMED USERS ===
const handleCleanupUnconfirmed = async (req, res, { supabase }) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        error: 'Email is required'
      });
    }

    // Get all users with this email
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return res.status(500).json({
        error: 'Failed to check existing users'
      });
    }

    // Check if there's already a confirmed user with this email
    const confirmedUser = users.users.find(user => 
      user.email === email && user.email_confirmed_at
    );

    if (confirmedUser) {
      return res.status(400).json({
        error: 'Email already registered. Please sign in instead.',
        emailExists: true
      });
    }

    // Find unconfirmed users with this email
    const unconfirmedUsers = users.users.filter(user => 
      user.email === email && !user.email_confirmed_at
    );

    // Delete all unconfirmed users with this email
    for (const user of unconfirmedUsers) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      
      if (deleteError) {
        console.error('Error deleting unconfirmed user:', deleteError);
      } else {
        console.log(`Deleted unconfirmed user: ${user.email} (${user.id})`);
      }
    }

    res.json({
      success: true,
      message: `Cleaned up ${unconfirmedUsers.length} unconfirmed user(s)`,
      deletedCount: unconfirmedUsers.length
    });

  } catch (error) {
    console.error('Cleanup unconfirmed users error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

module.exports = { handleCleanupUnconfirmed };
