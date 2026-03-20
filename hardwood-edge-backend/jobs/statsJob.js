const cron = require('node-cron');
const db = require('../db');
const { getTeams, getTeamDefense, getLeaguePlayerStats } = require('../services/sportsradar');

const SEASON = '2024-25';
const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];

function normalizePosition(raw) {
  const map = {
    point_guard: 'PG',
    shooting_guard: 'SG',
    small_forward: 'SF',
    power_forward: 'PF',
    center: 'C',
    PG: 'PG', SG: 'SG', SF: 'SF', PF: 'PF', C: 'C'
  };
  return map[raw] || null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function refreshTeams() {
  console.log('[statsJob] Refreshing teams...');
  const data = await getTeams();
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

async function refreshDefenseStats() {
  console.log('[statsJob] Starting defensive stats refresh...');
  const { rows: teams } = await db.query('SELECT team_id, name FROM teams');

  for (const team of teams) {
    try {
      const data = await getTeamDefense(team.team_id);
      const opponentStats = data?.opponents?.statistics?.opponents || [];

      for (const posStats of opponentStats) {
        const position = normalizePosition(posStats.position);
        if (!POSITIONS.includes(position)) continue;

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
          position,
          posStats.avg?.points || 0,
          posStats.avg?.field_goals_pct || 0,
          posStats.avg?.fantasy_points || 0,
          posStats.games_played || 0,
          SEASON
        ]);
      }

      console.log(`[statsJob] Defense updated: ${team.name}`);
      await sleep(1200);
    } catch (err) {
      console.error(`[statsJob] Failed for ${team.name}:`, err.message);
    }
  }
  console.log('[statsJob] Defensive stats refresh complete');
}

async function refreshPlayerStats() {
  console.log('[statsJob] Refreshing player stats...');
  const data = await getLeaguePlayerStats();
  const players = data?.players || [];

  for (const p of players) {
    const stats = p.seasons?.[0]?.totals?.statistics || {};

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
      p.team?.id || null,
      p.full_name,
      normalizePosition(p.primary_position),
      stats.points || 0,
      stats.rebounds || 0,
      stats.assists || 0,
      stats.three_points_made || 0,
      stats.steals || 0,
      stats.blocks || 0,
      stats.minutes || 0,
      stats.field_goals_pct || 0,
      stats.fantasy_points || 0
    ]);
  }
  console.log(`[statsJob] Player stats refreshed: ${players.length} players`);
}

async function runAll() {
  try {
    await refreshTeams();
    await refreshDefenseStats();
    await refreshPlayerStats();
  } catch (err) {
    console.error('[statsJob] Fatal error:', err.message);
  }
}

// Every night at 3am
cron.schedule('0 3 * * *', runAll);

module.exports = { runAll };
