-- =============================================
-- Seed: Datos iniciales de PsicArte
-- Ejecutar DESPUÉS de schema.sql
-- =============================================

-- Professionals
INSERT INTO professionals (id, name, title, experience, bio) VALUES
  ('ivan', 'Iván Pastén Fuentes', 'Actor, Profesor de Teatro, Instructor de Yoga', '8 años de experiencia', 'Actor teatral y audiovisual, profesor de teatro, dramaturgo e instructor de yoga, con formación universitaria en actuación y puesta en escena. Mi trabajo integra el arte, la expresión corporal, la comunicación y el bienestar, articulando herramientas escénicas, pedagógicas y socioemocionales para acompañar procesos creativos, educativos y personales.'),
  ('valentina', 'Valentina Maldonado Terroba', 'Psicóloga Clínica', '5 años de experiencia', 'Psicóloga clínica titulada de la Universidad Andrés Bello, graduada Cum Laude, con formación en enfoques psicoanalítico, sistémico-narrativo y centrado en soluciones. Cuento con experiencia en atención presencial y online a niños, niñas, adolescentes y adultos, acompañando procesos terapéuticos desde una mirada integral, respetuosa y contextualizada.');

-- Iván's diplomas
INSERT INTO professional_diplomas (professional_id, diploma) VALUES
  ('ivan', 'Licenciado en Actuación y Puesta en Escena - Universidad Mayor (Graduado Cum Laude)'),
  ('ivan', 'Diplomado en Pedagogía Teatral - Pontificia Universidad Católica de Chile'),
  ('ivan', 'Instructor de Yoga - Centro Alma'),
  ('ivan', 'Relator - Les Halles'),
  ('ivan', 'Curso Intensivo en Performance - Universidad Academia de Humanismo Cristiano');

-- Iván's specialties
INSERT INTO professional_specialties (professional_id, specialty) VALUES
  ('ivan', 'Mindfulness y reducción de estrés'),
  ('ivan', 'Expresión corporal y pedagogía teatral'),
  ('ivan', 'Altas capacidades de comunicación y habilidades sociales'),
  ('ivan', 'Coaching de vida con Programación Neurolingüística (PNL)'),
  ('ivan', 'Resolución de conflictos en el ámbito laboral (ADIPA)'),
  ('ivan', 'Gestión efectiva de riesgos psicosociales (ADIPA)'),
  ('ivan', 'Trauma organizacional e intervención ante eventos críticos (ADIPA)');

-- Valentina's diplomas
INSERT INTO professional_diplomas (professional_id, diploma) VALUES
  ('valentina', 'Titulada de Psicología - Universidad Andrés Bello (Graduada Cum Laude)'),
  ('valentina', 'Diplomado en Vulneración de Derechos, Intervención Psicosocial y Peritaje Psicológico (ADIPA)'),
  ('valentina', 'Especialización en Terapia Breve (ADIPA)'),
  ('valentina', 'Diplomado en Terapia de Pareja Breve Estratégica (AEPSIS)'),
  ('valentina', 'Sexología Clínica (En curso - ADIPA)');

-- Valentina's specialties
INSERT INTO professional_specialties (professional_id, specialty) VALUES
  ('valentina', 'Primeros Auxilios Psicológicos y acompañamiento emocional'),
  ('valentina', 'Protocolos de respuesta a la desregulación emocional en contexto educativo'),
  ('valentina', 'Pruebas gráficas, proyectivas y psicométricas'),
  ('valentina', 'Tratamiento de ansiedad, depresión, trauma, duelo y neurodivergencias'),
  ('valentina', 'Fortalecimiento de habilidades parentales y revinculación');

-- Rooms
INSERT INTO rooms (id, name, type, description, videoconference_link, open_time, close_time) VALUES
  ('sala-1', 'Consultorio 101', 'Fisica', 'Consultorio presencial con camilla y escritorio', NULL, '08:00', '22:00'),
  ('sala-2', 'Consultorio 102', 'Fisica', 'Sala de talleres grupales hasta 10 personas', NULL, '09:00', '21:00'),
  ('sala-3', 'Sala Yoga', 'Fisica', 'Espacio amplio para yoga y teatro con piso de madera', NULL, '08:00', '20:00'),
  ('sala-virt-1', 'Teleconsulta Psicología', 'Virtual', 'Sala de videollamada para psicoterapia online', 'https://meet.google.com/abc-defg-hij', '08:00', '22:00'),
  ('sala-virt-2', 'Coaching Virtual', 'Virtual', 'Sala de videollamada para coaching y capacitaciones', 'https://meet.google.com/xyz-uvwx-yz', '09:00', '21:00');

