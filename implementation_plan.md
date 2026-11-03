# Plan de Implementación y Acción — Cambios Página PsicArte

## 1. Estado de Reglas del Agente (`.agents/AGENTS.md`)

- **Archivo único de reglas**: [`.agents/AGENTS.md`](.agents/AGENTS.md) contiene la totalidad de las reglas (`R0` a `R22`), incluyendo `R21` (integración Khipu migrada desde `.github/copilot-instructions.md`).
- **Eliminación de duplicado**: `.github/copilot-instructions.md` ya no existe y el directorio vacío `.github/` fue limpiado.
- **Lectura obligatoria garantizada**: [`AGENTS.md`](AGENTS.md) en la raíz del proyecto actúa como puntero de arranque automático exigiendo la lectura íntegra de [`.agents/AGENTS.md`](.agents/AGENTS.md) (`R1`) antes de cualquier tarea.

---

## 2. Auditoría Crítica: Documento `.docx` vs. Estado Real del Código

Tras extraer el texto y las 12 imágenes embebidas en `.agents/Cambios página PsicArte.docx` y contrastarlas línea por línea con el código actual, este es el diagnóstico real:

| # | Requerimiento en `Cambios página PsicArte.docx` | Estado Real | Brecha / Problema Detectado (Critical Thinking & R15) |
|---|---|---|---|
| **1** | **Paleta de colores del nuevo logo** (`#FEFDF9`, `#001B40`, `#782050`, `#D8A048`, `#B88028`, `#802850`) | 🟢 **95% Listo** | Implementado en `public/css/variables.css`, semillas SQL y Administrador de Colores (`#pane-admin-theme`). **Violación detectada (`R18` y `R22`)**: En `public/pago-exito.html` persiste un botón con `background: #25D366; color: white` y número de WhatsApp hardcodeado (`56952182998`), y ni `pago-exito.html` ni `pago-cancelado.html` cargan `public/js/theme.js`. |
| **2** | **Logo pequeño de navegación**: *"Cambiar logo pequeño por este (`image7.png` horizontal), un poco más grande para que se vea"* | 🔴 **Pendiente** | En `public/images/logo_light.png` y `logo_dark.png` siguen estando los logos cuadrados antiguos del 03/08 (`300x300`). Nunca se extrajo `word/media/image7.png` (el nuevo logo horizontal `2048x797`) hacia `public/images/`. |
| **3** | **Logo original en presentación principal**: *"Agregar a la presentación de la página principal logo original (`image10.png`)"* | 🟡 **Parcial** | Se agregó `public/images/logo-original.webp` en el Hero de `public/index.html`. Sin embargo, la imagen tiene esquinas exteriores blancas opacas que en Modo Oscuro (`#031C32`) se ven como un recuadro cuadrado blanco alrededor del sello circular; requiere recorte circular (`border-radius: 50%`) o transparencia. |
| **4** | **Sobre trabajadores**: Cambiar `(prestador)` por especialidades reales (*Iván Pastén: actor, coach, capacitador; Valentina Maldonado: psicóloga clínica y laboral (Registro SIS 710236); Macarena Zamora: coordinadora eventos*) | 🔴 **Pendiente** | En `public/nosotros.html` y `public/js/services.js` se imprime `p.role`, que es el rol de sistema (`prestador`). Falta el campo de especialidad/cargo público en `provider_profiles`, falta corregir el apellido `Macarena Méndez` → `Macarena Zamora` en `database/valores_iniciales_dev.sql`, y en `database/valores_iniciales.sql` (producción) ni siquiera están sembrados los 3 profesionales. |
| **5** | **Comunidad y Noticias/Artículos**: Zona de noticias en Comunidad + opción para subir/escribir artículos desde usuarios/Acceder | 🟡 **Parcial (con bug crítico)** | La tabla `articles`, endpoints y panel `#pane-community-articles` existen. **Bug crítico (`R15`)**: En `public/js/activities.js`, `updateActivitiesVisibility()` oculta toda la sección `#calendario` y el enlace "Comunidad" del menú si `state.activities.length === 0`, escondiendo también los artículos publicados cuando no hay eventos en el mes. Además, el administrador no puede publicar un artículo directo sin enviarlo primero como borrador y aprobarlo en 2 pasos, ni eliminar artículos ya publicados. |
| **6** | **Diferenciar Inicio, Servicios y Agendar Hora**: Inicio con noticias destacadas; Servicios con definición de prestaciones + boleta/Isapre/Fonasa (ej. `redpsique.cl/services/`); Agendar Hora directo al agendamiento | 🔴 **Incompleto** | 1) `#inicio` solo tiene el Hero y no muestra noticias/artículos destacados. 2) `#servicios` solo tiene una línea de texto sobre boleta/Isapre/Fonasa y las tarjetas de cobro, pero carece de la sección descriptiva de cada área/prestación (Psicoterapia, Evaluación, Coaching, Talleres, Capacitaciones, Yoga). |
| **7** | **Sobre Contacto**: Instagram `@centropsicarte` y dirección `Oficina Virtual Las Bellotas 199, Providencia, RM` | 🟡 **Parcial** | Funciona en `index.html`, `nosotros.html` y páginas de pago, pero: 1) Falta en el footer de `public/acceso.html`; 2) No hay input para editar `instagram_url` en `#pane-admin-content` de `public/acceso.html`; 3) En `database/valores_iniciales_dev.sql` faltan `contactAddress` e `instagram_url` y existe un archivo suelto `database/valores_configuracion_contacto.sql` que viola `R11`. |
| **8** | **Bug Logos rotos + texto en Nosotros, Footer y Pago Efectuado** (`image11.png`, `image12.png`, `image3.png`) | 🔴 **Incompleto** | 1) En `image11.png` se observa `\n\n` literal en el texto de Presentación de `public/nosotros.html` y `public/js/api.js` porque SQLite almacena `\\n` literal desde `database/valores_iniciales.sql` y el `.replace(/\n/g, '<br>')` no convierte `\\n`. 2) En modo claro, `public/js/theme.js` asigna `logo_light.png` al `#footer-logo`, pero el footer siempre es oscuro (`#001B40`), por lo que con el nuevo logo horizontal las letras oscuras `#001B40` quedarían invisibles sobre el footer oscuro. |
| **9** | **Bug Edición de Salas**: *"Cuando se editan salas, no se guardan los cambios"* | 🟡 **Con Bug Lógico** | Se implementó `PUT /api/rooms/:id` en `server/server.js`, pero si una sala tiene más de 1 bloque horario en un día (como `room-1` en `valores_iniciales_dev.sql` que tiene mañana y tarde), `multiBlockDays` es `true` y **el backend ignora el cambio de horario**. Además, el formulario no muestra botón "Cancelar edición" ni permite gestionar bloques múltiples de sala. |
| **10** | **Bug Recurrencia Semanal Múltiples Días e Intervalos**: Lunes y jueves de 09:00-13:00 y 19:00-22:00 (`image4.png`) | 🟡 **Solo al crear, bloqueado al editar** | Al crear un servicio nuevo sí permite elegir varios días y varios intervalos por día. **Pero al editar un servicio existente** (`public/js/app.js` y `public/js/dashboard.js`), `setServiceScheduleEditable(false)` bloquea la sala, los días y los intervalos horarios, impidiendo modificar los horarios de servicios ya creados. |
| **11** | **Bug Tarjetas en Servicios y Aranceles**: *"Cuando uno apreta la tarjeta del prestador, no lleva a ninguna parte"* (`image2.png`) | 🟡 **Parcial** | Se añadió el botón `"Reservar este servicio"` en cada tarjeta de servicio (`public/js/services.js`), pero hacer clic en la tarjeta completa o en el nombre del profesional no ejecuta acción ni muestra resumen del profesional. |
| **12** | **Correos y Confirmación Post-Khipu**: Spam en correos personales, foto de perfil en mail, y envío de correo de confirmación (al cliente y al centro) con link online o dirección presencial, día, hora y prestador (`image9.png`) | 🔴 **Pendiente (0%)** | No existe integración de correo (`nodemailer` / SMTP / API) en `server/server.js` ni en `package.json`. Tampoco existe un campo `meeting_link` en las salas virtuales (`rooms`) o agendas para enviar el link de atención online automáticamente tras conciliarse el pago en `reconcileBookingPayment()`. |

