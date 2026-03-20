import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

const POSITIONS = ['', 'PG', 'SG', 'SF', 'PF', 'C'];
const SORT_COLS  = [
  { key: 'pts_allowed',     label: 'PTS Allowed' },
  { key: 'fg_pct_allowed',  label: 'FG% Allowed' },
  { key: 'fantasy_allowed', label: 'FPTS Allowed' },
];

function pct(val) {
  return val ? (parseFloat(val) * 100).toFixed(1) + '%' : '—';
}

export default function DefenseTable() {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [position, setPosition] = useState('PG');
  const [sort, setSort]         = useState('pts_allowed');

  useEffect(() => {
    setLoading(true);
    api.getDefense({ position, sort })
      .then(res => setRows(res.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [position, sort]);

  // Compute min/max for red-flagging
  const values = rows.map(r => parseFloat(r.pts_allowed));
  const maxVal  = Math.max(...values);
  const minVal  = Math.min(...values);

  return (
    <div>
      <div className="page-title">Defensive Rankings</div>
      <div className="page-desc">Points, FG%, and fantasy points allowed per position. Higher = worse defense = betting edge.</div>

      <div className="filters">
        <select className="filter-select" value={position} onChange={e => setPosition(e.target.value)}>
          {POSITIONS.map(p => (
            <option key={p} value={p}>{p || 'All Positions'}</option>
          ))}
        </select>

        <select className="filter-select" value={sort} onChange={e => setSort(e.target.value)}>
          {SORT_COLS.map(s => (
            <option key={s.key} value={s.key}>Sort by: {s.label}</option>
          ))}
        </select>
      </div>

      {loading && <div className="loading">Loading defensive stats...</div>}

      {!loading && (
        <div className="card" style={{ padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 20 }}>Rank</th>
                <th>Team</th>
                <th>Pos</th>
                <th onClick={() => setSort('pts_allowed')}
                    style={{ color: sort === 'pts_allowed' ? 'var(--accent-blue)' : '' }}>
                  PTS Allowed ↕
                </th>
                <th onClick={() => setSort('fg_pct_allowed')}
                    style={{ color: sort === 'fg_pct_allowed' ? 'var(--accent-blue)' : '' }}>
                  FG% Allowed ↕
                </th>
                <th onClick={() => setSort('fantasy_allowed')}
                    style={{ color: sort === 'fantasy_allowed' ? 'var(--accent-blue)' : '' }}>
                  FPTS Allowed ↕
                </th>
                <th>GP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const pts     = parseFloat(row.pts_allowed);
                const isWorst = pts === maxVal;
                const isBest  = pts === minVal;
                return (
                  <tr key={`${row.team_id}-${row.position}`}>
                    <td style={{ paddingLeft: 20, color: 'var(--text-secondary)' }}>{i + 1}</td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{row.abbreviation}</span>
                      <span style={{ color: 'var(--text-secondary)', marginLeft: 6, fontSize: 12 }}>{row.team_name}</span>
                    </td>
                    <td><span className="position-pill">{row.position}</span></td>
                    <td>
                      <span className={isWorst ? 'stat-high' : isBest ? 'stat-low' : ''}>
                        {parseFloat(row.pts_allowed).toFixed(1)}
                      </span>
                      {isWorst && <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--accent-red)' }}>▲ WEAK</span>}
                    </td>
                    <td>{pct(row.fg_pct_allowed)}</td>
                    <td>{parseFloat(row.fantasy_allowed).toFixed(1)}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{row.games_played}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
