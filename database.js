const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'parcels.json');

// Create data folder if it doesn't exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize empty database file if not present
function initDB() {
  if (!fs.existsSync(DB_FILE)) {
    const empty = { parcels: [], updates: [], nextId: 1 };
    fs.writeFileSync(DB_FILE, JSON.stringify(empty, null, 2));
  }
}

// Read the whole database
function readDB() {
  initDB();
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

// Write to database
function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Generate tracking number like DHL123456789NG
function generateTrackingNumber() {
  const prefix = 'DHL';
  const random = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
  return prefix + random + 'NG';
}

// Functions to manage parcels
const parcelQueries = {
  create: (sender, receiver) => {
    const db = readDB();
    const trackingNumber = generateTrackingNumber();
    const newParcel = {
      id: db.nextId++,
      tracking_number: trackingNumber,
      sender,
      receiver,
      status: 'Pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.parcels.push(newParcel);
    writeDB(db);
    return { id: newParcel.id, trackingNumber };
  },

  getAll: () => {
    const db = readDB();
    return db.parcels.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  getByTrackingNumber: (trackingNumber) => {
    const db = readDB();
    return db.parcels.find(p => p.tracking_number === trackingNumber) || null;
  },

  updateStatus: (id, status) => {
    const db = readDB();
    const parcel = db.parcels.find(p => p.id === Number(id));
    if (parcel) {
      parcel.status = status;
      parcel.updated_at = new Date().toISOString();
      writeDB(db);
    }
    return parcel;
  },

  delete: (id) => {
    const db = readDB();
    db.parcels = db.parcels.filter(p => p.id !== Number(id));
    db.updates = db.updates.filter(u => u.parcel_id !== Number(id));
    writeDB(db);
  }
};

// Functions for status updates
const updateQueries = {
  add: (parcelId, status, location) => {
    const db = readDB();
    db.updates.push({
      id: db.updates.length + 1,
      parcel_id: Number(parcelId),
      status,
      location: location || null,
      timestamp: new Date().toISOString()
    });
    writeDB(db);
  },

  getByParcelId: (parcelId) => {
    const db = readDB();
    return db.updates
      .filter(u => u.parcel_id === Number(parcelId))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
};

module.exports = { parcelQueries, updateQueries };
