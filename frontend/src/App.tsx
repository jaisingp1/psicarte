import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, Calendar, Award, Sparkles, BookOpen, Clock, ShieldCheck, Mail, Phone, 
  MapPin, CheckCircle2, ChevronDown, ChevronUp, UserCheck, Settings, Eye, HelpCircle, 
  ArrowUpRight, Info, AlertCircle, LogIn, User
} from 'lucide-react';
import { PsicarteLogo } from './components/PsicarteLogo';
import { BookingForm } from './components/BookingForm';
import { TherapistDashboard } from './components/TherapistDashboard';
import { LoginPage } from './components/LoginPage';
import { UserDashboard } from './components/UserDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { Appointment, User as UserType, Professional, Service } from './types';

export default function App() {
  const [activeNav, setActiveNav] = useState<string>('inicio');
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>(undefined);
  const [showAdminPortal, setShowAdminPortal] = useState<boolean>(false);
  const [expandedProf, setExpandedProf] = useState<string | null>(null);
  const [showTerms, setShowTerms] = useState<boolean>(false);

  // Auth state
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [page, setPage] = useState<'site' | 'login' | 'dashboard'>('site');

  // Restore session on mount
  useEffect(() => {
    const saved = localStorage.getItem('psicarte_user');
    if (saved) {
      try {
        const user = JSON.parse(saved);
        setCurrentUser(user);
        if (window.location.hash === '#dashboard') setPage('dashboard');
      } catch {}
    }
  }, []);

  const handleLogin = (user: UserType) => {
    setCurrentUser(user);
    localStorage.setItem('psicarte_user', JSON.stringify(user));
    setPage('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setPage('site');
    setShowAdminPortal(false);
    localStorage.removeItem('psicarte_user');
    window.location.hash = '';
  };

  // Contact Form State
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactMsg, setContactMsg] = useState('');
  const [contactSuccess, setContactSuccess] = useState(false);

  // Appointments State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allProfessionals, setAllProfessionals] = useState<Professional[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [siteContent, setSiteContent] = useState<Record<string, string>>({});

  // Load professionals, services, and site content from API
  useEffect(() => {
    fetch('/api/professionals')
      .then(r => r.json())
      .then(setAllProfessionals)
      .catch(console.error);
    fetch('/api/services')
      .then(r => r.json())
      .then(setAllServices)
      .catch(console.error);
    fetch('/api/content')
      .then(r => r.json())
      .then(setSiteContent)
      .catch(console.error);
  }, []);

  // Load appointments from API
  const loadAppointments = () => {
    fetch('/api/appointments')
      .then(r => r.json())
      .then((rows: any[]) => {
        const mapped: Appointment[] = rows.map((r: any) => ({
          id: r.id,
          clientName: r.client_name,
          clientEmail: r.client_email,
          clientPhone: r.client_phone,
          professionalId: r.professional_id,
          professionalName: r.professional_name,
          serviceId: r.service_id,
          serviceName: r.service_name,
          servicePrice: r.service_price,
          room_id: r.room_id,
          date: r.date,
          start_time: r.start_time,
          end_time: r.end_time,
          timeBlock: r.time_block,
          notes: r.notes,
          status: r.status,
          createdAt: r.created_at,
        }));
        setAppointments(mapped);
      })
      .catch(console.error);
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const handleBookingSuccess = (newApp: Appointment) => {
    // POST to API and then reload
    fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: newApp.id,
        clientName: newApp.clientName,
        clientEmail: newApp.clientEmail,
        clientPhone: newApp.clientPhone,
        professionalId: newApp.professionalId,
        professionalName: newApp.professionalName,
        serviceId: newApp.serviceId,
        serviceName: newApp.serviceName,
        servicePrice: newApp.servicePrice,
        date: newApp.date,
        start_time: newApp.start_time,
        end_time: newApp.end_time,
        timeBlock: newApp.timeBlock,
        notes: newApp.notes,
        room_id: newApp.room_id,
      }),
    })
      .then(() => loadAppointments())
      .catch(console.error);
  };

  const handleCancelAppointment = (id: string) => {
    fetch(`/api/appointments/${id}/cancel`, { method: 'PUT' })
      .then(() => loadAppointments())
      .catch(console.error);
  };

  const handlePresetService = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    scrollToSection('agendar-seccion');
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSuccess(true);
    setTimeout(() => {
      setContactSuccess(false);
      setContactName('');
      setContactEmail('');
      setContactPhone('');
      setContactMsg('');
    }, 5000);
  };

  // Show login page
  if (page === 'login') {
    return <LoginPage onLogin={handleLogin} onBack={() => setPage('site')} />;
  }

  // Show dashboard (authenticated)
  if (page === 'dashboard' && currentUser) {
    const role = currentUser.role;

    if (role === 'usuario') {
      return (
        <div className="min-h-screen flex flex-col bg-bg-base text-text-main antialiased">
          <nav className="sticky top-0 z-50 bg-bg-base/95 backdrop-blur-md border-b border-secondary/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-20">
                <PsicarteLogo size="md" />
                <button onClick={handleLogout}
                  className="text-[10px] font-bold uppercase tracking-widest px-3.5 py-2.5 rounded-sm border border-secondary/20 text-secondary hover:bg-secondary/5 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5" />
                  {currentUser.name.split(' ')[0]}
                </button>
              </div>
            </div>
          </nav>
          <main className="flex-grow">
            <UserDashboard
              user={currentUser}
              appointments={appointments}
              onCancelAppointment={handleCancelAppointment}
              onNewBooking={() => { setPage('site'); setTimeout(() => scrollToSection('agendar-seccion'), 100); }}
              onLogout={handleLogout}
            />
          </main>
        </div>
      );
    }

    if (role === 'profesional') {
      return (
        <div className="min-h-screen flex flex-col bg-bg-base text-text-main antialiased">
          <nav className="sticky top-0 z-50 bg-bg-base/95 backdrop-blur-md border-b border-secondary/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-20">
                <PsicarteLogo size="md" />
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/5 px-3 py-2 rounded-sm border border-primary/10">
                    {currentUser.name.split(' ')[0]}
                  </span>
                  <button onClick={handleLogout}
                    className="text-[10px] font-bold uppercase tracking-widest px-3.5 py-2.5 rounded-sm border border-secondary/20 text-secondary hover:bg-secondary/5 transition-all cursor-pointer"
                  >
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            </div>
          </nav>
          <main className="flex-grow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex justify-between items-center mb-6">
                <span className="text-xs text-text-muted font-medium">
                  Panel profesional — {currentUser.name}
                </span>
                <button onClick={() => { setPage('site'); }}
                  className="text-xs font-bold text-primary hover:underline cursor-pointer">
                  Volver al Sitio Corporativo →
                </button>
              </div>
              <TherapistDashboard
                appointments={appointments.filter(a => currentUser.professional_id ? a.professionalId === currentUser.professional_id : true)}
                onCancelAppointment={handleCancelAppointment}
                onAddAppointment={handleBookingSuccess}
                allProfessionals={allProfessionals}
              />
            </div>
          </main>
        </div>
      );
    }

    if (role === 'administrador') {
      return (
        <div className="min-h-screen flex flex-col bg-bg-base text-text-main antialiased">
          <AdminDashboard
            user={currentUser}
            appointments={appointments}
            onCancelAppointment={handleCancelAppointment}
            onLogout={handleLogout}
          />
        </div>
      );
    }
  }

  // Main site (no auth / public)
  return (
    <div className="min-h-screen flex flex-col bg-bg-base text-text-main antialiased selection:bg-primary selection:text-white">
      <nav className="sticky top-0 z-50 bg-bg-base/95 backdrop-blur-md border-b border-secondary/10 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="cursor-pointer" onClick={() => { scrollToSection('inicio-seccion'); }}>
              <PsicarteLogo size="md" />
            </div>

            <div className="hidden md:flex items-center gap-6">
              <button onClick={() => { scrollToSection('inicio-seccion'); setActiveNav('inicio'); }}
                className={`text-xs uppercase tracking-widest font-semibold transition-colors ${activeNav === 'inicio' ? 'text-primary' : 'text-secondary hover:text-primary'}`}>
                Inicio
              </button>
              <button onClick={() => { scrollToSection('nosotros-seccion'); setActiveNav('nosotros'); }}
                className={`text-xs uppercase tracking-widest font-semibold transition-colors ${activeNav === 'nosotros' ? 'text-primary' : 'text-secondary hover:text-primary'}`}>
                Nosotros
              </button>
              <button onClick={() => { scrollToSection('especialistas-seccion'); setActiveNav('especialistas'); }}
                className={`text-xs uppercase tracking-widest font-semibold transition-colors ${activeNav === 'especialistas' ? 'text-primary' : 'text-secondary hover:text-primary'}`}>
                Especialistas
              </button>
              <button onClick={() => { scrollToSection('servicios-seccion'); setActiveNav('servicios'); }}
                className={`text-xs uppercase tracking-widest font-semibold transition-colors ${activeNav === 'servicios' ? 'text-primary' : 'text-secondary hover:text-primary'}`}>
                Servicios
              </button>
              <button onClick={() => { scrollToSection('contacto-seccion'); setActiveNav('contacto'); }}
                className={`text-xs uppercase tracking-widest font-semibold transition-colors ${activeNav === 'contacto' ? 'text-primary' : 'text-secondary hover:text-primary'}`}>
                Contacto
              </button>

              <div className="h-4 w-[1px] bg-secondary/10 mx-2" />

              {currentUser ? (
                <button onClick={() => setPage('dashboard')}
                  className="text-[10px] font-bold uppercase tracking-widest px-3.5 py-2.5 rounded-sm border transition-all flex items-center gap-1.5 bg-primary text-white border-primary"
                >
                  <User className="w-3.5 h-3.5" />
                  {currentUser.name.split(' ')[0]}
                </button>
              ) : (
                <button onClick={() => setPage('login')}
                  className="text-[10px] font-bold uppercase tracking-widest px-3.5 py-2.5 rounded-sm border transition-all flex items-center gap-1.5 bg-transparent text-secondary border-secondary/20 hover:bg-secondary/5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Iniciar Sesión
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => { scrollToSection('agendar-seccion'); }}
                className="hidden sm:inline-flex bg-primary hover:bg-primary-dark text-white text-[11px] font-bold uppercase tracking-widest px-5 py-3 rounded-sm transition-all duration-300 border border-primary hover:scale-[1.01]">
                Agendar Sesión
              </button>
              <button onClick={() => setPage('login')}
                className="md:hidden p-2 rounded-sm text-secondary bg-bg-alt/50 border border-secondary/10"
                title="Iniciar Sesión">
                <LogIn className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow">
        <motion.div key="corporate-site" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* HERO */}
          <section id="inicio-seccion" className="relative py-24 md:py-32 overflow-hidden bg-bg-base border-b border-secondary/10">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-secondary/10" />
            <div className="absolute left-1/4 top-0 bottom-0 w-[1px] bg-secondary/[0.03] hidden md:block" />
            <div className="absolute right-1/4 top-0 bottom-0 w-[1px] bg-secondary/[0.03] hidden md:block" />
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-8">
              <div className="inline-flex items-center gap-2 bg-primary/5 px-4 py-1.5 border border-primary/10 rounded-sm">
                <Sparkles className="w-3.5 h-3.5 text-gold-dark animate-pulse" />
                <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-primary">{siteContent.hero_subtitulo || 'Salud Mental, Bienestar & Creatividad'}</span>
              </div>
              <h1 className="font-serif text-5xl sm:text-7xl font-light tracking-tight text-secondary leading-[1.1] max-w-4xl mx-auto">
                {siteContent.hero_titulo ? (
                  <>{siteContent.hero_titulo.split('bienestar')[0]}<span className="italic text-primary font-serif">bienestar</span>{siteContent.hero_titulo.split('bienestar')[1]?.split('expresión')[0]}<span className="italic text-gold font-serif">expresión</span>{siteContent.hero_titulo.split('expresión')[1] || ''}</>
                ) : (
                  <>El escenario donde tu <span className="italic text-primary font-serif">bienestar</span> y <span className="italic text-gold font-serif">expresión</span> se encuentran</>
                )}
              </h1>
              <p className="max-w-2xl mx-auto text-sm sm:text-base text-text-muted leading-relaxed font-sans font-light">
                {siteContent.hero_descripcion || 'En PsicArte integramos psicoterapia profesional, yoga corporal, talleres creativos y teatro terapéutico para abrir caminos integrales de sanación, autoconocimiento y crecimiento humano.'}
              </p>
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button onClick={() => scrollToSection('agendar-seccion')}
                  className="w-full sm:w-auto bg-primary hover:bg-primary-dark text-white font-bold text-xs uppercase tracking-widest px-8 py-4 rounded-sm border border-primary transition-all duration-300 shadow-none hover:scale-[1.01]">
                  Agendar Sesión Online
                </button>
                <button onClick={() => scrollToSection('servicios-seccion')}
                  className="w-full sm:w-auto bg-transparent hover:bg-secondary/5 text-secondary font-bold text-xs uppercase tracking-widest px-8 py-4 rounded-sm border border-secondary/20 transition-all duration-300 hover:scale-[1.01]">
                  Explorar Servicios
                </button>
              </div>
            </div>
          </section>

          {/* PRESENTATION, MISSION, VISION */}
          <section id="nosotros-seccion" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center space-y-4 mb-20">
              <span className="text-[10px] uppercase tracking-[0.25em] text-gold-dark font-bold block">Nuestra Esencia y Propósito de Servicio</span>
              <h2 className="font-serif text-4xl sm:text-5xl font-light tracking-tight text-secondary">¿Quiénes Somos?</h2>
              <div className="w-16 h-[1px] bg-gold mx-auto" />
            </div>
            <div className="grid lg:grid-cols-12 gap-12 items-start">
              <div className="lg:col-span-7 bg-white p-8 md:p-10 border border-secondary/10 rounded-sm hover:shadow-md transition-all duration-300 space-y-6">
                <h3 className="font-serif text-2xl font-light text-primary flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" />
                  Centro Integral PsicArte
                </h3>
                <div className="space-y-4">
                  {(siteContent.presentacion || '').split('\n\n').map((para: string, i: number) => (
                    <p key={i} className="text-text-muted text-sm leading-relaxed text-justify">{para}</p>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white border border-secondary/10 border-l-4 border-l-gold rounded-sm p-6 hover:shadow-md hover:translate-y-[-2px] transition-all duration-300">
                  <h4 className="font-serif text-xl font-medium text-secondary flex items-center gap-2 mb-3">
                    <Award className="w-4 h-4 text-gold" />
                    Nuestra Misión
                  </h4>
                  <p className="text-text-muted text-xs leading-relaxed text-justify font-sans">{siteContent.mision || ''}</p>
                </div>
                <div className="bg-white border border-secondary/10 border-l-4 border-l-primary rounded-sm p-6 hover:shadow-md hover:translate-y-[-2px] transition-all duration-300">
                  <h4 className="font-serif text-xl font-medium text-primary flex items-center gap-2 mb-3">
                    <BookOpen className="w-4 h-4 text-primary" />
                    Nuestra Visión
                  </h4>
                  <p className="text-text-muted text-xs leading-relaxed text-justify font-sans">{siteContent.vision || ''}</p>
                </div>
              </div>
            </div>
          </section>

          {/* PROFESSIONALS */}
          <section id="especialistas-seccion" className="py-24 bg-bg-alt/20 border-y border-secondary/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center space-y-4 mb-20">
                <span className="text-[10px] uppercase tracking-[0.25em] text-gold-dark font-bold block">Especialistas con alta formación ética y profesional</span>
                <h2 className="font-serif text-4xl sm:text-5xl font-light tracking-tight text-secondary">Nuestros Profesionales</h2>
                <div className="w-16 h-[1px] bg-gold mx-auto" />
              </div>
              <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                {allProfessionals.map((prof) => {
                  const isExpanded = expandedProf === prof.id;
                  return (
                    <div key={prof.id} className="bg-white border border-secondary/10 rounded-sm overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-md hover:border-secondary/20">
                      <div className="p-6 md:p-8 space-y-6">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-full bg-secondary text-white font-serif text-xl font-light flex items-center justify-center border border-gold shrink-0">
                            {prof.name.split(' ')[0][0]}{prof.name.split(' ').filter(n => n.length > 2)[1]?.[0] || ''}
                          </div>
                          <div>
                            <h3 className="font-serif text-2xl font-light text-secondary leading-tight">{prof.name}</h3>
                            <p className="text-[10px] uppercase tracking-[0.15em] font-semibold text-gold-dark mt-1">{prof.title}</p>
                            <span className="inline-block text-[9px] uppercase tracking-wider font-semibold bg-primary/5 text-primary border border-primary/10 px-2.5 py-0.5 rounded-sm mt-2">{prof.experience}</span>
                          </div>
                        </div>
                        <p className="text-text-muted text-xs leading-relaxed text-justify">{prof.bio}</p>
                        <div className="space-y-4 pt-4 border-t border-secondary/10">
                          <div>
                            <h5 className="text-[10px] uppercase tracking-wider font-bold text-secondary mb-2 flex items-center gap-1.5">
                              <Award className="w-3.5 h-3.5 text-gold" />
                              Títulos & Formación
                            </h5>
                            <ul className="space-y-1 text-xs text-text-muted">
                              {prof.diplomas.slice(0, isExpanded ? undefined : 2).map((dip, idx) => (
                                <li key={idx} className="flex items-start gap-1.5">
                                  <span className="text-gold shrink-0 mt-0.5">•</span>
                                  <span>{dip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          {isExpanded && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                              <div>
                                <h5 className="text-[10px] uppercase tracking-wider font-bold text-secondary mb-2 flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                                  Especialidades & Áreas
                                </h5>
                                <ul className="grid grid-cols-1 gap-1.5 text-xs text-text-muted">
                                  {prof.specialties.map((spec, idx) => (
                                    <li key={idx} className="flex items-start gap-1.5">
                                      <span className="text-primary shrink-0 mt-0.5">✓</span>
                                      <span>{spec}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </div>
                      <div className="p-6 bg-bg-base/40 border-t border-secondary/10 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                        <button onClick={() => setExpandedProf(isExpanded ? null : prof.id)}
                          className="text-[10px] uppercase tracking-wider font-bold text-secondary hover:text-primary flex items-center justify-center sm:justify-start gap-1 cursor-pointer">
                          {isExpanded ? <>Ver menos <ChevronUp className="w-3.5 h-3.5" /></> : <>Ver curriculum <ChevronDown className="w-3.5 h-3.5" /></>}
                        </button>
                        <button onClick={() => { const firstService = allServices.find(s => s.professionalId === prof.id || s.professional_id === prof.id); if (firstService) handlePresetService(firstService.id); else scrollToSection('agendar-seccion'); }}
                          className="bg-primary hover:bg-primary-dark text-white text-[11px] font-bold uppercase tracking-widest px-4 py-2.5 rounded-sm border border-primary transition-all duration-300 hover:scale-[1.01]">
                          Agendar Sesión
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* SERVICES */}
          <section id="servicios-seccion" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center space-y-4 mb-20">
              <span className="text-[10px] uppercase tracking-[0.25em] text-gold-dark font-bold block">{siteContent.servicios_subtitulo || 'Boletas para Reembolso Médico Fonasa, Isapres y Seguros'}</span>
              <h2 className="font-serif text-4xl sm:text-5xl font-light tracking-tight text-secondary">Nuestros Servicios</h2>
              <div className="w-16 h-[1px] bg-gold mx-auto" />
            </div>
            <div className="bg-bg-alt/10 border border-secondary/10 rounded-sm p-6 mb-16 flex flex-col md:flex-row items-center justify-between gap-6 max-w-4xl mx-auto">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/5 text-primary rounded-sm border border-primary/10">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif text-lg font-light text-secondary">Asegura tu Reembolso Médico</h4>
                  <p className="text-xs text-text-muted mt-0.5">Emitimos Boletas de Honorarios Electrónicas de forma inmediata para pacientes de Fonasa, Isapres y seguros complementarios.</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-primary bg-primary/5 border border-primary/15 px-4 py-2.5 rounded-sm uppercase tracking-widest whitespace-nowrap">Aplica a todas las consultas</span>
            </div>
            <div className="space-y-20">
              <div>
                <h3 className="font-serif text-2xl sm:text-3xl font-light text-secondary pb-4 border-b border-secondary/10 mb-8 flex items-center gap-3">
                  <Heart className="w-5 h-5 text-primary shrink-0" />
                  Psicoterapia, Evaluaciones & Pareja
                </h3>
                <div className="grid md:grid-cols-3 gap-6">
                  {allServices.filter(s => s.category === 'psicoterapia' || s.category === 'evaluacion').map((service) => (
                    <div key={service.id} className="bg-white border border-secondary/10 hover:border-gold/50 rounded-sm p-6 hover:shadow-md hover:translate-y-[-2px] transition-all duration-300 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-4 border-b border-secondary/10 pb-4 mb-4">
                          <div>
                            <h4 className="font-serif text-base font-medium text-secondary line-clamp-2 leading-snug">{service.name}</h4>
                            <span className="text-[10px] uppercase tracking-wider text-text-muted mt-1.5 block">Especialista: {(service.professionalName || service.professional_name || '').split(' ')[0]}</span>
                          </div>
                          <span className="text-xs font-bold text-primary bg-primary/5 border border-primary/10 px-2.5 py-1 rounded-sm whitespace-nowrap">{service.price === 0 ? 'Gratis' : `$${service.price.toLocaleString('es-CL')}`}</span>
                        </div>
                        <p className="text-xs text-text-muted leading-relaxed mb-6 min-h-[48px]">{service.description}</p>
                      </div>
                      <div className="flex items-center justify-between border-t border-secondary/10 pt-4">
                        <span className="text-[9px] uppercase tracking-wider font-semibold text-text-muted flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gold" />
                          {service.duration} min
                        </span>
                        <button onClick={() => handlePresetService(service.id)}
                          className="text-xs font-bold text-primary hover:text-primary-dark uppercase tracking-wider flex items-center gap-1 group transition-colors cursor-pointer">
                          Reservar Hora
                          <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-serif text-2xl sm:text-3xl font-light text-secondary pb-4 border-b border-secondary/10 mb-8 flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-gold shrink-0" />
                  Yoga, Clases & Bienestar Corporal
                </h3>
                <div className="grid md:grid-cols-3 gap-6">
                  {allServices.filter(s => s.category === 'yoga').map((service) => (
                    <div key={service.id} className="bg-white border border-secondary/10 hover:border-gold/50 rounded-sm p-6 hover:shadow-md hover:translate-y-[-2px] transition-all duration-300 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-4 border-b border-secondary/10 pb-4 mb-4">
                          <div>
                            <h4 className="font-serif text-base font-medium text-secondary line-clamp-2 leading-snug">{service.name}</h4>
                            <span className="text-[10px] uppercase tracking-wider text-text-muted mt-1.5 block">Especialista: {(service.professionalName || service.professional_name || '').split(' ')[0]}</span>
                          </div>
                          <span className="text-xs font-bold text-primary bg-primary/5 border border-primary/10 px-2.5 py-1 rounded-sm whitespace-nowrap">{service.price === 0 ? 'Gratis' : `$${service.price.toLocaleString('es-CL')}`}</span>
                        </div>
                        <p className="text-xs text-text-muted leading-relaxed mb-6 min-h-[48px]">{service.description}</p>
                      </div>
                      <div className="flex items-center justify-between border-t border-secondary/10 pt-4">
                        <span className="text-[9px] uppercase tracking-wider font-semibold text-text-muted flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gold" />
                          {service.duration} min
                        </span>
                        <button onClick={() => handlePresetService(service.id)}
                          className="text-xs font-bold text-primary hover:text-primary-dark uppercase tracking-wider flex items-center gap-1 group transition-colors cursor-pointer">
                          Reservar Hora
                          <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-serif text-2xl sm:text-3xl font-light text-secondary pb-4 border-b border-secondary/10 mb-8 flex items-center gap-3">
                  <Award className="w-5 h-5 text-secondary shrink-0" />
                  Talleres de Teatro, Capacitaciones & Coaching
                </h3>
                <div className="grid md:grid-cols-3 gap-6">
                  {allServices.filter(s => s.category === 'coaching' || s.category === 'taller' || s.category === 'capacitacion' || s.category === 'evento').map((service) => (
                    <div key={service.id} className="bg-white border border-secondary/10 hover:border-gold/50 rounded-sm p-6 hover:shadow-md hover:translate-y-[-2px] transition-all duration-300 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-4 border-b border-secondary/10 pb-4 mb-4">
                          <div>
                            <h4 className="font-serif text-base font-medium text-secondary line-clamp-2 leading-snug">{service.name}</h4>
                            <span className="text-[10px] uppercase tracking-wider text-text-muted mt-1.5 block">Encargado: {(service.professionalName || service.professional_name || '').split(' ')[0]}</span>
                          </div>
                          <span className="text-xs font-bold text-primary bg-primary/5 border border-primary/10 px-2.5 py-1 rounded-sm whitespace-nowrap">{service.price === 0 ? 'Gratis' : `$${service.price.toLocaleString('es-CL')}`}</span>
                        </div>
                        <p className="text-xs text-text-muted leading-relaxed mb-6 min-h-[48px]">{service.description}</p>
                      </div>
                      <div className="flex items-center justify-between border-t border-secondary/10 pt-4">
                        <span className="text-[9px] uppercase tracking-wider font-semibold text-text-muted flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gold" />
                          {service.duration} min
                        </span>
                        <button onClick={() => handlePresetService(service.id)}
                          className="text-xs font-bold text-primary hover:text-primary-dark uppercase tracking-wider flex items-center gap-1 group transition-colors cursor-pointer">
                          Reservar Hora
                          <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* BOOKING */}
          <section className="py-24 bg-bg-alt/10 border-t border-secondary/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <BookingForm
                onBookingSuccess={handleBookingSuccess}
                presetServiceId={selectedServiceId}
                onClearPresetService={() => setSelectedServiceId(undefined)}
                existingAppointments={appointments}
                allProfessionals={allProfessionals}
                allServices={allServices}
              />
            </div>
          </section>

          {/* TERMS */}
          <section className="py-16 max-w-4xl mx-auto px-4 sm:px-6">
            <div className="bg-white border border-secondary/10 rounded-sm p-6 hover:shadow-sm transition-all duration-300">
              <button onClick={() => setShowTerms(!showTerms)}
                className="w-full flex justify-between items-center text-left text-xs font-bold text-secondary uppercase tracking-widest cursor-pointer">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-gold" />
                  Términos y Condiciones del Servicio
                </span>
                {showTerms ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>
              <AnimatePresence>
                {showTerms && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 pt-4 border-t border-secondary/10 space-y-3.5 text-xs text-text-muted leading-relaxed">
                    <p>Al agendar una atención, taller, clase o actividad en nuestro centro integral, la persona declara conocer y aceptar los presentes términos y condiciones. Nuestros servicios pueden realizarse en modalida online o presencial, según la prestación contratada, e incluyen acompañamiento psicológico, terapéutico, psicoeducativo, capacitaciones, talleres grupales, talleres de teatro, clases de yoga, actividades de bienestar integral y otros espacios de arte escénico, formativos o de autocuidado.</p>
                    <p>Las sesiones, talleres, capacitaciones, clases o actividades deben ser agendadas o inscritas con anticipación y se consideran confirmadas una vez realizado el pago correspondiente o según el mecanismo de reserva informado por el centro. En el caso de atenciones online, la persona debe contar con conexión estable a internet, un dispositivo adecuado y un espacio privado. En actividades presenciales, deberá asistir al lugar, día y horario informado, respetando las normas de convivencia, cuidado del espacio y respeto hacia profesionales, facilitadores y participantes.</p>
                    <p>Respecto a pagos, anulaciones y reagendamientos, las sesiones, talleres, capacitaciones, clases o actividades pagadas no contemplan devolución de dinero ni reembolso, salvo en aquellos casos en que la normativa vigente lo exija. En caso de que la persona no pueda asistir a una sesión individual, esta podrá ser reagendada una sola vez, quedando sujeta a la disponibilidad horaria del profesional.</p>
                    <p>La participación en clases de yoga, talleres corporales, actividades de movimiento, relajación o bienestar físico requiere que la persona informe previamente cualquier condición médica, lesión, embarazo o antecedente relevante que pueda incidir en su participación segura. Toda información entregada durante procesos individuales será tratada con confidencialidad y reserva profesional, conforme a los principios éticos de la atención en salud mental y a la normativa aplicable.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* CONTACT */}
          <section id="contacto-seccion" className="py-24 bg-white border-t border-secondary/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center space-y-4 mb-20">
                <span className="text-[10px] uppercase tracking-[0.25em] text-gold-dark font-bold block">Estamos aquí para escucharte y coordinar capacitaciones</span>
                <h2 className="font-serif text-4xl sm:text-5xl font-light tracking-tight text-secondary">Contacto</h2>
                <div className="w-16 h-[1px] bg-gold mx-auto" />
              </div>
              <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
                <div className="space-y-8 flex flex-col justify-between">
                  <div className="space-y-6">
                    <h4 className="font-serif text-2xl font-light text-secondary leading-tight">¿Tienes dudas o buscas coordinar capacitaciones corporativas?</h4>
                    <p className="text-text-muted text-sm leading-relaxed">Si eres un establecimiento educacional, empresa o particular buscando contratar capacitaciones grupales, talleres de teatro o sesiones de yoga corporativas, escríbenos directamente. Responderemos a la brevedad.</p>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-bg-alt/50 text-secondary rounded-sm border border-secondary/10"><Mail className="w-4 h-4 text-primary" /></div>
                      <div>
                        <span className="text-[9px] uppercase tracking-widest font-bold text-text-muted block">Envíanos un Correo</span>
                        <a href={`mailto:${siteContent.contacto_email || 'contacto@psicarte.cl'}`} className="text-sm font-semibold text-secondary hover:text-primary transition-colors">{siteContent.contacto_email || 'contacto@psicarte.cl'}</a>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-bg-alt/50 text-secondary rounded-sm border border-secondary/10"><Phone className="w-4 h-4 text-primary" /></div>
                      <div>
                        <span className="text-[9px] uppercase tracking-widest font-bold text-text-muted block">Llámanos o escríbenos</span>
                        <a href={`tel:${siteContent.contacto_telefono || '+56961676706'}`} className="text-sm font-semibold text-secondary hover:text-primary transition-colors">{siteContent.contacto_telefono_display || '+56 9 6167 6706'}</a>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-bg-alt/50 text-secondary rounded-sm border border-secondary/10"><MapPin className="w-4 h-4 text-primary" /></div>
                      <div>
                        <span className="text-[9px] uppercase tracking-widest font-bold text-text-muted block">Ubicación</span>
                        <span className="text-sm font-semibold text-secondary">{siteContent.contacto_ubicacion || 'Chile • Consultas Online & Talleres Presenciales'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-gold/5 border border-gold/15 rounded-sm text-xs text-text-muted flex gap-3 items-start">
                    <AlertCircle className="w-5 h-5 text-gold shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-secondary">Importante:</span> Nuestros servicios no reemplazan la urgencia psiquiátrica o médica. En caso de emergencias graves de salud mental, por favor acude de inmediato a tu centro asistencial más cercano.
                    </div>
                  </div>
                </div>
                <div className="bg-white p-8 border border-secondary/10 rounded-sm hover:shadow-md transition-all duration-300">
                  <form onSubmit={handleContactSubmit} className="space-y-5">
                    <h4 className="font-serif text-lg font-medium text-secondary pb-3 border-b border-secondary/10 mb-4">Envíanos un mensaje</h4>
                    <div>
                      <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5">Nombre Completo</label>
                      <input type="text" required value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Ej. Renata Jeldes"
                        className="w-full px-3.5 py-2.5 text-sm border border-secondary/20 rounded-sm focus:border-primary focus:outline-none bg-[#FAF8F5]/30 focus:ring-1 focus:ring-primary" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5">Correo Electrónico</label>
                      <input type="email" required value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="correo@ejemplo.com"
                        className="w-full px-3.5 py-2.5 text-sm border border-secondary/20 rounded-sm focus:border-primary focus:outline-none bg-[#FAF8F5]/30 focus:ring-1 focus:ring-primary" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5">Teléfono</label>
                      <input type="tel" required value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+56912345678"
                        className="w-full px-3.5 py-2.5 text-sm border border-secondary/20 rounded-sm focus:border-primary focus:outline-none bg-[#FAF8F5]/30 focus:ring-1 focus:ring-primary" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5">Mensaje / Consulta</label>
                      <textarea required rows={3} value={contactMsg} onChange={(e) => setContactMsg(e.target.value)} placeholder="Escribe tu mensaje o detalla los servicios corporativos que requieres..."
                        className="w-full px-3.5 py-2.5 text-sm border border-secondary/20 rounded-sm focus:border-primary focus:outline-none bg-[#FAF8F5]/30 focus:ring-1 focus:ring-primary" />
                    </div>
                    <button type="submit"
                      className="w-full py-4 bg-primary hover:bg-primary-dark text-white font-bold text-xs uppercase tracking-widest rounded-sm transition-colors border border-primary cursor-pointer shadow-none">
                      Enviar Mensaje
                    </button>
                    <AnimatePresence>
                      {contactSuccess && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="bg-green-100 border border-green-200 text-green-800 p-3.5 rounded-sm text-xs font-semibold flex items-center gap-2 mt-2">
                          <CheckCircle2 className="w-5 h-5 shrink-0" />
                          ¡Mensaje enviado exitosamente! Te responderemos a la brevedad.
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </form>
                </div>
              </div>
            </div>
          </section>
        </motion.div>
      </main>

      <footer className="bg-secondary text-white border-t border-gold/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="space-y-4 md:col-span-2">
              <PsicarteLogo showText={true} textColor="light" size="md" />
              <p className="text-xs text-white/60 max-w-sm mt-3 leading-relaxed">
                {siteContent.footer_descripcion || 'Centro integral orientado al bienestar emocional, desarrollo personal, yoga, teatro y artes escénicas. Un espacio seguro de crecimiento y expresión creativa.'}
              </p>
            </div>
            <div>
              <h5 className="font-serif text-xs font-bold text-gold uppercase tracking-widest mb-6">Navegación</h5>
              <ul className="space-y-3 text-xs">
                <li><button onClick={() => { scrollToSection('inicio-seccion'); }} className="text-white/70 hover:text-gold transition-colors cursor-pointer">Inicio</button></li>
                <li><button onClick={() => { scrollToSection('nosotros-seccion'); }} className="text-white/70 hover:text-gold transition-colors cursor-pointer">Nosotros</button></li>
                <li><button onClick={() => { scrollToSection('especialistas-seccion'); }} className="text-white/70 hover:text-gold transition-colors cursor-pointer">Profesionales</button></li>
                <li><button onClick={() => { scrollToSection('servicios-seccion'); }} className="text-white/70 hover:text-gold transition-colors cursor-pointer">Servicios</button></li>
                <li><button onClick={() => { scrollToSection('contacto-seccion'); }} className="text-white/70 hover:text-gold transition-colors cursor-pointer">Contacto</button></li>
              </ul>
            </div>
            <div>
              <h5 className="font-serif text-xs font-bold text-gold uppercase tracking-widest mb-6">Contacto & Consultas</h5>
              <ul className="space-y-4 text-xs text-white/70">
                <li className="flex items-center gap-2.5"><Mail className="w-4 h-4 text-gold-light shrink-0" /><a href={`mailto:${siteContent.contacto_email || 'contacto@psicarte.cl'}`} className="hover:text-gold transition-colors">{siteContent.contacto_email || 'contacto@psicarte.cl'}</a></li>
                <li className="flex items-center gap-2.5"><Phone className="w-4 h-4 text-gold-light shrink-0" /><a href={`tel:${siteContent.contacto_telefono || '+56961676706'}`} className="hover:text-gold transition-colors">{siteContent.contacto_telefono_display || '+56 9 6167 6706'}</a></li>
                <li className="flex items-center gap-2.5"><MapPin className="w-4 h-4 text-gold-light shrink-0" /><span>{siteContent.contacto_ubicacion || 'Chile • Sesiones Online & Presencial'}</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-16 pt-8 flex flex-col sm:flex-row justify-between items-center text-[10px] uppercase tracking-widest text-white/40">
            <p>© {new Date().getFullYear()} Centro Integral PsicArte. Todos los derechos reservados.</p>
            <p className="mt-3 sm:mt-0">{siteContent.footer_lema || 'Elegancia, Psicología & Expresión Escénica'}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
