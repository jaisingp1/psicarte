-- valores_iniciales_prod.sql
-- Seed Data for Centro Integral PsicArte (Producción Limpia)
-- 1. Seed Content (Homepage Customizable Content)
INSERT
    OR REPLACE INTO content (key, value)
VALUES ('heroTitle', 'Centro Integral PsicArte'),
    (
        'heroSubtitle',
        'Psicología, Talleres, Capacitaciones y Artes Escénicas orientados al bienestar emocional, la expresión personal y el desarrollo humano.'
    ),
    (
        'presentationShort',
        'PsicArte es un centro integral orientado al bienestar emocional, el desarrollo personal, la expresión creativa y la formación de personas, familias, comunidades educativas y equipos de trabajo.'
    ),
    (
        'presentationFull',
        'PsicArte es un centro integral orientado al bienestar emocional, el desarrollo personal, la expresión creativa y la formación de personas, familias, comunidades educativas y equipos de trabajo. Integra psicología, talleres, capacitaciones, yoga, teatro y artes escénicas, articulando distintas herramientas para acompañar procesos terapéuticos, educativos, corporales y expresivos.

Desde nuestras distintas áreas de trabajo, abordamos temáticas vinculadas a salud mental, ansiedad, autoestima, desregulación emocional, habilidades sociales, comunicación efectiva, convivencia escolar, autocuidado, manejo de conflictos, bienestar laboral, riesgos psicosociales, expresión escénica, creatividad y desarrollo humano. Nuestro trabajo se sostiene en una mirada ética, respetuosa y humana, donde la psicología y el arte se encuentran como caminos complementarios para comprender, expresar, resignificar y transformar la experiencia personal y colectiva.'
    ),
    (
        'mission',
        'Nuestra misión es acompañar procesos de bienestar, aprendizaje y desarrollo humano a través de intervenciones psicológicas, talleres, capacitaciones y experiencias corporales y artísticas que integren la salud mental, la educación, el teatro, el yoga y la expresión personal. Trabajamos desde una mirada ética, cercana y contextualizada, adaptando cada proceso a las necesidades de las personas, familias, comunidades educativas, organizaciones o equipos de trabajo que acuden al centro.'
    ),
    (
        'vision',
        'Aspiramos a que PsicArte sea reconocido como un centro integral que articula salud mental y las artes escénicas, desprendiendo la educación, capacitación y el cuerpo de manera profesional, sensible e innovadora. Nuestra visión es contribuir a una cultura más consciente, empática y colaborativa, donde los servicios que ofrecemos sean herramientas para fortalecer la salud mental, la comunicación, la convivencia, la creatividad y el cuidado de los vínculos.'
    ),
    (
        'objectives',
        'Fomentar el bienestar emocional y el desarrollo humano integral mediante servicios de psicología, talleres artísticos, capacitaciones y experiencias corporales que promuevan la salud mental, la creatividad y el fortalecimiento de vínculos en personas, familias y comunidades.'
    ),
    ('contactEmail', 'contacto@centropsicarte.cl'),
    ('contactPhone', '+56961676706'),
    ('contactAddress', 'Oficina Virtual Las Bellotas 199, Providencia, RM');

-- 2. Seed Rooms & Schedules
INSERT
    OR REPLACE INTO rooms (id, name, type, meeting_link)
VALUES ('room-1', 'Sala Física Principal', 'Física', ''),
    ('room-2', 'Sala Virtual Zoom', 'Virtual', 'https://meet.google.com/psicarte-sala-virtual');

INSERT
    OR REPLACE INTO room_schedules (id, room_id, day_of_week, start_time, end_time)
VALUES ('rs-1-1', 'room-1', 1, '08:30', '12:00'),
    ('rs-1-2', 'room-1', 1, '13:00', '17:00'),
    ('rs-1-3', 'room-1', 2, '08:30', '12:00'),
    ('rs-1-4', 'room-1', 2, '13:00', '17:00'),
    ('rs-1-5', 'room-1', 3, '08:30', '12:00'),
    ('rs-1-6', 'room-1', 3, '13:00', '17:00'),
    ('rs-1-7', 'room-1', 4, '08:30', '12:00'),
    ('rs-1-8', 'room-1', 4, '13:00', '17:00'),
    ('rs-1-9', 'room-1', 5, '08:30', '12:00'),
    ('rs-1-10', 'room-1', 5, '13:00', '17:00'),
    ('rs-2-1', 'room-2', 1, '08:30', '20:00'),
    ('rs-2-2', 'room-2', 2, '08:30', '20:00'),
    ('rs-2-3', 'room-2', 3, '08:30', '20:00'),
    ('rs-2-4', 'room-2', 4, '08:30', '20:00'),
    ('rs-2-5', 'room-2', 5, '08:30', '20:00'),
    ('rs-2-6', 'room-2', 6, '08:30', '20:00');

