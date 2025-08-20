const express = require('express');
const mysql = require('mysql2/promise'); // mysql2 with promises
require('dotenv').config();

const app = express();
app.use(express.json()); // parse JSON request body

// MySQL connection pool using Railway DATABASE_URL
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,  // Railway injects full MySQL URL here
  ssl: { rejectUnauthorized: false }, // required for Railway
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

console.log("DATABASE_URL:", process.env.DATABASE_URL);

// Test connection on startup
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log("✅ Connected to MySQL!");
    conn.release();
  } catch (err) {
    console.error("❌ Connection error:", err);
  }
})();

// Basic route
app.get('/', (req, res) => {
  res.send('Hello from Express + MySQL 🚀');
});

// Add School
app.post('/addSchool', async (req, res) => {
  const { name, address, latitude, longitude } = req.body;

  try {
    const [result] = await pool.query(
      'INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)',
      [name, address, latitude, longitude]
    );
    res.json({ message: 'Location added successfully', locationId: result.insertId });
  } catch (err) {
    console.error('❌ Error inserting location:', err);
    res.status(500).json({ error: 'Error adding location' });
  }
});

// List Schools sorted by distance
app.post('/listSchools', async (req, res) => {
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }

  const sql = `
    SELECT 
        id,
        name,
        address,
        latitude,
        longitude,
        (
            6371 * ACOS(
                COS(RADIANS(?)) * COS(RADIANS(latitude)) * COS(RADIANS(longitude) - RADIANS(?)) +
                SIN(RADIANS(?)) * SIN(RADIANS(latitude))
            )
        ) AS distance
    FROM schools
    ORDER BY distance ASC
  `;

  try {
    const [results] = await pool.query(sql, [latitude, longitude, latitude]);
    res.json({
      message: "Locations sorted by distance",
      locations: results
    });
  } catch (err) {
    console.error('❌ Error retrieving locations:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test DB route
app.get('/test-db', async (req, res) => {
  try {
    const [results] = await pool.query('SELECT 1 + 1 AS result');
    res.send('Database connected! Result: ' + results[0].result);
  } catch (err) {
    console.error('DB connection error:', err);
    res.status(500).send('Database not connected');
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