-- Services (Iván Pastén)
INSERT INTO services (id, name, professional_id, professional_name, price, duration, description, category, modality) VALUES
  ('ivan-coaching', 'Coaching de Vida, Personal y Profesional Online', 'ivan', 'Iván Pastén Fuentes', 20990, 50, 'Acompañamiento personalizado para el desarrollo personal, laboral y la consecución de objetivos vitales mediante herramientas de PNL.', 'coaching', 'Telemedicina'),
  ('ivan-talleres', 'Talleres: Teatro, Expresión Corporal, etc.', 'ivan', 'Iván Pastén Fuentes', 20990, 120, 'Espacios dinámicos y creativos para potenciar la presencia escénica, el autoconocimiento corporal y la confianza.', 'taller', 'Presencial'),
  ('ivan-yoga', 'Pack 4 Sesiones de Yoga Presencial', 'ivan', 'Iván Pastén Fuentes', 25990, 50, 'Práctica física, respiratoria y mental de yoga guiada para conectar con el bienestar, reducir el estrés y habitar el cuerpo.', 'yoga', 'Presencial'),
  ('ivan-cap-ind', 'Capacitaciones individuales: Habilidades blandas', 'ivan', 'Iván Pastén Fuentes', 20990, 50, 'Desarrollo personalizado de trabajo colaborativo, resolución de problemas, prevención de riesgos y comunicación efectiva.', 'capacitacion', 'Ambas'),
  ('ivan-cap-gru', 'Capacitaciones grupales: Habilidades blandas', 'ivan', 'Iván Pastén Fuentes', 60990, 90, 'Para empresas y organizaciones. Trabajo colaborativo, resolución de problemas, riesgos psicosociales y comunicación asertiva.', 'capacitacion', 'Presencial'),
  ('ivan-reunion-inf', 'Reunión informativa: Capacitaciones corporativas', 'ivan', 'Iván Pastén Fuentes', 0, 45, 'Espacio informativo gratuito para empresas, centros educativos o particulares interesados en contratar capacitaciones.', 'evento', 'Ambas');

-- Services (Valentina Maldonado)
INSERT INTO services (id, name, professional_id, professional_name, price, duration, description, category, modality) VALUES
  ('val-psico-pref', 'Psicoterapia Online Preferencial', 'valentina', 'Valentina Maldonado Terroba', 20990, 50, 'Atención psicológica individual online enfocada en el abordaje de ansiedad, depresión, duelo y regulación emocional.', 'psicoterapia', 'Telemedicina'),
  ('val-psico-parental', 'Psicoterapia Online Habilidades Parentales y Revinculación', 'valentina', 'Valentina Maldonado Terroba', 25990, 50, 'Orientación terapéutica y herramientas para madres, padres y cuidadores en el proceso de revinculación afectiva.', 'psicoterapia', 'Telemedicina'),
  ('val-parejas', 'Terapia de Parejas Online', 'valentina', 'Valentina Maldonado Terroba', 30990, 50, 'Espacio confidencial enfocado en resolver conflictos relacionales, mejorar la comunicación y restaurar la intimidad.', 'psicoterapia', 'Telemedicina'),
  ('val-bach', 'Terapia Online Flores de Bach', 'valentina', 'Valentina Maldonado Terroba', 20990, 45, 'Acompañamiento emocional y recomendación personalizada de esencias florales para el equilibrio de estados de ánimo.', 'psicoterapia', 'Telemedicina'),
  ('val-eval', 'Evaluación Psicológica Online (OS-10, Peritajes, etc.)', 'valentina', 'Valentina Maldonado Terroba', 60990, 50, 'Relatores/instructores OS-10, control de impulsos laboral, peritaje de competencias parentales, VIF (1-3 sesiones).', 'evaluacion', 'Telemedicina'),
  ('val-informe', 'Informes y Certificados Psicológicos', 'valentina', 'Valentina Maldonado Terroba', 18990, 5, 'Emisión de certificados y reportes para tribunales de familia, colegios, apoyo emocional de mascotas o adecuación escolar.', 'evaluacion', 'Telemedicina');

