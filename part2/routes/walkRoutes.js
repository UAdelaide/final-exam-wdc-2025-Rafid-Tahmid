const express = require('express');
const router = express.Router();
const db = require('../models/db');

// GET all walk requests (for walkers to view)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT wr.*, d.name AS dog_name, d.size, u.username AS owner_name
      FROM WalkRequests wr
      JOIN Dogs d ON wr.dog_id = d.dog_id
      JOIN Users u ON d.owner_id = u.user_id
      WHERE wr.status = 'open'
    `);
    res.json(rows);
  } catch (error) {
    console.error('SQL Error:', error);
    res.status(500).json({ error: 'Failed to fetch walk requests' });
  }
});

// POST a new walk request (from owner)
router.post('/', async (req, res) => {
  const { dog_id, requested_time, duration_minutes, location } = req.body;

  try {
    // Validate required fields
    if (!dog_id || !requested_time || !duration_minutes || !location) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Convert datetime-local format to MySQL datetime format
    const mysqlDateTime = new Date(requested_time).toISOString().slice(0, 19).replace('T', ' ');

    const [result] = await db.query(`
      INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location)
      VALUES (?, ?, ?, ?)
    `, [dog_id, mysqlDateTime, duration_minutes, location]);

    res.status(201).json({ message: 'Walk request created', request_id: result.insertId });
  } catch (error) {
    console.error('Walk request creation error:', error);
    res.status(500).json({ error: 'Failed to create walk request: ' + error.message });
  }
});

// POST an application to walk a dog (from walker)
router.post('/:id/apply', async (req, res) => {
  const requestId = req.params.id;
  const { walker_id } = req.body;

  try {
    await db.query(`
      INSERT INTO WalkApplications (request_id, walker_id)
      VALUES (?, ?)
    `, [requestId, walker_id]);

    await db.query(`
      UPDATE WalkRequests
      SET status = 'accepted'
      WHERE request_id = ?
    `, [requestId]);

    res.status(201).json({ message: 'Application submitted' });
  } catch (error) {
    console.error('SQL Error:', error);
    res.status(500).json({ error: 'Failed to apply for walk' });
  }
});


// Get dogs for the logged-in owner
router.get('/my-dogs', async (req, res) => {
  try{
    const owner_id = req.session?.user?.user_id;
    const role = req.session?.user?.role;
    if (!owner_id || role !== 'owner') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const[rows]=await db.query(`
      SELECT dog_id, name, size
      FROM Dogs d
      WHERE d.owner_id = ?
      ORDER BY d.name
      `, [owner_id]);
      res.json(rows);
    } catch (error) {
      console.error('SQL Error:', error);
      res.status(500).json({ error: 'Failed to fetch dogs' });
    }
  });

module.exports = router;
