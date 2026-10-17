-- valores_iniciales.sql
-- Seed Data for Centro Integral PsicArte
-- Refactored: Agenda & Booking Module

-- 1. Seed Content (Homepage Customizable Content)
INSERT OR REPLACE INTO content (key, value) VALUES
('heroTitle', 'Centro Integral PsicArte'),
('heroSubtitle', 'Psicología, Talleres, Capacitaciones y Artes Escénicas orientados al bienestar emocional, la expresión personal y el desarrollo humano.'),
('presentationShort', 'PsicArte es un centro integral orientado al bienestar emocional, el desarrollo personal, la expresión creativa y la formación de personas, familias, comunidades educativas y equipos de trabajo.'),
('presentationFull', 'PsicArte es un centro integral orientado al bienestar emocional, el desarrollo personal, la expresión creativa y la formación de personas, familias, comunidades educativas y equipos de trabajo. Integra psicología, talleres, capacitaciones, yoga, teatro y artes escénicas, articulando distintas herramientas para acompañar procesos terapéuticos, educativos, corporales y expresivos.\n\nDesde nuestras distintas áreas de trabajo, abordamos temáticas vinculadas a salud mental, ansiedad, autoestima, desregulación emocional, habilidades sociales, comunicación efectiva, convivencia escolar, autocuidado, manejo de conflictos, bienestar laboral, riesgos psicosociales, expresión escénica, creatividad y desarrollo humano. Nuestro trabajo se sostiene en una mirada ética, respetuosa y humana, donde la psicología y el arte se encuentran como caminos complementarios para comprender, expresar, resignificar y transformar la experiencia personal y colectiva.'),
('mission', 'Nuestra misión es acompañar procesos de bienestar, aprendizaje y desarrollo humano a través de intervenciones psicológicas, talleres, capacitaciones y experiencias corporales y artísticas que integren la salud mental, la educación, el teatro, el yoga y la expresión personal. Trabajamos desde una mirada ética, cercana y contextualizada, adaptando cada proceso a las necesidades de las personas, familias, comunidades educativas, organizaciones o equipos de trabajo que acuden al centro.'),
('vision', 'Aspiramos a que PsicArte sea reconocido como un centro integral que articula salud mental y las artes escénicas, desprendiendo la educación, capacitación y el cuerpo de manera profesional, sensible e innovadora. Nuestra visión es contribuir a una cultura más consciente, empática y colaborativa, donde los servicios que ofrecemos sean herramientas para fortalecer la salud mental, la comunicación, la convivencia, la creatividad y el cuidado de los vínculos.'),
('objectives', 'Fomentar el bienestar emocional y el desarrollo humano integral mediante servicios de psicología, talleres artísticos, capacitaciones y experiencias corporales que promuevan la salud mental, la creatividad y el fortalecimiento de vínculos en personas, familias y comunidades.'),
('contactEmail', 'contacto@psicarte.cl'),
('contactPhone', '+56961676706');

-- 2. Seed Rooms (no openTime/closeTime — moved to room_schedules)
INSERT OR REPLACE INTO rooms (id, name, type) VALUES
('room-1', 'Sala Física Principal', 'Física'),
('room-2', 'Sala Virtual Zoom', 'Virtual');

-- 3. Seed Room Schedules (per day-of-week operating blocks)
-- Room 1: Mon-Fri 8:30-12:00 and 13:00-17:00
INSERT OR REPLACE INTO room_schedules (id, room_id, day_of_week, start_time, end_time) VALUES
('rs-1-1', 'room-1', 1, '08:30', '12:00'),
('rs-1-2', 'room-1', 1, '13:00', '17:00'),
('rs-1-3', 'room-1', 2, '08:30', '12:00'),
('rs-1-4', 'room-1', 2, '13:00', '17:00'),
('rs-1-5', 'room-1', 3, '08:30', '12:00'),
('rs-1-6', 'room-1', 3, '13:00', '17:00'),
('rs-1-7', 'room-1', 4, '08:30', '12:00'),
('rs-1-8', 'room-1', 4, '13:00', '17:00'),
('rs-1-9', 'room-1', 5, '08:30', '12:00'),
('rs-1-10', 'room-1', 5, '13:00', '17:00');

