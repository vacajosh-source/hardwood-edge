-- Teams reference table
CREATE TABLE IF NOT EXISTS teams (
  id            SERIAL PRIMARY KEY,
  team_id       VARCHAR(50) UNIQUE NOT NULL,
  name          VARCHAR(100) NOT NULL,
  abbreviation  VARCHAR(10) NOT NULL,
  conference    VARCHAR(10),
  division      VARCHAR(20),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- Player averages (current season)
CREATE TABLE IF NOT EXISTS players (
  id            SERIAL PRIMARY KEY,
  player_id     VARCHAR(50) UNIQUE NOT NULL,
  team_id       VARCHAR(50) REFERENCES teams(team_id),
  full_name     VARCHAR(100) NOT NULL,
  position      VARCHAR(5),
  points        NUMERIC(5,2) DEFAULT 0,
  rebounds      NUMERIC(5,2) DEFAULT 0,
  assists       NUMERIC(5,2) DEFAULT 0,
  three_pm      NUMERIC(5,2) DEFAULT 0,
  steals        NUMERIC(5,2) DEFAULT 0,
  blocks        NUMERIC(5,2) DEFAULT 0,
  minutes       NUMERIC(5,2) DEFAULT 0,
  fg_pct        NUMERIC(5,4) DEFAULT 0,
  fantasy_pts   NUMERIC(6,2) DEFAULT 0,
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- Defensive stats per team per position (powers Feature 1)
CREATE TABLE IF NOT EXISTS team_defense (
  id              SERIAL PRIMARY KEY,
  team_id         VARCHAR(50) REFERENCES teams(team_id),
  position        VARCHAR(5) NOT NULL,
  pts_allowed     NUMERIC(5,2) DEFAULT 0,
  fg_pct_allowed  NUMERIC(5,4) DEFAULT 0,
  fantasy_allowed NUMERIC(6,2) DEFAULT 0,
  games_played    INTEGER DEFAULT 0,
  season          VARCHAR(10) NOT NULL,
  updated_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, position, season)
);

-- Games
CREATE TABLE IF NOT EXISTS games (
  id            SERIAL PRIMARY KEY,
  game_id       VARCHAR(50) UNIQUE NOT NULL,
  home_team_id  VARCHAR(50) REFERENCES teams(team_id),
  away_team_id  VARCHAR(50) REFERENCES teams(team_id),
  game_date     DATE NOT NULL,
  game_time     TIMESTAMP,
  status        VARCHAR(20),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- Odds
CREATE TABLE IF NOT EXISTS odds (
  id            SERIAL PRIMARY KEY,
  game_id       VARCHAR(50) REFERENCES games(game_id),
  player_id     VARCHAR(50) REFERENCES players(player_id),
  book          VARCHAR(50) NOT NULL,
  market        VARCHAR(50) NOT NULL,
  line          NUMERIC(5,2),
  over_price    INTEGER,
  under_price   INTEGER,
  fetched_at    TIMESTAMP DEFAULT NOW()
);

-- Injuries + lineups
CREATE TABLE IF NOT EXISTS lineups (
  id            SERIAL PRIMARY KEY,
  game_id       VARCHAR(50) REFERENCES games(game_id),
  player_id     VARCHAR(50) REFERENCES players(player_id),
  team_id       VARCHAR(50) REFERENCES teams(team_id),
  status        VARCHAR(30),
  injury_note   TEXT,
  is_starter    BOOLEAN DEFAULT FALSE,
  updated_at    TIMESTAMP DEFAULT NOW()
);
