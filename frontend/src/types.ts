export interface Professional {
  id: string;
  name: string;
  title: string;
  experience: string;
  bio: string;
  diplomas: string[];
  specialties: string[];
  avatarUrl?: string;
}

export interface Service {
  id: string;
  name: string;
  professionalId: string;
  professionalName: string;
  price: number;
  duration: number; // in minutes
  description: string;
  category: 'coaching' | 'psicoterapia' | 'yoga' | 'capacitacion' | 'taller' | 'evaluacion' | 'evento';
  modality?: 'Presencial' | 'Telemedicina' | 'Ambas';
  // API snake_case aliases
  professional_id?: string;
  professional_name?: string;
}

export interface TimeBlock {
  id: string;
  time: string;
}

export interface DaySchedule {
  day: string; // 'Martes' | 'Jueves' | 'Viernes'
  blocks: string[];
}

export type AppointmentStatus = 'Programado' | 'Confirmado' | 'Cancelado' | 'Ausente' | 'Finalizado';
export type RoomType = 'Fisica' | 'Virtual';
export type WaitlistStatus = 'Espera' | 'Contactado' | 'Agendado' | 'Cancelado';

export interface Appointment {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  professionalId: string;
  professionalName: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  room_id?: string | null;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  timeBlock?: string;
  notes?: string;
  status: AppointmentStatus;
  createdAt: string;
}

export interface ClientMock {
  id: string;
  name: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: 'usuario' | 'profesional' | 'administrador';
  professional_id: string | null;
  blocked: number;
  created_at: string;
}

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  description: string | null;
  videoconference_link: string | null;
  open_time: string;
  close_time: string;
}

export interface WaitlistItem {
  id: number;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  professional_id: string | null;
  service_id: string | null;
  preferred_days: string | null;
  notes: string | null;
  status: WaitlistStatus;
  created_at: string;
}

export interface NewsItem {
  id?: string;
  title: string;
  message: string;
  active: number;
  start_date: string | null;
  end_date: string | null;
  created_at?: string;
}
