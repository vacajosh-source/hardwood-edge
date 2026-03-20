import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

const POSITIONS = ['', 'PG', 'SG', 'SF', 'PF', 'C'];
const SORT_OPTS  = [
  { key: 'points',      label: 'Points' },
  { key: 'rebounds',    label: 'Rebounds' },
  { key: 'assists',     label: 'Assists' },
  { key: 'three_pm',    label: '3PM' },
  { key: 'steals',      label: 'Steals' },
  { key: 'blocks',      label: 'Blocks' },
  { key: 'fantasy_pts', label: 'Fantasy Pts' },
];

export default function PlayerProfiles() {
  const [players, setPlayers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [position, setPosition] = useState('');
  const [sort, setSort]         = useState('points');
  const [search, setSearch]     = useState('');
  const [inputVal, setInputVal] = useState('');

  useEffect(() => {
    setLoading(true);
    api.getPlayers({ position, sort, search })
      .then(res => setPlayers(res.data || []))
      .catch(() => setPlayers([]))
      .finally(() => setLoading(false));
  }, [position, sort, search]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setSearch(inputVal), 400);
    return () => clearTimeout(t);
  }, [inputVal]);

  return (
    <div>
      <div className="page-title">Player Profiles</div>
      <div className="page-desc">Current season averages for all active NBA players.</div>

      <div className="filters">
        <input
          className="filter-input"
          placeholder="Search player..."
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          style={{ width: 180 }}
        />
        <select className="filter-select" value={position} onChange={e => setPosition(e.target.value)}>
          {POSITIONS.map(p => (
            <option key={p} value={p}>{p || 'All Positions'}</option>
          ))}
        </select>
        <select className="filter-select" value={sort} onChange={e => setSort(e.target.value)}>
          {SORT_OPTS.map(s => (
            <option key={s.key} value={s.key}>Sort by: {s.label}</option>
          ))}
        </select>
      </div>

      {loading && <div className="loading">Loading players...</div>}

      {!loading && (
        <div className="card" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 20 }}>Player</th>
                <th>Team</th>
                <th>Pos</th>
                <th>PTS</th>
                <th>REB</th>
                <th>AST</th>
                <th>3PM</th>
                <th>STL</th>
                <th>BLK</th>
                <th>MIN</th>
                <th>FG%</th>
                <th>FPTS</th>
              </tr>
            </thead>
            <tbody>
              {players.map(p => (
                <tr key={p.player_id}>
                  <td style={{ paddingLeft: 20, fontWeight: 600 }}>{p.full_name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{p.abbreviation}</td>
                  <td><span className="position-pill">{p.position}</span></td>
                  <td>{parseFloat(p.points).toFixed(1)}</td>
                  <td>{parseFloat(p.rebounds).toFixed(1)}</td>
                  <td>{parseFloat(p.assists).toFixed(1)}</td>
                  <td>{parseFloat(p.three_pm).toFixed(1)}</td>
                  <td>{parseFloat(p.steals).toFixed(1)}</td>
                  <td>{parseFloat(p.blocks).toFixed(1)}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{parseFloat(p.minutes).toFixed(0)}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{(parseFloat(p.fg_pct) * 100).toFixed(1)}%</td>
                  <td style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{parseFloat(p.fantasy_pts).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {players.length === 0 && (
            <div className="empty-state">No players found.</div>
          )}
        </div>
      )}
    </div>
  );
}