-- Room 2: Mon-Sat 8:30-20:00 (virtual, longer hours)
INSERT OR REPLACE INTO room_schedules (id, room_id, day_of_week, start_time, end_time) VALUES
('rs-2-1', 'room-2', 1, '08:30', '20:00'),
('rs-2-2', 'room-2', 2, '08:30', '20:00'),
('rs-2-3', 'room-2', 3, '08:30', '20:00'),
('rs-2-4', 'room-2', 4, '08:30', '20:00'),
('rs-2-5', 'room-2', 5, '08:30', '20:00'),
('rs-2-6', 'room-2', 6, '08:30', '20:00');

-- 4. Seed Users
-- Admin
INSERT OR REPLACE INTO users (id, email, password, name, role, rut, phone) VALUES
('usr-admin', 'admin@psicarte.cl', '$2b$10$j6vfcBbEJBlu1IgYC3Plm.zG1AbbQ4kLrRI18ALKhhgjyRpbf3UbS', 'Administrador General', 'administrador', '', '');

-- Prestadores
INSERT OR REPLACE INTO users (id, email, password, name, role, rut, phone) VALUES
('prov-ivan', 'ivan@psicarte.cl', '$2b$10$691/H0ahdP1OgYvZkgNW4.vEvbsWcEekZBBrFdiV02t8EydBKnVWa', 'Iván Pastén Fuentes', 'prestador', '', ''),
('prov-valentina', 'valentina@psicarte.cl', '$2b$10$691/H0ahdP1OgYvZkgNW4.vEvbsWcEekZBBrFdiV02t8EydBKnVWa', 'Valentina Maldonado Terroba', 'prestador', '', ''),
('prov-macarena', 'macarena@psicarte.cl', '$2b$10$691/H0ahdP1OgYvZkgNW4.vEvbsWcEekZBBrFdiV02t8EydBKnVWa', 'Macarena Méndez', 'prestador', '', '');

-- Clientes
INSERT OR REPLACE INTO users (id, email, password, name, role, rut, phone) VALUES
('usr-romilio', 'romilio@correo.com', '', 'Romilio Orellana', 'usuario', '15.422.311-K', '+56987654321'),
('usr-renata', 'renata@correo.com', '', 'Renata Jeldes', 'usuario', '18.399.201-9', '+56976543210'),
('usr-sofia', 'sofia@correo.com', '', 'Sofia Molina', 'usuario', '20.144.355-6', '+56965432109'),
('usr-monica', 'monica@correo.com', '', 'Monica Martinez', 'usuario', '12.833.456-7', '+56954321098'),
('usr-matias-a', 'matias.a@correo.com', '', 'Matias Aguirre', 'usuario', '19.344.202-K', '+56943210987'),
('usr-matias-c', 'matias.c@correo.com', '', 'Matias Cortes', 'usuario', '17.444.111-2', '+56932109876'),
('usr-rafael', 'rafael@correo.com', '', 'Rafael Contreras', 'usuario', '16.929.388-3', '+56921098765'),
('usr-patricio', 'patricio@correo.com', '', 'Patricio Fuentes', 'usuario', '14.828.199-4', '+56910987654'),
('usr-paula', 'paula@correo.com', '', 'Paula Novoa', 'usuario', '18.822.455-8', '+56909876543'),
('usr-victor', 'victor@correo.com', '', 'Victor Avila', 'usuario', '15.939.222-1', '+56998765432'),
('usr-camila', 'camila@correo.com', '', 'Camila Maldonado', 'usuario', '21.033.455-K', '+56987654320'),
('usr-benjamin', 'benjamin@correo.com', '', 'Benjamin Tabilo', 'usuario', '19.822.111-0', '+56976543219'),
('usr-jessica', 'jessica@correo.com', '', 'Jessica Cortes', 'usuario', '16.333.109-8', '+56965432198'),
('usr-jose', 'jose@correo.com', '', 'Jose Marin', 'usuario', '13.922.888-5', '+56954321987'),
('usr-cristian', 'cristian@correo.com', '', 'Cristian Alvarez', 'usuario', '17.822.444-1', '+56943219876');

