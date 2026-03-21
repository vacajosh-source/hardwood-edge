const cron = require('node-cron');
const db   = require('../db');
const { getTeams, getTeamSeasonalStats, getSeasonSchedule } = require('../services/sportsradar');

const SEASON      = '2024-25';
const SEASON_YEAR = '2024';
const SEASON_TYPE = 'REG';
const POSITIONS   = ['PG', 'SG', 'SF', 'PF', 'C'];

function normalizePosition(raw) {
  const map = {
    PG: 'PG', SG: 'SG', SF: 'SF', PF: 'PF', C: 'C',
    G: 'PG', F: 'SF', FC: 'PF', GF: 'SG',
    point_guard: 'PG', shooting_guard: 'SG',
    small_forward: 'SF', power_forward: 'PF', center: 'C'
  };
  return map[raw] || null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function refreshTeams() {
  console.log('[statsJob] Refreshing teams...');
  const data        = await getTeams();
  const conferences = data?.league?.conferences || [];

  for (const conf of conferences) {
    for (const div of conf.divisions || []) {
      for (const team of div.teams || []) {
        await db.query(`
          INSERT INTO teams (team_id, name, abbreviation, conference, division)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (team_id) DO UPDATE SET
            name         = EXCLUDED.name,
            abbreviation = EXCLUDED.abbreviation,
            conference   = EXCLUDED.conference,
            division     = EXCLUDED.division,
            updated_at   = NOW()
        `, [team.id, team.name, team.alias, conf.name, div.name]);
      }
    }
  }
  console.log('[statsJob] Teams refreshed');
}

async function refreshTeamStatsAndDefense() {
  console.log('[statsJob] Refreshing player stats + defensive data...');
  const { rows: teams } = await db.query('SELECT team_id, name FROM teams');

  for (const team of teams) {
    try {
      const data = await getTeamSeasonalStats(team.team_id, SEASON_YEAR, SEASON_TYPE);

      // --- Player stats ---
      const players = data?.players || [];
      for (const p of players) {
        const stats = p.total || p.average || {};
        const pos   = normalizePosition(p.primary_position || p.position);

        await db.query(`
          INSERT INTO players
            (player_id, team_id, full_name, position, points, rebounds, assists,
             three_pm, steals, blocks, minutes, fg_pct, fantasy_pts)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
          ON CONFLICT (player_id) DO UPDATE SET
            team_id     = EXCLUDED.team_id,
            full_name   = EXCLUDED.full_name,
            position    = EXCLUDED.position,
            points      = EXCLUDED.points,
            rebounds    = EXCLUDED.rebounds,
            assists     = EXCLUDED.assists,
            three_pm    = EXCLUDED.three_pm,
            steals      = EXCLUDED.steals,
            blocks      = EXCLUDED.blocks,
            minutes     = EXCLUDED.minutes,
            fg_pct      = EXCLUDED.fg_pct,
            fantasy_pts = EXCLUDED.fantasy_pts,
            updated_at  = NOW()
        `, [
          p.id,
          team.team_id,
          p.full_name || `${p.first_name} ${p.last_name}`,
          pos,
          stats.points           || 0,
          stats.rebounds         || 0,
          stats.assists          || 0,
          stats.three_points_made || 0,
          stats.steals           || 0,
          stats.blocks           || 0,
          stats.minutes          || 0,
          stats.field_goals_pct  || 0,
          // Simple fantasy pts: pts + 1.2*reb + 1.5*ast + 3*stl + 3*blk
          (
            (parseFloat(stats.points || 0)) +
            (parseFloat(stats.rebounds || 0) * 1.2) +
            (parseFloat(stats.assists || 0) * 1.5) +
            (parseFloat(stats.steals || 0) * 3) +
            (parseFloat(stats.blocks || 0) * 3)
          ).toFixed(2)
        ]);
      }

      // --- Defensive stats from opponent data ---
      // SportsRadar returns opponent totals under data.own_record.opponents
      const opponentsByPosition = data?.own_record?.opponents?.positions || [];

      for (const posGroup of opponentsByPosition) {
        const pos = normalizePosition(posGroup.position);
        if (!POSITIONS.includes(pos)) continue;

        const avg = posGroup.average || posGroup.total || {};

        await db.query(`
          INSERT INTO team_defense
            (team_id, position, pts_allowed, fg_pct_allowed, fantasy_allowed, games_played, season)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (team_id, position, season) DO UPDATE SET
            pts_allowed     = EXCLUDED.pts_allowed,
            fg_pct_allowed  = EXCLUDED.fg_pct_allowed,
            fantasy_allowed = EXCLUDED.fantasy_allowed,
            games_played    = EXCLUDED.games_played,
            updated_at      = NOW()
        `, [
          team.team_id,
          pos,
          avg.points          || 0,
          avg.field_goals_pct || 0,
          avg.fantasy_points  || 0,
          data?.own_record?.games_played || 0,
          SEASON
        ]);
      }

      console.log(`[statsJob] Updated: ${team.name} — ${players.length} players`);
      await sleep(1200);

    } catch (err) {
      console.error(`[statsJob] Failed for ${team.name}:`, err.message);
    }
  }

  console.log('[statsJob] Player stats + defense refresh complete');
}

async function refreshSchedule() {
  console.log('[statsJob] Refreshing schedule...');
  try {
    const data  = await getSeasonSchedule(SEASON_YEAR, SEASON_TYPE);
    const weeks = data?.weeks || [];

    for (const week of weeks) {
      for (const game of week.games || []) {
        await db.query(`
          INSERT INTO games (game_id, home_team_id, away_team_id, game_date, game_time, status)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (game_id) DO UPDATE SET
            status     = EXCLUDED.status,
            updated_at = NOW()
        `, [
          game.id,
          game.home?.id,
          game.away?.id,
          game.scheduled?.split('T')[0],
          game.scheduled,
          game.status || 'scheduled'
        ]).catch(() => {});
      }
    }

    console.log('[statsJob] Schedule refreshed');
  } catch (err) {
    console.error('[statsJob] Schedule refresh failed:', err.message);
  }
}

async function runAll() {
  try {
    await refreshTeams();
    await sleep(1200);
    await refreshSchedule();
    await sleep(1200);
    await refreshTeamStatsAndDefense();
  } catch (err) {
    console.error('[statsJob] Fatal error:', err.message);
  }
}

// Every night at 3am
cron.schedule('0 3 * * *', runAll);

module.exports = { runAll };