import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
// @ts-ignore
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'database', 'psicarte.db');

let SQL: Awaited<ReturnType<typeof initSqlJs>>;

function hashPass(pw: string) {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

async function init() {
  SQL = await initSqlJs();
}

function getDb(): SqlJsDatabase {
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    return new SQL.Database(buffer);
  }
  return new SQL.Database();
}

function saveAndClose(db: SqlJsDatabase) {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  db.close();
}

function queryRows(db: SqlJsDatabase, sql: string, params?: unknown[]) {
  const stmt = db.prepare(sql);
  if (params) stmt.bind(params);
  const cols = stmt.getColumnNames();
  const rows: Record<string, unknown>[] = [];
  while (stmt.step()) {
    rows.push(Object.fromEntries(cols.map((c: string, i: number) => [c, stmt.get()[i]])));
  }
  stmt.free();
  return rows;
}

function queryOne(db: SqlJsDatabase, sql: string, params?: unknown[]) {
  const rows = queryRows(db, sql, params);
  return rows[0] || null;
}

function seedTestUsers(db: SqlJsDatabase) {
  const existing = queryOne(db, 'SELECT COUNT(*) as cnt FROM users');
  if (existing && (existing as any).cnt > 0) return;

  const users = [
    { id: 'admin-1', email: 'admin@psicarte.cl', password: 'admin123', name: 'Administrador', phone: '+56900000001', role: 'administrador' },
    { id: 'ivan-prof', email: 'ivan@psicarte.cl', password: 'ivan123', name: 'Iván Pastén Fuentes', phone: '+56900000002', role: 'profesional', professional_id: 'ivan' },
    { id: 'val-prof', email: 'valentina@psicarte.cl', password: 'valentina123', name: 'Valentina Maldonado Terroba', phone: '+56900000003', role: 'profesional', professional_id: 'valentina' },
    { id: 'user-1', email: 'usuario@test.cl', password: 'usuario123', name: 'Usuario Test', phone: '+56900000004', role: 'usuario' },
    { id: 'user-2', email: 'renata.jeldes@gmail.com', password: 'renata123', name: 'Renata Jeldes', phone: '+56987456321', role: 'usuario' },
    { id: 'user-3', email: 'romilio.orellana@gmail.com', password: 'romilio123', name: 'Romilio Orellana', phone: '+56974125896', role: 'usuario' },
    { id: 'user-4', email: 'sofia.molina@gmail.com', password: 'sofia123', name: 'Sofia Molina', phone: '+56936251478', role: 'usuario' },
    { id: 'user-maca', email: 'macarena@psicarte.cl', password: 'macarena123', name: 'Macarena Méndez', phone: '+56900000005', role: 'usuario' },
  ];

  for (const u of users) {
    db.run('INSERT INTO users (id, email, password, name, phone, role, professional_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [u.id, u.email, hashPass(u.password), u.name, u.phone, u.role, (u as any).professional_id || null]);
  }
  console.log('Usuarios de prueba creados.');
}

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ===================== AUTH =====================

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });
  const db = getDb();
  const user = queryOne(db, 'SELECT * FROM users WHERE email = ?', [email]);
  saveAndClose(db);
  if (!user || user.password !== hashPass(password)) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  if (user.blocked === 1) {
    return res.status(403).json({ error: 'Cuenta bloqueada. Contacta al administrador.' });
  }
  const { password: _, ...safe } = user;
  res.json(safe);
});

app.post('/api/auth/register', (req, res) => {
  const { id, email, password, name, phone } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'Email, contraseña y nombre requeridos' });
  const db = getDb();
  const existing = queryOne(db, 'SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    saveAndClose(db);
    return res.status(409).json({ error: 'El email ya está registrado' });
  }
  const userId = id || `user-${Date.now()}`;
  db.run('INSERT INTO users (id, email, password, name, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, email, hashPass(password), name, phone || null, 'usuario']);
  const user = queryOne(db, 'SELECT * FROM users WHERE id = ?', [userId]);
  saveAndClose(db);
  const { password: _, ...safe } = user!;
  res.status(201).json(safe);
});

