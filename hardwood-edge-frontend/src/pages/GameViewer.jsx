import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

function StatusBadge({ status }) {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s === 'out')          return <span className="badge badge-red">OUT</span>;
  if (s === 'questionable') return <span className="badge badge-neutral">Q</span>;
  if (s === 'active')       return <span className="badge badge-favorable">Active</span>;
  return <span className="badge badge-blue">{status}</span>;
}

function RosterList({ players, title }) {
  if (!players || !players.length) return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{title}</div>
      <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>No lineup data yet</div>
    </div>
  );

  const starters = players.filter(p => p.is_starter);
  const bench    = players.filter(p => !p.is_starter);

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{title}</div>
      {starters.length > 0 && (
        <>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 6 }}>STARTERS</div>
          {starters.map(p => (
            <PlayerRow key={p.player_id} player={p} />
          ))}
        </>
      )}
      {bench.length > 0 && (
        <>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', margin: '10px 0 6px' }}>BENCH / INJURED</div>
          {bench.map(p => (
            <PlayerRow key={p.player_id} player={p} />
          ))}
        </>
      )}
    </div>
  );
}

function PlayerRow({ player }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="position-pill">{player.position}</span>
        <span style={{ fontSize: 13 }}>{player.full_name}</span>
        {player.injury_note && (
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>— {player.injury_note}</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{player.points} PPG</span>
        <StatusBadge status={player.status} />
      </div>
    </div>
  );
}

export default function GameViewer() {
  const [games, setGames]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate]     = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    setLoading(true);
    api.getGames({ date })
      .then(res => setGames(res.data || []))
      .catch(() => setGames([]))
      .finally(() => setLoading(false));
  }, [date]);

  return (
    <div>
      <div className="page-title">Today's Games</div>
      <div className="page-desc">Projected lineups and injury reports</div>

      <div className="filters">
        <input
          type="date"
          className="filter-input"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
      </div>

      {loading && <div className="loading">Loading games...</div>}

      {!loading && games.length === 0 && (
        <div className="empty-state">No games found for this date.</div>
      )}

      {!loading && games.map(game => (
        <div className="card" key={game.game_id}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {game.away_team} <span style={{ color: 'var(--text-secondary)', margin: '0 8px' }}>@</span> {game.home_team}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {game.game_time ? new Date(game.game_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}
              </span>
              <span className={`badge ${game.status === 'inprogress' ? 'badge-favorable' : 'badge-blue'}`}>
                {game.status || 'Scheduled'}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <RosterList players={game.away_roster} title={`${game.away_abbr} — Away`} />
            <RosterList players={game.home_roster} title={`${game.home_abbr} — Home`} />
          </div>
        </div>
      ))}
    </div>
  );
}
