# Plan de implementación — Cambios de página PsicArte

## Objetivo

Actualizar la identidad visual y la presentación pública de PsicArte, aclarar la navegación y la oferta, habilitar publicación de artículos con permisos definidos y corregir los problemas reportados en salas, agendas, tarjetas de prestadores y confirmaciones por correo.

Este documento registra la implementación y el QA de los cambios acordados.

## Estado de implementación

- **Implementado:** paleta y variantes visuales; logos en páginas públicas y de pago; contacto administrable; envío de artículos con moderación administrativa; edición de salas; agendas puntuales y recurrentes con múltiples días e intervalos; regeneración de horarios preservando reservas existentes.
- **Pendiente por decisión/entorno:** proveedor y credenciales de correo transaccional, configuración DNS y pruebas de entrega; consentimiento para publicar el registro SIS; aprobación final del texto de cobertura/aranceles.
- **QA realizado:** validación estática, arranque del servidor, endpoints públicos, protección de envíos de artículos sin token, logo/contacto en páginas públicas/de pago, temas claro/oscuro, y ausencia de desbordamiento horizontal en móvil.
- **QA pendiente:** flujo autenticado de envío/moderación y creación de agendas con datos de staging. No se debe regenerar ni borrar la base de datos real para probar.
- **Decisiones aplicadas:** moderación de artículos (1B), mantener tema oscuro (2A), logo horizontal en navegación y emblema en portada (3A), intervalos múltiples por día (8A), configuración administrable de contacto (9A).

## Estado actual observado

- Los estilos se ensamblan desde `public/css/style.css`; los tokens de tema están en `public/css/variables.css`. La paleta actual no coincide con la del brief.
- La página pública y las vistas de acceso, nosotros y pago reutilizan CSS; el cambio visual debe cubrir todas esas rutas y los temas claro/oscuro.
- La aplicación está modularizada en `public/js/`, usa `server/server.js` para la API y mantiene esquema y datos iniciales en `database/`.
- El esquema ya incluye servicios, salas y horarios, agendas, actividades, reservas, configuración y notificaciones Khipu; se debe revisar el modelo existente antes de introducir tablas o columnas.
- No se encontró una dependencia ni un módulo de envío de correo en el servidor. El mecanismo actual de `contacto@centropsicarte.cl` y la administración DNS deben confirmarse antes de elegir una integración.
- El proyecto ya contiene una integración Khipu. La confirmación de reserva debe depender de la confirmación del pago desde el servidor, no únicamente del retorno del navegador. La notificación de Khipu puede reintentarse, por lo que el procesamiento y el envío de correo deben ser idempotentes.

## Fases

### 1. Definiciones y activos visuales

1. El brief muestra un logotipo horizontal junto al cambio del logo pequeño de navegación y un emblema circular junto a la indicación de agregar el logo original a la presentación principal. Preparar esas dos variantes para cabecera y portada, respectivamente, y compararlas con `public/images/logo_light.png` y `public/images/logo_dark.png`.
2. Aplicar los colores del brief a los tokens centrales:
   - Fondo: `#FEFDF9`.
   - Texto principal: `#001B40`.
   - Acento principal: `#782050`.
   - Acento secundario: `#D8A048`.
   - Presencial: `#B88028`.
   - Online: `#802850`.
3. Conservar el tema oscuro y revisar ambos temas en cada superficie afectada; no trasladar automáticamente los colores claros al modo oscuro.
4. Ajustar tamaño, proporción y variantes de logo en cabecera, portada, pie y páginas de confirmación, evitando deformación, recorte o pérdida al hacer scroll.

**Archivos principales:** `public/css/variables.css`, `public/css/layout.css`, `public/css/components.css`, `public/css/services.css`, `public/css/booking.css`, `public/css/dashboard.css`, `public/css/community.css`; HTML de `public/index.html`, `public/nosotros.html`, `public/acceso.html`, `public/pago-exito.html` y `public/pago-cancelado.html`.

### 2. Navegación y contenido público

1. Diferenciar claramente Inicio, Servicios, Comunidad y Agendar hora:
   - Inicio presenta la identidad y una selección reciente de noticias/artículos.
   - Servicios describe prestaciones, modalidad, aranceles y cómo se entrega la boleta; incluir el texto sobre reembolsos Isapre y valores preferenciales Fonasa solo después de validar la redacción y condiciones.
   - Comunidad conserva las actividades y añade un índice de noticias/artículos.
   - Agendar hora lleva directamente al flujo de reserva existente.
