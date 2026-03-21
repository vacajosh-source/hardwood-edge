const express = require('express');
const router = express.Router();
const { runAll } = require('../jobs/statsJob');
const { refreshOdds } = require('../jobs/oddsJob');

// GET /api/admin/seed
// Manually triggers all data jobs — remove this route after first successful pull
router.get('/seed', async (req, res) => {
  // Simple secret check so random people can't trigger it
  const { secret } = req.query;
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  res.json({ message: 'Seed started — check Railway logs for progress. This runs in the background.' });

  // Run after response is sent so the request doesn't time out
  try {
    await runAll();
    await refreshOdds();
    console.log('[seed] All jobs complete');
  } catch (err) {
    console.error('[seed] Error:', err.message);
  }
});

module.exports = router;