app.get('/api/auth/profile/:userId', (req, res) => {
  const db = getDb();
  const user = queryOne(db, 'SELECT id, email, name, phone, role, professional_id, blocked, created_at FROM users WHERE id = ?', [req.params.userId]);
  saveAndClose(db);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(user);
});

app.put('/api/auth/profile/:userId', (req, res) => {
  const { name, phone } = req.body;
  const db = getDb();
  db.run('UPDATE users SET name = ?, phone = ? WHERE id = ?', [name, phone, req.params.userId]);
  const user = queryOne(db, 'SELECT id, email, name, phone, role, professional_id, blocked, created_at FROM users WHERE id = ?', [req.params.userId]);
  saveAndClose(db);
  res.json(user);
});

app.put('/api/auth/change-password/:userId', (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const db = getDb();
  const user = queryOne(db, 'SELECT password FROM users WHERE id = ?', [req.params.userId]);
  if (!user || user.password !== hashPass(currentPassword)) {
    saveAndClose(db);
    return res.status(401).json({ error: 'Contraseña actual incorrecta' });
  }
  db.run('UPDATE users SET password = ? WHERE id = ?', [hashPass(newPassword), req.params.userId]);
  saveAndClose(db);
  res.json({ success: true });
});

// ===================== ADMIN: User Management =====================

app.get('/api/admin/users', (_req, res) => {
  const db = getDb();
  const users = queryRows(db, 'SELECT id, email, name, phone, role, professional_id, blocked, created_at FROM users ORDER BY created_at DESC');
  saveAndClose(db);
  res.json(users);
});

app.put('/api/admin/users/:userId/role', (req, res) => {
  const { role, professional_id } = req.body;
  if (!['usuario', 'profesional', 'administrador'].includes(role)) {
    return res.status(400).json({ error: 'Rol inválido' });
  }
  const db = getDb();
  db.run('UPDATE users SET role = ?, professional_id = ? WHERE id = ?', [role, professional_id || null, req.params.userId]);
  const user = queryOne(db, 'SELECT id, email, name, phone, role, professional_id, blocked, created_at FROM users WHERE id = ?', [req.params.userId]);
  saveAndClose(db);
  res.json(user);
});

app.put('/api/admin/users/:userId/block', (req, res) => {
  const { blocked } = req.body;
  const db = getDb();
  db.run('UPDATE users SET blocked = ? WHERE id = ?', [blocked ? 1 : 0, req.params.userId]);
  saveAndClose(db);
  res.json({ success: true });
});

