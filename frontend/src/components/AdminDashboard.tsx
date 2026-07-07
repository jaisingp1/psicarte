import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, Calendar, Settings, Plus, X, Save, Trash2, Search, Lock, Unlock,
  Clock, Home, AlertCircle, CheckCircle2, UserPlus, List, Phone, Mail, Video, Building, Bell
} from 'lucide-react';
import { Appointment, User as UserType, Service, Room, WaitlistItem, Professional } from '../types';
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
  const [tab, setTab] = useState<'agenda' | 'planificador' | 'clinica' | 'contenido' | 'noticias'>('agenda');
  const [clinicSubTab, setClinicSubTab] = useState<'usuarios' | 'profesionales' | 'servicios' | 'horarios' | 'salas' | 'espera'>('usuarios');
  const [contentSubTab, setContentSubTab] = useState<'contacto' | 'nosotros' | 'hero'>('contacto');
  
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [allProfessionals, setAllProfessionals] = useState<Professional[]>([]);
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

  // News states
  const [allNews, setAllNews] = useState<any[]>([]);
  const [showNewNews, setShowNewNews] = useState(false);
  const [editingNews, setEditingNews] = useState<number | null>(null);
  const [newsForm, setNewsForm] = useState({ title: '', message: '', active: 1, start_date: '', end_date: '' });

  // Site Content states
  const [siteContent, setSiteContent] = useState<Record<string, string>>({});

  // Load data
  const loadData = () => {
    fetch(`${API}/admin/users`).then(r => r.json()).then(setAllUsers);
    fetch(`${API}/professionals`).then(r => r.json()).then(setAllProfessionals);
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
    fetch(`${API}/news`).then(r => r.json()).then(setAllNews);
    fetch(`${API}/content`).then(r => r.json()).then(data => {
      // Mapea usando id y content según el esquema de base de datos real de site_content
      setSiteContent(data || {});
    });
  };

  const loadDataWithEvents = () => {
    loadData();
    fetchEvents();
  };

  // News handlers
  const handleSaveNews = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingNews ? `${API}/admin/news/${editingNews}` : `${API}/admin/news`;
    const method = editingNews ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newsForm)
    });
    if (res.ok) {
      showMsg(editingNews ? 'Anuncio actualizado' : 'Anuncio creado');
      fetch(`${API}/news`).then(r => r.json()).then(setAllNews);
      setShowNewNews(false);
      setEditingNews(null);
      setNewsForm({ title: '', message: '', active: 1, start_date: '', end_date: '' });
    } else {
      const err = await res.json();
      showMsg(`Error: ${err.error}`);
    }
  };

  const handleDeleteNews = async (id: number) => {
    const res = await fetch(`${API}/admin/news/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setAllNews(prev => prev.filter(n => n.id !== id));
      showMsg('Anuncio eliminado');
    }
  };

  // Site Content handler
  const handleSaveSiteContent = async (keyName: string, valueText: string) => {
    const res = await fetch(`${API}/admin/content/${keyName}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value_text: valueText })
    });
    if (res.ok) {
      setSiteContent(prev => ({ ...prev, [keyName]: valueText }));
      showMsg('Contenido guardado con éxito');
    } else {
      showMsg('Error al guardar contenido');
    }
  };
  useEffect(loadDataWithEvents, []);

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

  // ===== Professional Management =====
  const [showNewProfessional, setShowNewProfessional] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<string | null>(null);
  const [professionalForm, setProfessionalForm] = useState({ id: '', name: '', title: '', experience: '', bio: '', avatar_url: '' });

  const handleSaveProfessional = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...professionalForm };
    if (editingProfessional) {
      await fetch(`${API}/admin/professionals/${editingProfessional}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      setAllProfessionals(prev => prev.map(p => p.id === editingProfessional ? { ...p, ...payload } as Professional : p));
      showMsg('Profesional actualizado');
    } else {
      const id = payload.id || `prof-${Date.now()}`;
      payload.id = id;
      const res = await fetch(`${API}/admin/professionals`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (res.ok) {
        setAllProfessionals(prev => [...prev, payload as Professional]);
        showMsg('Profesional creado');
      }
    }
    setShowNewProfessional(false);
    setEditingProfessional(null);
  };

  const handleDeleteProfessional = async (id: string) => {
    await fetch(`${API}/admin/professionals/${id}`, { method: 'DELETE' });
    setAllProfessionals(prev => prev.filter(p => p.id !== id));
    showMsg('Profesional eliminado');
  };

  // ===== Service Management =====
  const [showNewService, setShowNewService] = useState(false);
  const [editingService, setEditingService] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState({ name: '', professional_id: '', professional_name: '', price: 0, duration: 50, description: '', category: 'coaching' });

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    const prof = allProfessionals.find(p => p.id === serviceForm.professional_id);
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
  const [roomForm, setRoomForm] = useState({ name: '', description: '', open_time: '08:00', close_time: '22:00' });

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

  // ===== Event Management =====
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState({ title: '', description: '', date: '', time: '', capacity: 10, active: 1 });
  const [eventInscriptions, setEventInscriptions] = useState<any[]>([]);
  const [viewingEventInscriptionsId, setViewingEventInscriptionsId] = useState<string | null>(null);

  const fetchEvents = () => {
    fetch(`${API}/admin/events`).then(r => r.json()).then(setAllEvents).catch(console.error);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...eventForm };
    const id = editingEvent || `evt-${Date.now()}`;
    const res = await fetch(`${API}/admin/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...payload })
    });
    if (res.ok) {
      showMsg(editingEvent ? 'Evento actualizado' : 'Evento creado');
      fetchEvents();
      setShowNewEvent(false);
      setEditingEvent(null);
      setEventForm({ title: '', description: '', date: '', time: '', capacity: 10, active: 1 });
    } else {
      const err = await res.json();
      showMsg(`Error: ${err.error}`);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    const res = await fetch(`${API}/admin/events/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setAllEvents(prev => prev.filter(evt => evt.id !== id));
      showMsg('Evento eliminado');
    }
  };

  const handleViewInscriptions = async (evtId: string) => {
    const res = await fetch(`${API}/admin/events/${evtId}/inscriptions`);
    if (res.ok) {
      const data = await res.json();
      setEventInscriptions(data);
      setViewingEventInscriptionsId(evtId);
    }
  };

  // Add fetchEvents to initial loadData

  const tabs = [
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'planificador', label: 'Planificador', icon: Clock },
    { id: 'clinica', label: 'Gestión Clínica', icon: Users },
    { id: 'eventos', label: 'Eventos Especiales', icon: Calendar },
    { id: 'contenido', label: 'Contenido del Sitio', icon: Settings },
    { id: 'noticias', label: 'Noticias / Anuncios', icon: Bell }
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
                  allProfessionals={allProfessionals}
                />
              </motion.div>
            )}

            {/* TAB: WEEKLY PLANNER */}
            {tab === 'planificador' && (
              <motion.div key="planificador" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <SemanalPlanner rooms={rooms} allServices={allServices} allProfessionals={allProfessionals} />
              </motion.div>
            )}
            {/* TAB: NOTICIAS / ANUNCIOS */}
            {tab === 'noticias' && (
              <motion.div key="noticias" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-serif text-xl font-light text-secondary">Noticias y Anuncios Activos ({allNews.length})</h3>
                  <button onClick={() => { setShowNewNews(true); setEditingNews(null); setNewsForm({ title: '', message: '', active: 1, start_date: '', end_date: '' }); }}
                    className="bg-primary hover:bg-primary-dark text-white text-[10px] uppercase tracking-widest font-bold px-4 py-2.5 rounded-sm border border-primary transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nuevo Anuncio
                  </button>
                </div>

                {showNewNews && (
                  <form onSubmit={handleSaveNews} className="bg-bg-base/30 border border-secondary/10 rounded-sm p-5 mb-6 space-y-4">
                    <h4 className="font-serif text-base font-light text-secondary">{editingNews ? 'Editar Anuncio' : 'Crear Nuevo Anuncio'}</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5">Título del Anuncio</label>
                        <input required placeholder="Ej: ¡Bienvenidos a nuestro nuevo portal!" value={newsForm.title} onChange={e => setNewsForm({ ...newsForm, title: e.target.value })}
                          className="w-full px-3.5 py-2.5 text-xs border border-secondary/20 rounded-sm bg-white focus:border-primary focus:outline-none" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5">Mensaje / Contenido</label>
                        <textarea required placeholder="Escribe el mensaje del anuncio aquí..." value={newsForm.message} onChange={e => setNewsForm({ ...newsForm, message: e.target.value })}
                          className="w-full px-3.5 py-2.5 text-xs border border-secondary/20 rounded-sm bg-white focus:border-primary focus:outline-none" rows={4} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5">Mostrar Desde (Fecha Inicio)</label>
                        <input type="date" value={newsForm.start_date || ''} onChange={e => setNewsForm({ ...newsForm, start_date: e.target.value || null })}
                          className="w-full px-3.5 py-2.5 text-xs border border-secondary/20 rounded-sm bg-white focus:border-primary focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5">Mostrar Hasta (Fecha Fin)</label>
                        <input type="date" value={newsForm.end_date || ''} onChange={e => setNewsForm({ ...newsForm, end_date: e.target.value || null })}
                          className="w-full px-3.5 py-2.5 text-xs border border-secondary/20 rounded-sm bg-white focus:border-primary focus:outline-none" />
                      </div>
                      <div className="col-span-2 flex items-center gap-2">
                        <input type="checkbox" id="news-active" checked={!!newsForm.active} onChange={e => setNewsForm({ ...newsForm, active: e.target.checked ? 1 : 0 })}
                          className="rounded-sm border-secondary/20 text-primary focus:ring-primary w-4 h-4 cursor-pointer" />
                        <label htmlFor="news-active" className="text-xs font-semibold text-secondary cursor-pointer">Activar anuncio inmediatamente</label>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button type="submit" className="bg-primary text-white text-[10px] uppercase font-bold px-4 py-2.5 rounded-sm border border-primary cursor-pointer">Guardar</button>
                      <button type="button" onClick={() => { setShowNewNews(false); setEditingNews(null); }} className="text-[10px] uppercase font-bold text-text-muted px-4 cursor-pointer">Cancelar</button>
                    </div>
                  </form>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-secondary/10 text-[9px] uppercase tracking-widest font-bold text-text-muted bg-[#FAF8F5]">
                        <th className="py-3 px-3">Título</th>
                        <th className="py-3 px-3">Mensaje</th>
                        <th className="py-3 px-3">Rango de Publicación</th>
                        <th className="py-3 px-3 text-center">Estado</th>
                        <th className="py-3 px-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allNews.map(n => (
                        <tr key={n.id} className="border-b border-secondary/5 hover:bg-[#FAF8F5]/30">
                          <td className="py-3 px-3 font-semibold text-secondary max-w-[200px] truncate">{n.title}</td>
                          <td className="py-3 px-3 text-text-muted max-w-[300px] truncate">{n.message}</td>
                          <td className="py-3 px-3 text-text-muted">
                            {n.start_date || 'Sin inicio'} &rarr; {n.end_date || 'Sin fin'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border ${n.active ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200'}`}>
                              {n.active ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => { setEditingNews(n.id || null); setNewsForm(n); setShowNewNews(true); }} className="p-1.5 border border-secondary/20 text-text-muted hover:text-primary hover:border-primary rounded-sm cursor-pointer" title="Editar">
                                <Save className="w-3 h-3" />
                              </button>
                              <button onClick={() => handleDeleteNews(n.id!)} className="p-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-sm cursor-pointer" title="Eliminar">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {allNews.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-text-muted text-sm italic">
                            No hay noticias o anuncios registrados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* TAB: EVENTOS ESPECIALES */}
            {tab === 'eventos' && (
              <motion.div key="eventos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-serif text-xl font-light text-secondary">Eventos Especiales ({allEvents.length})</h3>
                  <button onClick={() => { setShowNewEvent(true); setEditingEvent(null); setEventForm({ title: '', description: '', date: '', time: '', capacity: 15, active: 1 }); }}
                    className="bg-primary hover:bg-primary-dark text-white text-[10px] uppercase tracking-widest font-bold px-4 py-2.5 rounded-sm border border-primary transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nuevo Evento
                  </button>
                </div>

                {showNewEvent && (
                  <form onSubmit={handleSaveEvent} className="bg-bg-base/30 border border-secondary/10 rounded-sm p-5 mb-6 space-y-4">
                    <h4 className="font-serif text-base font-light text-secondary">{editingEvent ? 'Editar Evento' : 'Crear Nuevo Evento'}</h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5">Título del Evento</label>
                        <input required placeholder="Ej: Taller de Meditación al Aire Libre" value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })}
                          className="w-full px-3.5 py-2.5 text-xs border border-secondary/20 rounded-sm bg-white focus:border-primary focus:outline-none" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5">Descripción o Detalles del Evento</label>
                        <textarea required placeholder="Describe las actividades, requisitos y lugar..." value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} rows={3}
                          className="w-full px-3.5 py-2.5 text-xs border border-secondary/20 rounded-sm bg-white focus:border-primary focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5">Fecha del Evento</label>
                        <input required type="date" value={eventForm.date} onChange={e => setEventForm({ ...eventForm, date: e.target.value })}
                          className="w-full px-3.5 py-2.5 text-xs border border-secondary/20 rounded-sm bg-white focus:border-primary focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5">Hora de Inicio (HH:MM)</label>
                        <input required type="time" value={eventForm.time} onChange={e => setEventForm({ ...eventForm, time: e.target.value })}
                          className="w-full px-3.5 py-2.5 text-xs border border-secondary/20 rounded-sm bg-white focus:border-primary focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5">Capacidad Total de Cupos</label>
                        <input required type="number" min="1" value={eventForm.capacity} onChange={e => setEventForm({ ...eventForm, capacity: Number(e.target.value) })}
                          className="w-full px-3.5 py-2.5 text-xs border border-secondary/20 rounded-sm bg-white focus:border-primary focus:outline-none" />
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <input type="checkbox" id="evt-active" checked={!!eventForm.active} onChange={e => setEventForm({ ...eventForm, active: e.target.checked ? 1 : 0 })}
                          className="rounded-sm border-secondary/20 text-primary focus:ring-primary w-4 h-4 cursor-pointer" />
                        <label htmlFor="evt-active" className="text-xs font-semibold text-secondary cursor-pointer">Evento disponible e inscriptible</label>
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button type="submit" className="bg-primary text-white text-[10px] uppercase font-bold px-4 py-2.5 rounded-sm border border-primary cursor-pointer">Guardar Evento</button>
                      <button type="button" onClick={() => { setShowNewEvent(false); setEditingEvent(null); }} className="text-[10px] uppercase font-bold text-text-muted px-4 cursor-pointer">Cancelar</button>
                    </div>
                  </form>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-secondary/10 text-[9px] uppercase tracking-widest font-bold text-text-muted bg-[#FAF8F5]">
                        <th className="py-3 px-3">Evento</th>
                        <th className="py-3 px-3">Fecha & Hora</th>
                        <th className="py-3 px-3 text-center">Inscritos / Capacidad</th>
                        <th className="py-3 px-3 text-center">Estado</th>
                        <th className="py-3 px-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allEvents.map(evt => (
                        <tr key={evt.id} className="border-b border-secondary/5 hover:bg-[#FAF8F5]/30">
                          <td className="py-3 px-3 font-semibold text-secondary max-w-[200px] truncate">
                            <span className="block">{evt.title}</span>
                            <span className="block text-[10px] text-text-muted font-normal max-w-[250px] truncate">{evt.description}</span>
                          </td>
                          <td className="py-3 px-3 text-text-muted">
                            {evt.date} a las {evt.time} hrs
                          </td>
                          <td className="py-3 px-3 text-center font-medium">
                            <button onClick={() => handleViewInscriptions(evt.id)}
                              className="text-primary hover:underline font-bold"
                              title="Ver inscritos"
                            >
                              {evt.registered_count || 0} / {evt.capacity} inscritos
                            </button>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border ${evt.active ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200'}`}>
                              {evt.active ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => { setEditingEvent(evt.id); setEventForm({ title: evt.title, description: evt.description, date: evt.date, time: evt.time, capacity: evt.capacity, active: evt.active }); setShowNewEvent(true); }}
                                className="p-1.5 border border-secondary/20 text-text-muted hover:text-primary hover:border-primary rounded-sm cursor-pointer" title="Editar">
                                <Save className="w-3 h-3" />
                              </button>
                              <button onClick={() => handleDeleteEvent(evt.id)} className="p-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-sm cursor-pointer" title="Eliminar">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {allEvents.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-text-muted text-sm italic">
                            No hay eventos especiales registrados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Event Inscriptions List Modal overlay */}
                {viewingEventInscriptionsId && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setViewingEventInscriptionsId(null)}>
                    <div className="bg-white rounded-sm shadow-xl border border-secondary/10 p-6 w-full max-w-2xl mx-4" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h4 className="font-serif text-lg font-light text-secondary">Personas Inscritas al Evento</h4>
                          <p className="text-xs text-text-muted mt-1">Lista completa de participantes registrados</p>
                        </div>
                        <button onClick={() => setViewingEventInscriptionsId(null)} className="p-1 text-text-muted hover:text-secondary cursor-pointer">
                          <X className="w-4.5 h-4.5" />
                        </button>
                      </div>

                      <div className="max-h-[300px] overflow-y-auto border border-secondary/10 rounded-sm">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-secondary/10 text-[9px] uppercase tracking-widest font-bold text-text-muted bg-[#FAF8F5]">
                              <th className="py-3 px-3">Nombre</th>
                              <th className="py-3 px-3">Email</th>
                              <th className="py-3 px-3">Teléfono</th>
                              <th className="py-3 px-3">Fecha Inscripción</th>
                            </tr>
                          </thead>
                          <tbody>
                            {eventInscriptions.map(ins => (
                              <tr key={ins.id} className="border-b border-secondary/5 hover:bg-[#FAF8F5]/30">
                                <td className="py-3 px-3 font-semibold text-secondary">{ins.client_name}</td>
                                <td className="py-3 px-3 text-text-muted">{ins.client_email}</td>
                                <td className="py-3 px-3 text-text-muted">{ins.client_phone}</td>
                                <td className="py-3 px-3 text-text-muted">{ins.created_at}</td>
                              </tr>
                            ))}
                            {eventInscriptions.length === 0 && (
                              <tr>
                                <td colSpan={4} className="py-12 text-center text-text-muted text-xs italic">
                                  No hay personas inscritas aún para este evento.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div className="mt-6 text-right">
                        <button onClick={() => setViewingEventInscriptionsId(null)} className="bg-secondary text-white text-[10px] uppercase font-bold px-6 py-2.5 rounded-sm border border-secondary cursor-pointer">Cerrar</button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB: CONTENIDO DEL SITIO */}
            {tab === 'contenido' && (
              <motion.div key="contenido" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="flex border-b border-secondary/10 bg-[#FAF8F5] mb-6">
                  {(['contacto', 'nosotros', 'hero'] as const).map(sub => (
                    <button key={sub} onClick={() => setContentSubTab(sub)}
                      className={`px-5 py-3 text-[9px] uppercase tracking-widest font-bold border-b-2 transition-all cursor-pointer ${
                        contentSubTab === sub ? 'border-primary text-primary bg-white font-extrabold' : 'border-transparent text-text-muted hover:text-secondary'
                      }`}
                    >
                      {sub === 'contacto' ? 'Información de Contacto' : sub === 'nosotros' ? 'Nuestra Misión, Visión y Objetivos' : 'Textos de Inicio (Hero)'}
                    </button>
                  ))}
                </div>

                {contentSubTab === 'contacto' && (
                  <div className="bg-[#FAF8F5]/30 border border-secondary/10 rounded-sm p-6 space-y-6">
                    <h4 className="font-serif text-base font-medium text-secondary">Editar Información de Contacto</h4>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest">Email de Contacto</label>
                        <div className="flex gap-2">
                          <input id="content-email" defaultValue={siteContent.contacto_email || ''} className="flex-1 px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white" />
                          <button type="button" onClick={() => handleSaveSiteContent('contacto_email', (document.getElementById('content-email') as HTMLInputElement).value)} className="bg-primary text-white text-[10px] uppercase font-bold px-4 rounded-sm border border-primary cursor-pointer">Guardar</button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest">Teléfono de Contacto (Formato Link)</label>
                        <div className="flex gap-2">
                          <input id="content-phone" defaultValue={siteContent.contacto_telefono || ''} className="flex-1 px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white" />
                          <button type="button" onClick={() => handleSaveSiteContent('contacto_telefono', (document.getElementById('content-phone') as HTMLInputElement).value)} className="bg-primary text-white text-[10px] uppercase font-bold px-4 rounded-sm border border-primary cursor-pointer">Guardar</button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest">Teléfono de Contacto (Visual)</label>
                        <div className="flex gap-2">
                          <input id="content-phone-disp" defaultValue={siteContent.contacto_telefono_display || ''} className="flex-1 px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white" />
                          <button type="button" onClick={() => handleSaveSiteContent('contacto_telefono_display', (document.getElementById('content-phone-disp') as HTMLInputElement).value)} className="bg-primary text-white text-[10px] uppercase font-bold px-4 rounded-sm border border-primary cursor-pointer">Guardar</button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest">Dirección / Ubicación</label>
                        <div className="flex gap-2">
                          <input id="content-location" defaultValue={siteContent.contacto_ubicacion || ''} className="flex-1 px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white" />
                          <button type="button" onClick={() => handleSaveSiteContent('contacto_ubicacion', (document.getElementById('content-location') as HTMLInputElement).value)} className="bg-primary text-white text-[10px] uppercase font-bold px-4 rounded-sm border border-primary cursor-pointer">Guardar</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {contentSubTab === 'nosotros' && (
                  <div className="space-y-6">
                    <div className="bg-[#FAF8F5]/30 border border-secondary/10 rounded-sm p-6 space-y-3">
                      <h4 className="font-serif text-base font-medium text-secondary">Texto de Presentación (Nosotros)</h4>
                      <textarea id="content-pres" defaultValue={siteContent.presentacion || ''} className="w-full px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white" rows={6} />
                      <div className="text-right">
                        <button type="button" onClick={() => handleSaveSiteContent('presentacion', (document.getElementById('content-pres') as HTMLTextAreaElement).value)} className="bg-primary text-white text-[10px] uppercase font-bold px-6 py-2.5 rounded-sm border border-primary cursor-pointer">Guardar Presentación</button>
                      </div>
                    </div>
                    <div className="bg-[#FAF8F5]/30 border border-secondary/10 rounded-sm p-6 space-y-3">
                      <h4 className="font-serif text-base font-medium text-secondary">Nuestra Misión</h4>
                      <textarea id="content-mision" defaultValue={siteContent.mision || ''} className="w-full px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white" rows={4} />
                      <div className="text-right">
                        <button type="button" onClick={() => handleSaveSiteContent('mision', (document.getElementById('content-mision') as HTMLTextAreaElement).value)} className="bg-primary text-white text-[10px] uppercase font-bold px-6 py-2.5 rounded-sm border border-primary cursor-pointer">Guardar Misión</button>
                      </div>
                    </div>
                    <div className="bg-[#FAF8F5]/30 border border-secondary/10 rounded-sm p-6 space-y-3">
                      <h4 className="font-serif text-base font-medium text-secondary">Nuestra Visión</h4>
                      <textarea id="content-vision" defaultValue={siteContent.vision || ''} className="w-full px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white" rows={4} />
                      <div className="text-right">
                        <button type="button" onClick={() => handleSaveSiteContent('vision', (document.getElementById('content-vision') as HTMLTextAreaElement).value)} className="bg-primary text-white text-[10px] uppercase font-bold px-6 py-2.5 rounded-sm border border-primary cursor-pointer">Guardar Visión</button>
                      </div>
                    </div>
                  </div>
                )}

                {contentSubTab === 'hero' && (
                  <div className="bg-[#FAF8F5]/30 border border-secondary/10 rounded-sm p-6 space-y-6">
                    <h4 className="font-serif text-base font-medium text-secondary">Editar Textos de Inicio</h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest">Subtítulo Pequeño (Animado)</label>
                        <div className="flex gap-2">
                          <input id="content-hero-sub" defaultValue={siteContent.hero_subtitulo || ''} className="flex-1 px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white" />
                          <button type="button" onClick={() => handleSaveSiteContent('hero_subtitulo', (document.getElementById('content-hero-sub') as HTMLInputElement).value)} className="bg-primary text-white text-[10px] uppercase font-bold px-4 rounded-sm border border-primary cursor-pointer">Guardar</button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest">Título Principal Hero</label>
                        <div className="flex gap-2">
                          <input id="content-hero-title" defaultValue={siteContent.hero_titulo || ''} className="flex-1 px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white" />
                          <button type="button" onClick={() => handleSaveSiteContent('hero_titulo', (document.getElementById('content-hero-title') as HTMLInputElement).value)} className="bg-primary text-white text-[10px] uppercase font-bold px-4 rounded-sm border border-primary cursor-pointer">Guardar</button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest">Descripción Hero</label>
                        <div className="flex gap-2">
                          <textarea id="content-hero-desc" defaultValue={siteContent.hero_descripcion || ''} className="flex-1 px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white" rows={2} />
                          <button type="button" onClick={() => handleSaveSiteContent('hero_descripcion', (document.getElementById('content-hero-desc') as HTMLTextAreaElement).value)} className="bg-primary text-white text-[10px] uppercase font-bold px-4 rounded-sm border border-primary cursor-pointer">Guardar</button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest">Descripción del Pie de Página (Footer)</label>
                        <div className="flex gap-2">
                          <textarea id="content-footer-desc" defaultValue={siteContent.footer_descripcion || ''} className="flex-1 px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white" rows={2} />
                          <button type="button" onClick={() => handleSaveSiteContent('footer_descripcion', (document.getElementById('content-footer-desc') as HTMLTextAreaElement).value)} className="bg-primary text-white text-[10px] uppercase font-bold px-4 rounded-sm border border-primary cursor-pointer">Guardar</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB: CLÍNICA (Grouping Subtabs) */}
            {tab === 'clinica' && (
              <motion.div key="clinica" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="flex border-b border-secondary/10 bg-[#FAF8F5] mb-6 flex-wrap">
                  {([
                    { id: 'usuarios', label: 'Usuarios', icon: Users },
                    { id: 'profesionales', label: 'Profesionales', icon: UserPlus },
                    { id: 'servicios', label: 'Servicios', icon: Settings },
                    { id: 'horarios', label: 'Horarios', icon: Clock },
                    { id: 'salas', label: 'Salas', icon: Home },
                    { id: 'espera', label: 'Lista Espera', icon: List }
                  ] as const).map(sub => (
                    <button key={sub.id} onClick={() => setClinicSubTab(sub.id)}
                      className={`px-4 py-3 text-[9px] uppercase tracking-widest font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                        clinicSubTab === sub.id ? 'border-primary text-primary bg-white font-extrabold' : 'border-transparent text-text-muted hover:text-secondary'
                      }`}
                    >
                      <sub.icon className="w-3.5 h-3.5" />
                      {sub.label}
                    </button>
                  ))}
                </div>

                {/* Subtab content: USERS */}
                {clinicSubTab === 'usuarios' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
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
                              {allProfessionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
                                  {u.blocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Subtab content: PROFESSIONALS */}
                {clinicSubTab === 'profesionales' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="font-serif text-xl font-light text-secondary">Profesionales ({allProfessionals.length})</h3>
                      <button onClick={() => { setShowNewProfessional(true); setEditingProfessional(null); setProfessionalForm({ id: '', name: '', title: '', experience: '', bio: '', avatar_url: '' }); }}
                        className="bg-primary hover:bg-primary-dark text-white text-[10px] uppercase tracking-widest font-bold px-4 py-2.5 rounded-sm border border-primary transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Nuevo Profesional
                      </button>
                    </div>

                    {showNewProfessional && (
                      <form onSubmit={handleSaveProfessional} className="bg-bg-base/30 border border-secondary/10 rounded-sm p-5 mb-6 space-y-4">
                        <h4 className="font-serif text-base font-light text-secondary">{editingProfessional ? 'Editar Profesional' : 'Nuevo Profesional'}</h4>
                        <div className="grid md:grid-cols-2 gap-4">
                          <input required placeholder="ID único (ej: ivan)" value={professionalForm.id} onChange={e => setProfessionalForm({ ...professionalForm, id: e.target.value })} disabled={!!editingProfessional}
                            className="px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white focus:border-primary focus:outline-none disabled:bg-gray-100" />
                          <input required placeholder="Nombre completo" value={professionalForm.name} onChange={e => setProfessionalForm({ ...professionalForm, name: e.target.value })}
                            className="px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white focus:border-primary focus:outline-none" />
                          <input required placeholder="Título (ej: Psicóloga Clínica)" value={professionalForm.title} onChange={e => setProfessionalForm({ ...professionalForm, title: e.target.value })}
                            className="px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white focus:border-primary focus:outline-none" />
                          <input required placeholder="Experiencia (ej: 5 años)" value={professionalForm.experience} onChange={e => setProfessionalForm({ ...professionalForm, experience: e.target.value })}
                            className="px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white focus:border-primary focus:outline-none" />
                          <textarea required placeholder="Biografía" value={professionalForm.bio} onChange={e => setProfessionalForm({ ...professionalForm, bio: e.target.value })}
                            className="px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white focus:border-primary focus:outline-none col-span-2" rows={3} />
                        </div>
                        <div className="flex gap-3">
                          <button type="submit" className="bg-primary text-white text-[10px] uppercase font-bold px-4 py-2.5 rounded-sm border border-primary cursor-pointer">Guardar</button>
                          <button type="button" onClick={() => { setShowNewProfessional(false); setEditingProfessional(null); }} className="text-[10px] uppercase font-bold text-text-muted px-4 cursor-pointer">Cancelar</button>
                        </div>
                      </form>
                    )}

                    <div className="grid md:grid-cols-2 gap-6">
                      {allProfessionals.map(p => (
                        <div key={p.id} className="border border-secondary/10 rounded-sm p-5 bg-white hover:shadow-md transition-all flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-sm text-secondary">{p.name}</h4>
                            <p className="text-[10px] uppercase text-primary font-bold">{p.title}</p>
                            <p className="text-xs text-text-muted mt-2 line-clamp-2">{p.bio}</p>
                          </div>
                          <div className="flex gap-1 ml-4">
                            <button onClick={() => { setEditingProfessional(p.id); setProfessionalForm({ id: p.id, name: p.name, title: p.title, experience: p.experience, bio: p.bio, avatar_url: p.avatar_url || '' }); setShowNewProfessional(true); }}
                              className="p-1.5 border border-secondary/20 text-text-muted hover:text-primary rounded-sm cursor-pointer" title="Editar">
                              <Save className="w-3 h-3" />
                            </button>
                            <button onClick={() => handleDeleteProfessional(p.id)} className="p-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-sm cursor-pointer" title="Eliminar">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Subtab content: SERVICES */}
                {clinicSubTab === 'servicios' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
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
                            {allProfessionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Subtab content: SCHEDULES (weekly) */}
                {clinicSubTab === 'horarios' && (
                  <div className="space-y-6">
                    <h3 className="font-serif text-xl font-light text-secondary">Horarios Semanales</h3>
                    <form onSubmit={handleAddSchedule} className="bg-bg-base/30 border border-secondary/10 rounded-sm p-4 flex flex-wrap gap-4 items-end">
                      <div className="flex-grow min-w-[200px]">
                        <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5">Profesional</label>
                        <select value={newSchedule.professional_id} onChange={e => setNewSchedule({ ...newSchedule, professional_id: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white">
                          {allProfessionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5">Día</label>
                        <select value={newSchedule.day} onChange={e => setNewSchedule({ ...newSchedule, day: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white">
                          {['Lunes','Martes','Miercoles','Jueves','Viernes','Sabado','Domingo'].map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div className="flex-grow">
                        <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5">Bloque Horario (Ej: 09:00 - 10:00)</label>
                        <input required placeholder="HH:MM - HH:MM" value={newSchedule.time_block} onChange={e => setNewSchedule({ ...newSchedule, time_block: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white" />
                      </div>
                      <button type="submit" className="bg-primary text-white text-[10px] uppercase font-bold px-6 py-2.5 rounded-sm border border-primary cursor-pointer flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Agregar</button>
                    </form>

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
                          {schedules.map(s => (
                            <tr key={s.id} className="border-b border-secondary/5 hover:bg-[#FAF8F5]/30">
                              <td className="py-3 px-3 font-semibold text-secondary">{s.professional_name || s.professional_id}</td>
                              <td className="py-3 px-3 text-text-muted">{s.day}</td>
                              <td className="py-3 px-3 font-medium">{s.time_block} hrs</td>
                              <td className="py-3 px-3 text-right">
                                <button onClick={() => handleDeleteSchedule(s.id)} className="p-1 border border-red-200 text-red-600 hover:bg-red-50 rounded-sm cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Subtab content: ROOMS */}
                {clinicSubTab === 'salas' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="font-serif text-xl font-light text-secondary">Salas e Infraestructura ({rooms.length})</h3>
                      <button onClick={() => { setShowNewRoom(true); setEditingRoom(null); setRoomForm({ id: '', name: '', type: 'Fisica', description: '', videoconference_link: '', open_time: '08:00', close_time: '22:00' }); }}
                        className="bg-primary hover:bg-primary-dark text-white text-[10px] uppercase tracking-widest font-bold px-4 py-2.5 rounded-sm border border-primary transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Nueva Sala
                      </button>
                    </div>

                    {showNewRoom && (
                      <form onSubmit={handleSaveRoom} className="bg-bg-base/30 border border-secondary/10 rounded-sm p-5 mb-6 space-y-4">
                        <h4 className="font-serif text-base font-light text-secondary">{editingRoom ? 'Editar Sala' : 'Crear Nueva Sala'}</h4>
                        <div className="grid md:grid-cols-2 gap-4">
                          <input required placeholder="ID de la sala (ej: sala-talleres)" value={roomForm.id} onChange={e => setRoomForm({ ...roomForm, id: e.target.value })} disabled={!!editingRoom}
                            className="px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white focus:border-primary focus:outline-none disabled:bg-gray-100" />
                          <input required placeholder="Nombre descriptivo" value={roomForm.name} onChange={e => setRoomForm({ ...roomForm, name: e.target.value })}
                            className="px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white focus:border-primary focus:outline-none" />
                          <select value={roomForm.type} onChange={e => setRoomForm({ ...roomForm, type: e.target.value as any })}
                            className="px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white">
                            <option value="Fisica">Presencial / Física</option>
                            <option value="Virtual">Virtual / Telemedicina</option>
                          </select>
                          <input placeholder="Link de videoconferencia (Opcional)" value={roomForm.videoconference_link} onChange={e => setRoomForm({ ...roomForm, videoconference_link: e.target.value })}
                            className="px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white focus:border-primary focus:outline-none" />
                          <input required placeholder="Apertura (HH:MM)" value={roomForm.open_time} onChange={e => setRoomForm({ ...roomForm, open_time: e.target.value })}
                            className="px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white focus:border-primary focus:outline-none" />
                          <input required placeholder="Cierre (HH:MM)" value={roomForm.close_time} onChange={e => setRoomForm({ ...roomForm, close_time: e.target.value })}
                            className="px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white focus:border-primary focus:outline-none" />
                          <textarea placeholder="Detalles de la sala..." value={roomForm.description} onChange={e => setRoomForm({ ...roomForm, description: e.target.value })}
                            className="px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white col-span-2 focus:border-primary focus:outline-none" rows={2} />
                        </div>
                        <div className="flex gap-3">
                          <button type="submit" className="bg-primary text-white text-[10px] uppercase font-bold px-4 py-2.5 rounded-sm border border-primary cursor-pointer">Guardar</button>
                          <button type="button" onClick={() => { setShowNewRoom(false); setEditingRoom(null); }} className="text-[10px] uppercase font-bold text-text-muted px-4 cursor-pointer">Cancelar</button>
                        </div>
                      </form>
                    )}

                    <div className="grid md:grid-cols-3 gap-6">
                      {rooms.map(r => (
                        <div key={r.id} className="border border-secondary/10 rounded-sm p-5 bg-white hover:shadow-md transition-all flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-center">
                              <h4 className="font-semibold text-sm text-secondary">{r.name}</h4>
                              <span className="text-[8px] uppercase font-bold bg-secondary/10 px-2 py-0.5 rounded-sm border border-secondary/20 text-secondary">{r.type}</span>
                            </div>
                            <p className="text-xs text-text-muted mt-2">{r.description || 'Sin descripción descriptiva.'}</p>
                            <p className="text-[10px] text-text-muted mt-2">Horario: {r.open_time} - {r.close_time}</p>
                            {r.videoconference_link && <p className="text-[10px] text-primary truncate mt-1">URL: {r.videoconference_link}</p>}
                          </div>
                          <div className="flex gap-2 justify-end mt-4 pt-4 border-t border-secondary/10">
                            <button onClick={() => { setEditingRoom(r.id); setRoomForm({ id: r.id, name: r.name, type: r.type, description: r.description || '', videoconference_link: r.videoconference_link || '', open_time: r.open_time, close_time: r.close_time }); setShowNewRoom(true); }}
                              className="p-1 border border-secondary/20 text-text-muted hover:text-primary rounded-sm cursor-pointer" title="Editar"><Save className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleDeleteRoom(r.id)} className="p-1 border border-red-200 text-red-600 hover:bg-red-50 rounded-sm cursor-pointer" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Subtab content: WAITLIST */}
                {clinicSubTab === 'espera' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="font-serif text-xl font-light text-secondary">Pacientes en Espera ({waitlist.length})</h3>
                      <button onClick={() => setShowNewWaitlist(true)} className="bg-primary hover:bg-primary-dark text-white text-[10px] uppercase tracking-widest font-bold px-4 py-2.5 rounded-sm border border-primary transition-all flex items-center gap-1.5 cursor-pointer">
                        <Plus className="w-3.5 h-3.5" /> Agregar Paciente
                      </button>
                    </div>

                    {showNewWaitlist && (
                      <form onSubmit={handleAddWaitlist} className="bg-bg-base/30 border border-secondary/10 rounded-sm p-5 space-y-4">
                        <h4 className="font-serif text-base font-light text-secondary">Agregar a Lista de Espera</h4>
                        <div className="grid md:grid-cols-3 gap-4">
                          <input required placeholder="Nombre del paciente" value={waitlistForm.client_name} onChange={e => setWaitlistForm({ ...waitlistForm, client_name: e.target.value })} className="px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white" />
                          <input required placeholder="Email de contacto" value={waitlistForm.client_email} onChange={e => setWaitlistForm({ ...waitlistForm, client_email: e.target.value })} className="px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white" />
                          <input placeholder="Teléfono" value={waitlistForm.client_phone} onChange={e => setWaitlistForm({ ...waitlistForm, client_phone: e.target.value })} className="px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white" />
                          <select value={waitlistForm.professional_id} onChange={e => setWaitlistForm({ ...waitlistForm, professional_id: e.target.value })} className="px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white">
                            <option value="">Cualquier especialista</option>
                            {allProfessionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                          <select value={waitlistForm.service_id} onChange={e => setWaitlistForm({ ...waitlistForm, service_id: e.target.value })} className="px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white col-span-2">
                            <option value="">Cualquier servicio</option>
                            {allServices.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                          <input placeholder="Días preferidos (ej: Martes y Jueves)" value={waitlistForm.preferred_days} onChange={e => setWaitlistForm({ ...waitlistForm, preferred_days: e.target.value })} className="px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white col-span-3" />
                          <textarea placeholder="Notas u observaciones" value={waitlistForm.notes} onChange={e => setWaitlistForm({ ...waitlistForm, notes: e.target.value })} className="px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white col-span-3" rows={2} />
                        </div>
                        <div className="flex gap-3">
                          <button type="submit" className="bg-primary text-white text-[10px] uppercase font-bold px-4 py-2.5 rounded-sm border border-primary cursor-pointer">Añadir</button>
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
                                  <Mail className="w-3.5 h-3.5" />
                                  <span className="text-[10px]">{w.client_email}</span>
                                </div>
                                {w.client_phone && (
                                  <div className="flex items-center gap-2 text-text-muted mt-0.5">
                                    <Phone className="w-3.5 h-3.5" />
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
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
