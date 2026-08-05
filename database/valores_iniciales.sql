-- valores_iniciales.sql
-- Seed Data for Centro Integral PsicArte

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

-- 2. Seed Rooms
INSERT OR REPLACE INTO rooms (id, name, type, openTime, closeTime) VALUES
('room-1', 'Sala Física Principal', 'Física', '08:30', '18:30'),
('room-2', 'Sala Virtual Zoom', 'Virtual', '08:30', '18:30');

-- 3. Seed Providers
-- blocks contains Tuesday (2), Thursday (4) and Friday (5) slot arrays in JSON format
INSERT OR REPLACE INTO providers (id, name, role, email, blocks, bio) VALUES
('prov-ivan', 'Iván Pastén Fuentes', 'Actor & Instructor de Yoga (8 años exp.)', 'ivan@psicarte.cl', '{"2":["20:00-21:00","21:00-22:00"],"4":["09:00-10:00","10:00-11:00","11:00-12:00","20:00-21:00","21:00-22:00"],"5":["09:00-10:00","10:00-11:00","11:00-12:00","20:00-21:00","21:00-22:00"]}', 'Actor teatral y audiovisual, profesor de teatro, dramaturgo e instructor de yoga, con formación universitaria en actuación y puesta en escena. Mi trabajo integra el arte, la expresión corporal, la comunicación y el bienestar, articulando herramientas escénicas, pedagógicas y socioemocionales para acompañar procesos creativos, educativos y personales.'),
('prov-valentina', 'Valentina Maldonado Terroba', 'Psicóloga Clínica (5 años exp.)', 'valentina@psicarte.cl', '{"2":["20:00-21:00","21:00-22:00"],"4":["09:00-10:00","10:00-11:00","11:00-12:00","20:00-21:00","21:00-22:00"],"5":["09:00-10:00","10:00-11:00","11:00-12:00","20:00-21:00","21:00-22:00"]}', 'Psicóloga clínica titulada de la Universidad Andrés Bello, graduada Cum Laude, con formación en enfoques psicoanalítico, sistémico-narrativo y centrado en soluciones. Cuento con experiencia en atención presencial y online a niños, niñas, adolescentes y adultos, acompañando procesos terapéuticos desde una mirada integral.'),
('prov-macarena', 'Macarena Méndez', 'Gestora Cultural & Coordinadora', 'macarena@psicarte.cl', '{"2":["20:00-21:00","21:00-22:00"],"4":["09:00-10:00","10:00-11:00","11:00-12:00","20:00-21:00","21:00-22:00"],"5":["09:00-10:00","10:00-11:00","11:00-12:00","20:00-21:00","21:00-22:00"]}', 'Coordinación de ventas de obras y artes escénicas para empresas, centros educativos o particulares. Reuniones informativas de proyectos teatrales y artísticos en PsicArte.');

-- 4. Seed Services
INSERT OR REPLACE INTO services (id, providerId, name, price, duration, type, allowReschedule, maxReschedules) VALUES
-- Ivan Services
('ivan-s1', 'prov-ivan', 'Coaching de Vida, Personal y Profesional Online', 20990, 50, 'Virtual', 1, 1),
('ivan-s2', 'prov-ivan', 'Talleres: Teatro, expresión corporal, etc.', 20990, 120, 'Física', 0, 1),
('ivan-s3', 'prov-ivan', 'Pack 4 Sesiones de Yoga Presencial', 25990, 50, 'Física', 1, 1),
('ivan-s4', 'prov-ivan', 'Capacitaciones individuales: Habilidades blandas', 20990, 50, 'Virtual', 1, 1),
('ivan-s5', 'prov-ivan', 'Capacitaciones grupales: Habilidades blandas', 60990, 90, 'Física', 1, 1),
('ivan-s6', 'prov-ivan', 'Reunión informativa de capacitaciones', 0, 45, 'Virtual', 1, 1),
-- Valentina Services
('val-s1', 'prov-valentina', 'Psicoterapia Online Preferencial', 20990, 50, 'Virtual', 1, 3),
('val-s2', 'prov-valentina', 'Psicoterapia Online Habilidades Parentales', 25990, 50, 'Virtual', 1, 1),
('val-s3', 'prov-valentina', 'Terapia de Parejas Online', 30990, 50, 'Virtual', 1, 1),
('val-s4', 'prov-valentina', 'Terapia Online Flores de Bach', 20990, 45, 'Virtual', 1, 1),
('val-s5', 'prov-valentina', 'Evaluación Psicológica Online (Relatores/OS-10)', 60990, 50, 'Virtual', 1, 1),
('val-s6', 'prov-valentina', 'Informes y Certificados', 20990, 5, 'Virtual', 1, 1),
-- Macarena Services
('maca-s1', 'prov-macarena', 'Reunión informativa: Venta de obras y artes escénicas', 0, 45, 'Virtual', 1, 1);

