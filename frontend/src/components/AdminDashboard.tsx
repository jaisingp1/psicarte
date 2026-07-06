import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Calendar, Settings, Plus, X, Save, Trash2, Search, Lock, Unlock,
  Clock, Home, AlertCircle, CheckCircle2, UserPlus, List, Phone, Mail, Video, Building
} from 'lucide-react';
import { Appointment, User as UserType, Service, Room, WaitlistItem } from '../types';
import { PROFESSIONALS } from '../data';
import { AgendaGantt } from './AgendaGantt';
import { SemanalPlanner } from './SemanalPlanner';

interface AdminDashboardProps {
  user: UserType;
  appointments: Appointment[];
  onCancelAppointment: (id: string) => void;
  onLogout: () => void;
}

const API = '/api';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, appointments, onCancelAppointment, onLogout }) => {
  const [tab, setTab] = useState<'agenda' | 'planificador' | 'usuarios' | 'servicios' | 'horarios' | 'salas' | 'espera'>('agenda');
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [search, setSearch] = useState('');
  const [ganttDate, setGanttDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [msg, setMsg] = useState('');
  const [waitlist, setWaitlist] = useState<WaitlistItem[]>([]);
  const [showNewWaitlist, setShowNewWaitlist] = useState(false);
  const [waitlistForm, setWaitlistForm] = useState({
    client_name: '', client_email: '', client_phone: '',
    professional_id: '', service_id: '', preferred_days: '', notes: '',
  });

  // Load data
  const loadData = () => {
    fetch(`${API}/admin/users`).then(r => r.json()).then(setAllUsers);
    fetch(`${API}/services`).then(r => r.json()).then((data: any[]) => {
      setAllServices(data.map((s: any) => ({
        id: s.id,
        name: s.name,
        professionalId: s.professional_id,
        professionalName: s.professional_name,
        price: s.price,
        duration: s.duration,
        description: s.description,
        category: s.category,
        modality: s.modality,
      })));
    });
    fetch(`${API}/admin/schedules`).then(r => r.json()).then(setSchedules);
    fetch(`${API}/admin/rooms`).then(r => r.json()).then(setRooms);
    fetch(`${API}/waitlist`).then(r => r.json()).then(setWaitlist);
  };
  useEffect(loadData, []);

  // ===== Gantt Handlers =====
  const handleMoveAppointment = async (id: string, roomId: string | null, newDate: string, startTime: string, endTime: string) => {
    const res = await fetch(`${API}/appointments/${id}/move`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_id: roomId, date: newDate, start_time: startTime, end_time: endTime }),
    });
    if (res.ok) showMsg('Cita movida');
    else { const err = await res.json(); showMsg(`Error: ${err.error}`); }
  };

  const handleResizeAppointment = async (id: string, startTime: string, endTime: string) => {
    const res = await fetch(`${API}/appointments/${id}/resize`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_time: startTime, end_time: endTime }),
    });
    if (res.ok) showMsg('Cita redimensionada');
    else { const err = await res.json(); showMsg(`Error: ${err.error}`); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    const res = await fetch(`${API}/appointments/${id}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) showMsg(`Estado cambiado a ${status}`);
    else { const err = await res.json(); showMsg(`Error: ${err.error}`); }
  };

  // ===== Waitlist =====
  const handleAddWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${API}/waitlist`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(waitlistForm),
    });
    if (res.ok) {
      const created = await res.json();
      setWaitlist(prev => [created, ...prev]);
      setShowNewWaitlist(false);
      setWaitlistForm({ client_name: '', client_email: '', client_phone: '', professional_id: '', service_id: '', preferred_days: '', notes: '' });
      showMsg('Agregado a lista de espera');
    } else { const err = await res.json(); showMsg(`Error: ${err.error}`); }
  };

  const handleDeleteWaitlist = async (id: number) => {
    const res = await fetch(`${API}/waitlist/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setWaitlist(prev => prev.filter(w => w.id !== id));
      showMsg('Eliminado de lista de espera');
    }
  };

  const handleWaitlistStatusChange = async (id: number, status: string) => {
    const res = await fetch(`${API}/waitlist/${id}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setWaitlist(prev => prev.map(w => w.id === id ? { ...w, status: status as any } : w));
      showMsg(`Estado cambiado a ${status}`);
    }
  };

  const showMsg = (text: string) => { setMsg(text); setTimeout(() => setMsg(''), 3000); };

  // ===== User Management =====
  const handleRoleChange = async (userId: string, role: string, professional_id: string | null) => {
    const res = await fetch(`${API}/admin/users/${userId}/role`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, professional_id }),
    });
    if (res.ok) {
      const updated = await res.json();
      setAllUsers(prev => prev.map(u => u.id === userId ? updated : u));
      showMsg('Rol actualizado');
    }
  };

  const handleBlockToggle = async (userId: string, blocked: boolean) => {
    await fetch(`${API}/admin/users/${userId}/block`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocked: !blocked }),
    });
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, blocked: blocked ? 0 : 1 } : u));
    showMsg(blocked ? 'Usuario desbloqueado' : 'Usuario bloqueado');
  };

  const [showNewUser, setShowNewUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', name: '', phone: '', role: 'usuario', professional_id: '' });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${API}/admin/users`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    });
    if (res.ok) {
      const created = await res.json();
      setAllUsers(prev => [created, ...prev]);
      setShowNewUser(false);
      setNewUser({ email: '', password: '', name: '', phone: '', role: 'usuario', professional_id: '' });
      showMsg('Usuario creado');
    } else {
      const err = await res.json();
      showMsg(`Error: ${err.error}`);
    }
  };

  // ===== Service Management =====
  const [showNewService, setShowNewService] = useState(false);
  const [editingService, setEditingService] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState({ name: '', professional_id: '', professional_name: '', price: 0, duration: 50, description: '', category: 'coaching' });

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    const prof = PROFESSIONALS.find(p => p.id === serviceForm.professional_id);
    const payload = { ...serviceForm, professional_name: prof?.name || '' };

    if (editingService) {
      await fetch(`${API}/admin/services/${editingService}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      setAllServices(prev => prev.map(s => s.id === editingService ? { ...s, ...payload } : s));
      showMsg('Servicio actualizado');
    } else {
      const id = `srv-${Date.now()}`;
      const res = await fetch(`${API}/admin/services`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, id }),
      });
      if (res.ok) {
        const newSvc = { id, ...payload } as Service;
        setAllServices(prev => [newSvc, ...prev]);
        showMsg('Servicio creado');
      }
    }
    setShowNewService(false);
    setEditingService(null);
  };

  const handleDeleteService = async (id: string) => {
    await fetch(`${API}/admin/services/${id}`, { method: 'DELETE' });
    setAllServices(prev => prev.filter(s => s.id !== id));
    showMsg('Servicio eliminado');
  };

  const editService = (s: Service) => {
    setEditingService(s.id);
    setServiceForm({
      name: s.name, professional_id: s.professionalId, professional_name: s.professionalName,
      price: s.price, duration: s.duration, description: s.description, category: s.category,
    });
    setShowNewService(true);
  };

  // ===== Schedule Management =====
  const [newSchedule, setNewSchedule] = useState({ professional_id: 'ivan', day: 'Lunes', time_block: '' });

  const handleAddSchedule = async () => {
    if (!newSchedule.time_block) return;
    await fetch(`${API}/admin/schedules`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newSchedule),
    });
    const updated = await fetch(`${API}/admin/schedules`).then(r => r.json());
    setSchedules(updated);
    setNewSchedule({ ...newSchedule, time_block: '' });
    showMsg('Bloque de horario agregado');
  };

  const handleDeleteSchedule = async (id: number) => {
    await fetch(`${API}/admin/schedules/${id}`, { method: 'DELETE' });
    setSchedules(prev => prev.filter(s => s.id !== id));
    showMsg('Bloque eliminado');
  };

  // ===== Room Management =====
  const [showNewRoom, setShowNewRoom] = useState(false);
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const [roomForm, setRoomForm] = useState({ name: '', description: '' });

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRoom) {
      await fetch(`${API}/admin/rooms/${editingRoom}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(roomForm),
      });
      setRooms(prev => prev.map(r => r.id === editingRoom ? { ...r, ...roomForm } : r));
    } else {
      const id = `room-${Date.now()}`;
      await fetch(`${API}/admin/rooms`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...roomForm }),
      });
      setRooms(prev => [...prev, { id, ...roomForm }]);
    }
    setShowNewRoom(false);
    setEditingRoom(null);
    showMsg('Sala guardada');
  };

  const handleDeleteRoom = async (id: string) => {
    await fetch(`${API}/admin/rooms/${id}`, { method: 'DELETE' });
    setRooms(prev => prev.filter(r => r.id !== id));
    showMsg('Sala eliminada');
  };

  const tabs = [
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'planificador', label: 'Gestor Agenda', icon: Clock },
    { id: 'usuarios', label: 'Usuarios', icon: Users },
    { id: 'servicios', label: 'Servicios', icon: Settings },
    { id: 'horarios', label: 'Horarios', icon: Clock },
    { id: 'salas', label: 'Salas', icon: Home },
    { id: 'espera', label: 'Lista Espera', icon: List },
  ] as const;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white border border-secondary/10 rounded-sm shadow-sm overflow-hidden">
        <div className="bg-secondary p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="font-serif text-2xl font-light">Panel de Administración</h2>
            <p className="text-[10px] uppercase tracking-widest text-gold-light font-bold mt-1">{user.name}</p>
          </div>
          <button onClick={onLogout}
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[10px] uppercase tracking-widest font-bold px-4 py-2.5 rounded-sm transition-all cursor-pointer"
          >
            Cerrar Sesión
          </button>
        </div>

        {msg && (
          <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-sm text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {msg}
          </div>
        )}

        <div className="flex flex-wrap border-b border-secondary/10 bg-[#FAF8F5]">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-5 py-4 text-[10px] uppercase tracking-widest font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                tab === t.id ? 'border-primary text-primary bg-white' : 'border-transparent text-text-muted hover:text-secondary'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* TAB: AGENDA (Gantt) */}
            {tab === 'agenda' && (
              <motion.div key="agenda" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AgendaGantt
                  appointments={appointments}
                  rooms={rooms}
                  date={ganttDate}
                  onDateChange={setGanttDate}
                  onMoveAppointment={handleMoveAppointment}
                  onResizeAppointment={handleResizeAppointment}
                  onStatusChange={handleStatusChange}
                />
              </motion.div>
            )}

            {/* TAB: WEEKLY PLANNER */}
            {tab === 'planificador' && (
              <motion.div key="planificador" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <SemanalPlanner rooms={rooms} allServices={allServices} />
              </motion.div>
            )}

            {/* TAB: USERS */}
            {tab === 'usuarios' && (
              <motion.div key="usuarios" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-serif text-xl font-light text-secondary">Usuarios ({allUsers.length})</h3>
                  <button onClick={() => { setShowNewUser(true); setNewUser({ email: '', password: '', name: '', phone: '', role: 'usuario', professional_id: '' }); }}
                    className="bg-primary hover:bg-primary-dark text-white text-[10px] uppercase tracking-widest font-bold px-4 py-2.5 rounded-sm border border-primary transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Crear Usuario
                  </button>
                </div>

                {showNewUser && (
                  <form onSubmit={handleCreateUser} className="bg-bg-base/30 border border-secondary/10 rounded-sm p-5 mb-6 space-y-4">
                    <h4 className="font-serif text-base font-light text-secondary">Nuevo Usuario</h4>
                    <div className="grid md:grid-cols-3 gap-4">
                      <input required placeholder="Email" type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                        className="px-3 py-2 text-xs border border-secondary/20 rounded-sm focus:border-primary focus:outline-none bg-white" />
                      <input required placeholder="Contraseña" type="text" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                        className="px-3 py-2 text-xs border border-secondary/20 rounded-sm focus:border-primary focus:outline-none bg-white" />
                      <input required placeholder="Nombre" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                        className="px-3 py-2 text-xs border border-secondary/20 rounded-sm focus:border-primary focus:outline-none bg-white" />
                      <input placeholder="Teléfono" value={newUser.phone} onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                        className="px-3 py-2 text-xs border border-secondary/20 rounded-sm focus:border-primary focus:outline-none bg-white" />
                      <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                        className="px-3 py-2 text-xs border border-secondary/20 rounded-sm focus:border-primary focus:outline-none bg-white">
                        <option value="usuario">Usuario</option>
                        <option value="profesional">Profesional</option>
                        <option value="administrador">Administrador</option>
                      </select>
                      {newUser.role === 'profesional' && (
                        <select value={newUser.professional_id} onChange={e => setNewUser({ ...newUser, professional_id: e.target.value })}
                          className="px-3 py-2 text-xs border border-secondary/20 rounded-sm focus:border-primary focus:outline-none bg-white">
                          <option value="">Seleccionar profesional</option>
                          {PROFESSIONALS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      )}
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button type="submit" className="bg-primary text-white text-[10px] uppercase font-bold px-4 py-2.5 rounded-sm border border-primary cursor-pointer">Guardar</button>
                      <button type="button" onClick={() => setShowNewUser(false)} className="text-[10px] uppercase font-bold text-text-muted px-4 cursor-pointer">Cancelar</button>
                    </div>
                  </form>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-secondary/10 text-[9px] uppercase tracking-widest font-bold text-text-muted bg-[#FAF8F5]">
                        <th className="py-3 px-3">Nombre</th>
                        <th className="py-3 px-3">Email</th>
                        <th className="py-3 px-3">Rol</th>
                        <th className="py-3 px-3">Profesional</th>
                        <th className="py-3 px-3 text-center">Bloqueado</th>
                        <th className="py-3 px-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers.map(u => (
                        <tr key={u.id} className="border-b border-secondary/5 hover:bg-[#FAF8F5]/30">
                          <td className="py-3 px-3 font-medium text-secondary">{u.name}</td>
                          <td className="py-3 px-3 text-text-muted">{u.email}</td>
                          <td className="py-3 px-3">
                            <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value, u.role === 'profesional' ? u.professional_id : null)}
                              className="text-[10px] font-bold uppercase border border-secondary/20 rounded-sm px-2 py-1 bg-white cursor-pointer"
                            >
                              <option value="usuario">Usuario</option>
                              <option value="profesional">Profesional</option>
                              <option value="administrador">Admin</option>
                            </select>
                          </td>
                          <td className="py-3 px-3 text-text-muted">{u.professional_id || '—'}</td>
                          <td className="py-3 px-3 text-center">
                            <button onClick={() => handleBlockToggle(u.id, !!u.blocked)}
                              className={`p-1.5 rounded-sm border cursor-pointer ${u.blocked ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-green-600 border-green-200 hover:bg-green-50'}`}
                              title={u.blocked ? 'Desbloquear' : 'Bloquear'}
                            >
                              {u.blocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                            </button>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="text-[9px] text-text-muted">{new Date(u.created_at).toLocaleDateString()}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* TAB: SERVICES */}
            {tab === 'servicios' && (
              <motion.div key="servicios" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-serif text-xl font-light text-secondary">Servicios ({allServices.length})</h3>
                  <button onClick={() => { setShowNewService(true); setEditingService(null); setServiceForm({ name: '', professional_id: 'ivan', professional_name: '', price: 0, duration: 50, description: '', category: 'coaching' }); }}
                    className="bg-primary hover:bg-primary-dark text-white text-[10px] uppercase tracking-widest font-bold px-4 py-2.5 rounded-sm border border-primary transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nuevo Servicio
                  </button>
                </div>

                {showNewService && (
                  <form onSubmit={handleSaveService} className="bg-bg-base/30 border border-secondary/10 rounded-sm p-5 mb-6 space-y-4">
                    <h4 className="font-serif text-base font-light text-secondary">{editingService ? 'Editar Servicio' : 'Nuevo Servicio'}</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <input required placeholder="Nombre del servicio" value={serviceForm.name} onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })}
                        className="px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white focus:border-primary focus:outline-none col-span-2" />
                      <select value={serviceForm.professional_id} onChange={e => setServiceForm({ ...serviceForm, professional_id: e.target.value })}
                        className="px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white">
                        {PROFESSIONALS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <select value={serviceForm.category} onChange={e => setServiceForm({ ...serviceForm, category: e.target.value })}
                        className="px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white">
                        {['coaching','psicoterapia','yoga','capacitacion','taller','evaluacion','evento'].map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <input required type="number" placeholder="Precio" value={serviceForm.price} onChange={e => setServiceForm({ ...serviceForm, price: Number(e.target.value) })}
                        className="px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white" />
                      <input required type="number" placeholder="Duración (min)" value={serviceForm.duration} onChange={e => setServiceForm({ ...serviceForm, duration: Number(e.target.value) })}
                        className="px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white" />
                      <textarea placeholder="Descripción" value={serviceForm.description} onChange={e => setServiceForm({ ...serviceForm, description: e.target.value })}
                        className="px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white col-span-2" rows={2} />
                    </div>
                    <div className="flex gap-3">
                      <button type="submit" className="bg-primary text-white text-[10px] uppercase font-bold px-4 py-2.5 rounded-sm border border-primary cursor-pointer">Guardar</button>
                      <button type="button" onClick={() => { setShowNewService(false); setEditingService(null); }} className="text-[10px] uppercase font-bold text-text-muted px-4 cursor-pointer">Cancelar</button>
                    </div>
                  </form>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-secondary/10 text-[9px] uppercase tracking-widest font-bold text-text-muted bg-[#FAF8F5]">
                        <th className="py-3 px-3">Nombre</th>
                        <th className="py-3 px-3">Profesional</th>
                        <th className="py-3 px-3">Categoría</th>
                        <th className="py-3 px-3">Precio</th>
                        <th className="py-3 px-3">Duración</th>
                        <th className="py-3 px-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allServices.map(s => (
                        <tr key={s.id} className="border-b border-secondary/5 hover:bg-[#FAF8F5]/30">
                          <td className="py-3 px-3 font-medium text-secondary">{s.name}</td>
                          <td className="py-3 px-3 text-text-muted">{s.professionalName}</td>
                          <td className="py-3 px-3"><span className="text-[9px] uppercase font-bold bg-bg-base/30 px-2 py-0.5 rounded-sm border border-secondary/10">{s.category}</span></td>
                          <td className="py-3 px-3 font-bold text-primary">${s.price.toLocaleString('es-CL')}</td>
                          <td className="py-3 px-3 text-text-muted">{s.duration} min</td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => editService(s)} className="p-1.5 border border-secondary/20 text-text-muted hover:text-primary hover:border-primary rounded-sm cursor-pointer" title="Editar">
                                <Save className="w-3 h-3" />
                              </button>
                              <button onClick={() => handleDeleteService(s.id)} className="p-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-sm cursor-pointer" title="Eliminar">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* TAB: SCHEDULES */}
            {tab === 'horarios' && (
              <motion.div key="horarios" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h3 className="font-serif text-xl font-light text-secondary mb-6">Bloques de Horario</h3>

                <div className="bg-bg-base/30 border border-secondary/10 rounded-sm p-5 mb-6 space-y-4">
                  <h4 className="font-serif text-sm font-light text-secondary">Agregar Bloque</h4>
                  <div className="flex gap-3 flex-wrap">
                    <select value={newSchedule.professional_id} onChange={e => setNewSchedule({ ...newSchedule, professional_id: e.target.value })}
                      className="px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white">
                      {PROFESSIONALS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select value={newSchedule.day} onChange={e => setNewSchedule({ ...newSchedule, day: e.target.value })}
                      className="px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white">
                      {['Lunes','Martes','Miercoles','Jueves','Viernes','Sabado','Domingo'].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <input type="text" placeholder="Ej: 10:00 - 11:00" value={newSchedule.time_block} onChange={e => setNewSchedule({ ...newSchedule, time_block: e.target.value })}
                      className="px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white" />
                    <button onClick={handleAddSchedule}
                      className="bg-primary hover:bg-primary-dark text-white text-[10px] uppercase font-bold px-4 py-2 rounded-sm border border-primary cursor-pointer"
                    >
                      <Plus className="w-3 h-3 inline mr-1" />
                      Agregar
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-secondary/10 text-[9px] uppercase tracking-widest font-bold text-text-muted bg-[#FAF8F5]">
                        <th className="py-3 px-3">Profesional</th>
                        <th className="py-3 px-3">Día</th>
                        <th className="py-3 px-3">Bloque</th>
                        <th className="py-3 px-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedules.map((s: any) => (
                        <tr key={s.id} className="border-b border-secondary/5 hover:bg-[#FAF8F5]/30">
                          <td className="py-3 px-3 font-medium text-secondary">{s.professional_name}</td>
                          <td className="py-3 px-3 text-text-muted">{s.day}</td>
                          <td className="py-3 px-3 font-mono">{s.time_block}</td>
                          <td className="py-3 px-3 text-right">
                            <button onClick={() => handleDeleteSchedule(s.id)} className="p-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-sm cursor-pointer">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* TAB: ROOMS */}
            {tab === 'salas' && (
              <motion.div key="salas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-serif text-xl font-light text-secondary">Salas ({rooms.length})</h3>
                  <button onClick={() => { setShowNewRoom(true); setEditingRoom(null); setRoomForm({ name: '', description: '' }); }}
                    className="bg-primary hover:bg-primary-dark text-white text-[10px] uppercase tracking-widest font-bold px-4 py-2.5 rounded-sm border border-primary transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nueva Sala
                  </button>
                </div>

                {(showNewRoom || editingRoom) && (
                  <form onSubmit={handleSaveRoom} className="bg-bg-base/30 border border-secondary/10 rounded-sm p-5 mb-6 space-y-4">
                    <h4 className="font-serif text-base font-light text-secondary">{editingRoom ? 'Editar Sala' : 'Nueva Sala'}</h4>
                    <div className="flex gap-4">
                      <input required placeholder="Nombre de la sala" value={roomForm.name} onChange={e => setRoomForm({ ...roomForm, name: e.target.value })}
                        className="flex-1 px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white focus:border-primary focus:outline-none" />
                      <input placeholder="Descripción (opcional)" value={roomForm.description} onChange={e => setRoomForm({ ...roomForm, description: e.target.value })}
                        className="flex-1 px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white" />
                    </div>
                    <div className="flex gap-3">
                      <button type="submit" className="bg-primary text-white text-[10px] uppercase font-bold px-4 py-2.5 rounded-sm border border-primary cursor-pointer">Guardar</button>
                      <button type="button" onClick={() => { setShowNewRoom(false); setEditingRoom(null); }} className="text-[10px] uppercase font-bold text-text-muted px-4 cursor-pointer">Cancelar</button>
                    </div>
                  </form>
                )}

                <div className="grid md:grid-cols-3 gap-4">
                  {rooms.map(r => (
                    <div key={r.id} className="bg-white border border-secondary/10 rounded-sm p-5 hover:shadow-sm transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-sm text-secondary">{r.name}</h4>
                          {r.type && <p className="text-[9px] uppercase font-bold text-text-muted mt-1">{r.type === 'Virtual' ? <><Video className="w-3 h-3 inline mr-1" />Virtual</> : <><Building className="w-3 h-3 inline mr-1" />Física</>}</p>}
                          {r.description && <p className="text-xs text-text-muted mt-1">{r.description}</p>}
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => { setEditingRoom(r.id); setRoomForm({ name: r.name, description: r.description || '' }); setShowNewRoom(true); }}
                            className="p-1.5 border border-secondary/20 text-text-muted hover:text-primary rounded-sm cursor-pointer" title="Editar">
                            <Save className="w-3 h-3" />
                          </button>
                          <button onClick={() => handleDeleteRoom(r.id)} className="p-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-sm cursor-pointer" title="Eliminar">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {rooms.length === 0 && (
                    <div className="col-span-3 text-center py-12 text-text-muted text-sm italic border border-dashed border-secondary/10 rounded-sm">
                      No hay salas registradas. Crea la primera.
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB: WAITLIST */}
            {tab === 'espera' && (
              <motion.div key="espera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-serif text-xl font-light text-secondary">Lista de Espera ({waitlist.length})</h3>
                  <button onClick={() => setShowNewWaitlist(!showNewWaitlist)}
                    className="bg-primary hover:bg-primary-dark text-white text-[10px] uppercase tracking-widest font-bold px-4 py-2.5 rounded-sm border border-primary transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Agregar Paciente
                  </button>
                </div>

                {showNewWaitlist && (
                  <form onSubmit={handleAddWaitlist} className="bg-bg-base/30 border border-secondary/10 rounded-sm p-5 mb-6 space-y-4">
                    <h4 className="font-serif text-base font-light text-secondary">Nuevo Paciente en Espera</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <input required placeholder="Nombre" value={waitlistForm.client_name} onChange={e => setWaitlistForm({ ...waitlistForm, client_name: e.target.value })}
                        className="px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white" />
                      <input required placeholder="Email" type="email" value={waitlistForm.client_email} onChange={e => setWaitlistForm({ ...waitlistForm, client_email: e.target.value })}
                        className="px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white" />
                      <input placeholder="Teléfono" value={waitlistForm.client_phone} onChange={e => setWaitlistForm({ ...waitlistForm, client_phone: e.target.value })}
                        className="px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white" />
                      <select value={waitlistForm.professional_id} onChange={e => setWaitlistForm({ ...waitlistForm, professional_id: e.target.value })}
                        className="px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white">
                        <option value="">Cualquier profesional</option>
                        {PROFESSIONALS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <select value={waitlistForm.service_id} onChange={e => setWaitlistForm({ ...waitlistForm, service_id: e.target.value })}
                        className="px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white">
                        <option value="">Cualquier servicio</option>
                        {allServices.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <input placeholder="Días preferidos" value={waitlistForm.preferred_days} onChange={e => setWaitlistForm({ ...waitlistForm, preferred_days: e.target.value })}
                        className="px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white" />
                      <textarea placeholder="Notas" value={waitlistForm.notes} onChange={e => setWaitlistForm({ ...waitlistForm, notes: e.target.value })}
                        className="px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white col-span-2" rows={2} />
                    </div>
                    <div className="flex gap-3">
                      <button type="submit" className="bg-primary text-white text-[10px] uppercase font-bold px-4 py-2.5 rounded-sm border border-primary cursor-pointer">Guardar</button>
                      <button type="button" onClick={() => setShowNewWaitlist(false)} className="text-[10px] uppercase font-bold text-text-muted px-4 cursor-pointer">Cancelar</button>
                    </div>
                  </form>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-secondary/10 text-[9px] uppercase tracking-widest font-bold text-text-muted bg-[#FAF8F5]">
                        <th className="py-3 px-3">Paciente</th>
                        <th className="py-3 px-3">Contacto</th>
                        <th className="py-3 px-3">Profesional</th>
                        <th className="py-3 px-3">Servicio</th>
                        <th className="py-3 px-3">Días Pref.</th>
                        <th className="py-3 px-3">Estado</th>
                        <th className="py-3 px-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {waitlist.map(w => (
                        <tr key={w.id} className="border-b border-secondary/5 hover:bg-[#FAF8F5]/30">
                          <td className="py-3 px-3 font-medium text-secondary">{w.client_name}</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2 text-text-muted">
                              <Mail className="w-3 h-3" />
                              <span className="text-[10px]">{w.client_email}</span>
                            </div>
                            {w.client_phone && (
                              <div className="flex items-center gap-2 text-text-muted mt-0.5">
                                <Phone className="w-3 h-3" />
                                <span className="text-[10px]">{w.client_phone}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-text-muted">{w.professional_id || '—'}</td>
                          <td className="py-3 px-3 text-text-muted">{w.service_id || '—'}</td>
                          <td className="py-3 px-3 text-text-muted">{w.preferred_days || '—'}</td>
                          <td className="py-3 px-3">
                            <select value={w.status} onChange={e => handleWaitlistStatusChange(w.id, e.target.value)}
                              className="text-[10px] font-bold uppercase border border-secondary/20 rounded-sm px-2 py-1 bg-white cursor-pointer"
                            >
                              <option value="Espera">Espera</option>
                              <option value="Contactado">Contactado</option>
                              <option value="Agendado">Agendado</option>
                              <option value="Cancelado">Cancelado</option>
                            </select>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button onClick={() => handleDeleteWaitlist(w.id)}
                              className="p-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-sm cursor-pointer"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {waitlist.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-text-muted text-sm italic">
                            No hay pacientes en lista de espera
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