-- 2b. Seed Users (Administrador Inicial y Equipo Profesional)
INSERT
    OR REPLACE INTO users (id, email, password, name, role, rut, phone)
VALUES (
        'usr-admin',
        'admin@centropsicarte.cl',
        '$2b$10$j6vfcBbEJBlu1IgYC3Plm.zG1AbbQ4kLrRI18ALKhhgjyRpbf3UbS',
        'Administrador General',
        'administrador',
        '',
        ''
    ),
    (
        'prov-ivan',
        'ivan@centropsicarte.cl',
        '$2b$10$691/H0ahdP1OgYvZkgNW4.vEvbsWcEekZBBrFdiV02t8EydBKnVWa',
        'Iván Pastén Fuentes',
        'prestador',
        '',
        ''
    ),
    (
        'prov-valentina',
        'valentina@centropsicarte.cl',
        '$2b$10$691/H0ahdP1OgYvZkgNW4.vEvbsWcEekZBBrFdiV02t8EydBKnVWa',
        'Valentina Maldonado Terroba',
        'prestador',
        '',
        ''
    ),
    (
        'prov-macarena',
        'macarena@centropsicarte.cl',
        '$2b$10$691/H0ahdP1OgYvZkgNW4.vEvbsWcEekZBBrFdiV02t8EydBKnVWa',
        'Macarena Zamora',
        'prestador',
        '',
        ''
    );

-- 2c. Seed Provider Profiles
INSERT
    OR REPLACE INTO provider_profiles (userId, specialty, blocks, bio)
VALUES (
        'prov-ivan',
        'Actor, coach, capacitador',
        '{"2":["20:00-21:00","21:00-22:00"],"4":["09:00-10:00","10:00-11:00","11:00-12:00","20:00-21:00","21:00-22:00"],"5":["09:00-10:00","10:00-11:00","11:00-12:00","20:00-21:00","21:00-22:00"]}',
        'Actor teatral y audiovisual, profesor de teatro, dramaturgo e instructor de yoga, con formación universitaria en actuación y puesta en escena. Mi trabajo integra el arte, la expresión corporal, la comunicación y el bienestar, articulando herramientas escénicas, pedagógicas y socioemocionales para acompañar procesos creativos, educativos y personales.'
    ),
    (
        'prov-valentina',
        'Psicóloga clínica y laboral (Registro SIS 710236)',
        '{"2":["20:00-21:00","21:00-22:00"],"4":["09:00-10:00","10:00-11:00","11:00-12:00","20:00-21:00","21:00-22:00"],"5":["09:00-10:00","10:00-11:00","11:00-12:00","20:00-21:00","21:00-22:00"]}',
        'Psicóloga clínica titulada de la Universidad Andrés Bello, graduada Cum Laude, con formación en enfoques psicoanalítico, sistémico-narrativo y centrado en soluciones. Cuento con experiencia en atención presencial y online a niños, niñas, adolescentes y adultos, acompañando procesos terapéuticos desde una mirada integral.'
    ),
    (
        'prov-macarena',
        'Coordinadora eventos',
        '{"2":["20:00-21:00","21:00-22:00"],"4":["09:00-10:00","10:00-11:00","11:00-12:00","20:00-21:00","21:00-22:00"],"5":["09:00-10:00","10:00-11:00","11:00-12:00","20:00-21:00","21:00-22:00"]}',
        'Coordinación de ventas de obras y artes escénicas para empresas, centros educativos o particulares. Reuniones informativas de proyectos teatrales y artísticos en PsicArte.'
    );

-- 2d. Seed Services & Service-Rooms
INSERT
    OR REPLACE INTO services (
        id,
        providerId,
        name,
        price,
        duration,
        type,
        allowReschedule,
        maxReschedules
    )