-- 5. Seed Clients (Cartera de Clientes Mock)
INSERT OR REPLACE INTO clients (email, name, rut, phone) VALUES
('romilio@correo.com', 'Romilio Orellana', '15.422.311-K', '+56987654321'),
('renata@correo.com', 'Renata Jeldes', '18.399.201-9', '+56976543210'),
('sofia@correo.com', 'Sofia Molina', '20.144.355-6', '+56965432109'),
('monica@correo.com', 'Monica Martinez', '12.833.456-7', '+56954321098'),
('matias.a@correo.com', 'Matias Aguirre', '19.344.202-K', '+56943210987'),
('matias.c@correo.com', 'Matias Cortes', '17.444.111-2', '+56932109876'),
('rafael@correo.com', 'Rafael Contreras', '16.929.388-3', '+56921098765'),
('patricio@correo.com', 'Patricio Fuentes', '14.828.199-4', '+56910987654'),
('paula@correo.com', 'Paula Novoa', '18.822.455-8', '+56909876543'),
('victor@correo.com', 'Victor Avila', '15.939.222-1', '+56998765432'),
('camila@correo.com', 'Camila Maldonado', '21.033.455-K', '+56987654320'),
('benjamin@correo.com', 'Benjamin Tabilo', '19.822.111-0', '+56976543219'),
('jessica@correo.com', 'Jessica Cortes', '16.333.109-8', '+56965432198'),
('jose@correo.com', 'Jose Marin', '13.922.888-5', '+56954321987'),
('cristian@correo.com', 'Cristian Alvarez', '17.822.444-1', '+56943219876');

-- 6. Seed Bookings
INSERT OR REPLACE INTO bookings (id, providerId, serviceId, serviceName, price, duration, roomId, roomName, date, timeSlot, startTime, endTime, clientEmail, clientName, clientRut, clientPhone, status) VALUES
('bk-1', 'prov-valentina', 'val-s1', 'Psicoterapia Online Preferencial', 20990, 50, 'room-2', 'Sala Virtual Zoom', '2026-07-28', '10:00-11:00', '10:00', '10:50', 'romilio@correo.com', 'Romilio Orellana', '15.422.311-K', '+56987654321', 'Paid'),
('bk-2', 'prov-ivan', 'ivan-s3', 'Pack 4 Sesiones de Yoga Presencial', 25990, 50, 'room-1', 'Sala Física Principal', '2026-08-14', '11:00-12:00', '11:00', '11:50', 'romilio@correo.com', 'Romilio Orellana', '15.422.311-K', '+56987654321', 'Paid');