---

## 3. Plan de Acción Paso a Paso

### Fase 1: Saneamiento de Reglas, Datos SQL y Bugs Inmediatos (`R11`, `R15`, `R18`, `R22`)
1. **Unificación de Semillas SQL (`R11`)**:
   - Integrar `contactAddress` e `instagram_url` directamente en `database/valores_iniciales_dev.sql` (igualando con `database/valores_iniciales.sql`).
   - Eliminar el archivo auxiliar `database/valores_configuracion_contacto.sql` y su llamada `applyContactDefaults` en `server/database.js` para respetar estrictamente `R11`.
   - Sembrar al menos 2 artículos iniciales publicados en `articles` dentro de `valores_iniciales.sql` y `valores_iniciales_dev.sql` para que las secciones de Noticias en Inicio y Comunidad tengan contenido real desde el primer arranque.
2. **Corrección de `pago-exito.html` y `pago-cancelado.html` (`R18`, `R22`)**:
   - Eliminar colores (`#25D366`, `white`) y enlace de WhatsApp hardcodeado en `public/pago-exito.html`; alimentar el botón de WhatsApp dinámicamente desde `config.whatsapp_number` y usar las variables CSS `--whatsapp-bg` y `--whatsapp-text`.
   - Reemplazar el `<script>` inline duplicado de tema en `pago-exito.html` y `pago-cancelado.html` por `<script src="js/theme.js"></script>` para que reciban `applyCustomThemeTokens()`.
