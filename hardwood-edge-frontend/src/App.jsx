import React, { useState } from 'react';
import GameViewer    from './pages/GameViewer';
import DefenseTable  from './pages/DefenseTable';
import PlayerProfiles from './pages/PlayerProfiles';
import MatchupAnalyzer from './pages/MatchupAnalyzer';
import OddsPanel     from './pages/OddsPanel';

const NAV = [
  { id: 'games',    label: "Today's Games",      icon: '🏀' },
  { id: 'defense',  label: 'Defensive Rankings',  icon: '🛡' },
  { id: 'players',  label: 'Player Profiles',     icon: '📊' },
  { id: 'matchup',  label: 'Matchup Analyzer',    icon: '⚡' },
  { id: 'odds',     label: 'Odds Shopping',        icon: '💰' },
];

export default function App() {
  const [active, setActive] = useState('games');

  const renderPage = () => {
    switch (active) {
      case 'games':   return <GameViewer />;
      case 'defense': return <DefenseTable />;
      case 'players': return <PlayerProfiles />;
      case 'matchup': return <MatchupAnalyzer />;
      case 'odds':    return <OddsPanel />;
      default:        return <GameViewer />;
    }
  };

  return (
    <div className="app">
      <header className="header">
        <span className="header-logo">HARDWOOD EDGE</span>
        <span className="header-subtitle">NBA Betting Analytics</span>
      </header>
      <div className="main-content">
        <nav className="sidebar">
          {NAV.map(item => (
            <div
              key={item.id}
              className={`sidebar-item ${active === item.id ? 'active' : ''}`}
              onClick={() => setActive(item.id)}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>
        <main className="page-content">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
