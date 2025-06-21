const express = require('express');
const router = express.Router();
const db = require('../models/db');

router.get('/', async (req, res) => {
    try {
      const [dogs] = await db.query(`
        SELECT d.dog_id, d.name, d.size, u.user_id as owner_id, u.username as owner_username
        FROM Dogs d
        JOIN Users u ON d.owner_id = u.user_id
        ORDER BY d.name
      `);
      res.json(dogs);
    } catch (error) {
      console.error('Error fetching dogs:', error);
      res.status(500).json({ error: 'Failed to fetch dogs' });
    }
  });

  module.exports = router;