-- 5. Seed Provider Profiles
INSERT OR REPLACE INTO provider_profiles (userId, blocks, bio) VALUES
('prov-ivan', '{"2":["20:00-21:00","21:00-22:00"],"4":["09:00-10:00","10:00-11:00","11:00-12:00","20:00-21:00","21:00-22:00"],"5":["09:00-10:00","10:00-11:00","11:00-12:00","20:00-21:00","21:00-22:00"]}', 'Actor teatral y audiovisual, profesor de teatro, dramaturgo e instructor de yoga, con formación universitaria en actuación y puesta en escena. Mi trabajo integra el arte, la expresión corporal, la comunicación y el bienestar, articulando herramientas escénicas, pedagógicas y socioemocionales para acompañar procesos creativos, educativos y personales.'),
('prov-valentina', '{"2":["20:00-21:00","21:00-22:00"],"4":["09:00-10:00","10:00-11:00","11:00-12:00","20:00-21:00","21:00-22:00"],"5":["09:00-10:00","10:00-11:00","11:00-12:00","20:00-21:00","21:00-22:00"]}', 'Psicóloga clínica titulada de la Universidad Andrés Bello, graduada Cum Laude, con formación en enfoques psicoanalítico, sistémico-narrativo y centrado en soluciones. Cuento con experiencia en atención presencial y online a niños, niñas, adolescentes y adultos, acompañando procesos terapéuticos desde una mirada integral.'),
('prov-macarena', '{"2":["20:00-21:00","21:00-22:00"],"4":["09:00-10:00","10:00-11:00","11:00-12:00","20:00-21:00","21:00-22:00"],"5":["09:00-10:00","10:00-11:00","11:00-12:00","20:00-21:00","21:00-22:00"]}', 'Coordinación de ventas de obras y artes escénicas para empresas, centros educativos o particulares. Reuniones informativas de proyectos teatrales y artísticos en PsicArte.');

-- 6. Seed Services (simplified: no roomId, no recurrence fields)
INSERT OR REPLACE INTO services (id, providerId, name, price, duration, type, allowReschedule, maxReschedules) VALUES
('ivan-s1', 'prov-ivan', 'Coaching de Vida, Personal y Profesional Online', 20990, 50, 'Virtual', 1, 1),
('ivan-s2', 'prov-ivan', 'Talleres: Teatro, expresión corporal, etc.', 20990, 120, 'Física', 0, 1),
('ivan-s3', 'prov-ivan', 'Pack 4 Sesiones de Yoga Presencial', 25990, 50, 'Física', 1, 1),
('ivan-s4', 'prov-ivan', 'Capacitaciones individuales: Habilidades blandas', 20990, 50, 'Virtual', 1, 1),
('ivan-s5', 'prov-ivan', 'Capacitaciones grupales: Habilidades blandas', 60990, 90, 'Física', 1, 1),
('ivan-s6', 'prov-ivan', 'Reunión informativa de capacitaciones', 0, 45, 'Virtual', 1, 1),
('val-s1', 'prov-valentina', 'Psicoterapia Online Preferencial', 20990, 50, 'Virtual', 1, 3),
('val-s2', 'prov-valentina', 'Psicoterapia Online Habilidades Parentales', 25990, 50, 'Virtual', 1, 1),
('val-s3', 'prov-valentina', 'Terapia de Parejas Online', 30990, 50, 'Virtual', 1, 1),
('val-s4', 'prov-valentina', 'Terapia Online Flores de Bach', 20990, 45, 'Virtual', 1, 1),
('val-s5', 'prov-valentina', 'Evaluación Psicológica Online (Relatores/OS-10)', 60990, 50, 'Virtual', 1, 1),
('val-s6', 'prov-valentina', 'Informes y Certificados', 20990, 5, 'Virtual', 1, 1),
('maca-s1', 'prov-macarena', 'Reunión informativa: Venta de obras y artes escénicas', 0, 45, 'Virtual', 1, 1);

-- 7. Seed Service-Rooms (many-to-many, migrated from old service.roomId)
INSERT OR REPLACE INTO service_rooms (id, service_id, room_id) VALUES
('sr-1', 'ivan-s1', 'room-2'),
('sr-2', 'ivan-s2', 'room-1'),
('sr-3', 'ivan-s3', 'room-1'),
('sr-4', 'ivan-s4', 'room-2'),
('sr-5', 'ivan-s5', 'room-1'),
('sr-6', 'ivan-s6', 'room-2'),
('sr-7', 'val-s1', 'room-2'),
('sr-8', 'val-s2', 'room-2'),
('sr-9', 'val-s3', 'room-2'),
('sr-10', 'val-s4', 'room-2'),
('sr-11', 'val-s5', 'room-2'),
('sr-12', 'val-s6', 'room-2'),
('sr-13', 'maca-s1', 'room-2');

