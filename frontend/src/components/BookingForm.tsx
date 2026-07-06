import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, Clock, User, Sparkles, Mail, Phone, FileText, CheckCircle2, ChevronRight, AlertCircle, Award, Heart } from 'lucide-react';
import { Professional, Service, Appointment } from '../types';
import { PROFESSIONALS, SERVICES, WEEKLY_SCHEDULES, CLIENT_MOCKS } from '../data';

interface BookingFormProps {
  onBookingSuccess: (appointment: Appointment) => void;
  presetServiceId?: string;
  onClearPresetService?: () => void;
  existingAppointments: Appointment[];
}

export const BookingForm: React.FC<BookingFormProps> = ({
  onBookingSuccess,
  presetServiceId,
  onClearPresetService,
  existingAppointments,
}) => {
  const [step, setStep] = useState<number>(1);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeBlock, setSelectedTimeBlock] = useState<string>('');
  
  // Client Info Form
  const [clientName, setClientName] = useState<string>('');
  const [clientEmail, setClientEmail] = useState<string>('');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [clientNotes, setClientNotes] = useState<string>('');
  const [isQuickSelectOpen, setIsQuickSelectOpen] = useState<boolean>(false);

  // Success Appointment State
  const [completedAppointment, setCompletedAppointment] = useState<Appointment | null>(null);

  // Set preset service if provided
  useEffect(() => {
    if (presetServiceId) {
      const service = SERVICES.find(s => s.id === presetServiceId);
      if (service) {
        setSelectedService(service);
        const prof = PROFESSIONALS.find(p => p.id === service.professionalId);
        if (prof) {
          setSelectedProfessional(prof);
        } else if (service.professionalId === 'macarena') {
          // Special case for Macarena
          setSelectedProfessional({
            id: 'macarena',
            name: 'Macarena Méndez',
            title: 'Coordinadora de Artes Escénicas',
            experience: 'Venta de Obras y Eventos',
            bio: 'Coordinadora encargada del área teatral y de artes escénicas de PsicArte.',
            diplomas: [],
            specialties: []
          });
        }
        setStep(3); // Skip directly to date/time selection
      }
    }
  }, [presetServiceId]);

  // Handle professional selection
  const handleSelectProfessional = (prof: Professional) => {
    setSelectedProfessional(prof);
    // If the service doesn't match, reset it
    if (selectedService && selectedService.professionalId !== prof.id) {
      setSelectedService(null);
    }
    setStep(2);
  };

  // Handle service selection
  const handleSelectService = (service: Service) => {
    setSelectedService(service);
    if (!selectedProfessional) {
      const prof = PROFESSIONALS.find(p => p.id === service.professionalId) || {
        id: 'macarena',
        name: 'Macarena Méndez',
        title: 'Coordinadora de Artes Escénicas',
        experience: 'Venta de Obras y Eventos',
        bio: 'Coordinadora encargada del área teatral y de artes escénicas de PsicArte.',
        diplomas: [],
        specialties: []
      } as Professional;
      setSelectedProfessional(prof);
    }
    setStep(3);
  };

  // Helper to check what day of the week a date string is
  const getDayNameFromDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T12:00:00'); // set local noon to prevent timezone shifts
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[date.getDay()];
  };

  // Available days for scheduling (Martes, Jueves, Viernes)
  const isDateSelectable = (dateString: string): boolean => {
    const dayName = getDayNameFromDate(dateString);
    return ['Martes', 'Jueves', 'Viernes'].includes(dayName);
  };

  // Get active time blocks for chosen day
  const getAvailableTimeBlocks = () => {
    if (!selectedDate) return [];
    const dayName = getDayNameFromDate(selectedDate);
    if (dayName === 'Martes') return WEEKLY_SCHEDULES.Martes;
    if (dayName === 'Jueves') return WEEKLY_SCHEDULES.Jueves;
    if (dayName === 'Viernes') return WEEKLY_SCHEDULES.Viernes;
    return [];
  };

  // Check if a specific date & time slot is already booked for this professional
  const isSlotBooked = (date: string, block: string) => {
    if (!selectedProfessional) return false;
    return existingAppointments.some(
      app => app.professionalId === selectedProfessional.id && 
             app.date === date && 
             app.timeBlock === block && 
             app.status === 'Confirmado'
    );
  };

  // Fast client autocomplete from list of mock clients
  const handleQuickSelectClient = (name: string) => {
    setClientName(name);
    const cleanName = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '.');
    setClientEmail(`${cleanName}@gmail.com`);
    
    const randomDigits = Math.floor(1000000 + Math.random() * 9000000);
    setClientPhone(`+569${randomDigits}`);
    
    setIsQuickSelectOpen(false);
  };

  // Reset Booking Form
  const handleReset = () => {
    setSelectedProfessional(null);
    setSelectedService(null);
    setSelectedDate('');
    setSelectedTimeBlock('');
    setClientName('');
    setClientEmail('');
    setClientPhone('');
    setClientNotes('');
    setCompletedAppointment(null);
    setStep(1);
    if (onClearPresetService) {
      onClearPresetService();
    }
  };

  // Submit appointment
  const handleSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfessional || !selectedService || !selectedDate || !selectedTimeBlock || !clientName || !clientEmail || !clientPhone) {
      return;
    }

    const [start_time, end_time] = selectedTimeBlock.split(' - ').map(t => t.trim());

    const newApp: Appointment = {
      id: `app-${Date.now()}`,
      clientName,
      clientEmail,
      clientPhone,
      professionalId: selectedProfessional.id,
      professionalName: selectedProfessional.name,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      servicePrice: selectedService.price,
      room_id: null,
      date: selectedDate,
      start_time,
      end_time,
      timeBlock: selectedTimeBlock,
      notes: clientNotes,
      status: 'Confirmado',
      createdAt: new Date().toISOString(),
    };

    onBookingSuccess(newApp);
    setCompletedAppointment(newApp);
    setStep(5);
  };

  // Generate date options (next 14 days)
  const getDateOptions = () => {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + i);
      const yyyy = nextDate.getFullYear();
      const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
      const dd = String(nextDate.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      
      if (isDateSelectable(dateStr)) {
        dates.push({
          value: dateStr,
          label: `${getDayNameFromDate(dateStr)} ${dd}/${mm}`,
          rawDate: nextDate
        });
      }
    }
    return dates;
  };

  const formattedPrice = (price: number) => {
    if (price === 0) return 'Gratuito';
    return `$${price.toLocaleString('es-CL')}`;
  };

  return (
    <div id="agendar-seccion" className="bg-white border border-secondary/10 rounded-sm hover:shadow-lg transition-all duration-300 p-8 md:p-12 max-w-4xl mx-auto my-8">
      {/* Step Indicator */}
      {step < 5 && (
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-10 border-b border-secondary/10 pb-6 gap-4">
          <h3 className="font-serif text-2xl font-light text-secondary flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-gold shrink-0" />
            Agenda tu Sesión en Línea
          </h3>
          <div className="flex flex-wrap items-center gap-1.5 text-[9px] uppercase tracking-widest text-text-muted font-bold bg-[#FAF8F5] border border-secondary/5 px-4 py-2.5 rounded-sm">
            <span className={step === 1 ? 'text-primary font-extrabold' : ''}>1. Especialista</span>
            <ChevronRight className="w-3 h-3 text-secondary/30" />
            <span className={step === 2 ? 'text-primary font-extrabold' : ''}>2. Servicio</span>
            <ChevronRight className="w-3 h-3 text-secondary/30" />
            <span className={step === 3 ? 'text-primary font-extrabold' : ''}>3. Horario</span>
            <ChevronRight className="w-3 h-3 text-secondary/30" />
            <span className={step === 4 ? 'text-primary font-extrabold' : ''}>4. Confirmación</span>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* STEP 1: Select Professional */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            <div className="text-center md:text-left">
              <p className="text-text-muted text-sm leading-relaxed max-w-2xl">
                Selecciona al profesional con quien deseas agendar. Ofrecemos acompañamiento en psicología clínica, talleres artísticos, capacitaciones corporales y de yoga.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 pt-2">
              {PROFESSIONALS.map((prof) => (
                <div
                  key={prof.id}
                  onClick={() => handleSelectProfessional(prof)}
                  className="group cursor-pointer rounded-sm border border-secondary/10 bg-white hover:border-gold/50 hover:shadow-md p-6 transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="w-14 h-14 rounded-sm bg-secondary text-white font-serif text-lg font-medium flex items-center justify-center border border-gold group-hover:scale-105 transition-transform">
                      {prof.name.split(' ')[0][0]}{prof.name.split(' ').filter(n => n.length > 2)[1]?.[0] || ''}
                    </div>
                    <div>
                      <h4 className="font-serif text-lg font-medium text-secondary group-hover:text-primary transition-colors">
                        {prof.name}
                      </h4>
                      <p className="text-[9px] uppercase tracking-wider font-bold text-gold-dark mt-1.5">{prof.title}</p>
                      <p className="text-xs text-text-muted italic mt-0.5">{prof.experience}</p>
                    </div>
                    <p className="text-xs text-text-muted line-clamp-4 leading-relaxed pt-2">
                      {prof.bio}
                    </p>
                  </div>
                  
                  <button className="w-full text-center py-3 px-4 rounded-sm text-[10px] uppercase tracking-widest font-bold text-white bg-secondary group-hover:bg-primary transition-colors mt-8 border border-secondary/10 shadow-none cursor-pointer">
                    Seleccionar Especialista
                  </button>
                </div>
              ))}

              {/* Special row for Macarena (Arts and Scenic coordination) */}
              <div
                onClick={() => handleSelectProfessional({
                  id: 'macarena',
                  name: 'Macarena Méndez',
                  title: 'Coordinadora de Artes Escénicas',
                  experience: 'Venta de Obras y Eventos',
                  bio: 'Coordinadora encargada del área teatral y de artes escénicas de PsicArte.',
                  diplomas: [],
                  specialties: []
                })}
                className="group cursor-pointer rounded-sm border border-secondary/10 bg-white hover:border-gold/50 hover:shadow-md p-6 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="w-14 h-14 rounded-sm bg-secondary text-white font-serif text-lg font-medium flex items-center justify-center border border-gold group-hover:scale-105 transition-transform">
                    MM
                  </div>
                  <div>
                    <h4 className="font-serif text-lg font-medium text-secondary group-hover:text-primary transition-colors">
                      Macarena Méndez
                    </h4>
                    <p className="text-[9px] uppercase tracking-wider font-bold text-gold-dark mt-1.5">Gestión Cultural y Obras</p>
                    <p className="text-xs text-text-muted italic mt-0.5">Coordinadora del Centro</p>
                  </div>
                  <p className="text-xs text-text-muted line-clamp-4 leading-relaxed pt-2">
                    Coordina la venta, exhibición y adaptación de obras teatrales, espectáculos escénicos y eventos para organizaciones o particulares.
                  </p>
                </div>
                
                <button className="w-full text-center py-3 px-4 rounded-sm text-[10px] uppercase tracking-widest font-bold text-white bg-secondary group-hover:bg-primary transition-colors mt-8 border border-secondary/10 shadow-none cursor-pointer">
                  Ver Obras y Eventos
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 2: Select Service */}
        {step === 2 && selectedProfessional && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center pb-2 border-b border-secondary/10">
              <div>
                <span className="text-[10px] font-bold text-gold-dark uppercase tracking-widest">Especialista Seleccionado</span>
                <h4 className="font-serif text-2xl font-light text-secondary mt-1">{selectedProfessional.name}</h4>
              </div>
              <button 
                onClick={() => setStep(1)} 
                className="text-xs font-bold text-primary hover:text-primary-dark uppercase tracking-wider cursor-pointer"
              >
                Cambiar profesional
              </button>
            </div>

            <p className="text-text-muted text-sm leading-relaxed">
              Por favor selecciona el servicio o prestación que deseas agendar con {selectedProfessional.name}:
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              {SERVICES.filter(s => s.professionalId === selectedProfessional.id).map((service) => (
                <div
                  key={service.id}
                  onClick={() => handleSelectService(service)}
                  className="cursor-pointer border border-secondary/10 hover:border-gold/50 rounded-sm p-5 bg-[#FAF8F5]/30 hover:bg-white transition-all duration-300 flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-4">
                      <h5 className="font-serif text-base font-medium text-secondary group-hover:text-primary transition-colors leading-snug">
                        {service.name}
                      </h5>
                      <span className="text-xs font-bold text-primary bg-primary/5 border border-primary/10 px-2.5 py-1 rounded-sm shrink-0 whitespace-nowrap">
                        {formattedPrice(service.price)}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted leading-relaxed line-clamp-2">
                      {service.description}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-6 pt-3 border-t border-secondary/10 text-xs font-medium text-text-muted">
                    <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest font-bold">
                      <Clock className="w-3.5 h-3.5 text-gold" />
                      {service.duration} minutos
                    </span>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-primary group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      Seleccionar <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6 flex justify-between border-t border-secondary/10">
              <button
                onClick={() => setStep(1)}
                className="px-5 py-3 rounded-sm text-xs font-bold uppercase tracking-widest border border-secondary/20 text-secondary hover:bg-[#FAF8F5] transition-all cursor-pointer"
              >
                Atrás
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: Date and Time Block */}
        {step === 3 && selectedProfessional && selectedService && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-secondary/10 pb-5 gap-4">
              <div>
                <span className="text-[10px] font-bold text-gold-dark uppercase tracking-widest">Servicio Elegido</span>
                <h4 className="font-serif text-xl font-light text-secondary mt-1">{selectedService.name}</h4>
                <p className="text-xs text-text-muted mt-0.5">Con {selectedProfessional.name} • {selectedService.duration} min • {formattedPrice(selectedService.price)}</p>
              </div>
              <button 
                onClick={() => setStep(presetServiceId ? 1 : 2)} 
                className="text-xs font-bold text-primary hover:text-primary-dark uppercase tracking-wider shrink-0 text-left cursor-pointer"
              >
                Cambiar servicio
              </button>
            </div>

            {selectedService.id === 'val-informe' ? (
              <div className="bg-primary/5 border border-primary/10 p-5 rounded-sm space-y-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-serif text-base font-medium text-secondary">Proceso para Certificados e Informes</h5>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">
                      Los informes y certificados no requieren asistir a una sesión de 50 minutos. Al agendar este servicio, la psicóloga Valentina Maldonado revisará tus antecedentes y elaborará el documento en un plazo de 3-5 días hábiles.
                    </p>
                    <p className="text-xs text-text-muted mt-2 font-medium">
                      Selecciona cualquier día disponible para fijar la fecha límite de entrega de tus documentos.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid md:grid-cols-2 gap-8">
              {/* Date Selection */}
              <div className="space-y-3">
                <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-gold shrink-0" />
                  1. Elige una fecha disponible
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2 border border-secondary/10 rounded-sm p-3 bg-[#FAF8F5]/30">
                  {getDateOptions().map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setSelectedDate(opt.value);
                        setSelectedTimeBlock('');
                      }}
                      className={`w-full text-left px-4 py-3 rounded-sm text-xs font-semibold transition-all flex justify-between items-center cursor-pointer ${
                        selectedDate === opt.value
                          ? 'bg-secondary text-white border border-secondary shadow-sm'
                          : 'bg-white hover:bg-[#FAF8F5] border border-secondary/10'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {selectedDate === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-gold animate-ping" />}
                    </button>
                  ))}
                  {getDateOptions().length === 0 && (
                    <p className="text-xs text-text-muted text-center py-4">No hay días disponibles en las próximas 2 semanas.</p>
                  )}
                </div>
                <p className="text-[10px] text-text-muted italic">
                  * Atendemos exclusivamente los días Martes, Jueves y Viernes.
                </p>
              </div>

              {/* Time Slot Selection */}
              <div className="space-y-3">
                <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gold shrink-0" />
                  2. Selecciona un bloque horario
                </label>

                {!selectedDate ? (
                  <div className="border border-dashed border-secondary/10 rounded-sm p-8 flex flex-col items-center justify-center text-center bg-[#FAF8F5]/30 h-[264px]">
                    <Clock className="w-6 h-6 text-gold mb-2 animate-pulse" />
                    <p className="text-xs text-text-muted max-w-[200px] leading-relaxed">Por favor, selecciona una fecha primero para ver los bloques horarios de atención.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2 border border-secondary/10 rounded-sm p-3 bg-[#FAF8F5]/30 h-[264px]">
                    {getAvailableTimeBlocks().map((block) => {
                      const isBooked = isSlotBooked(selectedDate, block);
                      return (
                        <button
                          key={block}
                          type="button"
                          disabled={isBooked}
                          onClick={() => setSelectedTimeBlock(block)}
                          className={`w-full text-left px-4 py-3 rounded-sm text-xs font-semibold transition-all flex justify-between items-center cursor-pointer ${
                            isBooked
                              ? 'bg-[#FAF8F5] text-gray-400 cursor-not-allowed border border-secondary/5 line-through'
                              : selectedTimeBlock === block
                              ? 'bg-primary text-white border border-primary'
                              : 'bg-white hover:bg-[#FAF8F5] border border-secondary/10'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Clock className={`w-3.5 h-3.5 ${selectedTimeBlock === block ? 'text-gold' : 'text-text-muted'}`} />
                            {block} hrs
                          </span>
                          {isBooked ? (
                            <span className="text-[8px] uppercase tracking-wider font-bold text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-sm">Reservado</span>
                          ) : selectedTimeBlock === block ? (
                            <span className="text-[8px] uppercase tracking-wider font-bold text-gold">Seleccionado</span>
                          ) : (
                            <span className="text-[8px] uppercase tracking-wider font-bold text-green-700 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded-sm">Disponible</span>
                          )}
                        </button>
                      );
                    })}
                    {getAvailableTimeBlocks().length === 0 && (
                      <p className="text-xs text-text-muted text-center py-8">No hay bloques disponibles para el día seleccionado.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6 flex justify-between border-t border-secondary/10">
              <button
                onClick={() => setStep(presetServiceId ? 1 : 2)}
                className="px-5 py-3 rounded-sm text-xs font-bold uppercase tracking-widest border border-secondary/20 text-secondary hover:bg-[#FAF8F5] transition-all cursor-pointer"
              >
                Atrás
              </button>
              <button
                disabled={!selectedDate || !selectedTimeBlock}
                onClick={() => setStep(4)}
                className={`px-6 py-3 rounded-sm text-xs font-bold uppercase tracking-widest text-white transition-all border ${
                  selectedDate && selectedTimeBlock
                    ? 'bg-primary hover:bg-primary-dark border-primary cursor-pointer'
                    : 'bg-gray-300 border-gray-300 cursor-not-allowed'
                }`}
              >
                Siguiente: Datos de Contacto
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 4: Client Info Form */}
        {step === 4 && selectedProfessional && selectedService && selectedDate && selectedTimeBlock && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="bg-[#FAF8F5] border border-secondary/10 rounded-sm p-4 flex flex-col md:flex-row justify-between text-[11px] text-secondary gap-3">
              <div>
                <span className="font-bold uppercase text-[9px] tracking-wider text-text-muted block md:inline md:mr-1">Especialista:</span> {selectedProfessional.name}
              </div>
              <div>
                <span className="font-bold uppercase text-[9px] tracking-wider text-text-muted block md:inline md:mr-1">Servicio:</span> {selectedService.name}
              </div>
              <div>
                <span className="font-bold uppercase text-[9px] tracking-wider text-text-muted block md:inline md:mr-1">Fecha:</span> {selectedDate} a las {selectedTimeBlock} hrs
              </div>
              <div>
                <span className="font-bold uppercase text-[9px] tracking-wider text-text-muted block md:inline md:mr-1">Valor:</span> {formattedPrice(selectedService.price)}
              </div>
            </div>

            <form onSubmit={handleSubmitBooking} className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <h4 className="font-serif text-lg font-medium text-secondary">Información del Solicitante</h4>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsQuickSelectOpen(!isQuickSelectOpen)}
                    className="text-[9px] uppercase tracking-widest bg-gold/5 text-gold-dark hover:bg-gold/10 font-bold px-3 py-2 rounded-sm border border-gold/15 flex items-center gap-1.5 cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 shrink-0 text-gold" />
                    Autocompletar Cliente (Mock)
                  </button>
                  
                  {isQuickSelectOpen && (
                    <div className="absolute right-0 mt-1 w-64 bg-white border border-secondary/10 rounded-sm shadow-lg z-20 max-h-48 overflow-y-auto p-1">
                      <p className="text-[9px] text-text-muted font-bold px-2 py-1.5 uppercase border-b border-secondary/10">Selecciona para pruebas:</p>
                      {CLIENT_MOCKS.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleQuickSelectClient(c.name)}
                          className="w-full text-left text-xs px-3 py-1.5 rounded-sm hover:bg-[#FAF8F5] text-secondary truncate font-medium block cursor-pointer"
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest">Nombre Completo</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-text-muted absolute left-3 top-3.5" />
                    <input
                      type="text"
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Ej. Renata Jeldes"
                      className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-secondary/20 rounded-sm focus:border-primary focus:outline-none bg-[#FAF8F5]/30 focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest">Correo Electrónico</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-text-muted absolute left-3 top-3.5" />
                    <input
                      type="email"
                      required
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder="renata@gmail.com"
                      className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-secondary/20 rounded-sm focus:border-primary focus:outline-none bg-[#FAF8F5]/30 focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest">Teléfono Móvil</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-text-muted absolute left-3 top-3.5" />
                    <input
                      type="tel"
                      required
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="+56912345678"
                      className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-secondary/20 rounded-sm focus:border-primary focus:outline-none bg-[#FAF8F5]/30 focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-secondary uppercase tracking-widest">Notas / Motivo de consulta (Opcional)</label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-text-muted absolute left-3 top-3.5" />
                  <textarea
                    rows={3}
                    value={clientNotes}
                    onChange={(e) => setClientNotes(e.target.value)}
                    placeholder="Describe brevemente lo que buscas con este servicio o si tienes requerimientos específicos..."
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-secondary/20 rounded-sm focus:border-primary focus:outline-none bg-[#FAF8F5]/30 focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {selectedService.price > 0 && (
                <div className="bg-gold/5 border border-gold/20 p-4 rounded-sm flex items-start gap-2.5 text-xs text-text-muted mt-2 leading-relaxed">
                  <CheckCircle2 className="w-5 h-5 text-gold shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-secondary">Información de Boleta y Reembolso:</span> Se entrega Boleta de Honorarios Electrónica para reembolso válido en pacientes Fonasa, Isapres y seguros particulares.
                  </div>
                </div>
              )}

              <div className="pt-6 flex justify-between border-t border-secondary/10">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-3 rounded-sm text-xs font-bold uppercase tracking-widest border border-secondary/20 text-secondary hover:bg-[#FAF8F5] transition-all cursor-pointer"
                >
                  Atrás
                </button>
                <button
                  type="submit"
                  className="px-8 py-3.5 rounded-sm text-xs font-bold uppercase tracking-widest text-white bg-primary hover:bg-primary-dark border border-primary transition-all flex items-center gap-2 cursor-pointer shadow-none"
                >
                  Confirmar Reserva e Inscribir
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* STEP 5: Success & Receipt */}
        {step === 5 && completedAppointment && (
          <motion.div
            key="step5"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 25 }}
            className="text-center py-6 max-w-lg mx-auto space-y-8"
          >
            <div className="w-14 h-14 rounded-sm bg-green-50 text-green-600 flex items-center justify-center mx-auto border border-green-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h4 className="font-serif text-2xl font-light text-secondary">¡Reserva Completada con Éxito!</h4>
              <p className="text-text-muted text-xs leading-relaxed max-w-sm mx-auto">
                Hemos registrado tu hora y enviado una confirmación a <span className="font-semibold text-secondary">{completedAppointment.clientEmail}</span>.
              </p>
            </div>

            {/* Receipt Card */}
            <div className="bg-[#FAF8F5] border border-secondary/10 rounded-sm p-6 text-left space-y-4">
              <div className="border-b border-secondary/10 pb-3 flex justify-between items-center">
                <span className="text-[9px] font-bold text-gold-dark uppercase tracking-widest">Comprobante de Reserva</span>
                <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">ID: {completedAppointment.id.split('-')[1] || completedAppointment.id}</span>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="text-text-muted block text-[9px] uppercase tracking-widest font-bold">Servicio contratado</span>
                  <span className="font-medium text-secondary text-sm leading-tight block mt-1">{completedAppointment.serviceName}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-text-muted block text-[9px] uppercase tracking-widest font-bold">Especialista</span>
                    <span className="font-medium text-secondary block mt-1">{completedAppointment.professionalName}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[9px] uppercase tracking-widest font-bold">Valor</span>
                    <span className="font-bold text-primary block mt-1">{formattedPrice(completedAppointment.servicePrice)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-text-muted block text-[9px] uppercase tracking-widest font-bold">Fecha</span>
                    <span className="font-medium text-secondary block mt-1">{completedAppointment.date}</span>
                  </div>
                  <div>
                    <span className="text-text-muted block text-[9px] uppercase tracking-widest font-bold">Horario</span>
                    <span className="font-medium text-secondary block mt-1">{completedAppointment.timeBlock} hrs</span>
                  </div>
                </div>

                <div>
                  <span className="text-text-muted block text-[9px] uppercase tracking-widest font-bold">Paciente / Solicitante</span>
                  <span className="font-medium text-secondary block mt-1">{completedAppointment.clientName}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-secondary/20 pt-4 text-[11px] text-text-muted italic leading-relaxed">
                * Para reembolsar con Fonasa o Isapre, descarga la boleta electrónica adjunta que llegará a tu correo una vez procesado el pago.
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleReset}
                className="px-6 py-3 rounded-sm text-xs font-bold uppercase tracking-widest text-white bg-secondary hover:bg-secondary-light border border-secondary transition-all cursor-pointer shadow-none"
              >
                Reservar otra sesión
              </button>
              <a
                href={`mailto:${completedAppointment.clientEmail}`}
                className="px-6 py-3 rounded-sm text-xs font-semibold border border-secondary/20 text-secondary hover:bg-[#FAF8F5] transition-colors inline-block text-center"
              >
                Ver correo de confirmación
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
