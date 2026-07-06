import { Professional, Service, ClientMock } from './types';

export const PRESENTACION_TEXT = `PsicArte es un centro integral orientado al bienestar emocional, el desarrollo personal, la expresión creativa y la formación de personas, familias, comunidades educativas y equipos de trabajo. Integra psicología, talleres, capacitaciones, yoga, teatro y artes escénicas, articulando distintas herramientas para acompañar procesos terapéuticos, educativos, corporales y expresivos.

En PsicArte comprendemos que cada persona vive sus procesos desde una historia, un cuerpo, una forma particular de sentir, comunicarse y relacionarse. Por eso, buscamos generar espacios seguros, cercanos y respetuosos, donde sea posible comprender lo que ocurre, fortalecer recursos personales y abrir nuevas posibilidades de bienestar, expresión y encuentro.

Desde nuestras distintas áreas de trabajo, abordamos temáticas vinculadas a salud mental, ansiedad, autoestima, desregulación emocional, habilidades sociales, comunicación efectiva, convivencia escolar, autocuidado, manejo de conflictos, bienestar laboral, riesgos psicosociales, expresión escénica, creatividad y desarrollo humano. Ofrecemos talleres y capacitaciones dirigidas a establecimientos educacionales, organizaciones, equipos de trabajo y comunidades, abordando temáticas como convivencia escolar, desregulación emocional, autocuidado, comunicación, manejo de conflictos, riesgos psicosociales, expresión emocional, bienestar laboral y estrategias de intervención ante situaciones críticas. Nuestro trabajo se sostiene en una mirada ética, respetuosa y humana, donde la psicología y el arte se encuentran como caminos complementarios para comprender, expresar, resignificar y transformar la experiencia personal y colectiva.`;

export const MISION_TEXT = `Nuestra misión es acompañar procesos de bienestar, aprendizaje y desarrollo humano a través de intervenciones psicológicas, talleres, capacitaciones y experiencias corporales y artísticas que integren la salud mental, la educación, el teatro, el yoga y la expresión personal.

Trabajamos desde una mirada ética, cercana y contextualizada, adaptando cada proceso a las necesidades de las personas, familias, comunidades educativas, organizaciones o equipos de trabajo que acuden al centro. Buscamos entregar herramientas concretas para favorecer la comunicación, la convivencia, el autocuidado, la regulación emocional, la creatividad, el trabajo colaborativo y el fortalecimiento de recursos personales y relacionales.

A través de la psicoterapia, los talleres psicoeducativos, las capacitaciones, las clases de yoga y los talleres de teatro, PsicArte promueve espacios de cuidado, reflexión y expresión donde cada persona o grupo pueda desarrollar nuevas formas de comprenderse, vincularse y enfrentar sus desafíos cotidianos.`;

export const VISION_TEXT = `Aspiramos a que PsicArte sea reconocido como un centro integral que articula salud mental y las artes escénicas, desprendiendo la educación, capacitación y el cuerpo de manera profesional, sensible e innovadora.

Buscamos consolidarnos como un espacio de referencia para personas, familias, comunidades educativas y organizaciones que requieran acompañamiento psicológico, formación, talleres y experiencias expresivas orientadas al bienestar y al desarrollo humano.

Nuestra visión es contribuir a una cultura más consciente, empática y colaborativa, donde los servicios que ofrecemos sean herramientas para fortalecer la salud mental, la comunicación, la convivencia, la creatividad y el cuidado de los vínculos.`;

