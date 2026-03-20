const cron = require('node-cron');
const db = require('../db');
const { getNBAEvents, getNBAPlayerProps } = require('../services/oddsapi');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function refreshOdds() {
  console.log('[oddsJob] Starting odds refresh...');

  try {
    const events = await getNBAEvents();

    for (const event of events || []) {
      const { rows: games } = await db.query(`
        SELECT game_id FROM games
        WHERE game_date = $1
          AND (home_team_id IN (SELECT team_id FROM teams WHERE name ILIKE $2)
            OR away_team_id IN (SELECT team_id FROM teams WHERE name ILIKE $2))
        LIMIT 1
      `, [event.commence_time?.split('T')[0], `%${event.home_team}%`]);

      if (!games.length) continue;
      const gameId = games[0].game_id;

      const props = await getNBAPlayerProps(event.id);
      await sleep(500);

      for (const market of props?.bookmakers || []) {
        for (const outcome of market.markets || []) {
          for (const selection of outcome.outcomes || []) {
            const { rows: players } = await db.query(
              `SELECT player_id FROM players WHERE full_name ILIKE $1 LIMIT 1`,
              [`%${selection.description}%`]
            );
            if (!players.length) continue;

            await db.query(`
              INSERT INTO odds (game_id, player_id, book, market, line, over_price, under_price)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
              gameId,
              players[0].player_id,
              market.title,
              outcome.key,
              selection.point || null,
              selection.name === 'Over' ? selection.price : null,
              selection.name === 'Under' ? selection.price : null
            ]);
          }
        }
      }
    }

    console.log('[oddsJob] Odds refresh complete');
  } catch (err) {
    console.error('[oddsJob] Error:', err.message);
  }
}

// Every 5 minutes
cron.schedule('*/5 * * * *', refreshOdds);

module.exports = { refreshOdds };