-- 7. Seed Activities
INSERT OR REPLACE INTO activities (id, title, date, time, location, desc, capacity) VALUES
('act-1', 'Charla Abierta: Ansiedad y Manejo de Estrés', date('now', '+2 days'), '19:00 a 20:30 hrs', 'Sala Virtual Zoom', 'Charla abierta para la comunidad sobre salud mental cotidiana.', 25),
('act-2', 'Taller Comunitario de Expresión Teatral', date('now', '+10 days'), '18:00 a 20:00 hrs', 'Sala Física Principal', 'Taller lúdico de improvisación y juego dramático dirigido por Iván Pastén.', 15),
('act-3', 'Círculo de Apoyo: Crianza Respetuosa', date('now', '+15 days'), '17:00 a 18:30 hrs', 'Sala Física Principal', 'Encuentro reflexivo sobre crianza, límites con amor y contención emocional.', 12),
('act-4', 'Taller de Arteterapia y Expresión Creativa', date('now', '+18 days'), '18:00 a 20:00 hrs', 'Sala Física Principal', 'Taller para explorar emociones a través del arte y la creatividad.', 15),
('act-5', 'Charla: Herramientas para la Comunicación Asertiva', date('now', '+22 days'), '19:00 a 20:30 hrs', 'Sala Virtual Zoom', 'Charla práctica sobre técnicas de comunicación asertiva en el día a día.', 20);

-- 8. Seed Configurations
INSERT OR REPLACE INTO config (key, value) VALUES
('popup_active', 'true'),
('popup_title', 'Aviso de Feriados'),
('popup_text', 'Estimada comunidad, el centro integral PsicArte suspenderá actividades presenciales los días 15 y 16 de Septiembre. Las atenciones virtuales continuarán según acuerdo con su terapeuta.'),
('banner_active', 'true'),
('banner_text', '¡Agende sus horas de consulta en línea de forma rápida y segura! Sistema de pago habilitado.'),
('whatsapp_number', '56952182998'),
('whatsapp_enabled', 'true'),
('max_reschedules', '1');

-- 9. Seed Khipu Notifications
INSERT OR REPLACE INTO khipu_notifications (id, type, headers, query_params, body, ip_address, received_at) VALUES
('notif-1', 'payment_1.3', '{"content-type":"application/x-www-form-urlencoded"}', '{"notification_token":"mock-token-bk-1"}', '{"api_version":"1.3","notification_token":"mock-token-bk-1","receiver_id":"123456","notification_sign":"abc123xyz"}', '127.0.0.1', datetime('now', '-2 hours')),
('notif-2', 'rendition_drn_2.0', '{"content-type":"application/json"}', '{}', '{"report_id":"rep-drn-998","api_version":"DRN-2.0","status":"success","generated_at":"2026-08-04T12:00:00Z","summary":{"total_amount":46980,"count":2}}', '127.0.0.1', datetime('now', '-1 hours')),
('notif-3', 'transaction_dtn_1.0', '{"content-type":"application/json"}', '{}', '{"report_id":"rep-dtn-552","api_version":"DTN-1.0","transactions":[{"payment_id":"khipu-p1","amount":20990,"status":"cleared"},{"payment_id":"khipu-p2","amount":25990,"status":"cleared"}]}', '127.0.0.1', datetime('now', '-10 minutes'));

-- 10. Seed Users
INSERT OR REPLACE INTO users (id, email, password, name, role, rut, phone) VALUES
('usr-admin', 'admin@psicarte.cl', '$2b$10$j6vfcBbEJBlu1IgYC3Plm.zG1AbbQ4kLrRI18ALKhhgjyRpbf3UbS', 'Administrador General', 'administrador', '', ''),
('usr-ivan', 'ivan@psicarte.cl', '$2b$10$691/H0ahdP1OgYvZkgNW4.vEvbsWcEekZBBrFdiV02t8EydBKnVWa', 'Iván Pastén Fuentes', 'prestador', '', ''),
('usr-valentina', 'valentina@psicarte.cl', '$2b$10$691/H0ahdP1OgYvZkgNW4.vEvbsWcEekZBBrFdiV02t8EydBKnVWa', 'Valentina Maldonado Terroba', 'prestador', '', ''),
('usr-macarena', 'macarena@psicarte.cl', '$2b$10$691/H0ahdP1OgYvZkgNW4.vEvbsWcEekZBBrFdiV02t8EydBKnVWa', 'Macarena Méndez', 'prestador', '', '');

