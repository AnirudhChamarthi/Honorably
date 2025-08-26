// === UTILITY ENDPOINTS ===

// Health check endpoint
const healthCheck = (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
};

// Moderation test endpoint
const testModeration = async (req, res, { openai }) => {
  try {
    const testMessage = req.body.message || "This is a test message";
    
    console.log('🧪 Testing moderation with:', testMessage);
    
    const moderation = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: [
        { type: "text", text: testMessage }
      ],
    });

    const result = moderation.results[0];
    
    res.json({
      message: testMessage,
      flagged: result.flagged,
      categories: Object.keys(result.categories).filter(key => result.categories[key]),
      scores: result.category_scores
    });
  } catch (error) {
    res.status(500).json({ error: 'Moderation test failed', details: error.message });
  }
};

module.exports = { healthCheck, testModeration };
