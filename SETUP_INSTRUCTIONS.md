# Honorably Setup Instructions

## Database Setup

The conversation feature requires database tables to be created in Supabase. Follow these steps:

### 1. Apply Database Schema

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `database_schema.sql` into the editor
4. Click "Run" to execute the schema

### 2. Verify Tables Created

After running the schema, you should see:
- `conversations` table
- `messages` table
- Row Level Security (RLS) policies enabled
- Triggers for conversation limits

### 3. Test the Application

1. Start the development server: `npm run dev`
2. Open http://localhost:3000
3. Sign in with your account
4. You should now see the conversation sidebar on the left
5. Click "+ New Conversation" to create your first conversation

### 4. Troubleshooting

If the sidebar doesn't appear:
1. Check the browser console for errors
2. Verify the database schema was applied correctly
3. Ensure your Supabase environment variables are set correctly

## Environment Variables

Make sure your `.env` file contains:
```
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

And your `project.env` file contains:
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```
