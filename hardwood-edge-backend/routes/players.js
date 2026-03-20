const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/players
// Query params: ?position=PG&team=LAL&search=lebron&sort=points
router.get('/', async (req, res) => {
  try {
    const { position, team, search, sort = 'points' } = req.query;

    const allowedSorts = ['points', 'rebounds', 'assists', 'three_pm', 'steals', 'blocks', 'minutes', 'fantasy_pts'];
    const sortCol = allowedSorts.includes(sort) ? sort : 'points';

    const conditions = ['p.minutes > 10'];
    const params = [];

    if (position) {
      params.push(position.toUpperCase());
      conditions.push(`p.position = $${params.length}`);
    }

    if (team) {
      params.push(team.toUpperCase());
      conditions.push(`t.abbreviation = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`p.full_name ILIKE $${params.length}`);
    }

    const { rows } = await db.query(`
      SELECT
        p.player_id,
        p.full_name,
        p.position,
        t.name        AS team_name,
        t.abbreviation,
        p.points,
        p.rebounds,
        p.assists,
        p.three_pm,
        p.steals,
        p.blocks,
        p.minutes,
        p.fg_pct,
        p.fantasy_pts,
        p.updated_at
      FROM players p
      JOIN teams t ON t.team_id = p.team_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY p.${sortCol} DESC
    `, params);

    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    console.error('[GET /api/players]', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch players' });
  }
});

// GET /api/players/:playerId
router.get('/:playerId', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        p.*,
        t.name        AS team_name,
        t.abbreviation,
        t.conference
      FROM players p
      JOIN teams t ON t.team_id = p.team_id
      WHERE p.player_id = $1
    `, [req.params.playerId]);

    if (!rows.length) return res.status(404).json({ success: false, error: 'Player not found' });

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[GET /api/players/:id]', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch player' });
  }
});

module.exports = router;
