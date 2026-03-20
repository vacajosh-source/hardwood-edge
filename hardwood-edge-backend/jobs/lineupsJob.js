const cron = require('node-cron');
const db = require('../db');
const { getInjuries, getProjectedLineups } = require('../services/rotowire');

async function refreshLineups() {
  console.log('[lineupsJob] Starting lineups + injuries refresh...');

  try {
    const [injuries, lineups] = await Promise.all([
      getInjuries(),
      getProjectedLineups()
    ]);

    for (const entry of injuries || []) {
      const { rows: players } = await db.query(
        `SELECT player_id FROM players WHERE full_name ILIKE $1 LIMIT 1`,
        [`%${entry.player}%`]
      );
      if (!players.length) continue;

      const { rows: games } = await db.query(`
        SELECT g.game_id, t.team_id
        FROM games g
        JOIN teams t ON t.team_id = g.home_team_id OR t.team_id = g.away_team_id
        JOIN players p ON p.team_id = t.team_id
        WHERE p.player_id = $1
          AND g.game_date >= CURRENT_DATE
          AND g.status = 'scheduled'
        ORDER BY g.game_date ASC
        LIMIT 1
      `, [players[0].player_id]);

      if (!games.length) continue;

      await db.query(`
        INSERT INTO lineups (game_id, player_id, team_id, status, injury_note, is_starter)
        VALUES ($1, $2, $3, $4, $5, false)
        ON CONFLICT (game_id, player_id) DO UPDATE SET
          status      = EXCLUDED.status,
          injury_note = EXCLUDED.injury_note,
          updated_at  = NOW()
      `, [
        games[0].game_id,
        players[0].player_id,
        games[0].team_id,
        entry.injury_status || 'questionable',
        entry.injury || null
      ]).catch(() => {});
    }

    for (const game of lineups || []) {
      for (const team of [game.home, game.away]) {
        if (!team) continue;
        for (const player of team.starters || []) {
          const { rows: players } = await db.query(
            `SELECT player_id, team_id FROM players WHERE full_name ILIKE $1 LIMIT 1`,
            [`%${player.name}%`]
          );
          if (!players.length) continue;

          const { rows: games } = await db.query(
            `SELECT game_id FROM games WHERE game_id = $1 LIMIT 1`,
            [game.game_id || '']
          );
          if (!games.length) continue;

          await db.query(`
            INSERT INTO lineups (game_id, player_id, team_id, status, is_starter)
            VALUES ($1, $2, $3, 'active', true)
            ON CONFLICT (game_id, player_id) DO UPDATE SET
              is_starter = true,
              status     = COALESCE(lineups.status, 'active'),
              updated_at = NOW()
          `, [
            games[0].game_id,
            players[0].player_id,
            players[0].team_id
          ]).catch(() => {});
        }
      }
    }

    console.log('[lineupsJob] Lineups + injuries refresh complete');
  } catch (err) {
    console.error('[lineupsJob] Error:', err.message);
  }
}

// Every 2 hours
cron.schedule('0 */2 * * *', refreshLineups);

module.exports = { refreshLineups };