3. **Corrección de `\n\n` literal en Presentación (`R15`)**:
   - En `public/nosotros.html` y `public/js/api.js`, reemplazar `.replace(/\n/g, "<br>")` por `.replace(/\\n|\n/g, "<br>")`.

### Fase 2: Logos y Coherencia Visual (`image7.png` y `image10.png`)
1. **Nuevo Logo Horizontal en Navegación y Footer**:
   - Extraer `word/media/image7.png` de `.agents/Cambios página PsicArte.docx` hacia `public/images/`:
     - Generar `logo_light.png` (fondo transparente para cabeceras claras) y `logo_dark.png` (versión clara/blanca-dorada legible sobre fondos oscuros `#001B40` y `#031C32`).
   - En `public/js/theme.js`, asegurar que `#footer-logo` use **siempre** `images/logo_dark.png` (ya que `--footer-bg` es oscuro `#001B40` tanto en tema claro como en oscuro) y usar rutas `/images/...` consistentes para evitar logos rotos en `/exito` y `/cancelado`.
   - Ajustar `.logo-container img` en `public/css/layout.css` para que el logo horizontal se vea nítido y un poco más grande sin romper el header en móvil.
2. **Logo Emblema Circular en Hero (`#hero-logo`)**:
   - Aplicar `border-radius: 50%` y sombra sutil a `.hero-logo` en `public/css/layout.css` para eliminar las esquinas blancas cuadradas en Modo Oscuro.

### Fase 3: Profesionales y Especialidades (`image8.png`)
1. **Esquema y Datos (`schema.sql` y `valores_iniciales*.sql`)**:
   - Agregar columna `specialty TEXT DEFAULT ''` en `provider_profiles` dentro de `database/schema.sql` (regenerando `.sqlite` sin `ALTER TABLE`, conforme a `R13`).
   - Actualizar los 3 profesionales en `database/valores_iniciales.sql` y `database/valores_iniciales_dev.sql`:
     - **Iván Pastén Fuentes** (`prov-ivan`): `specialty = 'Actor, coach, capacitador'`
     - **Valentina Maldonado Terroba** (`prov-valentina`): `specialty = 'Psicóloga clínica y laboral (Registro SIS 710236)'`
     - **Macarena Zamora** (`prov-macarena`, corrigiendo `Macarena Méndez`): `specialty = 'Coordinadora de eventos'`
2. **Backend y Frontend**:
   - Exponer `p.specialty` en `GET /api/providers` (`server/server.js`) y permitir editarlo desde Gestión de Usuarios en el panel de administración cuando `role === 'prestador'`.
   - Mostrar `p.specialty || 'Profesional PsicArte'` en lugar de `p.role` (`prestador`) tanto en `public/nosotros.html` como en las pestañas de `public/js/services.js`.

### Fase 4: Separación Clara de Inicio, Servicios, Comunidad y Contacto
1. **Inicio (`#inicio` + Novedades Destacadas)**:
   - Agregar bajo el Hero en `public/index.html` un bloque compacto de **"Últimas Noticias y Artículos"** (mostrando los 2-3 artículos más recientes con enlace a `#calendario` / Comunidad).
2. **Servicios (`#servicios`) — Definición de Prestaciones y Cobertura (estilo `redpsique.cl/services/`)**:
   - Incorporar en `#servicios` de `public/index.html`:
     1. **Tarjetas informativas de Cobertura y Beneficios**: Emisión de Boleta de Honorarios Electrónica, Reembolso en Isapres y Valores Preferenciales Fonasa.
     2. **Guía descriptiva de Áreas y Prestaciones** (Psicología Clínica y Laboral, Evaluaciones e Informes, Coaching y Desarrollo Personal, Talleres de Teatro y Expresión Escénica, Yoga y Bienestar Corporal, Capacitaciones para Empresas y Colegios) antes del buscador/listado de aranceles.
     3. Hacer que toda la tarjeta `.service-card` en `public/js/services.js` sea interactiva y muestre el cargo/especialidad del profesional junto con un acceso directo a reservar.