-- Weekly schedules
INSERT INTO weekly_schedules (professional_id, day, time_block) VALUES
  ('ivan', 'Martes', '20:00 - 21:00'),
  ('ivan', 'Martes', '21:00 - 22:00'),
  ('ivan', 'Jueves', '09:00 - 10:00'),
  ('ivan', 'Jueves', '10:00 - 11:00'),
  ('ivan', 'Jueves', '11:00 - 12:00'),
  ('ivan', 'Jueves', '20:00 - 21:00'),
  ('ivan', 'Jueves', '21:00 - 22:00'),
  ('ivan', 'Viernes', '09:00 - 10:00'),
  ('ivan', 'Viernes', '10:00 - 11:00'),
  ('ivan', 'Viernes', '11:00 - 12:00'),
  ('ivan', 'Viernes', '20:00 - 21:00'),
  ('ivan', 'Viernes', '21:00 - 22:00'),
  ('valentina', 'Martes', '20:00 - 21:00'),
  ('valentina', 'Martes', '21:00 - 22:00'),
  ('valentina', 'Jueves', '09:00 - 10:00'),
  ('valentina', 'Jueves', '10:00 - 11:00'),
  ('valentina', 'Jueves', '11:00 - 12:00'),
  ('valentina', 'Jueves', '20:00 - 21:00'),
  ('valentina', 'Jueves', '21:00 - 22:00'),
  ('valentina', 'Viernes', '09:00 - 10:00'),
  ('valentina', 'Viernes', '10:00 - 11:00'),
  ('valentina', 'Viernes', '11:00 - 12:00'),
  ('valentina', 'Viernes', '20:00 - 21:00'),
  ('valentina', 'Viernes', '21:00 - 22:00');

-- Schedule blocks (weekly planner)
INSERT INTO schedule_blocks (id, day, start_time, end_time, professional_id, service_id, room_id) VALUES
  ('sb-1', 'Lunes', '09:00', '10:00', 'valentina', 'val-psico-pref', 'sala-1'),
  ('sb-2', 'Lunes', '10:00', '11:00', 'valentina', 'val-psico-parental', 'sala-1'),
  ('sb-3', 'Lunes', '11:00', '11:50', 'valentina', 'val-psico-pref', 'sala-1'),
  ('sb-4', 'Lunes', '09:00', '10:00', 'ivan', 'ivan-coaching', 'sala-virt-2'),
  ('sb-5', 'Lunes', '10:00', '10:50', 'ivan', 'ivan-coaching', 'sala-virt-2'),
  ('sb-6', 'Lunes', '11:00', '12:00', 'ivan', 'ivan-reunion-inf', 'sala-virt-2'),
  ('sb-7', 'Martes', '09:00', '09:50', 'valentina', 'val-parejas', 'sala-virt-1'),
  ('sb-8', 'Martes', '10:00', '10:45', 'valentina', 'val-bach', 'sala-virt-1'),
  ('sb-9', 'Martes', '11:00', '11:50', 'valentina', 'val-psico-pref', 'sala-virt-1'),
  ('sb-10', 'Martes', '20:00', '20:50', 'ivan', 'ivan-coaching', 'sala-virt-2'),
  ('sb-11', 'Martes', '21:00', '21:50', 'ivan', 'ivan-coaching', 'sala-virt-2'),
  ('sb-12', 'Miercoles', '09:00', '10:50', 'ivan', 'ivan-yoga', 'sala-3'),
  ('sb-13', 'Miercoles', '11:00', '12:00', 'valentina', 'val-psico-pref', 'sala-1'),
  ('sb-14', 'Jueves', '09:00', '09:50', 'valentina', 'val-parejas', 'sala-virt-1'),
  ('sb-15', 'Jueves', '10:00', '10:50', 'valentina', 'val-psico-pref', 'sala-virt-1'),
  ('sb-16', 'Jueves', '11:00', '11:50', 'valentina', 'val-bach', 'sala-virt-1'),
  ('sb-17', 'Jueves', '20:00', '20:50', 'ivan', 'ivan-coaching', 'sala-virt-2'),
  ('sb-18', 'Jueves', '21:00', '21:50', 'ivan', 'ivan-coaching', 'sala-virt-2'),
  ('sb-19', 'Viernes', '09:00', '10:00', 'valentina', 'val-psico-pref', 'sala-1'),
  ('sb-20', 'Viernes', '10:00', '10:50', 'valentina', 'val-psico-parental', 'sala-1'),
  ('sb-21', 'Viernes', '11:00', '11:50', 'valentina', 'val-psico-pref', 'sala-1'),
  ('sb-22', 'Viernes', '20:00', '20:50', 'ivan', 'ivan-coaching', 'sala-2'),
  ('sb-23', 'Viernes', '21:00', '21:50', 'ivan', 'ivan-coaching', 'sala-2');