export const PROFESSIONALS: Professional[] = [
  {
    id: 'ivan',
    name: 'Iván Pastén Fuentes',
    title: 'Actor, Profesor de Teatro, Instructor de Yoga',
    experience: '8 años de experiencia',
    bio: 'Actor teatral y audiovisual, profesor de teatro, dramaturgo e instructor de yoga, con formación universitaria en actuación y puesta en escena. Mi trabajo integra el arte, la expresión corporal, la comunicación y el bienestar, articulando herramientas escénicas, pedagógicas y socioemocionales para acompañar procesos creativos, educativos y personales.',
    diplomas: [
      'Licenciado en Actuación y Puesta en Escena - Universidad Mayor (Graduado Cum Laude)',
      'Diplomado en Pedagogía Teatral - Pontificia Universidad Católica de Chile',
      'Instructor de Yoga - Centro Alma',
      'Relator - Les Halles',
      'Curso Intensivo en Performance - Universidad Academia de Humanismo Cristiano'
    ],
    specialties: [
      'Mindfulness y reducción de estrés',
      'Expresión corporal y pedagogía teatral',
      'Altas capacidades de comunicación y habilidades sociales',
      'Coaching de vida con Programación Neurolingüística (PNL)',
      'Resolución de conflictos en el ámbito laboral (ADIPA)',
      'Gestión efectiva de riesgos psicosociales (ADIPA)',
      'Trauma organizacional e intervención ante eventos críticos (ADIPA)'
    ]
  },
  {
    id: 'valentina',
    name: 'Valentina Maldonado Terroba',
    title: 'Psicóloga Clínica',
    experience: '5 años de experiencia',
    bio: 'Psicóloga clínica titulada de la Universidad Andrés Bello, graduada Cum Laude, con formación en enfoques psicoanalítico, sistémico-narrativo y centrado en soluciones. Cuento con experiencia en atención presencial y online a niños, niñas, adolescentes y adultos, acompañando procesos terapéuticos desde una mirada integral, respetuosa y contextualizada.',
    diplomas: [
      'Titulada de Psicología - Universidad Andrés Bello (Graduada Cum Laude)',
      'Diplomado en Vulneración de Derechos, Intervención Psicosocial y Peritaje Psicológico (ADIPA)',
      'Especialización en Terapia Breve (ADIPA)',
      'Diplomado en Terapia de Pareja Breve Estratégica (AEPSIS)',
      'Sexología Clínica (En curso - ADIPA)'
    ],
    specialties: [
      'Primeros Auxilios Psicológicos y acompañamiento emocional',
      'Protocolos de respuesta a la desregulación emocional en contexto educativo',
      'Pruebas gráficas, proyectivas y psicométricas',
      'Tratamiento de ansiedad, depresión, trauma, duelo y neurodivergencias',
      'Fortalecimiento de habilidades parentales y revinculación'
    ]
  }
];

