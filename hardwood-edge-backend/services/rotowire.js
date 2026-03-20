const axios = require('axios');

const BASE_URL = 'https://api.rotowire.com/basketball/nba';
const API_KEY = process.env.ROTOWIRE_API_KEY;

async function get(endpoint, params = {}) {
  try {
    const response = await axios.get(`${BASE_URL}${endpoint}`, {
      params: { key: API_KEY, ...params },
      timeout: 10000
    });
    return response.data;
  } catch (err) {
    console.error(`Rotowire error [${endpoint}]:`, err.message);
    throw err;
  }
}

async function getInjuries() {
  return get('/injuries.json');
}

async function getProjectedLineups() {
  return get('/lineups.json');
}

module.exports = {
  getInjuries,
  getProjectedLineups
};
