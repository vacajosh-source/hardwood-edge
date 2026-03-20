import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

const MARKETS = [
  { key: '',                  label: 'All Markets' },
  { key: 'player_points',     label: 'Points' },
  { key: 'player_rebounds',   label: 'Rebounds' },
  { key: 'player_assists',    label: 'Assists' },
  { key: 'player_threes',     label: '3-Pointers' },
];

function formatOdds(price) {
  if (!price) return '—';
  return price > 0 ? `+${price}` : `${price}`;
}

function OddsRow({ entry }) {
  const books = entry.books || [];

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontWeight: 600 }}>{entry.player_name}</span>
        <span className="position-pill">{entry.position}</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{entry.team}</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: 12, marginLeft: 'auto' }}>
          {entry.market.replace('player_', '').toUpperCase()}
        </span>
      </div>

      {/* Best available */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        {entry.best_over && (
          <div style={{ background: 'rgba(63,185,80,0.08)', border: '1px solid rgba(63,185,80,0.2)', borderRadius: 6, padding: 10 }}>
            <div style={{ fontSize: 10, color: 'var(--accent-green)', fontWeight: 600, marginBottom: 4 }}>BEST OVER</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{entry.best_over.line}</div>
            <div style={{ fontSize: 12, color: 'var(--accent-green)' }}>{formatOdds(entry.best_over.price)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{entry.best_over.book}</div>
          </div>
        )}
        {entry.best_under && (
          <div style={{ background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.2)', borderRadius: 6, padding: 10 }}>
            <div style={{ fontSize: 10, color: 'var(--accent-red)', fontWeight: 600, marginBottom: 4 }}>BEST UNDER</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{entry.best_under.line}</div>
            <div style={{ fontSize: 12, color: 'var(--accent-red)' }}>{formatOdds(entry.best_under.price)}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{entry.best_under.book}</div>
          </div>
        )}
      </div>

      {/* All books */}
      <table className="data-table" style={{ fontSize: 12 }}>
        <thead>
          <tr>
            <th>Book</th>
            <th>Line</th>
            <th>Over</th>
            <th>Under</th>
          </tr>
        </thead>
        <tbody>
          {books.map((b, i) => (
            <tr key={i}>
              <td style={{ color: 'var(--text-secondary)' }}>{b.book}</td>
              <td style={{ fontWeight: 600 }}>{b.line ?? '—'}</td>
              <td style={{ color: b.over_price > 0 ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                {formatOdds(b.over_price)}
              </td>
              <td style={{ color: b.under_price > 0 ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                {formatOdds(b.under_price)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function OddsPanel() {
  const [odds, setOdds]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [market, setMarket]   = useState('player_points');
  const [search, setSearch]   = useState('');
  const [inputVal, setInputVal] = useState('');

  useEffect(() => {
    setLoading(true);
    api.getOdds({ market })
      .then(res => setOdds(res.data || []))
      .catch(() => setOdds([]))
      .finally(() => setLoading(false));
  }, [market]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(inputVal), 400);
    return () => clearTimeout(t);
  }, [inputVal]);

  const filtered = search
    ? odds.filter(o => o.player_name.toLowerCase().includes(search.toLowerCase()))
    : odds;

  return (
    <div>
      <div className="page-title">Odds Shopping</div>
      <div className="page-desc">Best available prop lines across all books. Green highlights the best price.</div>

      <div className="filters">
        <input
          className="filter-input"
          placeholder="Search player..."
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          style={{ width: 180 }}
        />
        <select className="filter-select" value={market} onChange={e => setMarket(e.target.value)}>
          {MARKETS.map(m => (
            <option key={m.key} value={m.key}>{m.label}</option>
          ))}
        </select>
      </div>

      {loading && <div className="loading">Loading odds...</div>}

      {!loading && filtered.length === 0 && (
        <div className="empty-state">No odds data available. Check back once games are posted.</div>
      )}

      {!loading && filtered.map((entry, i) => (
        <OddsRow key={i} entry={entry} />
      ))}
    </div>
  );
}
