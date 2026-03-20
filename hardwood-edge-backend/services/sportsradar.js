const axios = require('axios');

const BASE_URL = 'https://api.sportradar.com/nba/trial/v8/en';
const API_KEY = process.env.SPORTRADAR_API_KEY;

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

async function getTeams() {
  return get('/league/hierarchy.json');
}

async function getTeamRoster(teamId) {
  return get(`/teams/${teamId}/profile.json`);
}

async function getTeamDefense(teamId) {
  return get(`/teams/${teamId}/opponents.json`);
}

async function getLeaguePlayerStats(season = '2024') {
  return get(`/seasons/${season}/REG/players/statistics.json`);
}

module.exports = {
  getTeams,
  getTeamRoster,
  getTeamDefense,
  getLeaguePlayerStats
};
