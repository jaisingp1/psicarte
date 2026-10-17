-- schema.sql
-- Database Schema for Centro Integral PsicArte
-- Refactored: Agenda & Booking Module

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

-- 4. Rooms table (simplified — schedules moved to room_schedules)
CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT,
    type TEXT
);

-- 5. Room Schedules table (per day-of-week operating blocks)
CREATE TABLE IF NOT EXISTS room_schedules (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    day_of_week INTEGER NOT NULL,  -- ISO: 1=Monday ... 7=Sunday
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    UNIQUE(room_id, day_of_week, start_time)
);

-- 6. Services table (simplified — recurrence moved to agendas, room moved to service_rooms)
CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    providerId TEXT NOT NULL,
    name TEXT NOT NULL,
    price INTEGER DEFAULT 0,
    duration INTEGER NOT NULL,
    type TEXT,
    allowReschedule INTEGER DEFAULT 1,
    maxReschedules INTEGER DEFAULT 1,
    FOREIGN KEY (providerId) REFERENCES users(id)
);

-- 7. Service-Rooms association table (many-to-many)
CREATE TABLE IF NOT EXISTS service_rooms (
    id TEXT PRIMARY KEY,
    service_id TEXT NOT NULL,
    room_id TEXT NOT NULL,
    FOREIGN KEY (service_id) REFERENCES services(id),
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    UNIQUE(service_id, room_id)
);

-- 8. Holidays table
CREATE TABLE IF NOT EXISTS holidays (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL
);

-- 9. Agendas table
CREATE TABLE IF NOT EXISTS agendas (
    id TEXT PRIMARY KEY,
    provider_id TEXT NOT NULL,
    service_id TEXT NOT NULL,
    room_id TEXT NOT NULL,
    type TEXT NOT NULL,             -- 'recurrent' or 'punctual'
    recurrence_rule TEXT,           -- JSON: rrule config + per-day time_ranges (for recurrent)
    specific_date TEXT,             -- ISO date (for punctual)
    start_time TEXT NOT NULL,       -- HH:MM
    end_time TEXT NOT NULL,         -- HH:MM
    start_date TEXT,                -- ISO date range start (for recurrent)
    end_date TEXT,                  -- ISO date range end (for recurrent)
    status TEXT DEFAULT 'draft',    -- 'draft' or 'published'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_id) REFERENCES users(id),
    FOREIGN KEY (service_id) REFERENCES services(id),
    FOREIGN KEY (room_id) REFERENCES rooms(id)
);

-- 10. Spots table (generated from agendas)
CREATE TABLE IF NOT EXISTS spots (
    id TEXT PRIMARY KEY,
    agenda_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    service_id TEXT NOT NULL,
    room_id TEXT NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    status TEXT DEFAULT 'available', -- 'available', 'reserved', 'booked'
    booking_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agenda_id) REFERENCES agendas(id),
    FOREIGN KEY (provider_id) REFERENCES users(id),
    FOREIGN KEY (service_id) REFERENCES services(id),
    FOREIGN KEY (room_id) REFERENCES rooms(id)
);

-- 11. Bookings table (updated with client_id and spot_id)
CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    spot_id TEXT,
    client_id TEXT,
    providerId TEXT,
    serviceId TEXT,
    agendaId TEXT,
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
    status TEXT,                   -- 'Pending_Payment', 'Paid', 'Cancelled'
    rescheduleCount INTEGER DEFAULT 0,
    khipuPaymentId TEXT,
    khipuPaymentUrl TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (spot_id) REFERENCES spots(id),
    FOREIGN KEY (client_id) REFERENCES users(id)
);

-- 12. Sickness Blocks table
CREATE TABLE IF NOT EXISTS sickness_blocks (
    id TEXT PRIMARY KEY,
    providerId TEXT,
    date TEXT,
    timeSlot TEXT,
    reason TEXT
);

-- 13. Activities table
CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    title TEXT,
    date TEXT,
    time TEXT,
    location TEXT,
    desc TEXT,
    capacity INTEGER DEFAULT 0
);

-- 14. Activity Enrollments table
CREATE TABLE IF NOT EXISTS activity_enrollments (
    id TEXT PRIMARY KEY,
    activityId TEXT,
    clientName TEXT,
    clientEmail TEXT,
    clientPhone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 15. Config table
CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- 16. Khipu Notifications Table
CREATE TABLE IF NOT EXISTS khipu_notifications (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    headers TEXT,
    query_params TEXT,
    body TEXT,
    ip_address TEXT,
    received_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
