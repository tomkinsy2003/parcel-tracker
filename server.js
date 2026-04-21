// Load environment variables (for local development)
// In production (Render), these come from the dashboard.
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');       // Web framework
const session = require('express-session'); // Keeps admin logged in
const cors = require('cors');             // Allows frontend to talk to backend
const path = require('path');

// Our custom database functions (we'll create this next)
const { parcelQueries, updateQueries } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware – these run on every request
app.use(express.json());                  // Parse JSON bodies
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public'))); // Serve HTML/CSS/JS

// Session setup – keeps admin logged in
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 day
}));

// Admin password – from environment variable or default
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Middleware to protect admin routes
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    next(); // User is logged in, proceed
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// ---------- PUBLIC ROUTES ----------

// Track a parcel by tracking number
app.get('/api/track/:trackingNumber', async (req, res) => {
  try {
    const parcel = await parcelQueries.getByTrackingNumber(req.params.trackingNumber);
    if (!parcel) {
      return res.status(404).json({ error: 'Parcel not found' });
    }
    const updates = await updateQueries.getByParcelId(parcel.id);
    res.json({ parcel, updates });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------- ADMIN AUTH ----------
app.post('/api/admin/login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.get('/api/admin/check', (req, res) => {
  res.json({ isAdmin: !!req.session.isAdmin });
});

// ---------- ADMIN PARCEL MANAGEMENT ----------

// Get all parcels
app.get('/api/admin/parcels', requireAdmin, async (req, res) => {
  try {
    const parcels = await parcelQueries.getAll();
    res.json(parcels);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a new parcel
app.post('/api/admin/parcels', requireAdmin, async (req, res) => {
  try {
    const { sender, receiver } = req.body;
    if (!sender || !receiver) {
      return res.status(400).json({ error: 'Sender and receiver required' });
    }
    const result = await parcelQueries.create(sender, receiver);
    await updateQueries.add(result.id, 'Pending', 'Shipment created');
    res.status(201).json({ id: result.id, trackingNumber: result.trackingNumber });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update parcel status
app.put('/api/admin/parcels/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status, location } = req.body;
    if (!['Pending', 'In Transit', 'Delivered'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    await parcelQueries.updateStatus(req.params.id, status);
    await updateQueries.add(req.params.id, status, location || 'Status updated');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a parcel
app.delete('/api/admin/parcels/:id', requireAdmin, async (req, res) => {
  try {
    await parcelQueries.delete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Start the server – listen on all network interfaces
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});
