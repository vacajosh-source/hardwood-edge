import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

export default function MatchupAnalyzer() {
  const [players, setPlayers]     = useState([]);
  const [teams, setTeams]         = useState([]);
  const [playerId, setPlayerId]   = useState('');
  const [teamId, setTeamId]       = useState('');
  const [result, setResult]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState('');
  const [inputVal, setInputVal]   = useState('');

  // Load players for dropdown
  useEffect(() => {
    api.getPlayers({ sort: 'fantasy_pts' })
      .then(res => setPlayers(res.data || []))
      .catch(() => {});
  }, []);

  // Load teams from defense endpoint
  useEffect(() => {
    api.getDefense({ position: 'PG' })
      .then(res => {
        const unique = [];
        const seen   = new Set();
        for (const row of res.data || []) {
          if (!seen.has(row.team_id)) {
            seen.add(row.team_id);
            unique.push({ team_id: row.team_id, name: row.team_name, abbreviation: row.abbreviation });
          }
        }
        setTeams(unique.sort((a, b) => a.abbreviation.localeCompare(b.abbreviation)));
      })
      .catch(() => {});
  }, []);

  // Debounce player search
  useEffect(() => {
    const t = setTimeout(() => setSearch(inputVal), 400);
    return () => clearTimeout(t);
  }, [inputVal]);

  const filteredPlayers = search
    ? players.filter(p => p.full_name.toLowerCase().includes(search.toLowerCase()))
    : players;

  const analyze = () => {
    if (!playerId || !teamId) return;
    setLoading(true);
    setResult(null);
    api.getMatchup(playerId, teamId)
      .then(res => setResult(res.data))
      .catch(() => setResult(null))
      .finally(() => setLoading(false));
  };

  const ratingClass = result
    ? result.edge.rating === 'Favorable'   ? 'badge-favorable'
    : result.edge.rating === 'Unfavorable' ? 'badge-unfavorable'
    : 'badge-neutral'
    : '';

  return (
    <div>
      <div className="page-title">Matchup Analyzer</div>
      <div className="page-desc">Select a player and opposing team to get an edge rating based on defensive data.</div>

      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Player</div>
            <input
              className="filter-input"
              placeholder="Search player..."
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              style={{ width: '100%', marginBottom: 8 }}
            />
            <select
              className="filter-select"
              style={{ width: '100%' }}
              value={playerId}
              onChange={e => setPlayerId(e.target.value)}
            >
              <option value="">Select player</option>
              {filteredPlayers.map(p => (
                <option key={p.player_id} value={p.player_id}>
                  {p.full_name} ({p.abbreviation} — {p.position})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Opposing Team</div>
            <select
              className="filter-select"
              style={{ width: '100%', marginTop: 34 }}
              value={teamId}
              onChange={e => setTeamId(e.target.value)}
            >
              <option value="">Select team</option>
              {teams.map(t => (
                <option key={t.team_id} value={t.team_id}>
                  {t.abbreviation} — {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={analyze}
          disabled={!playerId || !teamId || loading}
          style={{
            background: 'var(--accent-blue)',
            color: '#fff',
            border: 'none',
            padding: '8px 20px',
            borderRadius: 6,
            cursor: playerId && teamId ? 'pointer' : 'not-allowed',
            opacity: playerId && teamId ? 1 : 0.5,
            fontWeight: 600,
            fontSize: 13
          }}
        >
          {loading ? 'Analyzing...' : 'Analyze Matchup'}
        </button>
      </div>

      {result && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <span style={{ fontSize: 16, fontWeight: 600 }}>{result.player.full_name}</span>
            <span className="position-pill">{result.player.position}</span>
            <span style={{ color: 'var(--text-secondary)' }}>vs</span>
            <span style={{ fontWeight: 600 }}>{result.opponent_defense.team_name}</span>
            <span className={`badge ${ratingClass}`} style={{ fontSize: 13, padding: '4px 12px' }}>
              {result.edge.rating}
            </span>
          </div>

          <div style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 13, lineHeight: 1.6 }}>
            {result.edge.summary}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'PTS Allowed to ' + result.player.position, value: parseFloat(result.opponent_defense.pts_allowed).toFixed(1), league: parseFloat(result.league_averages.pts_allowed).toFixed(1), unit: '' },
              { label: 'FG% Allowed',   value: (parseFloat(result.opponent_defense.fg_pct_allowed) * 100).toFixed(1) + '%', league: (parseFloat(result.league_averages.fg_pct_allowed) * 100).toFixed(1) + '%', unit: '' },
              { label: 'FPTS Allowed',  value: parseFloat(result.opponent_defense.fantasy_allowed).toFixed(1), league: parseFloat(result.league_averages.fantasy_allowed).toFixed(1), unit: '' },
            ].map(stat => (
              <div key={stat.label} style={{ background: 'var(--bg-secondary)', borderRadius: 6, padding: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>{stat.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>League avg: {stat.league}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
