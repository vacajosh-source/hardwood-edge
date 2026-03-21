require('dotenv').config();
const express = require('express');
const cors = require('cors');

const defenseRoutes = require('./routes/defense');
const playersRoutes = require('./routes/players');
const matchupRoutes = require('./routes/matchup');
const gamesRoutes   = require('./routes/games');
const oddsRoutes    = require('./routes/odds');
const adminRoutes   = require('./routes/admin');

// Start cron jobs
require('./jobs/statsJob');
require('./jobs/oddsJob');
require('./jobs/lineupsJob');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());

app.use('/api/defense', defenseRoutes);
app.use('/api/players', playersRoutes);
app.use('/api/matchup', matchupRoutes);
app.use('/api/games',   gamesRoutes);
app.use('/api/odds',    oddsRoutes);
app.use('/api/admin',   adminRoutes);


app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
