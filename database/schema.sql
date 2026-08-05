-- schema.sql
-- Database Schema for Centro Integral PsicArte

-- 1. Users Table (tabla unificada de usuarios)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'usuario',  -- 'administrador', 'prestador', 'usuario'
    rut TEXT,
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Provider Profiles table (auxiliar para datos específicos de prestadores)
CREATE TABLE IF NOT EXISTS provider_profiles (
    userId TEXT PRIMARY KEY,
    blocks TEXT,
    bio TEXT,
    FOREIGN KEY (userId) REFERENCES users(id)
);

-- 3. Content table
CREATE TABLE IF NOT EXISTS content (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- 4. Rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT,
    type TEXT,
    openTime TEXT,
    closeTime TEXT
);

-- 5. Services table
CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    providerId TEXT,
    name TEXT,
    price INTEGER,
    duration INTEGER,
    type TEXT,
    roomId TEXT,
    recurrence TEXT DEFAULT 'single',
    recurrenceDay INTEGER,
    recurrenceStartTime TEXT,
    recurrenceEndTime TEXT,
    recurrenceStartDate TEXT,
    recurrenceEndDate TEXT,
    allowReschedule INTEGER DEFAULT 1,
    maxReschedules INTEGER DEFAULT 1
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
    rescheduleCount INTEGER DEFAULT 0,
    khipuPaymentId TEXT,
    khipuPaymentUrl TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. Service Schedules (Spots pre-generados)
CREATE TABLE IF NOT EXISTS service_schedules (
    id TEXT PRIMARY KEY,
    serviceId TEXT NOT NULL,
    roomId TEXT NOT NULL,
    providerId TEXT NOT NULL,
    date TEXT NOT NULL,
    startTime TEXT NOT NULL,
    endTime TEXT NOT NULL,
    status TEXT DEFAULT 'available',
    bookingId TEXT,
    generatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (serviceId) REFERENCES services(id),
    FOREIGN KEY (roomId) REFERENCES rooms(id),
    FOREIGN KEY (providerId) REFERENCES users(id)
);

-- 8. Sickness Blocks table
CREATE TABLE IF NOT EXISTS sickness_blocks (
    id TEXT PRIMARY KEY,
    providerId TEXT,
    date TEXT,
    timeSlot TEXT,
    reason TEXT
);

-- 9. Activities table
CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    title TEXT,
    date TEXT,
    time TEXT,
    location TEXT,
    desc TEXT,
    capacity INTEGER DEFAULT 0
);

-- 10. Activity Enrollments table
CREATE TABLE IF NOT EXISTS activity_enrollments (
    id TEXT PRIMARY KEY,
    activityId TEXT,
    clientName TEXT,
    clientEmail TEXT,
    clientPhone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 11. Config table
CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- 12. Khipu Notifications Table
CREATE TABLE IF NOT EXISTS khipu_notifications (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,          -- 'payment_1.3', 'rendition_drn_2.0', 'transaction_dtn_1.0'
    headers TEXT,                -- JSON string of headers
    query_params TEXT,           -- JSON string of query params
    body TEXT,                   -- JSON string or raw text of the POST body
    ip_address TEXT,             -- Sender's IP address
    received_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