-- Site content
INSERT INTO site_content (id, content) VALUES
  ('presentacion', 'PsicArte es un centro integral orientado al bienestar emocional, el desarrollo personal, la expresión creativa y la formación de personas, familias, comunidades educativas y equipos de trabajo. Integra psicología, talleres, capacitaciones, yoga, teatro y artes escénicas, articulando distintas herramientas para acompañar procesos terapéuticos, educativos, corporales y expresivos.

En PsicArte comprendemos que cada persona vive sus procesos desde una historia, un cuerpo, una forma particular de sentir, comunicarse y relacionarse. Por eso, buscamos generar espacios seguros, cercanos y respetuosos, donde sea posible comprender lo que ocurre, fortalecer recursos personales y abrir nuevas posibilidades de bienestar, expresión y encuentro.

Desde nuestras distintas áreas de trabajo, abordamos temáticas vinculadas a salud mental, ansiedad, autoestima, desregulación emocional, habilidades sociales, comunicación efectiva, convivencia escolar, autocuidado, manejo de conflictos, bienestar laboral, riesgos psicosociales, expresión escénica, creatividad y desarrollo humano. Ofrecemos talleres y capacitaciones dirigidas a establecimientos educacionales, organizaciones, equipos de trabajo y comunidades, abordando temáticas como convivencia escolar, desregulación emocional, autocuidado, comunicación, manejo de conflictos, riesgos psicosociales, expresión emocional, bienestar laboral y estrategias de intervención ante situaciones críticas. Nuestro trabajo se sostiene en una mirada ética, respetuosa y humana, donde la psicología y el arte se encuentran como caminos complementarios para comprender, expresar, resignificar y transformar la experiencia personal y colectiva.'),
  ('mision', 'Nuestra misión es acompañar procesos de bienestar, aprendizaje y desarrollo humano a través de intervenciones psicológicas, talleres, capacitaciones y experiencias corporales y artísticas que integren la salud mental, la educación, el teatro, el yoga y la expresión personal.

Trabajamos desde una mirada ética, cercana y contextualizada, adaptando cada proceso a las necesidades de las personas, familias, comunidades educativas, organizaciones o equipos de trabajo que acuden al centro. Buscamos entregar herramientas concretas para favorecer la comunicación, la convivencia, el autocuidado, la regulación emocional, la creatividad, el trabajo colaborativo y el fortalecimiento de recursos personales y relacionales.

A través de la psicoterapia, los talleres psicoeducativos, las capacitaciones, las clases de yoga y los talleres de teatro, PsicArte promueve espacios de cuidado, reflexión y expresión donde cada persona o grupo pueda desarrollar nuevas formas de comprenderse, vincularse y enfrentar sus desafíos cotidianos.'),
  ('vision', 'Aspiramos a que PsicArte sea reconocido como un centro integral que articula salud mental y las artes escénicas, desprendiendo la educación, capacitación y el cuerpo de manera profesional, sensible e innovadora.

Buscamos consolidarnos como un espacio de referencia para personas, familias, comunidades educativas y organizaciones que requieran acompañamiento psicológico, formación, talleres y experiencias expresivas orientadas al bienestar y al desarrollo humano.

Nuestra visión es contribuir a una cultura más consciente, empática y colaborativa, donde los servicios que ofrecemos sean herramientas para fortalecer la salud mental, la comunicación, la convivencia, la creatividad y el cuidado de los vínculos.');
