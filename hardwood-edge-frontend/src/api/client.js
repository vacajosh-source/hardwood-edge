const BASE_URL = process.env.REACT_APP_API_URL || '';

async function request(endpoint) {
  const res = await fetch(`${BASE_URL}${endpoint}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  getDefense: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/defense${q ? '?' + q : ''}`);
  },
  getPlayers: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/players${q ? '?' + q : ''}`);
  },
  getPlayer: (playerId) => request(`/api/players/${playerId}`),
  getMatchup: (playerId, opponentTeamId) =>
    request(`/api/matchup?playerId=${playerId}&opponentTeamId=${opponentTeamId}`),
  getGames: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/games${q ? '?' + q : ''}`);
  },
  getOdds: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/odds${q ? '?' + q : ''}`);
  }
};