2. Presentar los perfiles y roles indicados: Ivan Pasten (actor, coach, capacitador), Valentina Maldonado (psicóloga clínica y laboral; Registro SIS 710236) y Macarena Zamora (coordinadora de eventos). Confirmar autorización para publicar el registro SIS de Valentina y su número.
3. Agregar el Instagram `@centropsicarte` y la dirección “Oficina Virtual Las Bellotas 199, Providencia, RM” a contacto. Guardar enlaces externos administrables usando la configuración existente, no codificarlos en HTML/JavaScript.
4. Hacer que las tarjetas de prestadores en Servicios y Aranceles conduzcan a una acción coherente (perfil, servicios filtrados o reserva), definida antes de implementarla.

**Archivos principales:** `public/index.html`, `public/nosotros.html`, `public/js/app.js`, `public/js/services.js`, `public/js/activities.js`, `public/css/layout.css`, `public/css/services.css`, `public/css/community.css` y la configuración correspondiente.

### 3. Noticias y artículos

1. Definir los estados editoriales (por ejemplo, borrador, pendiente de revisión, publicado y archivado) y quién puede crear, revisar, publicar, editar y retirar contenido.
2. Revisar autenticación y roles actuales antes de agregar permisos; habilitar una experiencia de creación accesible desde el área autenticada si se aprueba.
3. Extender `database/schema.sql` y los datos de despliegue únicamente tras decidir el modelo de artículos y la estrategia de migración/back-up.
4. Implementar endpoints de lectura pública solo para contenido publicado y endpoints autenticados para edición; validar y limitar el contenido recibido.
5. Añadir tarjetas de artículos en Inicio y una página/listado de Comunidad, con diseño móvil, estados vacíos y etiquetas de fecha/categoría según lo aprobado.

**Archivos principales:** `database/schema.sql`, `database/valores_iniciales*.sql` si se necesitan datos editoriales iniciales, `server/server.js`, `public/index.html`, `public/acceso.html`, `public/js/activities.js` o un módulo frontend acorde al patrón existente, y `public/css/community.css`.

### 4. Correcciones de agenda y navegación

1. Reproducir la edición de salas y rastrear el formulario, petición API, validación y persistencia antes de corregirla.
2. Revisar la creación de agendas recurrentes en el panel para admitir más de un día por semana y varios intervalos horarios por día, incluido el ejemplo lunes/jueves 09:00–13:00 y 19:00–22:00.
3. Mantener validación de solapamientos, zona horaria, disponibilidad de sala/prestador y compatibilidad con agendas y reservas existentes.
4. Seguir el enlace/acción de las tarjetas de prestador y asegurar que no queden elementos clicables sin respuesta.
5. Reproducir el fallo del logo en Nosotros, al final del scroll y en la página de pago efectuado; validar recursos, rutas relativas, estilos sticky/responsive y variantes claro/oscuro.

**Archivos principales:** `public/js/dashboard.js`, `public/js/services.js`, `public/js/booking.js`, `public/js/app.js`, `server/server.js`, `database/schema.sql`, páginas HTML y módulos CSS identificados durante la reproducción.

### 5. Correos y entregabilidad

1. Identificar el proveedor que envía desde `contacto@centropsicarte.cl`, comprobar autenticación del dominio (SPF, DKIM y DMARC) y alinear el remitente con la identidad del dominio.
2. Seleccionar o confirmar un proveedor de correo transaccional e integrar credenciales mediante variables de entorno/secretos de despliegue, nunca en el repositorio.
3. Disparar confirmaciones solo cuando el backend verifique un pago conciliado y la reserva quede confirmada. La redirección de retorno de Khipu por sí sola no confirma un pago.
4. Hacer idempotente el envío frente a notificaciones repetidas y fallos/reintentos. Registrar el resultado del envío y permitir reintentos controlados sin duplicar confirmaciones.
5. Enviar al comprador y al centro un correo con día, hora y prestador; incluir enlace de atención para sesiones online y dirección para sesiones presenciales.
6. Configurar la imagen de perfil del remitente desde el proveedor de correo. Si se requiere que el logo se muestre de forma consistente en clientes compatibles, evaluar BIMI después de validar requisitos y autenticación DNS.
7. Probar recepción, spam, enlaces y contenido en `vmaldonado@centropsicarte.cl`, `ipasten@centropsicarte.cl`, `contacto@centropsicarte.cl` y el correo del comprador, en coordinación con el administrador de correo.

**Archivos principales:** `server/server.js`, `database/schema.sql` solo si hace falta estado de envío, configuración de despliegue y documentación operativa del dominio. La implementación debe seguir la referencia Khipu ya revisada y el flujo de notificaciones existente.

### 6. Verificación y puesta en producción

