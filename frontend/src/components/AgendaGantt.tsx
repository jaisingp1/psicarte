import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { Calendar, Filter, ChevronLeft, ChevronRight, Video, Building, User, Clock, AlertCircle } from 'lucide-react';
import { Appointment, Room } from '../types';
import { PROFESSIONALS } from '../data';

interface AgendaGanttProps {
  appointments: Appointment[];
  rooms: Room[];
  date: string;
  onDateChange: (date: string) => void;
  onMoveAppointment: (id: string, roomId: string | null, date: string, startTime: string, endTime: string) => void;
  onResizeAppointment: (id: string, startTime: string, endTime: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onAppointmentClick?: (app: Appointment) => void;
}

const HOUR_HEIGHT = 64;
const HALF_HOUR = HOUR_HEIGHT / 2;
const START_HOUR = 7;
const END_HOUR = 22;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const COL_WIDTH = 120;
const ROW_LABEL_WIDTH = 180;
const STATUS_COLORS: Record<string, string> = {
  Programado: 'bg-blue-100 border-blue-300 text-blue-800',
  Confirmado: 'bg-green-100 border-green-300 text-green-800',
  Cancelado: 'bg-red-100 border-red-300 text-red-800',
  Ausente: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  Finalizado: 'bg-gray-100 border-gray-300 text-gray-600',
};
const PROF_COLORS = ['#4f46e5', '#0891b2', '#7c3aed', '#be123c', '#ca8a04'];

function timeToPixels(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return ((h - START_HOUR) * 60 + m) * (HOUR_HEIGHT / 60);
}

function pixelsToTime(pixels: number): string {
  const totalMinutes = Math.round((pixels / HOUR_HEIGHT) * 60);
  const h = Math.floor(totalMinutes / 60) + START_HOUR;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(Math.round(m / 15) * 15).padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export const AgendaGantt: React.FC<AgendaGanttProps> = ({
  appointments, rooms, date, onDateChange,
  onMoveAppointment, onResizeAppointment, onStatusChange, onAppointmentClick,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterProf, setFilterProf] = useState<string>('all');
  const [dragging, setDragging] = useState<{ id: string; type: 'move' | 'resize-start' | 'resize-end'; startX: number; startY: number; origTop: number; origLeft: number; origRoom: string } | null>(null);
  const ganttRef = useRef<HTMLDivElement>(null);

  const filteredRooms = rooms.filter(r => filterType === 'all' || r.type === filterType);
  const profColorMap: Record<string, string> = {};
  PROFESSIONALS.forEach((p, i) => { profColorMap[p.id] = PROF_COLORS[i % PROF_COLORS.length]; });

  const handleMouseDown = (app: Appointment, type: 'move' | 'resize-start' | 'resize-end', e: React.MouseEvent) => {
    e.preventDefault();
    const rect = ganttRef.current?.getBoundingClientRect();
    if (!rect) return;
    const blockEl = (e.target as HTMLElement).closest('.app-block') as HTMLElement;
    if (!blockEl) return;
    setDragging({
      id: app.id,
      type,
      startX: e.clientX,
      startY: e.clientY,
      origTop: blockEl.offsetTop,
      origLeft: blockEl.offsetLeft,
      origRoom: app.room_id || '',
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return;
    const gantt = ganttRef.current;
    if (!gantt) return;
    const rect = gantt.getBoundingClientRect();
    const dx = e.clientX - dragging.startX;
    const dy = e.clientY - dragging.startY;
    const blocks = gantt.querySelectorAll('.app-block');
    const target = Array.from(blocks).find(b => (b as HTMLElement).dataset.appid === dragging.id) as HTMLElement;
    if (!target) return;

    if (dragging.type === 'move') {
      const newTop = Math.max(0, dragging.origTop + dy);
      target.style.top = `${newTop}px`;
      const newLeft = dragging.origLeft + dx;
      target.style.left = `${newLeft}px`;
    } else if (dragging.type === 'resize-start') {
      const newTop = Math.max(0, dragging.origTop + dy);
      const diff = dragging.origTop - newTop;
      target.style.top = `${newTop}px`;
      const currentH = parseInt(target.style.height || `${HALF_HOUR}`);
      target.style.height = `${currentH + diff}px`;
    } else if (dragging.type === 'resize-end') {
      const currentH = parseInt(target.style.height || `${HALF_HOUR}`);
      target.style.height = `${Math.max(HALF_HOUR, currentH + dy)}px`;
    }
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    if (!dragging) return;
    const gantt = ganttRef.current;
    if (!gantt) return;
    const blocks = gantt.querySelectorAll('.app-block');
    const target = Array.from(blocks).find(b => (b as HTMLElement).dataset.appid === dragging.id) as HTMLElement;
    if (!target) { setDragging(null); return; }

    const rect = gantt.getBoundingClientRect();
    const scrollTop = gantt.scrollTop;
    const top = parseInt(target.style.top || '0') + scrollTop;
    const height = parseInt(target.style.height || `${HALF_HOUR}`);
    const left = parseInt(target.style.left || '0');

    if (dragging.type === 'move') {
      const newTime = pixelsToTime(top);
      const durationMinutes = (height / HOUR_HEIGHT) * 60;
      const endH = Math.floor((timeToPixels(newTime) + (durationMinutes * HOUR_HEIGHT / 60)) / (HOUR_HEIGHT / 60) / 60) + START_HOUR;
      const endM = Math.round((timeToPixels(newTime) + (durationMinutes * HOUR_HEIGHT / 60)) % (HOUR_HEIGHT / 60) / (HOUR_HEIGHT / 60) * 60);
      const newEnd = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

      const colIndex = Math.round((left - ROW_LABEL_WIDTH) / COL_WIDTH);
      let targetRoomId = '';
      if (colIndex >= 0 && colIndex < filteredRooms.length) {
        targetRoomId = filteredRooms[colIndex].id;
      }
      onMoveAppointment(dragging.id, targetRoomId || null, date, newTime, newEnd);
    } else if (dragging.type === 'resize-start') {
      const newStart = pixelsToTime(top);
      const appData = appointments.find(a => a.id === dragging.id);
      if (appData) onResizeAppointment(dragging.id, newStart, appData.end_time);
    } else if (dragging.type === 'resize-end') {
      const newEnd = pixelsToTime(top + height);
      const appData = appointments.find(a => a.id === dragging.id);
      if (appData) onResizeAppointment(dragging.id, appData.start_time, newEnd);
    }

    target.style.top = '';
    target.style.left = '';
    target.style.height = '';
    setDragging(null);
  }, [dragging, date, filteredRooms, appointments, onMoveAppointment, onResizeAppointment]);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  const getAppStyle = (app: Appointment) => {
    const top = timeToPixels(app.start_time);
    const endPx = timeToPixels(app.end_time);
    const height = Math.max(HALF_HOUR, endPx - top);
    return { top: `${top}px`, height: `${height}px` };
  };

  const timeSlots: string[] = [];
  for (let h = START_HOUR; h < END_HOUR; h++) {
    for (let m = 0; m < 60; m += 30) {
      timeSlots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }

  const getAppointmentsForRoom = (roomId: string) =>
    appointments.filter(a => a.room_id === roomId && a.status !== 'Cancelado');

  const getAppointmentColor = (app: Appointment) => {
    const base = profColorMap[app.professionalId] || '#6b7280';
    const statusAlpha = app.status === 'Confirmado' ? 'dd' : app.status === 'Programado' ? '99' : '55';
    return base + statusAlpha;
  };

  return (
    <div className="bg-white border border-secondary/10 rounded-sm">
      <div className="p-4 border-b border-secondary/10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => onDateChange(addDays(date, -1))} className="p-1.5 hover:bg-secondary/5 rounded-sm cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-semibold text-secondary flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-primary" />
            {formatDate(date)}
          </span>
          <button onClick={() => onDateChange(addDays(date, 1))} className="p-1.5 hover:bg-secondary/5 rounded-sm cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
          <button onClick={() => onDateChange(new Date().toISOString().split('T')[0])} className="text-[10px] uppercase font-bold text-primary hover:underline ml-2 cursor-pointer">Hoy</button>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <Filter className="w-3.5 h-3.5 text-text-muted" />
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="px-2 py-1 border border-secondary/20 rounded-sm text-xs bg-white focus:outline-none">
            <option value="all">Todas las salas</option>
            <option value="Fisica">Físicas</option>
            <option value="Virtual">Videoconferencia</option>
          </select>
          <select value={filterProf} onChange={e => setFilterProf(e.target.value)}
            className="px-2 py-1 border border-secondary/20 rounded-sm text-xs bg-white focus:outline-none">
            <option value="all">Todos los profesionales</option>
            {PROFESSIONALS.map(p => <option key={p.id} value={p.id}>{p.name.split(' ')[0]}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-auto" ref={ganttRef}>
        <div style={{ minWidth: ROW_LABEL_WIDTH + filteredRooms.length * COL_WIDTH + 200 }}>
          <div className="flex border-b border-secondary/10 bg-[#FAF8F5] sticky top-0 z-10" style={{ marginLeft: ROW_LABEL_WIDTH }}>
            {filteredRooms.map(room => (
              <div key={room.id} className="text-center py-2 text-[10px] uppercase tracking-widest font-bold text-secondary border-r border-secondary/10 flex items-center justify-center gap-1"
                style={{ width: COL_WIDTH }}>
                {room.type === 'Virtual' ? <Video className="w-3 h-3 text-primary" /> : <Building className="w-3 h-3 text-gold-dark" />}
                <span className="truncate">{room.name}</span>
              </div>
            ))}
          </div>

          <div className="flex">
            <div className="shrink-0 border-r border-secondary/10 bg-white" style={{ width: ROW_LABEL_WIDTH }}>
              {filteredRooms.map(room => (
                <div key={room.id} className="flex items-center px-3 border-b border-secondary/5 text-xs font-semibold text-secondary"
                  style={{ height: HOUR_HEIGHT * TOTAL_HOURS / filteredRooms.length > 60 ? HOUR_HEIGHT * TOTAL_HOURS / filteredRooms.length : HOUR_HEIGHT * TOTAL_HOURS }}>
                  <div className="truncate">
                    <span className="block text-[10px]">{room.name}</span>
                    <span className="block text-[8px] text-text-muted font-normal">{room.type} • {room.open_time}-{room.close_time}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="relative flex-1" style={{ minHeight: TOTAL_HOURS * HOUR_HEIGHT }}>
              {filteredRooms.map((room, ri) => (
                <div key={room.id} className="absolute border-b border-secondary/5" style={{ top: 0, left: ri * COL_WIDTH, width: COL_WIDTH, height: TOTAL_HOURS * HOUR_HEIGHT }}>
                  {timeSlots.map((slot, si) => (
                    <div key={si} className={`border-t ${si % 2 === 0 ? 'border-secondary/5' : 'border-secondary/0'} ${parseInt(slot) >= 12 && parseInt(slot) < 14 ? 'bg-bg-base/10' : ''}`}
                      style={{ height: HALF_HOUR }} />
                  ))}
                </div>
              ))}

              {filteredRooms.map((room, ri) =>
                getAppointmentsForRoom(room.id)
                  .filter(a => filterProf === 'all' || a.professionalId === filterProf)
                  .map(app => {
                    const style = getAppStyle(app);
                    return (
                      <div key={app.id} className="app-block absolute rounded-sm border cursor-pointer overflow-hidden group z-20"
                        data-appid={app.id}
                        style={{
                          left: ri * COL_WIDTH + 4,
                          width: COL_WIDTH - 8,
                          top: style.top,
                          height: style.height,
                          backgroundColor: getAppointmentColor(app),
                          borderColor: profColorMap[app.professionalId] || '#6b7280',
                          minHeight: 20,
                        }}
                        onClick={() => onAppointmentClick?.(app)}
                      >
                        <div className="px-1.5 py-0.5 text-[9px] font-semibold text-white truncate flex items-center gap-1">
                          <User className="w-2.5 h-2.5 shrink-0" />
                          {app.clientName.split(' ')[0]}
                        </div>
                        <div className="px-1.5 text-[8px] text-white/80 truncate">{app.serviceName}</div>
                        <div className="px-1.5 text-[7px] text-white/60 truncate">{app.start_time} - {app.end_time}</div>

                        <div className="absolute top-0 left-0 w-2 h-full cursor-col-resize hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity z-30"
                          onMouseDown={e => { e.stopPropagation(); handleMouseDown(app, 'resize-start', e); }} />

                        <div className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity z-30"
                          onMouseDown={e => { e.stopPropagation(); handleMouseDown(app, 'resize-end', e); }} />

                        <div className="absolute inset-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-20"
                          onMouseDown={e => handleMouseDown(app, 'move', e)} />

                        <div className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-30">
                          <select value={app.status} onChange={e => { e.stopPropagation(); onStatusChange(app.id, e.target.value); }}
                            className="text-[7px] border-none rounded-sm bg-white/90 text-gray-800 cursor-pointer"
                            onClick={e => e.stopPropagation()}>
                            <option value="Programado">Prog</option>
                            <option value="Confirmado">Conf</option>
                            <option value="Ausente">Aus</option>
                            <option value="Finalizado">Fin</option>
                          </select>
                        </div>
                      </div>
                    );
                  })
              )}

              {filteredRooms.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-text-muted text-sm italic">
                  No hay salas disponibles con los filtros seleccionados.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-secondary/10 flex items-center gap-4 text-[10px] text-text-muted">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-100 border border-blue-300" /> Programado</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-100 border border-green-300" /> Confirmado</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-yellow-100 border border-yellow-300" /> Ausente</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-300" /> Finalizado</span>
        <span className="text-[9px] text-text-muted ml-auto">Arrastra turnos para mover • Bordes para redimensionar</span>
      </div>
    </div>
  );
};