VALUES (
        'ivan-s1',
        'prov-ivan',
        'Coaching de Vida, Personal y Profesional Online',
        20990,
        50,
        'Virtual',
        1,
        1
    ),
    (
        'ivan-s2',
        'prov-ivan',
        'Talleres: Teatro, expresión corporal, etc.',
        20990,
        120,
        'Física',
        0,
        1
    ),
    (
        'ivan-s3',
        'prov-ivan',
        'Pack 4 Sesiones de Yoga Presencial',
        25990,
        50,
        'Física',
        1,
        1
    ),
    (
        'ivan-s4',
        'prov-ivan',
        'Capacitaciones individuales: Habilidades blandas',
        20990,
        50,
        'Virtual',
        1,
        1
    ),
    (
        'ivan-s5',
        'prov-ivan',
        'Capacitaciones grupales: Habilidades blandas',
        60990,
        90,
        'Física',
        1,
        1
    ),
    (
        'ivan-s6',
        'prov-ivan',
        'Reunión informativa de capacitaciones',
        0,
        45,
        'Virtual',
        1,
        1
    ),
    (
        'val-s1',
        'prov-valentina',
        'Psicoterapia Online Preferencial',
        20990,
        50,
        'Virtual',
        1,
        3
    ),
    (
        'val-s2',
        'prov-valentina',
        'Psicoterapia Online Habilidades Parentales',
        25990,
        50,
        'Virtual',
        1,
        1
    ),
    (
        'val-s3',
        'prov-valentina',
        'Terapia de Parejas Online',
        30990,
        50,
        'Virtual',
        1,
        1
    ),
    (
        'val-s4',
        'prov-valentina',
        'Terapia Online Flores de Bach',
        20990,
        45,
        'Virtual',
        1,
        1
    ),
    (
        'val-s5',
        'prov-valentina',
        'Evaluación Psicológica Online (Relatores/OS-10)',
        60990,
        50,
        'Virtual',
        1,
        1
    ),
    (
        'val-s6',
        'prov-valentina',
        'Informes y Certificados',
        20990,
        5,
        'Virtual',
        1,
        1
    ),
    (
        'maca-s1',
        'prov-macarena',
        'Reunión informativa: Venta de obras y artes escénicas',
        0,
        45,
        'Virtual',
        1,
        1
    );

INSERT
    OR REPLACE INTO service_rooms (id, service_id, room_id)
VALUES ('sr-1', 'ivan-s1', 'room-2'),
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

-- 2e. Seed Agendas
INSERT OR REPLACE INTO agendas (
    id, provider_id, service_id, room_id, type, recurrence_rule, start_time, end_time, start_date, end_date, status
) VALUES
    ('agenda-ivan-s1', 'prov-ivan', 'ivan-s1', 'room-2', 'recurrent', '{"freq":"WEEKLY","interval":1,"byweekday":[1,3],"dtstart":"2026-01-01"}', '09:00', '13:00', '2026-01-01', NULL, 'published'),
    ('agenda-ivan-s2', 'prov-ivan', 'ivan-s2', 'room-1', 'recurrent', '{"freq":"WEEKLY","interval":1,"byweekday":[2],"dtstart":"2026-01-01"}', '09:00', '13:00', '2026-01-01', NULL, 'published'),
    ('agenda-ivan-s3', 'prov-ivan', 'ivan-s3', 'room-1', 'recurrent', '{"freq":"WEEKLY","interval":1,"byweekday":[3],"dtstart":"2026-01-01"}', '14:00', '17:00', '2026-01-01', NULL, 'published'),
    ('agenda-ivan-s4', 'prov-ivan', 'ivan-s4', 'room-2', 'recurrent', '{"freq":"WEEKLY","interval":1,"byweekday":[2,4],"dtstart":"2026-01-01"}', '14:00', '18:00', '2026-01-01', NULL, 'published'),
    ('agenda-ivan-s5', 'prov-ivan', 'ivan-s5', 'room-1', 'recurrent', '{"freq":"WEEKLY","interval":1,"byweekday":[4],"dtstart":"2026-01-01"}', '09:00', '12:00', '2026-01-01', NULL, 'published'),
    ('agenda-ivan-s6', 'prov-ivan', 'ivan-s6', 'room-2', 'recurrent', '{"freq":"WEEKLY","interval":1,"byweekday":[5],"dtstart":"2026-01-01"}', '09:00', '13:00', '2026-01-01', NULL, 'published'),
    ('agenda-val-s1', 'prov-valentina', 'val-s1', 'room-2', 'recurrent', '{"freq":"WEEKLY","interval":1,"byweekday":[1,3,5],"dtstart":"2026-01-01"}', '09:00', '13:00', '2026-01-01', NULL, 'published'),
    ('agenda-val-s2', 'prov-valentina', 'val-s2', 'room-2', 'recurrent', '{"freq":"WEEKLY","interval":1,"byweekday":[2,4],"dtstart":"2026-01-01"}', '09:00', '13:00', '2026-01-01', NULL, 'published'),
    ('agenda-val-s3', 'prov-valentina', 'val-s3', 'room-2', 'recurrent', '{"freq":"WEEKLY","interval":1,"byweekday":[1,3],"dtstart":"2026-01-01"}', '14:00', '18:00', '2026-01-01', NULL, 'published'),
    ('agenda-val-s4', 'prov-valentina', 'val-s4', 'room-2', 'recurrent', '{"freq":"WEEKLY","interval":1,"byweekday":[2,4],"dtstart":"2026-01-01"}', '14:00', '18:00', '2026-01-01', NULL, 'published'),
    ('agenda-val-s5', 'prov-valentina', 'val-s5', 'room-2', 'recurrent', '{"freq":"WEEKLY","interval":1,"byweekday":[5],"dtstart":"2026-01-01"}', '14:00', '18:00', '2026-01-01', NULL, 'published'),
    ('agenda-val-s6', 'prov-valentina', 'val-s6', 'room-2', 'recurrent', '{"freq":"WEEKLY","interval":1,"byweekday":[6],"dtstart":"2026-01-01"}', '10:00', '13:00', '2026-01-01', NULL, 'published'),
    ('agenda-maca-s1', 'prov-macarena', 'maca-s1', 'room-2', 'recurrent', '{"freq":"WEEKLY","interval":1,"byweekday":[1,2,3,4,5],"dtstart":"2026-01-01"}', '15:00', '18:00', '2026-01-01', NULL, 'published');

