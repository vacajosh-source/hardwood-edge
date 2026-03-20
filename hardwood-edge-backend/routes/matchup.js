const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/matchup?playerId=xxx&opponentTeamId=xxx
router.get('/', async (req, res) => {
  try {
    const { playerId, opponentTeamId } = req.query;
    if (!playerId || !opponentTeamId) {
      return res.status(400).json({ success: false, error: 'playerId and opponentTeamId are required' });
    }

    const { rows: playerRows } = await db.query(`
      SELECT p.*, t.name AS team_name, t.abbreviation
      FROM players p
      JOIN teams t ON t.team_id = p.team_id
      WHERE p.player_id = $1
    `, [playerId]);

    if (!playerRows.length) return res.status(404).json({ success: false, error: 'Player not found' });
    const player = playerRows[0];

    const { rows: defRows } = await db.query(`
      SELECT d.*, t.name AS team_name, t.abbreviation
      FROM team_defense d
      JOIN teams t ON t.team_id = d.team_id
      WHERE d.team_id = $1 AND d.position = $2 AND d.season = '2024-25'
    `, [opponentTeamId, player.position]);

    if (!defRows.length) return res.status(404).json({ success: false, error: 'Defensive data not found for this matchup' });
    const defense = defRows[0];

    const { rows: avgRows } = await db.query(`
      SELECT
        AVG(pts_allowed)     AS avg_pts_allowed,
        AVG(fg_pct_allowed)  AS avg_fg_pct_allowed,
        AVG(fantasy_allowed) AS avg_fantasy_allowed
      FROM team_defense
      WHERE position = $1 AND season = '2024-25'
    `, [player.position]);

    const leagueAvg = avgRows[0];

    const ptsDiff     = parseFloat(defense.pts_allowed)     - parseFloat(leagueAvg.avg_pts_allowed);
    const fantasyDiff = parseFloat(defense.fantasy_allowed) - parseFloat(leagueAvg.avg_fantasy_allowed);
    const fgDiff      = parseFloat(defense.fg_pct_allowed)  - parseFloat(leagueAvg.avg_fg_pct_allowed);
    const score       = (ptsDiff * 0.4) + (fantasyDiff * 0.4) + (fgDiff * 100 * 0.2);

    let rating, summary;
    if (score >= 2) {
      rating = 'Favorable';
      summary = `${defense.team_name} is one of the weaker defenses against ${player.position}s, allowing ${defense.pts_allowed} PPG to the position — ${Math.abs(ptsDiff).toFixed(1)} above league average.`;
    } else if (score <= -2) {
      rating = 'Unfavorable';
      summary = `${defense.team_name} defends the ${player.position} position well, allowing only ${defense.pts_allowed} PPG — ${Math.abs(ptsDiff).toFixed(1)} below league average.`;
    } else {
      rating = 'Neutral';
      summary = `${defense.team_name} is roughly league average against ${player.position}s. No strong edge either way.`;
    }

    res.json({
      success: true,
      data: {
        player: {
          player_id:   player.player_id,
          full_name:   player.full_name,
          position:    player.position,
          team:        player.team_name,
          points:      player.points,
          fantasy_pts: player.fantasy_pts
        },
        opponent_defense: {
          team_id:         defense.team_id,
          team_name:       defense.team_name,
          abbreviation:    defense.abbreviation,
          position:        defense.position,
          pts_allowed:     defense.pts_allowed,
          fg_pct_allowed:  defense.fg_pct_allowed,
          fantasy_allowed: defense.fantasy_allowed
        },
        league_averages: {
          pts_allowed:     parseFloat(leagueAvg.avg_pts_allowed).toFixed(2),
          fg_pct_allowed:  parseFloat(leagueAvg.avg_fg_pct_allowed).toFixed(4),
          fantasy_allowed: parseFloat(leagueAvg.avg_fantasy_allowed).toFixed(2)
        },
        edge: { rating, score: parseFloat(score.toFixed(2)), summary }
      }
    });
  } catch (err) {
    console.error('[GET /api/matchup]', err.message);
    res.status(500).json({ success: false, error: 'Failed to analyze matchup' });
  }
});

module.exports = router;