-- 8. Seed Agendas (migrated from old service recurrence data)
-- Punctual agendas (old recurrence='single')
INSERT OR REPLACE INTO agendas (id, provider_id, service_id, room_id, type, specific_date, start_time, end_time, status) VALUES
('agenda-ivan-s1', 'prov-ivan', 'ivan-s1', 'room-2', 'punctual', '2026-08-05', '08:30', '20:00', 'published'),
('agenda-ivan-s2', 'prov-ivan', 'ivan-s2', 'room-1', 'punctual', '2026-08-10', '08:30', '17:00', 'published'),
('agenda-ivan-s3', 'prov-ivan', 'ivan-s3', 'room-1', 'punctual', '2026-08-14', '08:30', '17:00', 'published'),
('agenda-ivan-s4', 'prov-ivan', 'ivan-s4', 'room-2', 'punctual', '2026-08-07', '08:30', '20:00', 'published'),
('agenda-ivan-s6', 'prov-ivan', 'ivan-s6', 'room-2', 'punctual', '2026-08-12', '08:30', '20:00', 'published'),
('agenda-val-s1', 'prov-valentina', 'val-s1', 'room-2', 'punctual', '2026-08-06', '08:30', '20:00', 'published'),
('agenda-val-s2', 'prov-valentina', 'val-s2', 'room-2', 'punctual', '2026-08-08', '08:30', '20:00', 'published'),
('agenda-val-s3', 'prov-valentina', 'val-s3', 'room-2', 'punctual', '2026-08-11', '08:30', '20:00', 'published'),
('agenda-val-s4', 'prov-valentina', 'val-s4', 'room-2', 'punctual', '2026-08-13', '08:30', '20:00', 'published'),
('agenda-val-s5', 'prov-valentina', 'val-s5', 'room-2', 'punctual', '2026-08-15', '08:30', '20:00', 'published'),
('agenda-val-s6', 'prov-valentina', 'val-s6', 'room-2', 'punctual', '2026-08-09', '08:30', '20:00', 'published'),
('agenda-maca-s1', 'prov-macarena', 'maca-s1', 'room-2', 'punctual', '2026-08-16', '08:30', '20:00', 'published');

-- Recurrent agenda: ivan-s5 (weekly Thursdays 09:00-12:00, from 2026-01-01)
INSERT OR REPLACE INTO agendas (id, provider_id, service_id, room_id, type, recurrence_rule, start_time, end_time, start_date, end_date, status) VALUES
('agenda-ivan-s5', 'prov-ivan', 'ivan-s5', 'room-1', 'recurrent',
 '{"freq":"WEEKLY","interval":1,"byweekday":[4],"dtstart":"2026-01-01","time_ranges":{"4":{"start":"09:00","end":"12:00"}}}',
 '09:00', '12:00', '2026-01-01', NULL, 'published');

-- 9. Seed Bookings (with client_id linked to users)
INSERT OR REPLACE INTO bookings (id, spot_id, client_id, providerId, serviceId, agendaId, serviceName, price, duration, roomId, roomName, date, timeSlot, startTime, endTime, clientEmail, clientName, clientRut, clientPhone, status) VALUES
('bk-1', NULL, 'usr-romilio', 'prov-valentina', 'val-s1', 'agenda-val-s1', 'Psicoterapia Online Preferencial', 20990, 50, 'room-2', 'Sala Virtual Zoom', '2026-07-28', '10:00-10:50', '10:00', '10:50', 'romilio@correo.com', 'Romilio Orellana', '15.422.311-K', '+56987654321', 'Paid'),
('bk-2', NULL, 'usr-romilio', 'prov-ivan', 'ivan-s3', 'agenda-ivan-s3', 'Pack 4 Sesiones de Yoga Presencial', 25990, 50, 'room-1', 'Sala Física Principal', '2026-08-14', '11:00-11:50', '11:00', '11:50', 'romilio@correo.com', 'Romilio Orellana', '15.422.311-K', '+56987654321', 'Paid');

-- 10. Seed Activities
INSERT OR REPLACE INTO activities (id, title, date, time, location, desc, capacity) VALUES
('act-1', 'Charla Abierta: Ansiedad y Manejo de Estrés', date('now', '+2 days'), '19:00 a 20:30 hrs', 'Sala Virtual Zoom', 'Charla abierta para la comunidad sobre salud mental cotidiana.', 25),
('act-2', 'Taller Comunitario de Expresión Teatral', date('now', '+10 days'), '18:00 a 20:00 hrs', 'Sala Física Principal', 'Taller lúdico de improvisación y juego dramático dirigido por Iván Pastén.', 15),
('act-3', 'Círculo de Apoyo: Crianza Respetuosa', date('now', '+15 days'), '17:00 a 18:30 hrs', 'Sala Física Principal', 'Encuentro reflexivo sobre crianza, límites con amor y contención emocional.', 12),
('act-4', 'Taller de Arteterapia y Expresión Creativa', date('now', '+18 days'), '18:00 a 20:00 hrs', 'Sala Física Principal', 'Taller para explorar emociones a través del arte y la creatividad.', 15),
('act-5', 'Charla: Herramientas para la Comunicación Asertiva', date('now', '+22 days'), '19:00 a 20:30 hrs', 'Sala Virtual Zoom', 'Charla práctica sobre técnicas de comunicación asertiva en el día a día.', 20);