-- 2f. Seed Community Articles Iniciales
INSERT
    OR REPLACE INTO articles (id, author_id, title, summary, body, status, created_at, updated_at, published_at)
VALUES (
        'art-1',
        'prov-valentina',
        'Salud Mental y Expresión Creativa: Un puente hacia el bienestar',
        'Cómo la integración de la psicoterapia y las herramientas expresivas fortalece los procesos de autoconocimiento y regulación emocional.',
        'En Centro Integral PsicArte comprendemos que cada proceso humano requiere distintas formas de expresión y elaboración.

Integrar el espacio psicoterapéutico con herramientas corporales y escénicas permite abordar la ansiedad, el estrés laboral y los desafíos vinculares desde una perspectiva ética, cercana y respetuosa del ritmo de cada persona.',
        'published',
        datetime('now', '-5 days'),
        datetime('now', '-5 days'),
        datetime('now', '-5 days')
    ),
    (
        'art-2',
        'prov-ivan',
        'El Cuerpo y la Voz en la Comunicación Efectiva',
        'Herramientas de las artes escénicas aplicadas al desarrollo de habilidades blandas, liderazgo y convivencia en equipos de trabajo.',
        'La comunicación efectiva no ocurre únicamente desde la palabra hablada: involucra la presencia corporal, la escucha activa y el reconocimiento del otro.

A través del entrenamiento escénico y el coaching, acompañamos a personas, comunidades educativas y organizaciones a fortalecer sus habilidades socioemocionales y expresivas.',
        'published',
        datetime('now', '-2 days'),
        datetime('now', '-2 days'),
        datetime('now', '-2 days')
    );

-- 3. Seed Configurations
INSERT
    OR REPLACE INTO config (key, value)
