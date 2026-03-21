const axios = require('axios');

const BASE_URL = 'https://api.sportradar.com/nba/trial/v8/en';
const API_KEY  = process.env.SPORTRADAR_API_KEY;

async function get(endpoint) {
  try {
    const response = await axios.get(`${BASE_URL}${endpoint}`, {
      params: { api_key: API_KEY },
      timeout: 10000
    });
    return response.data;
  } catch (err) {
    console.error(`SportsRadar error [${endpoint}]:`, err.message);
    throw err;
  }
}

// All NBA teams grouped by conference/division
async function getTeams() {
  return get('/league/hierarchy.json');
}

// Team seasonal stats — returns both player stats AND opponent (defensive) stats
async function getTeamSeasonalStats(teamId, season = '2024', type = 'REG') {
  return get(`/seasons/${season}/${type}/teams/${teamId}/statistics.json`);
}

// Full season schedule — populates the games table
async function getSeasonSchedule(season = '2024', type = 'REG') {
  return get(`/seasons/${season}/${type}/schedule.json`);
}

// Daily injuries
async function getDailyInjuries() {
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '/');
  return get(`/league/${today}/injuries.json`);
}

module.exports = {
  getTeams,
  getTeamSeasonalStats,
  getSeasonSchedule,
  getDailyInjuries
};