export const SERVICES: Service[] = [
  // Iván Pastén
  {
    id: 'ivan-coaching',
    name: 'Coaching de Vida, Personal y Profesional Online',
    professionalId: 'ivan',
    professionalName: 'Iván Pastén Fuentes',
    price: 20990,
    duration: 50,
    description: 'Acompañamiento personalizado para el desarrollo personal, laboral y la consecución de objetivos vitales mediante herramientas de PNL.',
    category: 'coaching'
  },
  {
    id: 'ivan-talleres',
    name: 'Talleres: Teatro, Expresión Corporal, etc.',
    professionalId: 'ivan',
    professionalName: 'Iván Pastén Fuentes',
    price: 20990,
    duration: 120,
    description: 'Espacios dinámicos y creativos para potenciar la presencia escénica, el autoconocimiento corporal y la confianza.',
    category: 'taller'
  },
  {
    id: 'ivan-yoga',
    name: 'Pack 4 Sesiones de Yoga Presencial',
    professionalId: 'ivan',
    professionalName: 'Iván Pastén Fuentes',
    price: 25990,
    duration: 50,
    description: 'Práctica física, respiratoria y mental de yoga guiada para conectar con el bienestar, reducir el estrés y habitar el cuerpo.',
    category: 'yoga'
  },
  {
    id: 'ivan-cap-ind',
    name: 'Capacitaciones individuales: Habilidades blandas',
    professionalId: 'ivan',
    professionalName: 'Iván Pastén Fuentes',
    price: 20990,
    duration: 50,
    description: 'Desarrollo personalizado de trabajo colaborativo, resolución de problemas, prevención de riesgos y comunicación efectiva.',
    category: 'capacitacion'
  },
  {
    id: 'ivan-cap-gru',
    name: 'Capacitaciones grupales: Habilidades blandas',
    professionalId: 'ivan',
    professionalName: 'Iván Pastén Fuentes',
    price: 60990,
    duration: 90,
    description: 'Para empresas y organizaciones. Trabajo colaborativo, resolución de problemas, riesgos psicosociales y comunicación asertiva.',
    category: 'capacitacion'
  },
  {
    id: 'ivan-reunion-inf',
    name: 'Reunión informativa: Capacitaciones corporativas',
    professionalId: 'ivan',
    professionalName: 'Iván Pastén Fuentes',
    price: 0,
    duration: 45,
    description: 'Espacio informativo gratuito para empresas, centros educativos o particulares interesados en contratar capacitaciones.',
    category: 'evento'
  },

  // Valentina Maldonado
  {
    id: 'val-psico-pref',
    name: 'Psicoterapia Online Preferencial',
    professionalId: 'valentina',
    professionalName: 'Valentina Maldonado Terroba',
    price: 20990,
    duration: 50,
    description: 'Atención psicológica individual online enfocada en el abordaje de ansiedad, depresión, duelo y regulación emocional.',
    category: 'psicoterapia'
  },
  {
    id: 'val-psico-parental',
    name: 'Psicoterapia Online Habilidades Parentales y Revinculación',
    professionalId: 'valentina',
    professionalName: 'Valentina Maldonado Terroba',
    price: 25990,
    duration: 50,
    description: 'Orientación terapéutica y herramientas para madres, padres y cuidadores en el proceso de revinculación afectiva.',
    category: 'psicoterapia'
  },
  {
    id: 'val-parejas',
    name: 'Terapia de Parejas Online',
    professionalId: 'valentina',
    professionalName: 'Valentina Maldonado Terroba',
    price: 30990,
    duration: 50,
    description: 'Espacio confidencial enfocado en resolver conflictos relacionales, mejorar la comunicación y restaurar la intimidad.',
    category: 'psicoterapia'
  },
  {
    id: 'val-bach',
    name: 'Terapia Online Flores de Bach',
    professionalId: 'valentina',
    professionalName: 'Valentina Maldonado Terroba',
    price: 20990,
    duration: 45,
    description: 'Acompañamiento emocional y recomendación personalizada de esencias florales para el equilibrio de estados de ánimo.',
    category: 'psicoterapia'
  },
  {
    id: 'val-eval',
    name: 'Evaluación Psicológica Online (OS-10, Peritajes, etc.)',
    professionalId: 'valentina',
    professionalName: 'Valentina Maldonado Terroba',
    price: 60990,
    duration: 50,
    description: 'Relatores/instructores OS-10, control de impulsos laboral, peritaje de competencias parentales, VIF (1-3 sesiones).',
    category: 'evaluacion'
  },
  {
    id: 'val-informe',
    name: 'Informes y Certificados Psicológicos',
    professionalId: 'valentina',
    professionalName: 'Valentina Maldonado Terroba',
    price: 18990,
    duration: 5,
    description: 'Emisión de certificados y reportes para tribunales de familia, colegios, apoyo emocional de mascotas o adecuación escolar.',
    category: 'evaluacion'
  },

  // Macarena Méndez
  {
    id: 'macarena-reunion',
    name: 'Reunión informativa: Venta de obras y artes escénicas',
    professionalId: 'macarena',
    professionalName: 'Macarena Méndez',
    price: 0,
    duration: 45,
    description: 'Venta y coordinación de obras teatrales y artes escénicas para empresas, centros educativos o particulares.',
    category: 'evento'
  }
];

export const CLIENT_MOCKS: ClientMock[] = [
  { id: '1', name: 'Romilio Orellana' },
  { id: '2', name: 'Renata Jeldes' },
  { id: '3', name: 'Sofia Molina' },
  { id: '4', name: 'Monica Martinez' },
  { id: '5', name: 'Matias Aguirre' },
  { id: '6', name: 'Matias Cortes' },
  { id: '7', name: 'Rafael Contreras' },
  { id: '8', name: 'Patricio Fuentes' },
  { id: '9', name: 'Paula Novoa' },
  { id: '10', name: 'Victor Avila' },
  { id: '11', name: 'Camila Maldonado' },
  { id: '12', name: 'Benjamin Tabilo' },
  { id: '13', name: 'Jessica Cortes' },
  { id: '14', name: 'Jose Marin' },
  { id: '15', name: 'Cristian Alvarez' }
];

// Available Schedules for both Iván and Valentina
export const WEEKLY_SCHEDULES = {
  Martes: ['20:00 - 21:00', '21:00 - 22:00'],
  Jueves: ['09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00', '20:00 - 21:00', '21:00 - 22:00'],
  Viernes: ['09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00', '20:00 - 21:00', '21:00 - 22:00']
};
