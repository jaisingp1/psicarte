import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Calendar as CalendarIcon, DollarSign, Clock, Search, FileText, Plus, 
  Trash2, Filter, Sparkles, Sliders, CheckCircle2, RefreshCw, X, ShieldAlert 
} from 'lucide-react';
import { Professional, Service, Appointment } from '../types';
import { PROFESSIONALS, SERVICES, CLIENT_MOCKS } from '../data';

interface TherapistDashboardProps {
  appointments: Appointment[];
  onCancelAppointment: (id: string) => void;
  onAddAppointment: (appointment: Appointment) => void;
}

interface ClinicalNote {
  clientId: string;
  clientName: string;
  notes: string;
  date: string;
  therapistId: string;
}

export const TherapistDashboard: React.FC<TherapistDashboardProps> = ({
  appointments,
  onCancelAppointment,
  onAddAppointment,
}) => {
  const [selectedTherapistId, setSelectedTherapistId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'appointments' | 'clients' | 'analytics'>('appointments');
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  
  // Clinical Notes (stored in localStorage)
  const [clinicalNotes, setClinicalNotes] = useState<ClinicalNote[]>([]);
  const [newNoteText, setNewNoteText] = useState<string>('');

  // Load clinical notes on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem('psicarte_clinical_notes');
    if (savedNotes) {
      try {
        setClinicalNotes(JSON.parse(savedNotes));
      } catch (e) {
        console.error("Error loading clinical notes:", e);
      }
    }
  }, []);

  // Save clinical notes
  const handleAddClinicalNote = (clientId: string, clientName: string) => {
    if (!newNoteText.trim()) return;

    const newNote: ClinicalNote = {
      clientId,
      clientName,
      notes: newNoteText,
      date: new Date().toLocaleDateString('es-CL'),
      therapistId: selectedTherapistId === 'all' ? 'valentina' : selectedTherapistId,
    };

    const updatedNotes = [newNote, ...clinicalNotes];
    setClinicalNotes(updatedNotes);
    localStorage.setItem('psicarte_clinical_notes', JSON.stringify(updatedNotes));
    setNewNoteText('');
  };

  // Delete clinical note
  const handleDeleteClinicalNote = (indexToDelete: number) => {
    const updatedNotes = clinicalNotes.filter((_, idx) => idx !== indexToDelete);
    setClinicalNotes(updatedNotes);
    localStorage.setItem('psicarte_clinical_notes', JSON.stringify(updatedNotes));
  };

  // Filtered Appointments
  const filteredAppointments = appointments.filter((app) => {
    const matchesTherapist = selectedTherapistId === 'all' || app.professionalId === selectedTherapistId;
    const matchesSearch = 
      app.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.date.includes(searchTerm);
    return matchesTherapist && matchesSearch;
  });

  // Calculate stats based on current therapist filter
  const activeApps = appointments.filter(app => app.status === 'Confirmado' && (selectedTherapistId === 'all' || app.professionalId === selectedTherapistId));
  const totalRevenue = activeApps.reduce((acc, app) => acc + app.servicePrice, 0);
  const totalMinutes = activeApps.reduce((acc, app) => {
    const service = SERVICES.find(s => s.id === app.serviceId);
    return acc + (service?.duration || 50);
  }, 0);

  // Get distinct client list from both appointments and CLIENT_MOCKS
  const getCombinedClients = () => {
    const clientsMap = new Map<string, string>();
    
    CLIENT_MOCKS.forEach(c => clientsMap.set(c.name, `${c.name.toLowerCase().replace(/\s+/g, '.')}@gmail.com`));
    
    appointments.forEach(app => {
      clientsMap.set(app.clientName, app.clientEmail);
    });

    const list = Array.from(clientsMap.entries()).map(([name, email]) => ({
      name,
      email,
      phone: appointments.find(a => a.clientName === name)?.clientPhone || '+569 XXXXXXXX'
    }));

    if (searchTerm) {
      return list.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return list;
  };

  const formattedPrice = (price: number) => {
    if (price === 0) return 'Gratuito';
    return `$${price.toLocaleString('es-CL')}`;
  };

  return (
    <div className="bg-white border border-secondary/10 rounded-sm hover:shadow-lg transition-all duration-300 overflow-hidden my-12">
      {/* Header */}
      <div className="bg-secondary p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-gold/15">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gold/20 rounded-sm text-gold border border-gold/30 shrink-0">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-2xl font-light tracking-tight text-white">Panel Administrativo PsicArte</h3>
            <p className="text-[10px] uppercase tracking-widest text-gold-light font-bold mt-1.5">Control de Agenda, Fichas de Pacientes y Estadísticas Clínicas</p>
          </div>
        </div>

        {/* Professional Quick Switch */}
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-2 rounded-sm w-full md:w-auto">
          <span className="text-[10px] uppercase tracking-widest font-bold px-2 text-gold-light hidden md:inline">Vista de:</span>
          <select
            value={selectedTherapistId}
            onChange={(e) => setSelectedTherapistId(e.target.value)}
            className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer pr-4 border-none"
          >
            <option value="all" className="bg-secondary text-white">Todos los especialistas</option>
            <option value="ivan" className="bg-secondary text-white">Iván Pastén Fuentes</option>
            <option value="valentina" className="bg-secondary text-white">Valentina Maldonado</option>
            <option value="macarena" className="bg-secondary text-white">Macarena Méndez</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-secondary/10 bg-[#FAF8F5]">
        <button
          onClick={() => { setActiveTab('appointments'); setSelectedClient(null); }}
          className={`px-6 py-4 text-[10px] uppercase tracking-widest font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'appointments'
              ? 'border-primary text-primary bg-white font-extrabold'
              : 'border-transparent text-text-muted hover:text-secondary'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          Agenda y Sesiones ({activeApps.length})
        </button>
        <button
          onClick={() => { setActiveTab('clients'); }}
          className={`px-6 py-4 text-[10px] uppercase tracking-widest font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'clients'
              ? 'border-primary text-primary bg-white font-extrabold'
              : 'border-transparent text-text-muted hover:text-secondary'
          }`}
        >
          <Users className="w-4 h-4" />
          Fichas de Pacientes ({getCombinedClients().length})
        </button>
        <button
          onClick={() => { setActiveTab('analytics'); setSelectedClient(null); }}
          className={`px-6 py-4 text-[10px] uppercase tracking-widest font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'analytics'
              ? 'border-primary text-primary bg-white font-extrabold'
              : 'border-transparent text-text-muted hover:text-secondary'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Rendimiento y Reportes
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-b border-secondary/10 bg-[#FAF8F5]/40">
        <div className="p-6 border-r border-secondary/5 text-center md:text-left">
          <span className="text-[9px] uppercase tracking-widest font-bold text-text-muted block mb-1">Sesiones Activas</span>
          <span className="text-2xl font-serif font-light text-secondary">{activeApps.length}</span>
        </div>
        <div className="p-6 border-r border-secondary/5 text-center md:text-left">
          <span className="text-[9px] uppercase tracking-widest font-bold text-text-muted block mb-1">Ingresos Estimados</span>
          <span className="text-2xl font-serif font-light text-primary">{formattedPrice(totalRevenue)}</span>
        </div>
        <div className="p-6 border-r border-secondary/5 text-center md:text-left">
          <span className="text-[9px] uppercase tracking-widest font-bold text-text-muted block mb-1">Tiempo Agendado</span>
          <span className="text-2xl font-serif font-light text-secondary">{totalMinutes} min</span>
        </div>
        <div className="p-6 text-center md:text-left">
          <span className="text-[9px] uppercase tracking-widest font-bold text-text-muted block mb-1">Pacientes Registrados</span>
          <span className="text-2xl font-serif font-light text-gold-dark">{getCombinedClients().length}</span>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="p-8">
        {/* Search Bar */}
        {activeTab !== 'analytics' && (
          <div className="relative mb-6">
            <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={activeTab === 'appointments' ? "Buscar por nombre de paciente, servicio o fecha..." : "Buscar paciente por nombre..."}
              className="w-full pl-10 pr-4 py-3 text-sm border border-secondary/20 rounded-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-[#FAF8F5]/30"
            />
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* TAB 1: Appointments List */}
          {activeTab === 'appointments' && (
            <motion.div
              key="appointments"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-secondary/10 text-[9px] uppercase tracking-widest font-bold text-text-muted bg-[#FAF8F5]">
                      <th className="py-3.5 px-4">Paciente</th>
                      <th className="py-3.5 px-4">Servicio / Prestación</th>
                      <th className="py-3.5 px-4">Especialista</th>
                      <th className="py-3.5 px-4">Fecha y Hora</th>
                      <th className="py-3.5 px-4">Valor</th>
                      <th className="py-3.5 px-4 text-center">Estado</th>
                      <th className="py-3.5 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAppointments.map((app) => (
                      <tr 
                        key={app.id} 
                        className={`border-b border-secondary/5 text-sm hover:bg-[#FAF8F5]/50 transition-colors ${app.status === 'Cancelado' ? 'opacity-60 bg-gray-50/50' : ''}`}
                      >
                        <td className="py-4 px-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-secondary">{app.clientName}</span>
                            <span className="text-[10px] text-text-muted font-normal mt-0.5">{app.clientEmail}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-secondary-light">{app.serviceName}</span>
                            <span className="text-[9px] uppercase tracking-wider text-text-muted mt-0.5">ID: {app.id}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-[9px] font-bold uppercase tracking-widest bg-secondary/5 text-secondary border border-secondary/10 px-2.5 py-1 rounded-sm">
                            {app.professionalName.split(' ')[0]}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-mono text-xs">
                          <div className="flex flex-col">
                            <span className="font-bold text-secondary">{app.date}</span>
                            <span className="text-[9px] uppercase tracking-widest font-bold text-gold-dark mt-0.5">{app.timeBlock} hrs</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-bold text-primary">
                          {formattedPrice(app.servicePrice)}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`text-[8px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-sm border ${
                            app.status === 'Confirmado'
                              ? 'border-green-200 text-green-700 bg-green-50'
                              : 'border-red-200 text-red-700 bg-red-50 line-through'
                          }`}>
                            {app.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          {app.status === 'Confirmado' ? (
                            <button
                              onClick={() => onCancelAppointment(app.id)}
                              title="Anular Sesión"
                              className="p-1.5 rounded-sm border border-red-200 text-red-600 hover:bg-red-50 transition-colors inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                              Anular
                            </button>
                          ) : (
                            <span className="text-xs text-text-muted italic">Anulado</span>
                          )}
                        </td>
                      </tr>
                    ))}

                    {filteredAppointments.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-text-muted text-sm italic">
                          No se encontraron reservas con los filtros aplicados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* TAB 2: Client Files & Clinical Notes */}
          {activeTab === 'clients' && (
            <motion.div
              key="clients"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid md:grid-cols-3 gap-6"
            >
              {/* Clients List Panel */}
              <div className="md:col-span-1 border border-secondary/10 rounded-sm p-4 bg-[#FAF8F5]/30 h-[480px] overflow-y-auto space-y-2">
                <h5 className="font-serif text-xs font-bold text-secondary uppercase tracking-widest border-b border-secondary/10 pb-2.5 mb-4">Fichas de Pacientes</h5>
                {getCombinedClients().map((client) => (
                  <div
                    key={client.name}
                    onClick={() => setSelectedClient(client.name)}
                    className={`p-3 rounded-sm cursor-pointer transition-all border ${
                      selectedClient === client.name
                        ? 'bg-secondary text-white border-secondary shadow-sm'
                        : 'bg-white hover:bg-gold-light/10 border-secondary/5 hover:border-gold'
                    }`}
                  >
                    <h6 className="font-bold text-sm leading-snug">{client.name}</h6>
                    <p className={`text-[10px] mt-1 truncate ${selectedClient === client.name ? 'text-gold-light' : 'text-text-muted'}`}>
                      {client.email}
                    </p>
                  </div>
                ))}
              </div>

              {/* Client Clinical File Panel */}
              <div className="md:col-span-2 border border-secondary/10 rounded-sm p-6 bg-white h-[480px] flex flex-col justify-between">
                {selectedClient ? (
                  <>
                    <div className="overflow-y-auto space-y-5 flex-1 pr-2">
                      <div className="flex justify-between items-start border-b border-secondary/10 pb-4">
                        <div>
                          <h4 className="font-serif text-2xl font-light text-secondary">{selectedClient}</h4>
                          <span className="text-xs text-text-muted block mt-1">
                            Contacto: {getCombinedClients().find(c => c.name === selectedClient)?.phone} • {getCombinedClients().find(c => c.name === selectedClient)?.email}
                          </span>
                        </div>
                        <span className="text-[9px] uppercase tracking-widest font-bold text-gold bg-gold/5 border border-gold/15 px-2 py-1 rounded-sm">Paciente Integrado</span>
                      </div>

                      {/* Appointment History for this patient */}
                      <div className="space-y-3">
                        <h6 className="text-[10px] uppercase font-bold text-text-muted tracking-widest">Historial de Reservas</h6>
                        <div className="grid gap-2">
                          {appointments
                            .filter(app => app.clientName === selectedClient)
                            .map(app => (
                              <div key={app.id} className="text-xs bg-[#FAF8F5] rounded-sm p-3 border border-secondary/5 flex justify-between items-center">
                                <div>
                                  <span className="font-medium text-secondary">{app.serviceName}</span>
                                  <span className="text-text-muted block text-[10px] mt-0.5">{app.date} • {app.timeBlock} hrs con {app.professionalName}</span>
                                </div>
                                <span className={`text-[8px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm border ${
                                  app.status === 'Confirmado' ? 'border-green-200 text-green-700 bg-green-50' : 'border-red-200 text-red-700 bg-red-50'
                                }`}>
                                  {app.status}
                                </span>
                              </div>
                            ))}
                          {appointments.filter(app => app.clientName === selectedClient).length === 0 && (
                            <p className="text-xs text-text-muted italic">No tiene citas previas registradas aún.</p>
                          )}
                        </div>
                      </div>

                      {/* Clinical Logs / Notes */}
                      <div className="space-y-4 pt-2">
                        <h6 className="text-[10px] uppercase font-bold text-text-muted tracking-widest flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-gold shrink-0" />
                          Notas de Evolución y Diagnóstico
                        </h6>
                        <div className="space-y-3">
                          {clinicalNotes
                            .filter(n => n.clientName === selectedClient)
                            .map((note, index) => (
                              <div key={index} className="bg-primary/5 border border-primary/10 rounded-sm p-4 relative group">
                                <button
                                  onClick={() => handleDeleteClinicalNote(index)}
                                  className="absolute top-2.5 right-2.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                  title="Eliminar Nota"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <div className="flex justify-between text-[9px] text-text-muted font-bold tracking-widest border-b border-primary/10 pb-1 mb-2">
                                  <span>REGISTRADO POR: PSICÓLOGA</span>
                                  <span>{note.date}</span>
                                </div>
                                <p className="text-xs text-secondary leading-relaxed font-sans whitespace-pre-wrap">{note.notes}</p>
                              </div>
                            ))}
                          {clinicalNotes.filter(n => n.clientName === selectedClient).length === 0 && (
                            <div className="border border-dashed border-secondary/10 rounded-sm p-6 text-center text-xs text-text-muted bg-[#FAF8F5]/30">
                              No hay notas de evolución clínica ingresadas para este paciente. Añade una nota abajo para llevar un registro seguro.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* New Clinical Log input */}
                    <div className="border-t border-secondary/10 pt-4 bg-white mt-2 space-y-2">
                      <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest">Añadir Nota de Sesión / Bitácora</label>
                      <div className="flex gap-2">
                        <textarea
                          rows={2}
                          value={newNoteText}
                          onChange={(e) => setNewNoteText(e.target.value)}
                          placeholder={`Escribe aquí observaciones, avances o bitácora de terapia...`}
                          className="flex-1 p-3 text-xs border border-secondary/20 rounded-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-sans resize-none bg-[#FAF8F5]/30"
                        />
                        <button
                          onClick={() => handleAddClinicalNote(selectedClient, selectedClient)}
                          className="bg-primary hover:bg-primary-dark border border-primary text-white px-5 rounded-sm flex items-center justify-center font-bold text-xs uppercase tracking-widest cursor-pointer"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Guardar
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#FAF8F5]/20 rounded-sm">
                    <Users className="w-8 h-8 text-gold mb-3" />
                    <h5 className="font-serif text-lg font-medium text-secondary">Fichas Clínicas de Pacientes</h5>
                    <p className="text-xs text-text-muted max-w-sm mt-1 leading-relaxed">
                      Selecciona un paciente del menú lateral izquierdo para ver su información de contacto, historial de consultas registradas y escribir notas de evolución.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 3: Analytics and Reports */}
          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="grid md:grid-cols-3 gap-6">
                {/* Visual statistics card */}
                <div className="md:col-span-2 bg-[#FAF8F5]/30 border border-secondary/10 rounded-sm p-6 space-y-5">
                  <h4 className="font-serif text-base font-medium text-secondary flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-gold shrink-0" />
                    Distribución de Servicios y Especialidad
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-secondary mb-1.5">
                        <span>Psicoterapia y Evaluaciones (Valentina Maldonado)</span>
                        <span>{appointments.filter(a => a.professionalId === 'valentina' && a.status === 'Confirmado').length} sesiones</span>
                      </div>
                      <div className="w-full bg-secondary/10 h-2 rounded-sm overflow-hidden">
                        <div 
                          className="bg-primary h-full rounded-sm transition-all duration-500" 
                          style={{ 
                            width: `${(appointments.filter(a => a.professionalId === 'valentina' && a.status === 'Confirmado').length / (activeApps.length || 1)) * 100}%` 
                          }} 
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold text-secondary mb-1.5">
                        <span>Talleres, Yoga y Capacitación (Iván Pastén)</span>
                        <span>{appointments.filter(a => a.professionalId === 'ivan' && a.status === 'Confirmado').length} sesiones</span>
                      </div>
                      <div className="w-full bg-secondary/10 h-2 rounded-sm overflow-hidden">
                        <div 
                          className="bg-gold h-full rounded-sm transition-all duration-500" 
                          style={{ 
                            width: `${(appointments.filter(a => a.professionalId === 'ivan' && a.status === 'Confirmado').length / (activeApps.length || 1)) * 100}%` 
                          }} 
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold text-secondary mb-1.5">
                        <span>Gestión y Venta Escénica (Macarena Méndez)</span>
                        <span>{appointments.filter(a => a.professionalId === 'macarena' && a.status === 'Confirmado').length} reuniones</span>
                      </div>
                      <div className="w-full bg-secondary/10 h-2 rounded-sm overflow-hidden">
                        <div 
                          className="bg-secondary h-full rounded-sm transition-all duration-500" 
                          style={{ 
                            width: `${(appointments.filter(a => a.professionalId === 'macarena' && a.status === 'Confirmado').length / (activeApps.length || 1)) * 100}%` 
                          }} 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-5 border-t border-secondary/10 flex gap-4 text-xs text-text-muted justify-around text-center">
                    <div>
                      <span className="font-bold text-secondary block text-base">{appointments.filter(a => a.status === 'Confirmado').length}</span>
                      Confirmadas
                    </div>
                    <div>
                      <span className="font-bold text-red-600 block text-base">{appointments.filter(a => a.status === 'Cancelado').length}</span>
                      Anuladas
                    </div>
                    <div>
                      <span className="font-bold text-gold-dark block text-base">{clinicalNotes.length}</span>
                      Notas escritas
                    </div>
                  </div>
                </div>

                {/* Legal compliance / Info card */}
                <div className="bg-primary/5 border border-primary/10 rounded-sm p-6 flex flex-col justify-between">
                  <div>
                    <h5 className="font-serif text-sm font-medium text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-gold shrink-0" />
                      Cumplimiento y Boletas
                    </h5>
                    <p className="text-xs text-text-muted leading-relaxed">
                      Todas las sesiones registradas de psicoterapia y terapia floral tienen derecho a emisión de Boleta de Honorarios Electrónica para su reembolso con Fonasa, Isapre o seguro de salud complementario.
                    </p>
                    <p className="text-xs text-text-muted leading-relaxed mt-3">
                      Para efectos impositivos en el Servicio de Impuestos Internos (SII), el valor bruto ya incluye los porcentajes legales correspondientes.
                    </p>
                  </div>
                  <div className="bg-white border border-secondary/10 p-3 rounded-sm text-center mt-6">
                    <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider block mb-0.5">Reembolso Promedio</span>
                    <span className="font-serif text-lg font-light text-secondary">60% - 80%</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
