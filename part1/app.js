var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mysql = require('mysql2/promise');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

let db;

(async () => {
  try {
    // Connect to the DogWalkService database (should be created using dogwalks.sql)
    db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'DogWalkService'
    });

    console.log('Connected to DogWalkService database');

  } catch (err) {
    console.error('Error connecting to database. Ensure MySQL is running and dogwalks.sql has been executed: service mysql start', err);
  }
})();

// API Endpoints

// Root route to return basic service info as JSON (following starthere pattern)
app.get('/', async (req, res) => {
  try {
    res.json({ message: "Dog Walking Service API", status: "running" });
  } catch (err) {
    res.status(500).json({ error: 'Service error' });
  }
});

app.get('/api/dogs', async (req, res) => {
  try {
    const [dogs] = await db.execute(`
      SELECT d.name as dog_name, d.size, u.username as owner_username
      FROM Dogs d
      JOIN Users u ON d.owner_id = u.user_id
      ORDER BY d.name
    `);
    res.json(dogs);
  } catch (err) {
    console.error('Error fetching dogs:', err);
    res.status(500).json({ error: 'Failed to fetch dogs' });
  }
});

app.get('/api/walkrequests/open', async (req, res) => {
  try {
    const [requests] = await db.execute(`
      SELECT wr.request_id, d.name as dog_name, wr.requested_time,
             wr.duration_minutes, wr.location, u.username as owner_username
      FROM WalkRequests wr
      JOIN Dogs d ON wr.dog_id = d.dog_id
      JOIN Users u ON d.owner_id = u.user_id
      WHERE wr.status = 'open'
      ORDER BY wr.requested_time
    `);
    res.json(requests);
  } catch (err) {
    console.error('Error fetching open walk requests:', err);
    res.status(500).json({ error: 'Failed to fetch open walk requests' });
  }
});

app.get('/api/walkers/summary', async (req, res) => {
  try {
    const [walkers] = await db.execute(`
      SELECT
        u.username as walker_username,
        COUNT(wr.rating_id) as total_ratings,
        CASE
          WHEN COUNT(wr.rating_id) > 0 THEN AVG(wr.rating)
          ELSE NULL
        END as average_rating,
        COUNT(DISTINCT wa.request_id) as completed_walks
      FROM Users u
      LEFT JOIN WalkApplications wa ON u.user_id = wa.walker_id AND wa.status = 'accepted'
      LEFT JOIN WalkRequests wreq ON wa.request_id = wreq.request_id AND wreq.status = 'completed'
      LEFT JOIN WalkRatings wr ON wreq.request_id = wr.request_id AND wr.walker_id = u.user_id
      WHERE u.role = 'walker'
      GROUP BY u.user_id, u.username
      ORDER BY u.username
    `);
    res.json(walkers);
  } catch (err) {
    console.error('Error fetching walker summary:', err);
    res.status(500).json({ error: 'Failed to fetch walker summary' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

module.exports = app;