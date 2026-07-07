import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Plus, X, Trash2, ChevronLeft, ChevronRight, User, Clock, Save
} from 'lucide-react';
import { Room, Service, Professional } from '../types';

interface ScheduleBlock {
  id: string;
  day: string;
  start_time: string;
  end_time: string;
  professional_id: string;
  professional_name: string;
  service_id: string;
  service_name: string;
  duration: number;
  room_id: string;
  room_name: string;
  created_at: string;
}

const DAYS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
const HOUR_HEIGHT = 64;
const START_HOUR = 7;
const END_HOUR = 22;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const COL_WIDTH = 180;
const PROF_COLORS = ['#4f46e5', '#0891b2', '#7c3aed', '#be123c', '#ca8a04', '#059669', '#d97706'];

function timeToPixels(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return ((h - START_HOUR) * 60 + m) * (HOUR_HEIGHT / 60);
}

function pixelsToTime(y: number): string {
  const totalMinutes = Math.round((y / HOUR_HEIGHT) * 60);
  const h = Math.floor(totalMinutes / 60) + START_HOUR;
  const m = Math.round(totalMinutes % 60 / 10) * 10;
  if (m >= 60) return `${String(h + 1).padStart(2, '0')}:00`;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function snapTo10(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const snapped = Math.round(m / 10) * 10;
  if (snapped >= 60) return `${String(h + 1).padStart(2, '0')}:00`;
  return `${String(h).padStart(2, '0')}:${String(snapped).padStart(2, '0')}`;
}

const API = '/api';

interface SemanalPlannerProps {
  rooms: Room[];
  allServices: Service[];
  allProfessionals: Professional[];
}

export const SemanalPlanner: React.FC<SemanalPlannerProps> = ({ rooms, allServices, allProfessionals }) => {
  const [day, setDay] = useState('Lunes');
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [dragging, setDragging] = useState<{
    id: string; type: 'move' | 'resize-start' | 'resize-end';
    startY: number; origTop: number; origRoom: string; origDay: string;
  } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalPos, setModalPos] = useState({ top: 0, roomId: '' });
  const [newBlock, setNewBlock] = useState({
    professional_id: '', service_id: '', room_id: '',
    start_time: '09:00', end_time: '10:00',
  });
  const [msg, setMsg] = useState('');
  const gridRef = useRef<HTMLDivElement>(null);

  const loadBlocks = useCallback(() => {
    fetch(`${API}/schedule/${day}`)
      .then(r => r.json())
      .then(setBlocks);
  }, [day]);

  useEffect(() => { loadBlocks(); }, [loadBlocks]);

  const showMsg = (text: string) => { setMsg(text); setTimeout(() => setMsg(''), 3000); };

  // When professional changes, auto-select first service
  useEffect(() => {
    if (newBlock.professional_id && !newBlock.service_id) {
      const profServices = allServices.filter(s => s.professionalId === newBlock.professional_id);
      if (profServices.length > 0) {
        const s = profServices[0];
        setNewBlock(prev => ({
          ...prev,
          service_id: s.id,
          end_time: calcEndTime(prev.start_time, s.duration),
        }));
      }
    }
  }, [newBlock.professional_id]);

  const handleServiceChange = (serviceId: string) => {
    const svc = allServices.find(s => s.id === serviceId);
    setNewBlock(prev => ({
      ...prev,
      service_id: serviceId,
      end_time: svc ? calcEndTime(prev.start_time, svc.duration) : prev.end_time,
    }));
  };

  const handleStartTimeChange = (startTime: string) => {
    const svc = allServices.find(s => s.id === newBlock.service_id);
    setNewBlock(prev => ({
      ...prev,
      start_time: startTime,
      end_time: svc ? calcEndTime(startTime, svc.duration) : prev.end_time,
    }));
  };

  const calcEndTime = (start: string, dur: number): string => {
    const [h, m] = start.split(':').map(Number);
    const total = h * 60 + m + dur;
    const nh = Math.floor(total / 60);
    const nm = total % 60;
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
  };

  const profColorMap: Record<string, string> = {};
  allProfessionals.forEach((p, i) => { profColorMap[p.id] = PROF_COLORS[i % PROF_COLORS.length]; });

  const handleGridClick = (e: React.MouseEvent, roomId: string) => {
    if (dragging) return;
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = e.clientY - rect.top + (gridRef.current?.scrollTop || 0) - 40; // minus header height
    const time = pixelsToTime(y);
    const snapped = snapTo10(time);
    
    // Check constraints
    if (snapped < (room.open_time || '08:00') || snapped >= (room.close_time || '22:00')) {
      showMsg('Horario fuera del horario de la sala');
      return;
    }
    setModalPos({ top: y, roomId });
    setNewBlock({
      professional_id: '',
      service_id: '',
      room_id: roomId,
      start_time: snapped,
      end_time: '',
    });
    setShowModal(true);
  };

  const handleAddBlock = async () => {
    if (!newBlock.professional_id || !newBlock.service_id || !newBlock.start_time || !newBlock.end_time) {
      showMsg('Completa todos los campos');
      return;
    }
    const id = `sb-${Date.now()}`;
    const res = await fetch(`${API}/schedule`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newBlock, id, day }),
    });
    if (res.ok) {
      loadBlocks();
      setShowModal(false);
      showMsg('Bloque agregado');
    } else {
      const err = await res.json();
      showMsg(err.error || 'Error al agregar bloque');
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    const res = await fetch(`${API}/schedule/${blockId}`, { method: 'DELETE' });
    if (res.ok) { loadBlocks(); showMsg('Bloque eliminado'); }
  };

  const handleMouseDown = (block: ScheduleBlock, type: 'move' | 'resize-start' | 'resize-end', e: React.MouseEvent) => {
    e.preventDefault();
    const blockEl = (e.target as HTMLElement).closest('.sb-block') as HTMLElement;
    if (!blockEl) return;
    setDragging({
      id: block.id, type,
      startY: e.clientY,
      origTop: timeToPixels(block.start_time),
      origRoom: block.room_id,
      origDay: day,
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const scrollTop = gridRef.current.scrollTop;
    const deltaY = (e.clientY - dragging.startY) * 1;
    const newPixels = Math.max(0, dragging.origTop + deltaY);

    if (dragging.type === 'move') {
      const block = blocks.find(b => b.id === dragging.id);
      if (!block) return;
      const newTime = pixelsToTime(newPixels);
      const snapped = snapTo10(newTime);
      // Find which room column we're over
      const mouseX = e.clientX - rect.left + gridRef.current.scrollLeft - 48; // account for time label width
      let roomIdx = Math.floor(mouseX / COL_WIDTH);
      roomIdx = Math.max(0, Math.min(rooms.length - 1, roomIdx));
      const targetRoom = rooms[roomIdx]?.id || block.room_id;
      const svc = allServices.find(s => s.id === block.service_id);
      const endT = svc ? calcEndTime(snapped, svc.duration) : block.end_time;
      // Update block visually via DOM
      const el = gridRef.current.querySelector(`[data-block-id="${dragging.id}"]`) as HTMLElement;
      if (el) {
        el.style.top = `${timeToPixels(snapped)}px`;
        el.style.left = `${roomIdx * COL_WIDTH}px`;
      }
    } else if (dragging.type === 'resize-start' || dragging.type === 'resize-end') {
      // Will handle on mouse up for simplicity
    }
  }, [dragging, blocks, rooms, allServices]);

  const handleMouseUp = useCallback(async (e: MouseEvent) => {
    if (!dragging) return;
    const block = blocks.find(b => b.id === dragging.id);
    if (!block) { setDragging(null); return; }

    const rect = gridRef.current?.getBoundingClientRect();
    const scrollTop = gridRef.current?.scrollTop || 0;
    const deltaY = (e.clientY - dragging.startY) * 1;
    const newPixels = Math.max(0, dragging.origTop + deltaY);

    if (dragging.type === 'move') {
      const newTime = pixelsToTime(newPixels);
      const snapped = snapTo10(newTime);
      const mouseX = e.clientX - (rect?.left || 0) + scrollTop - 48;
      let roomIdx = Math.floor(mouseX / COL_WIDTH);
      roomIdx = Math.max(0, Math.min(rooms.length - 1, roomIdx));
      const targetRoomObj = rooms[roomIdx] || rooms.find(r => r.id === block.room_id);
      const targetRoom = targetRoomObj?.id || block.room_id;
      const svc = allServices.find(s => s.id === block.service_id);
      const endT = svc ? calcEndTime(snapped, svc.duration) : block.end_time;

      if (snapped < (targetRoomObj?.open_time || '08:00') || endT > (targetRoomObj?.close_time || '22:00')) {
        showMsg('El bloque no cabe en el horario de la sala');
        setDragging(null);
        return;
      }

      if (snapped !== block.start_time || targetRoom !== block.room_id) {
        const res = await fetch(`${API}/schedule/${dragging.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            day, start_time: snapped, end_time: endT, room_id: targetRoom,
            professional_id: block.professional_id, service_id: block.service_id,
          }),
        });
        if (res.ok) { loadBlocks(); showMsg('Bloque movido'); }
        else { const err = await res.json(); showMsg(err.error || 'Error'); }
      }
    } else if (dragging.type === 'resize-start' || dragging.type === 'resize-end') {
      // Resize: recalculate start or end based on drag
      const svc = allServices.find(s => s.id === block.service_id);
      const blockDuration = svc ? svc.duration : 60;
      const newPixelsStart = dragging.type === 'resize-start'
        ? Math.max(0, dragging.origTop + (e.clientY - dragging.startY))
        : timeToPixels(block.start_time);
      const newPixelsEnd = dragging.type === 'resize-end'
        ? Math.max(newPixelsStart + 10, dragging.origTop + timeToPixels(block.end_time) - timeToPixels(block.start_time) + (e.clientY - dragging.startY))
        : timeToPixels(block.end_time);

      const newStart = pixelsToTime(newPixelsStart);
      const newEnd = pixelsToTime(newPixelsEnd);
      const snappedStart = snapTo10(newStart);
      const snappedEnd = snapTo10(newEnd);

      if (snappedStart !== block.start_time || snappedEnd !== block.end_time) {
        const res = await fetch(`${API}/schedule/${dragging.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            day, start_time: snappedStart, end_time: snappedEnd,
            room_id: block.room_id, professional_id: block.professional_id, service_id: block.service_id,
          }),
        });
        if (res.ok) { loadBlocks(); showMsg('Bloque redimensionado'); }
        else { const err = await res.json(); showMsg(err.error || 'Error'); }
      }
    }

    // Reset visual position
    const el = gridRef.current?.querySelector(`[data-block-id="${dragging.id}"]`) as HTMLElement;
    if (el) { el.style.top = ''; el.style.left = ''; }
    setDragging(null);
  }, [dragging, blocks, rooms, allServices, day, loadBlocks]);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  const filteredBlocks = blocks.filter(b => b.day === day);

  return (
    <div className="select-none">
      {msg && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-sm text-xs font-semibold flex items-center gap-2">
          {msg}
        </div>
      )}

      {/* Day Tabs */}
      <div className="flex flex-wrap border-b border-secondary/10 bg-[#FAF8F5] rounded-t-sm">
        {DAYS.map(d => (
          <button key={d} onClick={() => setDay(d)}
            className={`px-4 py-3 text-[10px] uppercase tracking-widest font-bold border-b-2 transition-all cursor-pointer ${
              day === d ? 'border-primary text-primary bg-white' : 'border-transparent text-text-muted hover:text-secondary'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Grid Container */}
      <div
        ref={gridRef}
        className="overflow-auto relative border border-secondary/10 rounded-b-sm bg-white"
        style={{ maxHeight: 'calc(100vh - 320px)' }}
      >
        <div style={{ position: 'relative', width: rooms.length * COL_WIDTH + 48, minHeight: TOTAL_HOURS * HOUR_HEIGHT + 40 }}>
          
          {/* Header Row (Sticky Top) */}
          <div className="flex sticky top-0 z-40 bg-white" style={{ height: 40 }}>
            {/* Top-Left Corner (Sticky Left & Top) */}
            <div className="sticky left-0 z-50 bg-white border-b border-r border-secondary/10 flex-shrink-0" style={{ width: 48, height: 40 }}></div>
            
            {/* Room headers */}
            {rooms.map((r) => (
              <div key={r.id} className="flex-shrink-0 flex items-center justify-center font-bold text-[9px] uppercase tracking-widest text-text-muted border-b border-r border-secondary/10 bg-[#FAF8F5]"
                style={{ width: COL_WIDTH }}
              >
                {r.name}
              </div>
            ))}
          </div>

          <div className="flex relative">
            {/* Time labels (Sticky Left) */}
            <div className="sticky left-0 z-30 bg-white flex-shrink-0 border-r border-secondary/10" style={{ width: 48 }}>
              {Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i).map(h => (
                <div key={h} className="border-b border-secondary/10 relative" style={{ height: HOUR_HEIGHT }}>
                  <span className="absolute -top-2 right-1 text-[9px] text-text-muted font-mono">{String(h).padStart(2, '0')}:00</span>
                </div>
              ))}
            </div>

            {/* Main Grid content */}
            <div style={{ position: 'relative', width: rooms.length * COL_WIDTH }}>
              {/* Hour grid lines */}
              {Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i).map(h => (
                <div key={h} className="border-b border-secondary/5 absolute w-full pointer-events-none" style={{ top: (h - START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}>
                  <div className="border-t border-secondary/5" style={{ height: '50%', marginTop: HOUR_HEIGHT / 2 }} />
                </div>
              ))}

              {/* Room columns (clickable areas) & Constraints */}
              {rooms.map((r, i) => {
                const openPixels = timeToPixels(r.open_time || '08:00');
                const closePixels = timeToPixels(r.close_time || '22:00');
                return (
                  <div key={r.id}
                    className="absolute top-0 bottom-0 border-r border-secondary/5"
                    style={{ left: i * COL_WIDTH, width: COL_WIDTH }}
                  >
                    {/* Invalid top area */}
                    <div className="absolute w-full bg-gray-100/50" style={{ top: 0, height: openPixels }} />
                    {/* Valid area */}
                    <div className="absolute w-full hover:bg-primary/5 transition-colors cursor-pointer"
                      style={{ top: openPixels, height: closePixels - openPixels }}
                      onMouseDown={(e) => {
                        const target = e.target as HTMLElement;
                        if (!target.closest('.sb-block') && !target.closest('.sb-block-handle')) {
                          handleGridClick(e, r.id);
                        }
                      }}
                    />
                    {/* Invalid bottom area */}
                    <div className="absolute w-full bg-gray-100/50" style={{ top: closePixels, bottom: 0 }} />
                  </div>
                );
              })}

            {/* Blocks */}
            {filteredBlocks.map(block => {
              const top = timeToPixels(block.start_time);
              const bottom = timeToPixels(block.end_time);
              const height = bottom - top;
              const roomIdx = rooms.findIndex(r => r.id === block.room_id);
              if (roomIdx < 0 || height <= 0) return null;
              const color = profColorMap[block.professional_id] || '#6b7280';

              return (
                <motion.div
                  key={block.id}
                  data-block-id={block.id}
                  className="sb-block absolute rounded-sm border shadow-sm overflow-hidden cursor-grab active:cursor-grabbing"
                  style={{
                    top, left: roomIdx * COL_WIDTH + 2,
                    width: COL_WIDTH - 4, height,
                    backgroundColor: `${color}15`,
                    borderColor: color,
                    borderLeftWidth: 3,
                    zIndex: dragging?.id === block.id ? 50 : 10,
                  }}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onMouseDown={(e) => handleMouseDown(block, 'move', e)}
                >
                  {/* Resize handle top */}
                  <div className="sb-block-handle absolute -top-1 left-0 right-0 h-2 cursor-n-resize z-10 hover:bg-black/10"
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(block, 'resize-start', e); }}
                  />
                  {/* Resize handle bottom */}
                  <div className="sb-block-handle absolute -bottom-1 left-0 right-0 h-2 cursor-s-resize z-10 hover:bg-black/10"
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(block, 'resize-end', e); }}
                  />
                  {/* Content */}
                  <div className="p-1.5 text-[10px] leading-tight h-full flex flex-col justify-between">
                    <div>
                      <div className="font-bold truncate" style={{ color }}>{block.professional_name}</div>
                      <div className="text-text-muted truncate">{block.service_name}</div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] text-text-muted font-mono">
                        {block.start_time} - {block.end_time}
                      </span>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteBlock(block.id); }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-red-500 hover:bg-red-50 rounded cursor-pointer"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Empty state */}
            {filteredBlocks.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-text-muted text-sm italic">Haz clic en una sala para agregar un bloque</p>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      {/* Add Block Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-sm shadow-xl border border-secondary/10 p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-serif text-lg font-light text-secondary">Agregar Bloque</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-text-muted hover:text-secondary cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-text-muted block mb-1">Profesional</label>
                <select value={newBlock.professional_id} onChange={e => setNewBlock({ ...newBlock, professional_id: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white"
                >
                  <option value="">Seleccionar</option>
                  {allProfessionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-text-muted block mb-1">Servicio</label>
                <select value={newBlock.service_id} onChange={e => handleServiceChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white"
                >
                  <option value="">Seleccionar</option>
                  {allServices.filter(s => !newBlock.professional_id || s.professionalId === newBlock.professional_id).map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.duration}min)</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-text-muted block mb-1">Sala</label>
                  <select value={newBlock.room_id} onChange={e => setNewBlock({ ...newBlock, room_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white"
                  >
                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-text-muted block mb-1">Inicio</label>
                  <input type="time" value={newBlock.start_time} onChange={e => handleStartTimeChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-secondary/20 rounded-sm bg-white" step="600"
                  />
                </div>
              </div>
              {newBlock.end_time && (
                <div className="text-xs text-text-muted bg-bg-base/30 p-2 rounded-sm">
                  <Clock className="w-3 h-3 inline mr-1" />
                  Fin estimado: <strong>{newBlock.end_time}</strong>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleAddBlock} className="flex-1 bg-primary text-white text-[10px] uppercase font-bold px-4 py-2.5 rounded-sm border border-primary cursor-pointer">
                <Plus className="w-3 h-3 inline mr-1" />
                Agregar
              </button>
              <button onClick={() => setShowModal(false)} className="text-[10px] uppercase font-bold text-text-muted px-4 cursor-pointer">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