3. **Comunidad (`#calendario`) y Artículos**:
   - Corregir `updateActivitiesVisibility()` en `public/js/activities.js` para que la sección Comunidad **nunca se oculte** cuando existan artículos publicados (o mostrar un estado vacío amigable en el calendario si no hay eventos ese mes, manteniendo visible la zona de Noticias y Artículos).
   - Permitir en `#pane-community-articles` que el **administrador** publique artículos directamente (`status = 'published'`) sin tener que auto-aprobarse, y pueda eliminar artículos publicados.
4. **Contacto completo en todas las vistas y Admin**:
   - Añadir `#contact-address-row` y `#contact-instagram-row` al footer de `public/acceso.html`.
   - Añadir el campo editable **"Instagram URL"** en `#pane-admin-content` de `public/acceso.html` y guardarlo desde `saveContentCustomizations()`.

### Fase 5: Corrección Completa de Edición de Salas y Edición de Agendas/Servicios
1. **Edición de Salas (`PUT /api/rooms/:id`)**:
   - Corregir `server/server.js` para que al editar una sala se actualicen sus bloques horarios en `room_schedules` (reemplazando los horarios de los días activos de esa sala con el nuevo rango o los intervalos configurados) en lugar de abortar cuando `multiBlockDays` es `true`.
   - Agregar soporte opcional de enlace de videollamada (`meeting_link TEXT DEFAULT ''` en tabla `rooms` de `schema.sql`) para salas `Virtual` (Zoom/Meet), indispensable para el correo automático de confirmación online.
   - Mejorar la UX en `public/js/dashboard.js`: al pulsar editar sala, cambiar el texto del botón a `"Guardar Cambios de Sala"` y mostrar un botón `"Cancelar"`.
2. **Edición de Horarios Recurrentes en Servicios Existentes**:
   - Habilitar la carga de la agenda actual del servicio en el formulario al pulsar "Editar Servicio" y permitir actualizar sus días (ej. Lunes y Jueves) y múltiples intervalos horarios (ej. `09:00–13:00` y `19:00–22:00`) mediante `PUT /api/agendas/:id`, regenerando los `spots` disponibles y preservando intactos los `spots` con reservas pagadas.

### Fase 6: Correos Transaccionales, Confirmación Khipu y Entregabilidad (`image9.png`)
1. **Módulo de Correo Transaccional en Backend**:
   - Integrar `nodemailer` en `server/` configurado mediante variables de entorno (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `CENTER_NOTIFICATION_EMAIL`), usando `contacto@centropsicarte.cl` como remitente autenticado (`From`) para evitar el filtro de spam que afecta a las casillas personales.
2. **Disparo Idempotente al Confirmar Reserva**:
   - Agregar columna `confirmation_email_sent INTEGER DEFAULT 0` en la tabla `bookings` de `database/schema.sql`.
   - Cuando `reconcileBookingPayment()` en `server/server.js` confirme el pago con Khipu (`GET /v3/payments/{id}` con `status === 'done'`) —o cuando se cree una reserva de costo `$0` / por administrador—, enviar correo HTML con diseño de marca PsicArte **al paciente** y **al centro/prestador**:
     - **Si es Online (`Virtual`)**: Profesional, servicio, fecha, hora y **link de atención online** (`room.meeting_link`).
     - **Si es Presencial (`Física`)**: Profesional, servicio, fecha, hora y **dirección física** (`Oficina Virtual Las Bellotas 199, Providencia, RM`).
3. **Guía Operativa DNS (Anti-Spam) y Foto de Perfil del Correo**:
   - Entregar guía paso a paso para configurar registros **SPF, DKIM y DMARC** en el DNS de `centropsicarte.cl` (causa raíz por la que `vmaldonado@` e `ipasten@` caen en Spam de Gmail) y cómo configurar la foto de perfil del remitente (Google Workspace / Cuenta de Google asociada a `contacto@centropsicarte.cl` + Gravatar).

---

## 4. Preguntas Aclaratorias y Opciones de Resolución (`R16`)

Antes de ejecutar las modificaciones de código y base de datos, selecciona tu preferencia para las siguientes decisiones abiertas:

### Pregunta 1: Especialidades de Profesionales y Registro SIS de Valentina
En el documento se pide mostrar:
- *Iván Pastén: actor, coach, capacitador*
- *Valentina Maldonado: psicóloga clínica y laboral (Registro SIS 710236)*
- *Macarena Zamora: coordinadora eventos*