VALUES ('popup_active', 'false'),
    ('popup_title', ''),
    ('popup_text', ''),
    ('banner_active', 'false'),
    ('banner_text', '¡Agende sus horas de consulta en línea de forma rápida y segura! Sistema de pago habilitado.'),
    ('whatsapp_number', '56961676706'),
    ('whatsapp_enabled', 'true'),
    ('instagram_url', 'https://www.instagram.com/centropsicarte/'),
    ('max_reschedules', '1'),
    ('theme_custom_tokens', '{"light":{"--bg-primary":"#FEFDF9","--bg-secondary":"#F7F1E2","--text-primary":"#001B40","--text-secondary":"#4A5568","--color-accent":"#782050","--color-accent-text":"#FEFDF9","--color-border":"#E2E8F0","--color-navy":"#001B40","--color-gold":"#D8A048","--color-pomegranate":"#782050","--header-bg":"#FEFDF9","--header-border":"#E2E8F0","--nav-link-color":"#001B40","--nav-link-accent":"#782050","--footer-bg":"#001B40","--footer-text":"#FEFDF9","--footer-accent":"#D8A048","--footer-border":"#2D4363","--btn-primary-bg":"#782050","--btn-primary-text":"#FEFDF9","--btn-secondary-bg":"#FEFDF9","--btn-secondary-text":"#001B40","--btn-secondary-border":"#E2E8F0","--btn-icon-bg":"#FEFDF9","--btn-icon-text":"#001B40","--input-bg":"#F7F1E2","--input-text":"#001B40","--input-border":"#E2E8F0","--input-focus-border":"#782050","--bg-card":"#FFFFFF","--card-border":"#E2E8F0","--card-hover-border":"#782050","--service-price-color":"#782050","--color-online":"#802850","--color-online-text":"#FEFDF9","--color-in-person":"#B88028","--color-in-person-text":"#001B40","--filter-active-bg":"#782050","--filter-active-text":"#FEFDF9","--modal-bg":"#FFFFFF","--modal-text":"#001B40","--modal-border":"#E2E8F0","--modal-overlay-color":"#001933","--popup-title-color":"#782050","--banner-bg":"#782050","--banner-text":"#FFF9F3","--booking-widget-bg":"#FFFFFF","--step-active-bg":"#782050","--step-active-text":"#FEFDF9","--cal-cell-bg":"#F7F1E2","--cal-cell-text":"#001B40","--cal-selected-bg":"#782050","--cal-selected-text":"#FEFDF9","--slot-bg":"#F7F1E2","--slot-text":"#001B40","--slot-selected-bg":"#782050","--slot-selected-text":"#FEFDF9","--color-success":"#2F855A","--color-warning":"#B75012","--color-error":"#C53030","--color-info":"#2B6CB0","--toast-bg":"#FFFFFF","--toast-text":"#001B40","--whatsapp-bg":"#1E8E46","--whatsapp-text":"#FFFFFF"},"dark":{"--bg-primary":"#031C32","--bg-secondary":"#0A2542","--text-primary":"#FEFDF9","--text-secondary":"#CBD5E1","--color-accent":"#D8A048","--color-accent-text":"#001B40","--color-border":"#1E3A5F","--color-navy":"#001B40","--color-gold":"#D8A048","--color-pomegranate":"#782050","--header-bg":"#031C32","--header-border":"#1E3A5F","--nav-link-color":"#FEFDF9","--nav-link-accent":"#D8A048","--footer-bg":"#001B40","--footer-text":"#FEFDF9","--footer-accent":"#D8A048","--footer-border":"#1E3A5F","--btn-primary-bg":"#D8A048","--btn-primary-text":"#001B40","--btn-secondary-bg":"#0D2C4D","--btn-secondary-text":"#FEFDF9","--btn-secondary-border":"#1E3A5F","--btn-icon-bg":"#0D2C4D","--btn-icon-text":"#FEFDF9","--input-bg":"#0A2542","--input-text":"#FEFDF9","--input-border":"#1E3A5F","--input-focus-border":"#D8A048","--bg-card":"#0D2C4D","--card-border":"#1E3A5F","--card-hover-border":"#D8A048","--service-price-color":"#D8A048","--color-online":"#802850","--color-online-text":"#FEFDF9","--color-in-person":"#D8A048","--color-in-person-text":"#001B40","--filter-active-bg":"#D8A048","--filter-active-text":"#001B40","--modal-bg":"#0D2C4D","--modal-text":"#FEFDF9","--modal-border":"#1E3A5F","--modal-overlay-color":"#000D1A","--popup-title-color":"#D8A048","--banner-bg":"#782050","--banner-text":"#FFF9F3","--booking-widget-bg":"#0D2C4D","--step-active-bg":"#D8A048","--step-active-text":"#001B40","--cal-cell-bg":"#0A2542","--cal-cell-text":"#FEFDF9","--cal-selected-bg":"#D8A048","--cal-selected-text":"#001B40","--slot-bg":"#0A2542","--slot-text":"#FEFDF9","--slot-selected-bg":"#D8A048","--slot-selected-text":"#001B40","--color-success":"#48BB78","--color-warning":"#F6AD55","--color-error":"#FC8181","--color-info":"#63B3ED","--toast-bg":"#0D2C4D","--toast-text":"#FEFDF9","--whatsapp-bg":"#25D366","--whatsapp-text":"#001B40"},"defaults":{"light":{"--bg-primary":"#FEFDF9","--bg-secondary":"#F7F1E2","--text-primary":"#001B40","--text-secondary":"#4A5568","--color-accent":"#782050","--color-accent-text":"#FEFDF9","--color-border":"#E2E8F0","--color-navy":"#001B40","--color-gold":"#D8A048","--color-pomegranate":"#782050","--header-bg":"#FEFDF9","--header-border":"#E2E8F0","--nav-link-color":"#001B40","--nav-link-accent":"#782050","--footer-bg":"#001B40","--footer-text":"#FEFDF9","--footer-accent":"#D8A048","--footer-border":"#2D4363","--btn-primary-bg":"#782050","--btn-primary-text":"#FEFDF9","--btn-secondary-bg":"#FEFDF9","--btn-secondary-text":"#001B40","--btn-secondary-border":"#E2E8F0","--btn-icon-bg":"#FEFDF9","--btn-icon-text":"#001B40","--input-bg":"#F7F1E2","--input-text":"#001B40","--input-border":"#E2E8F0","--input-focus-border":"#782050","--bg-card":"#FFFFFF","--card-border":"#E2E8F0","--card-hover-border":"#782050","--service-price-color":"#782050","--color-online":"#802850","--color-online-text":"#FEFDF9","--color-in-person":"#B88028","--color-in-person-text":"#001B40","--filter-active-bg":"#782050","--filter-active-text":"#FEFDF9","--modal-bg":"#FFFFFF","--modal-text":"#001B40","--modal-border":"#E2E8F0","--modal-overlay-color":"#001933","--popup-title-color":"#782050","--banner-bg":"#782050","--banner-text":"#FFF9F3","--booking-widget-bg":"#FFFFFF","--step-active-bg":"#782050","--step-active-text":"#FEFDF9","--cal-cell-bg":"#F7F1E2","--cal-cell-text":"#001B40","--cal-selected-bg":"#782050","--cal-selected-text":"#FEFDF9","--slot-bg":"#F7F1E2","--slot-text":"#001B40","--slot-selected-bg":"#782050","--slot-selected-text":"#FEFDF9","--color-success":"#2F855A","--color-warning":"#B75012","--color-error":"#C53030","--color-info":"#2B6CB0","--toast-bg":"#FFFFFF","--toast-text":"#001B40","--whatsapp-bg":"#1E8E46","--whatsapp-text":"#FFFFFF"},"dark":{"--bg-primary":"#031C32","--bg-secondary":"#0A2542","--text-primary":"#FEFDF9","--text-secondary":"#CBD5E1","--color-accent":"#D8A048","--color-accent-text":"#001B40","--color-border":"#1E3A5F","--color-navy":"#001B40","--color-gold":"#D8A048","--color-pomegranate":"#782050","--header-bg":"#031C32","--header-border":"#1E3A5F","--nav-link-color":"#FEFDF9","--nav-link-accent":"#D8A048","--footer-bg":"#001B40","--footer-text":"#FEFDF9","--footer-accent":"#D8A048","--footer-border":"#1E3A5F","--btn-primary-bg":"#D8A048","--btn-primary-text":"#001B40","--btn-secondary-bg":"#0D2C4D","--btn-secondary-text":"#FEFDF9","--btn-secondary-border":"#1E3A5F","--btn-icon-bg":"#0D2C4D","--btn-icon-text":"#FEFDF9","--input-bg":"#0A2542","--input-text":"#FEFDF9","--input-border":"#1E3A5F","--input-focus-border":"#D8A048","--bg-card":"#0D2C4D","--card-border":"#1E3A5F","--card-hover-border":"#D8A048","--service-price-color":"#D8A048","--color-online":"#802850","--color-online-text":"#FEFDF9","--color-in-person":"#D8A048","--color-in-person-text":"#001B40","--filter-active-bg":"#D8A048","--filter-active-text":"#001B40","--modal-bg":"#0D2C4D","--modal-text":"#FEFDF9","--modal-border":"#1E3A5F","--modal-overlay-color":"#000D1A","--popup-title-color":"#D8A048","--banner-bg":"#782050","--banner-text":"#FFF9F3","--booking-widget-bg":"#0D2C4D","--step-active-bg":"#D8A048","--step-active-text":"#001B40","--cal-cell-bg":"#0A2542","--cal-cell-text":"#FEFDF9","--cal-selected-bg":"#D8A048","--cal-selected-text":"#001B40","--slot-bg":"#0A2542","--slot-text":"#FEFDF9","--slot-selected-bg":"#D8A048","--slot-selected-text":"#001B40","--color-success":"#48BB78","--color-warning":"#F6AD55","--color-error":"#FC8181","--color-info":"#63B3ED","--toast-bg":"#0D2C4D","--toast-text":"#FEFDF9","--whatsapp-bg":"#25D366","--whatsapp-text":"#001B40"}}}');

