const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/odds
// Query params: ?playerId=xxx&gameId=xxx&market=player_points
router.get('/', async (req, res) => {
  try {
    const { playerId, gameId, market } = req.query;

    const conditions = [];
    const params = [];

    if (playerId) {
      params.push(playerId);
      conditions.push(`o.player_id = $${params.length}`);
    }

    if (gameId) {
      params.push(gameId);
      conditions.push(`o.game_id = $${params.length}`);
    }

    if (market) {
      params.push(market);
      conditions.push(`o.market = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await db.query(`
      SELECT
        o.id,
        o.game_id,
        o.market,
        o.book,
        o.line,
        o.over_price,
        o.under_price,
        o.fetched_at,
        p.full_name    AS player_name,
        p.position,
        t.abbreviation AS team
      FROM odds o
      JOIN players p ON p.player_id = o.player_id
      JOIN teams t ON t.team_id = p.team_id
      ${where}
      ORDER BY o.market, o.line DESC, o.fetched_at DESC
    `, params);

    const grouped = {};
    for (const row of rows) {
      const key = `${row.player_name}__${row.market}`;
      if (!grouped[key]) {
        grouped[key] = {
          player_name: row.player_name,
          position:    row.position,
          team:        row.team,
          market:      row.market,
          books:       [],
          best_over:   null,
          best_under:  null
        };
      }

      grouped[key].books.push({
        book:        row.book,
        line:        row.line,
        over_price:  row.over_price,
        under_price: row.under_price,
        fetched_at:  row.fetched_at
      });

      if (row.over_price !== null) {
        if (!grouped[key].best_over || row.over_price > grouped[key].best_over.price) {
          grouped[key].best_over = { book: row.book, line: row.line, price: row.over_price };
        }
      }

      if (row.under_price !== null) {
        if (!grouped[key].best_under || row.under_price > grouped[key].best_under.price) {
          grouped[key].best_under = { book: row.book, line: row.line, price: row.under_price };
        }
      }
    }

    res.json({
      success: true,
      count: Object.keys(grouped).length,
      data: Object.values(grouped)
    });
  } catch (err) {
    console.error('[GET /api/odds]', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch odds' });
  }
});

module.exports = router;