- **Opción 1A (Recomendada)**: Publicar exactamente los tres cargos solicitados en el `.docx` (incluyendo `(Registro SIS 710236)` para Valentina y corrigiendo el apellido a `Macarena Zamora`) y agregar el campo `specialty` editable en el Panel de Administración.
  - *Pros*: Cumple 100% con el documento del cliente y otorga respaldo clínico verificable.
  - *Contras*: Ninguno si Valentina ya autorizó incluir su número SIS en el documento.
- **Opción 1B**: Publicar los cargos sin el número SIS (`Psicóloga clínica y laboral`) hasta que el administrador lo agregue manualmente desde el panel.
  - *Pros*: Más conservador con el dato del registro.
  - *Contras*: No refleja de inmediato el texto literal pedido en el `.docx`.

### Pregunta 2: Enlace de Atención para Sesiones Online en el Correo de Confirmación
El documento indica: *"El mail de confirmación debería contener el link de la atención, en caso de ser online"*. Actualmente las salas virtuales (`Sala Virtual Zoom`) no tienen un campo de URL guardado en la base de datos.

- **Opción 2A (Recomendada)**: Agregar un campo `meeting_link` (URL de Zoom/Meet) en la tabla `rooms` (editable desde **Panel de Control → Salas**). Cuando la reserva sea en sala Virtual, el correo incluirá automáticamente ese link.
  - *Pros*: Totalmente automatizado al pagar con Khipu y configurable sin tocar código.
  - *Contras*: Requiere regenerar `database.sqlite` al actualizar `schema.sql` (`R13`).
- **Opción 2B**: Definir el link de videollamada por Prestador (en `provider_profiles`) en lugar de por Sala Virtual.
  - *Pros*: Útil si cada profesional usa su propia sala personal de Zoom/Meet.
  - *Contras*: Menos flexible si el centro usa una cuenta corporativa única por sala virtual.
- **Opción 2C**: Permitir ambos (link en la Sala Virtual por defecto, con posibilidad de override en el perfil del Prestador).
  - *Pros*: Cubre ambos escenarios operativos sin fricción.
  - *Contras*: Un campo adicional en el formulario de usuario prestador.

### Pregunta 3: Proveedor de Correo para Confirmaciones Automáticas
Observamos que `contacto@centropsicarte.cl` no cae en spam, mientras que `vmaldonado@` e `ipasten@` sí.

- **Opción 3A (Recomendada)**: Implementar el envío en el servidor usando **Nodemailer (SMTP estándar)** configurado por variables en `.env` para enviar desde `contacto@centropsicarte.cl` (con `Reply-To` al correo del prestador y copia a `contacto@centropsicarte.cl` y al prestador).
  - *Pros*: Aprovecha la buena reputación actual de `contacto@centropsicarte.cl`, no requiere contratar un servicio externo adicional y funciona con cPanel/Google Workspace/Zoho/Microsoft 365.
  - *Contras*: Requiere colocar el host, puerto y clave SMTP de `contacto@centropsicarte.cl` en el archivo `.env` del servidor.
- **Opción 3B**: Integrar un proveedor API transaccional (como Resend o Brevo) además de soporte SMTP.
  - *Pros*: Estadísticas de apertura y rebotes en panel externo.
  - *Contras*: Requiere crear cuenta externa y configurar nuevos registros DNS antes de funcionar.

### Pregunta 4: Regeneración de Base de Datos Local (`R13`)
Para agregar `specialty` en `provider_profiles`, `meeting_link` en `rooms` y `confirmation_email_sent` en `bookings`, la regla `R13` prohíbe usar `ALTER TABLE` y exige modificar `database/schema.sql` y regenerar `database.sqlite` desde las semillas SQL.

- **Opción 4A (Recomendada)**: Modificar `schema.sql`, `valores_iniciales.sql` y `valores_iniciales_dev.sql`, y regenerar `database.sqlite` limpio con todos los datos actualizados.
  - *Pros*: Cumple estrictamente con `R11`, `R12` y `R13`.
  - *Contras*: Si agregaste pruebas manuales locales en `database.sqlite` no volcadas a los `.sql`, se reemplazarán por la semilla actualizada.
- **Opción 4B**: Exportar primero cualquier dato manual que tengas actualmente en `database.sqlite` hacia `valores_iniciales_dev.sql` antes de regenerar `database.sqlite`.
  - *Pros*: Cumple `R13` sin perder ningún dato de prueba local.
  - *Contras*: Añade un paso previo de volcado antes de recrear la base.
