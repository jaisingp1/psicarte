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
        'PsicArte es un centro integral orientado al bienestar emocional, el desarrollo personal, la expresión creativa y la formación de personas, familias, comunidades educativas y equipos de trabajo. Integra psicología, talleres, capacitaciones, yoga, teatro y artes escénicas, articulando distintas herramientas para acompañar procesos terapéuticos, educativos, corporales y expresivos.\n\nDesde nuestras distintas áreas de trabajo, abordamos temáticas vinculadas a salud mental, ansiedad, autoestima, desregulación emocional, habilidades sociales, comunicación efectiva, convivencia escolar, autocuidado, manejo de conflictos, bienestar laboral, riesgos psicosociales, expresión escénica, creatividad y desarrollo humano. Nuestro trabajo se sostiene en una mirada ética, respetuosa y humana, donde la psicología y el arte se encuentran como caminos complementarios para comprender, expresar, resignificar y transformar la experiencia personal y colectiva.'
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
    ('contactPhone', '+56961676706');

-- 2. Seed Users (Solo Administrador Inicial)
INSERT
    OR REPLACE INTO users (id, email, password, name, role, rut, phone)
VALUES (
        'usr-admin',
        'admin@centropsicarte.cl',
        '.zG1AbbQ4kLrRI18ALKhhgjyRpbf3UbS',
        'Administrador General',
        'administrador',
        '',
        ''
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
    ('max_reschedules', '1');

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