-- 11. Seed Configurations
INSERT OR REPLACE INTO config (key, value) VALUES
('popup_active', 'true'),
('popup_title', 'Aviso de Feriados'),
('popup_text', 'Estimada comunidad, el centro integral PsicArte suspenderá actividades presenciales los días 15 y 16 de Septiembre. Las atenciones virtuales continuarán según acuerdo con su terapeuta.'),
('banner_active', 'true'),
('banner_text', '¡Agende sus horas de consulta en línea de forma rápida y segura! Sistema de pago habilitado.'),
('whatsapp_number', '56952182998'),
('whatsapp_enabled', 'true'),
('max_reschedules', '1');

-- 12. Seed Khipu Notifications
INSERT OR REPLACE INTO khipu_notifications (id, type, headers, query_params, body, ip_address, received_at) VALUES
('notif-1', 'payment_1.3', '{"content-type":"application/x-www-form-urlencoded"}', '{"notification_token":"mock-token-bk-1"}', '{"api_version":"1.3","notification_token":"mock-token-bk-1","receiver_id":"123456","notification_sign":"abc123xyz"}', '127.0.0.1', datetime('now', '-2 hours')),
('notif-2', 'rendition_drn_2.0', '{"content-type":"application/json"}', '{}', '{"report_id":"rep-drn-998","api_version":"DRN-2.0","status":"success","generated_at":"2026-08-04T12:00:00Z","summary":{"total_amount":46980,"count":2}}', '127.0.0.1', datetime('now', '-1 hours')),
('notif-3', 'transaction_dtn_1.0', '{"content-type":"application/json"}', '{}', '{"report_id":"rep-dtn-552","api_version":"DTN-1.0","transactions":[{"payment_id":"khipu-p1","amount":20990,"status":"cleared"},{"payment_id":"khipu-p2","amount":25990,"status":"cleared"}]}', '127.0.0.1', datetime('now', '-10 minutes'));

