const express = require('express');
const router  = express.Router();
const { runAll } = require('../jobs/statsJob');
const { refreshOdds } = require('../jobs/oddsJob');
const { getTeamSeasonalStats } = require('../services/sportsradar');
const db = require('../db');

// GET /api/admin/seed
router.get('/seed', async (req, res) => {
  const { secret } = req.query;
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json({ message: 'Seed started — check Railway logs for progress. This runs in the background.' });
  try {
    await runAll();
    await refreshOdds();
    console.log('[seed] All jobs complete');
  } catch (err) {
    console.error('[seed] Error:', err.message);
  }
});

// GET /api/admin/probe?secret=xxx
// Returns raw SportsRadar response for first team so we can see the data shape
router.get('/probe', async (req, res) => {
  const { secret } = req.query;
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { rows } = await db.query('SELECT team_id, name FROM teams LIMIT 1');
    if (!rows.length) return res.json({ error: 'No teams in DB yet' });

    const data = await getTeamSeasonalStats(rows[0].team_id);
    res.json({
      team: rows[0].name,
      top_level_keys: Object.keys(data),
      players_count: (data.players || []).length,
      first_player: (data.players || [])[0] || null,
      own_record_keys: data.own_record ? Object.keys(data.own_record) : [],
      sample_own_record: data.own_record || null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