- Verificar contraste WCAG AA como mínimo: `#D8A048` y `#B88028` no son texto accesible sobre `#FEFDF9`; usarlos como fondos/decoración con texto `#001B40`, o como acentos no textuales. Revisar también estados hover/focus.
- Validar todas las páginas en tema claro y oscuro, y en móvil (<576px), móvil/tablet (768px) y escritorio (992px+).
- Probar permisos de artículos, contenido público no publicado, edición persistente de salas, recurrencias de varios días/intervalos, tarjetas de prestadores, logo en todas las rutas y estados de reserva/pago.
- Probar notificaciones Khipu repetidas y tardías, y comprobar que la reserva y el correo no se duplican ni se confirman por el retorno del navegador.
- Ejecutar validadores y pruebas existentes para cada conjunto de cambios; hacer una prueba de extremo a extremo en entorno de prueba antes del despliegue.
- Preparar respaldo de base de datos y plan de reversión antes de cambiar el esquema o publicar el CMS.

## Orden y dependencias

1. Resolver activos, decisiones de producto y proveedor de correo.
2. Implementar tokens/logos y navegación/contenido público.
3. Definir permisos y modelo de artículos antes de desarrollar el CMS.
4. Corregir salas y recurrencias revisando la compatibilidad con datos actuales.
5. Implementar notificaciones después de acordar proveedor y validar el estado de pago confirmado en servidor.
6. Hacer QA integral y despliegue gradual con respaldo.

## Preguntas abiertas

1. **Permisos para artículos — resuelto: opción B.**
   - A. Solo administradores/publicadores crean y publican: flujo más simple y control editorial alto, pero menos participación.
   - B. Usuarios autenticados envían borradores para revisión: permite aportes con moderación y menor riesgo de publicación inadecuada; requiere estados y herramientas de revisión. **Recomendación:** B.
   - C. Usuarios autenticados publican directamente: menor fricción, pero mayor riesgo de abuso y exigencia de moderación posterior.
2. **Tema oscuro — resuelto: opción A.**
   - A. Mantenerlo y adaptar los nuevos acentos con contraste comprobado: conserva la funcionalidad actual, requiere QA de ambas paletas. **Recomendación:** A.
   - B. Eliminar el tema oscuro: simplifica estilos, pero cambia una función existente.
3. **Asignación de los logos — resuelto: opción A.**
   - A. Usar el logotipo horizontal del brief en la cabecera y el emblema circular en la presentación principal: sigue la secuencia del documento y separa el identificador compacto del logo original. **Recomendación:** A.
   - B. Usar el emblema circular en la cabecera y conservar el horizontal solo en la portada: prioriza el símbolo en navegación, pero cambia el uso sugerido por la secuencia del brief.
4. **Datos de prestadores.**
   - A. Publicar los roles descritos y el registro SIS tras confirmación escrita: máxima transparencia, requiere consentimiento expreso para el identificador.
   - B. Publicar solo nombre y especialidad, omitiendo el número SIS: menor exposición de datos personales, menos detalle verificable.
5. **Texto de aranceles y cobertura.**
   - A. Usar una redacción aprobada por PsicArte que especifique condiciones de reembolso y atención Fonasa: evita promesas ambiguas, requiere validación interna.
   - B. Limitarse a indicar que se entrega boleta y que se consulte a la aseguradora: menor riesgo de afirmar cobertura, pero comunica menos la oferta.
6. **Proveedor de correo y remitente.**
   - A. Mantener el proveedor que actualmente entrega `contacto@centropsicarte.cl` y configurarlo para correo transaccional: menos cambios operativos si soporta API/SMTP confiable.
   - B. Adoptar un servicio transaccional dedicado: mejor trazabilidad y automatización, requiere alta/configuración DNS y credenciales de despliegue.
7. **Imagen de perfil del correo.**
   - A. Configurar avatar del remitente desde el proveedor: rápido, pero la visualización depende del cliente/proveedor receptor.
   - B. Evaluar BIMI con logo y DNS autenticado: mayor control en clientes compatibles, con requisitos adicionales y sin garantía universal.
8. **Horarios recurrentes — resuelto: opción A.**
   - A. Permitir múltiples intervalos para cada día seleccionado: representa directamente el ejemplo, requiere revisar reglas de colisión.
   - B. Crear una regla recurrente independiente por día e intervalo: modelo más explícito y flexible, pero puede ser más complejo de administrar.
9. **Instagram y datos de contacto — resuelto: opción A.**
   - A. Administrarlos desde la configuración existente: editable sin desplegar código, exige revisar los formularios/permisos actuales.
   - B. Mantenerlos como contenido fijo del sitio: implementación rápida, pero cada actualización requiere un despliegue.