app.post('/api/admin/users', (req, res) => {
  const { email, password, name, phone, role, professional_id } = req.body;
  const db = getDb();
  const existing = queryOne(db, 'SELECT id FROM users WHERE email = ?', [email]);
  if (existing) {
    saveAndClose(db);
    return res.status(409).json({ error: 'El email ya existe' });
  }
  const id = `user-${Date.now()}`;
  db.run('INSERT INTO users (id, email, password, name, phone, role, professional_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, email, hashPass(password), name, phone || null, role || 'usuario', professional_id || null]);
  const user = queryOne(db, 'SELECT id, email, name, phone, role, professional_id, blocked, created_at FROM users WHERE id = ?', [id]);
  saveAndClose(db);
  res.status(201).json(user);
});

// ===================== ADMIN: Professionals Management =====================

app.post('/api/admin/professionals', (req, res) => {
  const { id, name, title, experience, bio, avatar_url } = req.body;
  const db = getDb();
  db.run('INSERT INTO professionals (id, name, title, experience, bio, avatar_url) VALUES (?, ?, ?, ?, ?, ?)',
    [id, name, title || '', experience || '', bio || '', avatar_url || null]);
  saveAndClose(db);
  res.status(201).json({ success: true });
});

app.put('/api/admin/professionals/:id', (req, res) => {
  const { name, title, experience, bio, avatar_url } = req.body;
  const db = getDb();
  db.run('UPDATE professionals SET name=?, title=?, experience=?, bio=?, avatar_url=? WHERE id=?',
    [name, title || '', experience || '', bio || '', avatar_url || null, req.params.id]);
  saveAndClose(db);
  res.json({ success: true });
});

app.delete('/api/admin/professionals/:id', (req, res) => {
  const db = getDb();
  db.run('DELETE FROM professionals WHERE id = ?', [req.params.id]);
  saveAndClose(db);
  res.json({ success: true });
});

// ===================== ADMIN: Services Management =====================

app.post('/api/admin/services', (req, res) => {
  const { id, name, professional_id, professional_name, price, duration, description, category, modality } = req.body;
  const db = getDb();
  db.run('INSERT INTO services (id, name, professional_id, professional_name, price, duration, description, category, modality) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, name, professional_id, professional_name, price, duration, description, category, modality || 'Ambas']);
  saveAndClose(db);
  res.status(201).json({ success: true });
});

app.put('/api/admin/services/:id', (req, res) => {
  const { name, professional_id, professional_name, price, duration, description, category, modality } = req.body;
  const db = getDb();
  db.run('UPDATE services SET name=?, professional_id=?, professional_name=?, price=?, duration=?, description=?, category=?, modality=? WHERE id=?',
    [name, professional_id, professional_name, price, duration, description, category, modality || 'Ambas', req.params.id]);
  saveAndClose(db);
  res.json({ success: true });
});

app.delete('/api/admin/services/:id', (req, res) => {
  const db = getDb();
  db.run('DELETE FROM services WHERE id = ?', [req.params.id]);
  saveAndClose(db);
  res.json({ success: true });
});

// ===================== ADMIN: Schedule Management =====================

app.get('/api/admin/schedules', (_req, res) => {
  const db = getDb();
  const rows = queryRows(db, 'SELECT ws.*, p.name as professional_name FROM weekly_schedules ws JOIN professionals p ON p.id = ws.professional_id ORDER BY ws.professional_id, ws.day');
  saveAndClose(db);
  res.json(rows);
});

app.post('/api/admin/schedules', (req, res) => {
  const { professional_id, day, time_block } = req.body;
  const db = getDb();
  db.run('INSERT INTO weekly_schedules (professional_id, day, time_block) VALUES (?, ?, ?)', [professional_id, day, time_block]);
  saveAndClose(db);
  res.status(201).json({ success: true });
});

app.delete('/api/admin/schedules/:id', (req, res) => {
  const db = getDb();
  db.run('DELETE FROM weekly_schedules WHERE id = ?', [req.params.id]);
  saveAndClose(db);
  res.json({ success: true });
});

// ===================== ADMIN: Rooms =====================

app.get('/api/admin/rooms', (_req, res) => {
  const db = getDb();
  const rooms = queryRows(db, 'SELECT * FROM rooms');
  saveAndClose(db);
  res.json(rooms);
});

app.post('/api/admin/rooms', (req, res) => {
  const { id, name, type, description, videoconference_link, open_time, close_time } = req.body;
  const db = getDb();
  db.run('INSERT INTO rooms (id, name, type, description, videoconference_link, open_time, close_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, name, type || 'Fisica', description || null, videoconference_link || null, open_time || '08:00', close_time || '22:00']);
  saveAndClose(db);
  res.status(201).json({ success: true });
});

app.put('/api/admin/rooms/:id', (req, res) => {
  const { name, type, description, videoconference_link, open_time, close_time } = req.body;
  const db = getDb();
  db.run('UPDATE rooms SET name=?, type=?, description=?, videoconference_link=?, open_time=?, close_time=? WHERE id=?',
    [name, type || 'Fisica', description || null, videoconference_link || null, open_time || '08:00', close_time || '22:00', req.params.id]);
  saveAndClose(db);
  res.json({ success: true });
});

app.delete('/api/admin/rooms/:id', (req, res) => {
  const db = getDb();
  db.run('DELETE FROM rooms WHERE id = ?', [req.params.id]);
  saveAndClose(db);
  res.json({ success: true });
});

// ===================== PUBLIC: Appointments =====================

app.post('/api/appointments', (req, res) => {
  const { id, clientName, clientEmail, clientPhone, professionalId, professionalName, serviceId, serviceName, servicePrice, date, start_time, end_time, timeBlock, notes, room_id } = req.body;
  const db = getDb();

  // Conflict check
  const conflicts = queryRows(db, `SELECT id FROM appointments WHERE date = ? AND status IN ('Programado','Confirmado') AND (
    (room_id = ? AND ? IS NOT NULL) OR
    (professional_id = ?) OR
    (client_email = ?)
  ) AND (
    (start_time < ? AND end_time > ?)
  ) AND id != ?`,
    [date, room_id || '', room_id, professionalId, clientEmail, end_time, start_time, id || '']);

  if (conflicts.length > 0) {
    saveAndClose(db);
    return res.status(409).json({ error: 'Conflicto de horario detectado', conflicts });
  }

  const tid = id || `app-${Date.now()}`;
  const sTime = start_time || timeBlock?.split(' - ')[0] || '09:00';
  const eTime = end_time || timeBlock?.split(' - ')[1] || '10:00';
  const tb = timeBlock || `${sTime} - ${eTime}`;
  db.run('INSERT INTO appointments (id, client_name, client_email, client_phone, professional_id, professional_name, service_id, service_name, service_price, date, start_time, end_time, time_block, notes, status, room_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [tid, clientName, clientEmail, clientPhone, professionalId, professionalName, serviceId, serviceName, servicePrice, date, sTime, eTime, tb, notes || null, 'Programado', room_id || null]);
  saveAndClose(db);
  res.status(201).json({ id: tid, success: true });
});

app.get('/api/appointments', (req, res) => {
  const { date } = req.query;
  const db = getDb();
  let sql = 'SELECT a.*, r.name as room_name, r.type as room_type FROM appointments a LEFT JOIN rooms r ON r.id = a.room_id';
  const params: string[] = [];
  if (date) {
    sql += ' WHERE a.date = ?';
    params.push(date as string);
  }
  sql += ' ORDER BY a.date ASC, a.start_time ASC';
  const rows = queryRows(db, sql, params.length ? params : undefined);
  saveAndClose(db);
  res.json(rows);
});

app.get('/api/appointments/user/:email', (req, res) => {
  const db = getDb();
  const rows = queryRows(db, 'SELECT * FROM appointments WHERE client_email = ? ORDER BY date DESC', [req.params.email]);
  saveAndClose(db);
  res.json(rows);
});

app.get('/api/appointments/professional/:professionalId', (req, res) => {
  const db = getDb();
  const rows = queryRows(db, 'SELECT * FROM appointments WHERE professional_id = ? ORDER BY date DESC', [req.params.professionalId]);
  saveAndClose(db);
  res.json(rows);
});

app.put('/api/appointments/:id/cancel', (req, res) => {
  const db = getDb();
  db.run("UPDATE appointments SET status = 'Cancelado' WHERE id = ?", [req.params.id]);
  saveAndClose(db);
  res.json({ success: true });
});

app.put('/api/appointments/:id/move', (req, res) => {
  const { room_id, date, start_time, end_time } = req.body;
  const db = getDb();
  const current = queryOne(db, 'SELECT * FROM appointments WHERE id = ?', [req.params.id]);
  if (!current) { saveAndClose(db); return res.status(404).json({ error: 'Turno no encontrado' }); }

  const conflicts = queryRows(db, `SELECT id FROM appointments WHERE date = ? AND status IN ('Programado','Confirmado') AND id != ? AND (
    (room_id = ? AND ? IS NOT NULL) OR (professional_id = ?)
  ) AND (start_time < ? AND end_time > ?)`,
    [date || current.date, req.params.id, room_id || '', room_id, current.professional_id, end_time || current.end_time, start_time || current.start_time]);

  if (conflicts.length > 0) {
    saveAndClose(db);
    return res.status(409).json({ error: 'Conflicto de horario', conflicts });
  }

  const tb = `${start_time || current.start_time} - ${end_time || current.end_time}`;
  db.run('UPDATE appointments SET room_id=?, date=?, start_time=?, end_time=?, time_block=? WHERE id=?',
    [room_id ?? current.room_id, date || current.date, start_time || current.start_time, end_time || current.end_time, tb, req.params.id]);
  saveAndClose(db);
  res.json({ success: true });
});

app.put('/api/appointments/:id/resize', (req, res) => {
  const { start_time, end_time } = req.body;
  const db = getDb();
  const tb = `${start_time} - ${end_time}`;
  db.run('UPDATE appointments SET start_time=?, end_time=?, time_block=? WHERE id=?', [start_time, end_time, tb, req.params.id]);
  saveAndClose(db);
  res.json({ success: true });
});

app.put('/api/appointments/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['Programado','Confirmado','Cancelado','Ausente','Finalizado'].includes(status)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }
  const db = getDb();
  db.run('UPDATE appointments SET status = ? WHERE id = ?', [status, req.params.id]);
  saveAndClose(db);
  res.json({ success: true });
});

// ===================== GANTT DATA =====================

app.get('/api/gantt/:date', (req, res) => {
  const db = getDb();
  const rooms = queryRows(db, 'SELECT * FROM rooms ORDER BY type, name');
  const apps = queryRows(db, 'SELECT a.*, r.name as room_name, r.type as room_type FROM appointments a LEFT JOIN rooms r ON r.id = a.room_id WHERE a.date = ? AND a.status NOT IN (\'Cancelado\') ORDER BY a.start_time', [req.params.date]);
  saveAndClose(db);
  res.json({ rooms, appointments: apps });
});

// ===================== WAITLIST =====================

app.get('/api/waitlist', (_req, res) => {
  const db = getDb();
  const items = queryRows(db, 'SELECT w.*, p.name as professional_name, s.name as service_name FROM waitlist w LEFT JOIN professionals p ON p.id = w.professional_id LEFT JOIN services s ON s.id = w.service_id ORDER BY w.created_at DESC');
  saveAndClose(db);
  res.json(items);
});

app.post('/api/waitlist', (req, res) => {
  const { client_name, client_email, client_phone, professional_id, service_id, preferred_days, notes } = req.body;
  const db = getDb();
  db.run('INSERT INTO waitlist (client_name, client_email, client_phone, professional_id, service_id, preferred_days, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [client_name, client_email, client_phone || null, professional_id || null, service_id || null, preferred_days || null, notes || null]);
  saveAndClose(db);
  res.status(201).json({ success: true });
});

app.put('/api/waitlist/:id/status', (req, res) => {
  const { status } = req.body;
  const db = getDb();
  db.run('UPDATE waitlist SET status = ? WHERE id = ?', [status, req.params.id]);
  saveAndClose(db);
  res.json({ success: true });
});

app.delete('/api/waitlist/:id', (req, res) => {
  const db = getDb();
  db.run('DELETE FROM waitlist WHERE id = ?', [req.params.id]);
  saveAndClose(db);
  res.json({ success: true });
});

// ===================== Schedule Blocks (Weekly Planner) =====================

app.get('/api/schedule/week', (_req, res) => {
  const db = getDb();
  const blocks = queryRows(db, `SELECT sb.*, p.name as professional_name, s.name as service_name, s.duration, r.name as room_name
    FROM schedule_blocks sb
    JOIN professionals p ON p.id = sb.professional_id
    JOIN services s ON s.id = sb.service_id
    JOIN rooms r ON r.id = sb.room_id
    ORDER BY sb.day, sb.start_time`);
  saveAndClose(db);
  res.json(blocks);
});

app.get('/api/schedule/:day', (req, res) => {
  const db = getDb();
  const blocks = queryRows(db, `SELECT sb.*, p.name as professional_name, s.name as service_name, s.duration, r.name as room_name
    FROM schedule_blocks sb
    JOIN professionals p ON p.id = sb.professional_id
    JOIN services s ON s.id = sb.service_id
    JOIN rooms r ON r.id = sb.room_id
    WHERE sb.day = ?
    ORDER BY sb.start_time`, [req.params.day]);
  saveAndClose(db);
  res.json(blocks);
});

app.post('/api/schedule', (req, res) => {
  const { id, day, start_time, end_time, professional_id, service_id, room_id } = req.body;
  if (!id || !day || !start_time || !end_time || !professional_id || !service_id || !room_id) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }
  const db = getDb();
  // Check conflict
  const conflict = queryOne(db, `SELECT COUNT(*) as cnt FROM schedule_blocks WHERE day = ? AND room_id = ? AND NOT (end_time <= ? OR start_time >= ?) AND id != ?`,
    [day, room_id, start_time, end_time, id]);
  if (conflict && (conflict as any).cnt > 0) {
    saveAndClose(db);
    return res.status(409).json({ error: 'Conflicto de horario con otro bloque en la misma sala' });
  }
  db.run('INSERT INTO schedule_blocks (id, day, start_time, end_time, professional_id, service_id, room_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, day, start_time, end_time, professional_id, service_id, room_id]);
  saveAndClose(db);
  res.status(201).json({ success: true });
});

app.put('/api/schedule/:id', (req, res) => {
  const { day, start_time, end_time, professional_id, service_id, room_id } = req.body;
  const db = getDb();
  // Check conflict (exclude self)
  const conflict = queryOne(db, `SELECT COUNT(*) as cnt FROM schedule_blocks WHERE day = ? AND room_id = ? AND NOT (end_time <= ? OR start_time >= ?) AND id != ?`,
    [day || '', room_id || '', start_time, end_time, req.params.id]);
  if (conflict && (conflict as any).cnt > 0) {
    saveAndClose(db);
    return res.status(409).json({ error: 'Conflicto de horario con otro bloque en la misma sala' });
  }
  db.run(`UPDATE schedule_blocks SET day = COALESCE(?, day), start_time = COALESCE(?, start_time), end_time = COALESCE(?, end_time),
    professional_id = COALESCE(?, professional_id), service_id = COALESCE(?, service_id), room_id = COALESCE(?, room_id) WHERE id = ?`,
    [day, start_time, end_time, professional_id, service_id, room_id, req.params.id]);
  saveAndClose(db);
  res.json({ success: true });
});

app.delete('/api/schedule/:id', (req, res) => {
  const db = getDb();
  db.run('DELETE FROM schedule_blocks WHERE id = ?', [req.params.id]);
  saveAndClose(db);
  res.json({ success: true });
});

// ===================== PUBLIC: Professionals, Services, Schedules, Content =====================

app.get('/api/professionals', (_req, res) => {
  const db = getDb();
  const rows = queryRows(db, 'SELECT * FROM professionals');
  const result = rows.map((prof: any) => {
    const diplomas = queryRows(db, 'SELECT diploma FROM professional_diplomas WHERE professional_id = ?', [prof.id]);
    const specialties = queryRows(db, 'SELECT specialty FROM professional_specialties WHERE professional_id = ?', [prof.id]);
    return { ...prof, diplomas: diplomas.map((d: any) => d.diploma), specialties: specialties.map((s: any) => s.specialty) };
  });
  saveAndClose(db);
  res.json(result);
});

app.get('/api/professionals/:id', (req, res) => {
  const db = getDb();
  const prof = queryOne(db, 'SELECT * FROM professionals WHERE id = ?', [req.params.id]);
  if (!prof) {
    saveAndClose(db);
    return res.status(404).json({ error: 'Profesional no encontrado' });
  }
  const diplomas = queryRows(db, 'SELECT diploma FROM professional_diplomas WHERE professional_id = ?', [req.params.id]);
  const specialties = queryRows(db, 'SELECT specialty FROM professional_specialties WHERE professional_id = ?', [req.params.id]);
  saveAndClose(db);
  res.json({ ...prof, diplomas: diplomas.map(d => d.diploma), specialties: specialties.map(s => s.specialty) });
});

app.get('/api/services', (_req, res) => {
  const db = getDb();
  const rows = queryRows(db, 'SELECT * FROM services');
  saveAndClose(db);
  res.json(rows);
});

app.get('/api/services/:professionalId', (req, res) => {
  const db = getDb();
  const rows = queryRows(db, 'SELECT * FROM services WHERE professional_id = ?', [req.params.professionalId]);
  saveAndClose(db);
  res.json(rows);
});

app.get('/api/schedules/:professionalId', (req, res) => {
  const db = getDb();
  const rows = queryRows(db, 'SELECT day, time_block FROM weekly_schedules WHERE professional_id = ? ORDER BY day', [req.params.professionalId]);
  saveAndClose(db);
  const grouped: Record<string, string[]> = {};
  for (const s of rows) {
    const day = s.day as string;
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(s.time_block as string);
  }
  res.json(grouped);
});

app.get('/api/content', (_req, res) => {
  const db = getDb();
  const rows = queryRows(db, 'SELECT id, content FROM site_content');
  saveAndClose(db);
  const result: Record<string, string> = {};
  for (const r of rows) {
    result[r.id as string] = r.content as string;
  }
  res.json(result);
});

app.get('/api/content/:id', (req, res) => {
  const db = getDb();
  const row = queryOne(db, 'SELECT content FROM site_content WHERE id = ?', [req.params.id]);
  saveAndClose(db);
  if (!row) return res.status(404).json({ error: 'Contenido no encontrado' });
  res.json(row);
});

app.put('/api/admin/content/:id', (req, res) => {
  const { content } = req.body;
  if (content === undefined) return res.status(400).json({ error: 'Contenido requerido' });
  const db = getDb();
  const existing = queryOne(db, 'SELECT id FROM site_content WHERE id = ?', [req.params.id]);
  if (existing) {
    db.run('UPDATE site_content SET content = ? WHERE id = ?', [content, req.params.id]);
  } else {
    db.run('INSERT INTO site_content (id, content) VALUES (?, ?)', [req.params.id, content]);
  }
  saveAndClose(db);
  res.json({ success: true });
});

// ===================== ADMIN: Block appointment (block agenda) =====================

app.post('/api/admin/appointments/:id/block', (req, res) => {
  const db = getDb();
  db.run("UPDATE appointments SET status = 'Cancelado' WHERE id = ?", [req.params.id]);
  saveAndClose(db);
  res.json({ success: true });
});

// ===================== PUBLIC & ADMIN: News =====================

app.get('/api/news', (_req, res) => {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  const news = queryRows(db, `SELECT * FROM news WHERE active = 1 AND (start_date IS NULL OR start_date <= ?) AND (end_date IS NULL OR end_date >= ?) ORDER BY created_at DESC`, [today, today]);
  saveAndClose(db);
  res.json(news);
});

app.get('/api/admin/news', (_req, res) => {
  const db = getDb();
  const news = queryRows(db, 'SELECT * FROM news ORDER BY created_at DESC');
  saveAndClose(db);
  res.json(news);
});

app.post('/api/admin/news', (req, res) => {
  const { id, title, message, active, start_date, end_date } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'Título y mensaje son requeridos' });
  const db = getDb();
  const newsId = id || `news-${Date.now()}`;
  const existing = queryOne(db, 'SELECT id FROM news WHERE id = ?', [newsId]);
  if (existing) {
    db.run('UPDATE news SET title = ?, message = ?, active = ?, start_date = ?, end_date = ? WHERE id = ?',
      [title, message, active ? 1 : 0, start_date || null, end_date || null, newsId]);
  } else {
    db.run('INSERT INTO news (id, title, message, active, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)',
      [newsId, title, message, active ? 1 : 0, start_date || null, end_date || null]);
  }
  saveAndClose(db);
  res.json({ id: newsId, success: true });
});

app.delete('/api/admin/news/:id', (req, res) => {
  const db = getDb();
  db.run('DELETE FROM news WHERE id = ?', [req.params.id]);
  saveAndClose(db);
  res.json({ success: true });
});

// ===================== INIT =====================

init().then(() => {
  // Seed test users on first run
  const db = getDb();
  seedTestUsers(db);
  saveAndClose(db);

  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
});