-- 13. Chilean National Holidays 2026-2030
-- Includes irrenunciables, movables with Tue->Mon/Wed->Fri rule, and Semana Santa
INSERT OR REPLACE INTO holidays (id, date, name) VALUES
('hol-2026-1', '2026-01-01', 'Año Nuevo (2026)'),
('hol-2026-13', '2026-04-02', 'Jueves Santo (2026)'),
('hol-2026-14', '2026-04-03', 'Viernes Santo (2026)'),
('hol-2026-2', '2026-05-01', 'Día del Trabajo (2026)'),
('hol-2026-6', '2026-05-21', 'Glorias Navales (2026)'),
('hol-2026-7', '2026-06-29', 'San Pedro y San Pablo (2026)'),
('hol-2026-8', '2026-07-16', 'Virgen del Carmen (2026)'),
('hol-2026-9', '2026-08-15', 'Asunción de la Virgen (2026)'),
('hol-2026-3', '2026-09-18', 'Primera Junta de Gobierno (2026)'),
('hol-2026-4', '2026-09-19', 'Glorias del Ejército de Chile (2026)'),
('hol-2026-10', '2026-10-12', 'Día de la Raza (2026)'),
('hol-2026-11', '2026-11-01', 'Día de Todos los Santos (2026)'),
('hol-2026-12', '2026-12-07', 'Inmaculada Concepción (2026)'),
('hol-2026-5', '2026-12-25', 'Navidad (2026)'),
('hol-2027-1', '2027-01-01', 'Año Nuevo (2027)'),
('hol-2027-13', '2027-03-25', 'Jueves Santo (2027)'),
('hol-2027-14', '2027-03-26', 'Viernes Santo (2027)'),
('hol-2027-2', '2027-05-01', 'Día del Trabajo (2027)'),
('hol-2027-6', '2027-05-21', 'Glorias Navales (2027)'),
('hol-2027-7', '2027-06-28', 'San Pedro y San Pablo (2027)'),
('hol-2027-8', '2027-07-16', 'Virgen del Carmen (2027)'),
('hol-2027-9', '2027-08-15', 'Asunción de la Virgen (2027)'),
('hol-2027-3', '2027-09-18', 'Primera Junta de Gobierno (2027)'),
('hol-2027-4', '2027-09-19', 'Glorias del Ejército de Chile (2027)'),
('hol-2027-10', '2027-10-11', 'Día de la Raza (2027)'),
('hol-2027-11', '2027-11-01', 'Día de Todos los Santos (2027)'),
('hol-2027-12', '2027-12-10', 'Inmaculada Concepción (2027)'),
('hol-2027-5', '2027-12-25', 'Navidad (2027)'),
('hol-2028-1', '2028-01-01', 'Año Nuevo (2028)'),
('hol-2028-13', '2028-04-13', 'Jueves Santo (2028)'),
('hol-2028-14', '2028-04-14', 'Viernes Santo (2028)'),
('hol-2028-2', '2028-05-01', 'Día del Trabajo (2028)'),
('hol-2028-6', '2028-05-21', 'Glorias Navales (2028)'),
('hol-2028-7', '2028-06-29', 'San Pedro y San Pablo (2028)'),
('hol-2028-8', '2028-07-16', 'Virgen del Carmen (2028)'),
('hol-2028-9', '2028-08-14', 'Asunción de la Virgen (2028)'),
('hol-2028-3', '2028-09-18', 'Primera Junta de Gobierno (2028)'),
('hol-2028-4', '2028-09-19', 'Glorias del Ejército de Chile (2028)'),
('hol-2028-10', '2028-10-12', 'Día de la Raza (2028)'),
('hol-2028-11', '2028-11-03', 'Día de Todos los Santos (2028)'),
('hol-2028-12', '2028-12-08', 'Inmaculada Concepción (2028)'),
('hol-2028-5', '2028-12-25', 'Navidad (2028)'),
('hol-2029-1', '2029-01-01', 'Año Nuevo (2029)'),
('hol-2029-13', '2029-03-29', 'Jueves Santo (2029)'),
('hol-2029-14', '2029-03-30', 'Viernes Santo (2029)'),
('hol-2029-2', '2029-05-01', 'Día del Trabajo (2029)'),
('hol-2029-6', '2029-05-21', 'Glorias Navales (2029)'),
('hol-2029-7', '2029-06-29', 'San Pedro y San Pablo (2029)'),
('hol-2029-8', '2029-07-16', 'Virgen del Carmen (2029)'),
('hol-2029-9', '2029-08-17', 'Asunción de la Virgen (2029)'),
('hol-2029-3', '2029-09-18', 'Primera Junta de Gobierno (2029)'),
('hol-2029-4', '2029-09-19', 'Glorias del Ejército de Chile (2029)'),
('hol-2029-10', '2029-10-12', 'Día de la Raza (2029)'),
('hol-2029-11', '2029-11-01', 'Día de Todos los Santos (2029)'),
('hol-2029-12', '2029-12-08', 'Inmaculada Concepción (2029)'),
('hol-2029-5', '2029-12-25', 'Navidad (2029)'),
('hol-2030-1', '2030-01-01', 'Año Nuevo (2030)'),
('hol-2030-13', '2030-04-18', 'Jueves Santo (2030)'),
('hol-2030-14', '2030-04-19', 'Viernes Santo (2030)'),
('hol-2030-2', '2030-05-01', 'Día del Trabajo (2030)'),
('hol-2030-6', '2030-05-20', 'Glorias Navales (2030)'),
('hol-2030-7', '2030-06-29', 'San Pedro y San Pablo (2030)'),
('hol-2030-8', '2030-07-15', 'Virgen del Carmen (2030)'),
('hol-2030-9', '2030-08-15', 'Asunción de la Virgen (2030)'),
('hol-2030-3', '2030-09-18', 'Primera Junta de Gobierno (2030)'),
('hol-2030-4', '2030-09-19', 'Glorias del Ejército de Chile (2030)'),
('hol-2030-10', '2030-10-12', 'Día de la Raza (2030)'),
('hol-2030-11', '2030-11-01', 'Día de Todos los Santos (2030)'),
('hol-2030-12', '2030-12-08', 'Inmaculada Concepción (2030)'),
('hol-2030-5', '2030-12-25', 'Navidad (2030)');
