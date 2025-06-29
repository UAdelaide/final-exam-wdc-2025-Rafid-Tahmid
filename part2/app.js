const express = require('express');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

const app = express();
const dogRoutes = require('./routes/dogRoutes');
// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '/public')));

// Session middleware
app.use(session({
  secret: 'dog-walking-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// Routes
const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dogs', dogRoutes);

// Export the app instead of listening here
module.exports = app;
