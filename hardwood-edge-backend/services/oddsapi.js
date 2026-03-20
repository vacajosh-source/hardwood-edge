const axios = require('axios');

const BASE_URL = 'https://api.the-odds-api.com/v4';
const API_KEY = process.env.ODDS_API_KEY;

async function get(endpoint, params = {}) {
  try {
    const response = await axios.get(`${BASE_URL}${endpoint}`, {
      params: { apiKey: API_KEY, ...params },
      timeout: 10000
    });
    return response.data;
  } catch (err) {
    console.error(`OddsAPI error [${endpoint}]:`, err.message);
    throw err;
  }
}

async function getNBAGameOdds() {
  return get('/sports/basketball_nba/odds', {
    regions: 'us',
    markets: 'h2h,spreads,totals',
    oddsFormat: 'american'
  });
}

async function getNBAPlayerProps(eventId) {
  return get(`/sports/basketball_nba/events/${eventId}/odds`, {
    regions: 'us',
    markets: 'player_points,player_rebounds,player_assists,player_threes',
    oddsFormat: 'american'
  });
}

async function getNBAEvents() {
  return get('/sports/basketball_nba/events');
}

module.exports = {
  getNBAGameOdds,
  getNBAPlayerProps,
  getNBAEvents
};
