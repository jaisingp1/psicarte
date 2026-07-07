-- =============================================
-- Schema: PsicArte Database
-- Ejecutar solo esto para DB limpia (sin datos)
-- =============================================

CREATE TABLE IF NOT EXISTS professionals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  experience TEXT NOT NULL,
  bio TEXT NOT NULL,
  avatar_url TEXT
);

CREATE TABLE IF NOT EXISTS professional_diplomas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  professional_id TEXT NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  diploma TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS professional_specialties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  professional_id TEXT NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  specialty TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  professional_id TEXT NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  professional_name TEXT NOT NULL,
  price REAL NOT NULL CHECK(price >= 0),
  duration INTEGER NOT NULL CHECK(duration > 0),
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('coaching', 'psicoterapia', 'yoga', 'capacitacion', 'taller', 'evaluacion', 'evento')),
  modality TEXT NOT NULL DEFAULT 'Ambas' CHECK(modality IN ('Presencial', 'Telemedicina', 'Ambas'))
);

CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Fisica' CHECK(type IN ('Fisica', 'Virtual')),
  description TEXT,
  videoconference_link TEXT,
  open_time TEXT NOT NULL DEFAULT '08:00',
  close_time TEXT NOT NULL DEFAULT '22:00'
);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  professional_id TEXT NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  professional_name TEXT NOT NULL,
  service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  service_price REAL NOT NULL,
  room_id TEXT REFERENCES rooms(id),
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  time_block TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Programado' CHECK(status IN ('Programado', 'Confirmado', 'Cancelado', 'Ausente', 'Finalizado')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS weekly_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  professional_id TEXT NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  day TEXT NOT NULL CHECK(day IN ('Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo')),
  time_block TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS site_content (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'usuario' CHECK(role IN ('usuario', 'profesional', 'administrador', 'recepcionista')),
  professional_id TEXT REFERENCES professionals(id),
  blocked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS waitlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  professional_id TEXT REFERENCES professionals(id),
  service_id TEXT REFERENCES services(id),
  preferred_days TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Espera' CHECK(status IN ('Espera', 'Contactado', 'Agendado', 'Cancelado')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS schedule_blocks (
  id TEXT PRIMARY KEY,
  day TEXT NOT NULL CHECK(day IN ('Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo')),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  professional_id TEXT NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  service_id TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS news (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  start_date TEXT, -- YYYY-MM-DD
  end_date TEXT,   -- YYYY-MM-DD
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
