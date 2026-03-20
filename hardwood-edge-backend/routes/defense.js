const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/defense
// Query params: ?position=PG&team=LAL&sort=pts_allowed&season=2024-25
router.get('/', async (req, res) => {
  try {
    const { position, team, sort = 'pts_allowed', season = '2024-25' } = req.query;

    const allowedSorts = ['pts_allowed', 'fg_pct_allowed', 'fantasy_allowed'];
    const sortCol = allowedSorts.includes(sort) ? sort : 'pts_allowed';

    const conditions = ['d.season = $1'];
    const params = [season];

    if (position) {
      params.push(position.toUpperCase());
      conditions.push(`d.position = $${params.length}`);
    }

    if (team) {
      params.push(team.toUpperCase());
      conditions.push(`t.abbreviation = $${params.length}`);
    }

    const { rows } = await db.query(`
      SELECT
        d.team_id,
        t.name           AS team_name,
        t.abbreviation,
        t.conference,
        d.position,
        d.pts_allowed,
        d.fg_pct_allowed,
        d.fantasy_allowed,
        d.games_played,
        d.updated_at
      FROM team_defense d
      JOIN teams t ON t.team_id = d.team_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${sortCol} DESC
    `, params);

    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    console.error('[GET /api/defense]', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch defensive stats' });
  }
});

module.exports = router;
