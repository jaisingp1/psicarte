import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, X, User, Mail, Phone, Save, LogOut, AlertCircle, CheckCircle2, Edit3, ArrowLeft } from 'lucide-react';
import { Appointment, User as UserType, Service } from '../types';
import { SERVICES } from '../data';

interface UserDashboardProps {
  user: UserType;
  appointments: Appointment[];
  onCancelAppointment: (id: string) => void;
  onNewBooking: () => void;
  onLogout: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ user, appointments, onCancelAppointment, onNewBooking, onLogout }) => {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [editPhone, setEditPhone] = useState(user.phone || '');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const userApps = appointments.filter(a => a.clientEmail === user.email);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/auth/profile/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, phone: editPhone }),
      });
      const data = await res.json();
      if (res.ok) {
        user.name = data.name;
        user.phone = data.phone;
        localStorage.setItem('psicarte_user', JSON.stringify(user));
        setSaveMsg('Datos actualizados correctamente');
        setEditing(false);
      }
    } catch {
      setSaveMsg('Error al guardar');
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    try {
      await fetch(`/api/appointments/${id}/cancel`, { method: 'PUT' });
      onCancelAppointment(id);
    } catch {}
    setCancellingId(null);
  };

  const totalSpent = userApps.filter(a => a.status === 'Confirmado').reduce((acc, a) => acc + a.servicePrice, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white border border-secondary/10 rounded-sm shadow-sm overflow-hidden">
        <div className="bg-secondary p-8 text-white">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="font-serif text-2xl font-light">Mi Panel</h2>
              <p className="text-[10px] uppercase tracking-widest text-gold-light font-bold mt-1">Bienvenido/a, {user.name}</p>
            </div>
            <button onClick={onLogout}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[10px] uppercase tracking-widest font-bold px-4 py-2.5 rounded-sm transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Cerrar Sesión
            </button>
          </div>
        </div>

        <div className="p-6 md:p-8">
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-bg-base/30 border border-secondary/10 rounded-sm p-5 text-center">
              <span className="text-[9px] uppercase tracking-widest font-bold text-text-muted block">Mis Sesiones</span>
              <span className="text-3xl font-serif font-light text-secondary mt-1 block">{userApps.length}</span>
            </div>
            <div className="bg-bg-base/30 border border-secondary/10 rounded-sm p-5 text-center">
              <span className="text-[9px] uppercase tracking-widest font-bold text-text-muted block">Activas</span>
              <span className="text-3xl font-serif font-light text-green-600 mt-1 block">{userApps.filter(a => a.status === 'Confirmado').length}</span>
            </div>
            <div className="bg-bg-base/30 border border-secondary/10 rounded-sm p-5 text-center">
              <span className="text-[9px] uppercase tracking-widest font-bold text-text-muted block">Total Invertido</span>
              <span className="text-3xl font-serif font-light text-primary mt-1 block">${totalSpent.toLocaleString('es-CL')}</span>
            </div>
          </div>

          {saveMsg && (
            <div className={`mb-6 p-3 rounded-sm text-xs font-semibold flex items-center gap-2 ${saveMsg.includes('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {saveMsg}
            </div>
          )}

          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-secondary/10 pb-4">
              <h3 className="font-serif text-xl font-light text-secondary flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Mis Agendamientos
              </h3>
              <button onClick={onNewBooking}
                className="bg-primary hover:bg-primary-dark text-white text-[10px] uppercase tracking-widest font-bold px-4 py-2.5 rounded-sm border border-primary transition-all cursor-pointer"
              >
                + Nueva Hora
              </button>
            </div>

            {userApps.length === 0 ? (
              <div className="text-center py-12 text-text-muted text-sm italic border border-dashed border-secondary/10 rounded-sm">
                No tienes sesiones agendadas aún.
              </div>
            ) : (
              <div className="space-y-3">
                {userApps.map(app => {
                  const service = SERVICES.find(s => s.id === app.serviceId);
                  return (
                    <div key={app.id} className={`border rounded-sm p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${app.status === 'Cancelado' ? 'bg-gray-50/50 opacity-60 border-red-200' : 'bg-white border-secondary/10 hover:border-primary/20'}`}>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm text-secondary">{app.serviceName}</h4>
                        <p className="text-xs text-text-muted mt-1 flex items-center gap-3 flex-wrap">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{app.date}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{app.timeBlock} hrs</span>
                          <span className="flex items-center gap-1"><User className="w-3 h-3" />{app.professionalName}</span>
                        </p>
                        {app.notes && <p className="text-[10px] text-text-muted mt-1 italic">Nota: {app.notes}</p>}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-sm border ${app.status === 'Confirmado' ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200'}`}>
                          {app.status}
                        </span>
                        {app.status === 'Confirmado' && (
                          <button onClick={() => handleCancel(app.id)} disabled={cancellingId === app.id}
                            className="p-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-sm transition-colors cursor-pointer disabled:opacity-50"
                            title="Cancelar sesión"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-10 pt-8 border-t border-secondary/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-xl font-light text-secondary flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Mis Datos Personales
              </h3>
              {!editing && (
                <button onClick={() => setEditing(true)}
                  className="text-[10px] uppercase tracking-widest font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  Editar
                </button>
              )}
            </div>

            {editing ? (
              <div className="bg-bg-base/30 border border-secondary/10 rounded-sm p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5">Nombre</label>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-secondary/20 rounded-sm focus:border-primary focus:outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5">Teléfono</label>
                  <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-secondary/20 rounded-sm focus:border-primary focus:outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5">Email</label>
                  <input type="email" value={user.email} disabled
                    className="w-full px-3.5 py-2.5 text-sm border border-secondary/10 rounded-sm bg-gray-50 text-text-muted cursor-not-allowed"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={handleSaveProfile} disabled={saving}
                    className="bg-primary hover:bg-primary-dark text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-sm border border-primary transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                  <button onClick={() => { setEditing(false); setEditName(user.name); setEditPhone(user.phone || ''); }}
                    className="text-xs font-bold text-text-muted hover:text-secondary uppercase tracking-widest px-4 py-2.5 cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-bg-base/30 border border-secondary/10 rounded-sm p-6">
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-[9px] uppercase tracking-widest font-bold text-text-muted block">Nombre</span>
                    <span className="text-secondary font-medium">{user.name}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-widest font-bold text-text-muted block">Email</span>
                    <span className="text-secondary">{user.email}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-widest font-bold text-text-muted block">Teléfono</span>
                    <span className="text-secondary">{user.phone || '—'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
