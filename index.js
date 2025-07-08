const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
console.log('Starting Express app...');

const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// PostgreSQL connection setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});


pool.connect()
  .then(() => console.log('✅ Connected to PostgreSQL database'))
  .catch(err => {
    console.error('❌ Failed to connect to PostgreSQL:', err);
    process.exit(1);
  });

app.get('/', (req, res) => {
  res.send('Voter poll API is running');
});

// Submit vote
app.post('/vote', async (req, res) => {
  const { name, surname, idNumber, email, party } = req.body;

  try {
    const existing = await pool.query(
      'SELECT * FROM votes WHERE id_number = $1',
      [idNumber]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'This ID number has already voted' });
    }

    await pool.query(
      'INSERT INTO votes (name, surname, id_number, email, party) VALUES ($1, $2, $3, $4, $5)',
      [name, surname, idNumber, email, party]
    );

    res.status(200).json({ message: 'Vote submitted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get poll results
app.get('/results', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT party, COUNT(*) AS count FROM votes GROUP BY party'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
