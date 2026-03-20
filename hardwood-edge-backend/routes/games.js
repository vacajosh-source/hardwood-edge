const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/games
// Query params: ?date=2025-03-20&team=LAL
router.get('/', async (req, res) => {
  try {
    const { date, team } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const conditions = ['g.game_date = $1'];
    const params = [targetDate];

    if (team) {
      params.push(team.toUpperCase());
      conditions.push(`(ht.abbreviation = $${params.length} OR at.abbreviation = $${params.length})`);
    }

    const { rows: games } = await db.query(`
      SELECT
        g.game_id,
        g.game_date,
        g.game_time,
        g.status,
        ht.name         AS home_team,
        ht.abbreviation AS home_abbr,
        ht.team_id      AS home_team_id,
        at.name         AS away_team,
        at.abbreviation AS away_abbr,
        at.team_id      AS away_team_id
      FROM games g
      JOIN teams ht ON ht.team_id = g.home_team_id
      JOIN teams at ON at.team_id = g.away_team_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY g.game_time ASC
    `, params);

    const enriched = await Promise.all(games.map(async (game) => {
      const { rows: roster } = await db.query(`
        SELECT
          l.is_starter,
          l.status,
          l.injury_note,
          p.player_id,
          p.full_name,
          p.position,
          p.points,
          p.rebounds,
          p.assists,
          p.fantasy_pts,
          t.team_id,
          t.abbreviation
        FROM lineups l
        JOIN players p ON p.player_id = l.player_id
        JOIN teams t ON t.team_id = l.team_id
        WHERE l.game_id = $1
        ORDER BY l.is_starter DESC, p.fantasy_pts DESC
      `, [game.game_id]);

      return {
        ...game,
        home_roster: roster.filter(r => r.team_id === game.home_team_id),
        away_roster: roster.filter(r => r.team_id === game.away_team_id)
      };
    }));

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    console.error('[GET /api/games]', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch games' });
  }
});

module.exports = router;
