-- schema.sql
-- Database Schema for Centro Integral PsicArte
-- Nueva lógica de disponibilidad dinámica en rejilla de 5 minutos
-- 1. Users Table (tabla unificada de usuarios)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'usuario',
    -- 'administrador', 'prestador', 'usuario'
    rut TEXT,
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- 2. Provider Profiles table (auxiliar para datos específicos de prestadores)
CREATE TABLE IF NOT EXISTS provider_profiles (
    userId TEXT PRIMARY KEY,
    specialty TEXT,
    bio TEXT,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
-- 3. Content table
CREATE TABLE IF NOT EXISTS content (key TEXT PRIMARY KEY, value TEXT);
-- 3a. Community articles (authenticated submissions require administrator approval)
CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,
    author_id TEXT,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_review' CHECK (
        status IN ('pending_review', 'published', 'rejected')
    ),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    published_at DATETIME,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE
    SET NULL
);
-- 4. Rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    -- 'Física' | 'Virtual'
    capacity INTEGER DEFAULT 1,
    -- Solo aplica a físicas; cupo efectivo es 1
    meet_enabled INTEGER DEFAULT 1,
    -- Para virtuales: 1 por defecto, configurable
    allow_all_services INTEGER DEFAULT 1,
    -- 1: permite todos los servicios, 0: restringido a room_services
    min_advance_min INTEGER DEFAULT 0,
    -- Antelación mínima en minutos
    max_advance_days INTEGER DEFAULT 60,
    -- Antelación máxima en días
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- 5. Room Shifts table (franjas de atención por día de la semana)
CREATE TABLE IF NOT EXISTS room_shifts (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    day_of_week INTEGER NOT NULL,
    -- ISO: 1=Lunes ... 7=Domingo
    start_time TEXT NOT NULL,
    -- HH:MM
    end_time TEXT NOT NULL,
    -- HH:MM
    provider_id TEXT NOT NULL,
    -- Prestador asignado (exclusivo por sala-franja)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(room_id, day_of_week, start_time)
);
-- 6. Room Shift Breaks table (descansos dentro de cada franja)
CREATE TABLE IF NOT EXISTS room_shift_breaks (
    id TEXT PRIMARY KEY,
    shift_id TEXT NOT NULL,
    start_time TEXT NOT NULL,
    -- HH:MM
    end_time TEXT NOT NULL,
    -- HH:MM
    FOREIGN KEY (shift_id) REFERENCES room_shifts(id) ON DELETE CASCADE
);
-- 7. Room Exceptions table (excepciones por fecha o feriado)
CREATE TABLE IF NOT EXISTS room_exceptions (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    date TEXT NOT NULL,
    -- YYYY-MM-DD
    type TEXT NOT NULL,
    -- 'close_day', 'delete_shift', 'modify_shift', 'add_shift'
    target_shift_id TEXT,
    -- Referencia a room_shifts(id) en delete_shift o modify_shift
    start_time TEXT,
    -- HH:MM (modify_shift / add_shift)
    end_time TEXT,
    -- HH:MM (modify_shift / add_shift)
    provider_id TEXT,
    -- Prestador asignado (modify_shift / add_shift)
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (target_shift_id) REFERENCES room_shifts(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE
    SET NULL
);
-- 8. Room Exception Breaks table (descansos para franjas modificadas o agregadas en excepción)
CREATE TABLE IF NOT EXISTS room_exception_breaks (
    id TEXT PRIMARY KEY,
    exception_id TEXT NOT NULL,
    start_time TEXT NOT NULL,
    -- HH:MM
    end_time TEXT NOT NULL,
    -- HH:MM
    FOREIGN KEY (exception_id) REFERENCES room_exceptions(id) ON DELETE CASCADE
);
-- 9. Services Master Catalog table
CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    allowReschedule INTEGER DEFAULT 1,
    maxReschedules INTEGER DEFAULT 1,
    min_advance_min INTEGER DEFAULT 0,
    max_advance_days INTEGER DEFAULT 60,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- 10. Provider-Services association table (duración y precio por prestador)
CREATE TABLE IF NOT EXISTS provider_services (
    id TEXT PRIMARY KEY,
    provider_id TEXT NOT NULL,
    service_id TEXT NOT NULL,
    duration INTEGER NOT NULL,
    -- Duración en minutos (múltiplo de 5 min)
    price INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    UNIQUE(provider_id, service_id)
);
-- 11. Room-Services restriction table (cuando allow_all_services = 0)
CREATE TABLE IF NOT EXISTS room_services (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    service_id TEXT NOT NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    UNIQUE(room_id, service_id)
);
-- 12. Provider Vacations table
CREATE TABLE IF NOT EXISTS provider_vacations (
    id TEXT PRIMARY KEY,
    provider_id TEXT NOT NULL,
    start_date TEXT NOT NULL,
    -- YYYY-MM-DD
    end_date TEXT NOT NULL,
    -- YYYY-MM-DD
    start_time TEXT DEFAULT '00:00',
    -- HH:MM
    end_time TEXT DEFAULT '23:59',
    -- HH:MM
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
);
-- 13. Provider-Room Google Accounts table (OAuth 2.0 por prestador-sala)
CREATE TABLE IF NOT EXISTS provider_room_google_accounts (
    id TEXT PRIMARY KEY,
    provider_id TEXT NOT NULL,
    room_id TEXT NOT NULL,
    google_email TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expiry INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    UNIQUE(provider_id, room_id)
);
-- 14. Holidays table
CREATE TABLE IF NOT EXISTS holidays (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL
);
-- 15. Bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    providerId TEXT NOT NULL,
    serviceId TEXT NOT NULL,
    roomId TEXT NOT NULL,
    serviceName TEXT,
    price INTEGER,
    duration INTEGER,
    roomName TEXT,
    date TEXT NOT NULL,
    startTime TEXT NOT NULL,
    endTime TEXT NOT NULL,
    timeSlot TEXT,
    clientEmail TEXT,
    clientName TEXT,
    clientRut TEXT,
    clientPhone TEXT,
    status TEXT NOT NULL DEFAULT 'Pending_Payment',
    -- 'Pending_Payment', 'Paid', 'Cancelled'
    rescheduleCount INTEGER DEFAULT 0,
    khipuPaymentId TEXT,
    khipuPaymentUrl TEXT,
    confirmation_email_sent INTEGER DEFAULT 0,
    meet_link TEXT DEFAULT '',
    meet_status TEXT DEFAULT 'none',
    -- 'none', 'pending', 'ready', 'failed'
    meet_retries INTEGER DEFAULT 0,
    meet_last_error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES users(id),
    FOREIGN KEY (providerId) REFERENCES users(id),
    FOREIGN KEY (serviceId) REFERENCES services(id),
    FOREIGN KEY (roomId) REFERENCES rooms(id)
);
-- 16. Admin Alerts table
CREATE TABLE IF NOT EXISTS admin_alerts (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    -- 'meet_missing_account', 'meet_generation_failed'
    booking_id TEXT,
    provider_id TEXT,
    room_id TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    -- 'open', 'resolved'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE
    SET NULL,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE
    SET NULL
);
-- 17. Activities table
CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    title TEXT,
    date TEXT,
    time TEXT,
    location TEXT,
    desc TEXT,
    capacity INTEGER DEFAULT 0
);
-- 18. Activity Enrollments table
CREATE TABLE IF NOT EXISTS activity_enrollments (
    id TEXT PRIMARY KEY,
    activityId TEXT,
    clientName TEXT,
    clientEmail TEXT,
    clientPhone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- 19. Config table
CREATE TABLE IF NOT EXISTS config (key TEXT PRIMARY KEY, value TEXT);
-- 20. Khipu Notifications Table
CREATE TABLE IF NOT EXISTS khipu_notifications (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    headers TEXT,
    query_params TEXT,
    body TEXT,
    ip_address TEXT,
    received_at DATETIME DEFAULT CURRENT_TIMESTAMP
);