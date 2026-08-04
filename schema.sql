-- schema.sql
-- Database Schema for Centro Integral PsicArte

-- 1. Content table
CREATE TABLE IF NOT EXISTS content (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- 2. Rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT,
    type TEXT,
    openTime TEXT,
    closeTime TEXT
);

-- 3. Providers table
CREATE TABLE IF NOT EXISTS providers (
    id TEXT PRIMARY KEY,
    name TEXT,
    role TEXT,
    email TEXT,
    blocks TEXT
);

-- 4. Services table
CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    providerId TEXT,
    name TEXT,
    price INTEGER,
    duration INTEGER,
    type TEXT,
    allowReschedule INTEGER DEFAULT 1,
    maxReschedules INTEGER DEFAULT 1
);

-- 5. Clients table
CREATE TABLE IF NOT EXISTS clients (
    email TEXT PRIMARY KEY,
    name TEXT,
    rut TEXT,
    phone TEXT
);

-- 6. Bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    providerId TEXT,
    serviceId TEXT,
    serviceName TEXT,
    price INTEGER,
    duration INTEGER,
    roomId TEXT,
    roomName TEXT,
    date TEXT,
    timeSlot TEXT,
    startTime TEXT,
    endTime TEXT,
    clientEmail TEXT,
    clientName TEXT,
    clientRut TEXT,
    clientPhone TEXT,
    status TEXT,
    rescheduleCount INTEGER DEFAULT 0
);

-- 7. Sickness Blocks table
CREATE TABLE IF NOT EXISTS sickness_blocks (
    id TEXT PRIMARY KEY,
    providerId TEXT,
    date TEXT,
    timeSlot TEXT,
    reason TEXT
);

-- 8. Activities table
CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    title TEXT,
    date TEXT,
    time TEXT,
    location TEXT,
    desc TEXT,
    capacity INTEGER DEFAULT 0
);

-- 9. Activity Enrollments table
CREATE TABLE IF NOT EXISTS activity_enrollments (
    id TEXT PRIMARY KEY,
    activityId TEXT,
    clientName TEXT,
    clientEmail TEXT,
    clientPhone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 10. Config table
CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT
);