-- 13. Chilean National Holidays 2026-2030
-- Includes irrenunciables, movables with Tue->Mon/Wed->Fri rule, and Semana Santa
INSERT
    OR REPLACE INTO holidays (id, date, name)
VALUES ('hol-2026-1', '2026-01-01', 'Año Nuevo (2026)'),
    (
        'hol-2026-13',
        '2026-04-02',
        'Jueves Santo (2026)'
    ),
    (
        'hol-2026-14',
        '2026-04-03',
        'Viernes Santo (2026)'
    ),
    (
        'hol-2026-2',
        '2026-05-01',
        'Día del Trabajo (2026)'
    ),
    (
        'hol-2026-6',
        '2026-05-21',
        'Glorias Navales (2026)'
    ),
    (
        'hol-2026-7',
        '2026-06-29',
        'San Pedro y San Pablo (2026)'
    ),
    (
        'hol-2026-8',
        '2026-07-16',
        'Virgen del Carmen (2026)'
    ),
    (
        'hol-2026-9',
        '2026-08-15',
        'Asunción de la Virgen (2026)'
    ),
    (
        'hol-2026-3',
        '2026-09-18',
        'Primera Junta de Gobierno (2026)'
    ),
    (
        'hol-2026-4',
        '2026-09-19',
        'Glorias del Ejército de Chile (2026)'
    ),
    (
        'hol-2026-10',
        '2026-10-12',
        'Día de la Raza (2026)'
    ),
    (
        'hol-2026-11',
        '2026-11-01',
        'Día de Todos los Santos (2026)'
    ),
    (
        'hol-2026-12',
        '2026-12-07',
        'Inmaculada Concepción (2026)'
    ),
    ('hol-2026-5', '2026-12-25', 'Navidad (2026)'),
    ('hol-2027-1', '2027-01-01', 'Año Nuevo (2027)'),
    (
        'hol-2027-13',
        '2027-03-25',
        'Jueves Santo (2027)'
    ),
    (
        'hol-2027-14',
        '2027-03-26',
        'Viernes Santo (2027)'
    ),
    (
        'hol-2027-2',
        '2027-05-01',
        'Día del Trabajo (2027)'
    ),
    (
        'hol-2027-6',
        '2027-05-21',
        'Glorias Navales (2027)'
    ),
    (
        'hol-2027-7',
        '2027-06-28',
        'San Pedro y San Pablo (2027)'
    ),
    (
        'hol-2027-8',
        '2027-07-16',
        'Virgen del Carmen (2027)'
    ),
    (
        'hol-2027-9',
        '2027-08-15',
        'Asunción de la Virgen (2027)'
    ),
    (
        'hol-2027-3',
        '2027-09-18',
        'Primera Junta de Gobierno (2027)'
    ),
    (
        'hol-2027-4',
        '2027-09-19',
        'Glorias del Ejército de Chile (2027)'
    ),
    (
        'hol-2027-10',
        '2027-10-11',
        'Día de la Raza (2027)'
    ),
    (
        'hol-2027-11',
        '2027-11-01',
        'Día de Todos los Santos (2027)'
    ),
    (
        'hol-2027-12',
        '2027-12-10',
        'Inmaculada Concepción (2027)'
    ),
    ('hol-2027-5', '2027-12-25', 'Navidad (2027)'),
    ('hol-2028-1', '2028-01-01', 'Año Nuevo (2028)'),
    (
        'hol-2028-13',
        '2028-04-13',
        'Jueves Santo (2028)'
    ),
    (
        'hol-2028-14',
        '2028-04-14',
        'Viernes Santo (2028)'
    ),
    (
        'hol-2028-2',
        '2028-05-01',
        'Día del Trabajo (2028)'
    ),
    (
        'hol-2028-6',
        '2028-05-21',
        'Glorias Navales (2028)'
    ),
    (
        'hol-2028-7',
        '2028-06-29',
        'San Pedro y San Pablo (2028)'
    ),
    (
        'hol-2028-8',
        '2028-07-16',
        'Virgen del Carmen (2028)'
    ),
    (
        'hol-2028-9',
        '2028-08-14',
        'Asunción de la Virgen (2028)'
    ),
    (
        'hol-2028-3',
        '2028-09-18',
        'Primera Junta de Gobierno (2028)'
    ),
    (
        'hol-2028-4',
        '2028-09-19',
        'Glorias del Ejército de Chile (2028)'
    ),
    (
        'hol-2028-10',
        '2028-10-12',
        'Día de la Raza (2028)'
    ),
    (
        'hol-2028-11',
        '2028-11-03',
        'Día de Todos los Santos (2028)'
    ),
    (
        'hol-2028-12',
        '2028-12-08',
        'Inmaculada Concepción (2028)'
    ),
    ('hol-2028-5', '2028-12-25', 'Navidad (2028)'),
    ('hol-2029-1', '2029-01-01', 'Año Nuevo (2029)'),
    (
        'hol-2029-13',
        '2029-03-29',
        'Jueves Santo (2029)'
    ),
    (
        'hol-2029-14',
        '2029-03-30',
        'Viernes Santo (2029)'
    ),
    (
        'hol-2029-2',
        '2029-05-01',
        'Día del Trabajo (2029)'
    ),
    (
        'hol-2029-6',
        '2029-05-21',
        'Glorias Navales (2029)'
    ),
    (
        'hol-2029-7',
        '2029-06-29',
        'San Pedro y San Pablo (2029)'
    ),
    (
        'hol-2029-8',
        '2029-07-16',
        'Virgen del Carmen (2029)'
    ),
    (
        'hol-2029-9',
        '2029-08-17',
        'Asunción de la Virgen (2029)'
    ),
    (
        'hol-2029-3',
        '2029-09-18',
        'Primera Junta de Gobierno (2029)'
    ),
    (
        'hol-2029-4',
        '2029-09-19',
        'Glorias del Ejército de Chile (2029)'
    ),
    (
        'hol-2029-10',
        '2029-10-12',
        'Día de la Raza (2029)'
    ),
    (
        'hol-2029-11',
        '2029-11-01',
        'Día de Todos los Santos (2029)'
    ),
    (
        'hol-2029-12',
        '2029-12-08',
        'Inmaculada Concepción (2029)'
    ),
    ('hol-2029-5', '2029-12-25', 'Navidad (2029)'),
    ('hol-2030-1', '2030-01-01', 'Año Nuevo (2030)'),
    (
        'hol-2030-13',
        '2030-04-18',
        'Jueves Santo (2030)'
    ),
    (
        'hol-2030-14',
        '2030-04-19',
        'Viernes Santo (2030)'
    ),
    (
        'hol-2030-2',
        '2030-05-01',
        'Día del Trabajo (2030)'
    ),
    (
        'hol-2030-6',
        '2030-05-20',
        'Glorias Navales (2030)'
    ),
    (
        'hol-2030-7',
        '2030-06-29',
        'San Pedro y San Pablo (2030)'
    ),
    (
        'hol-2030-8',
        '2030-07-15',
        'Virgen del Carmen (2030)'
    ),
    (
        'hol-2030-9',
        '2030-08-15',
        'Asunción de la Virgen (2030)'
    ),
    (
        'hol-2030-3',
        '2030-09-18',
        'Primera Junta de Gobierno (2030)'
    ),
    (
        'hol-2030-4',
        '2030-09-19',
        'Glorias del Ejército de Chile (2030)'
    ),
    (
        'hol-2030-10',
        '2030-10-12',
        'Día de la Raza (2030)'
    ),
    (
        'hol-2030-11',
        '2030-11-01',
        'Día de Todos los Santos (2030)'
    ),
    (
        'hol-2030-12',
        '2030-12-08',
        'Inmaculada Concepción (2030)'
    ),
    ('hol-2030-5', '2030-12-25', 'Navidad (2030)');
