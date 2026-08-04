# Tareas de Implementación — Khipu Instant Payments

## Fase 1: Configuración del Entorno
- [ ] 1.1 Instalar `dotenv` (`npm install dotenv`)
- [ ] 1.2 Crear archivo `.env` en el root con variables placeholder (`KHIPU_RECEIVER_ID`, `KHIPU_SECRET`, `KHIPU_SANDBOX=true`)
- [ ] 1.3 Agregar `.env` al [.gitignore](file:///c:/Users/CLEJPA/Downloads/Psicarte/.gitignore) si no está presente

## Fase 2: Base de Datos
- [ ] 2.1 Modificar [schema.sql](file:///c:/Users/CLEJPA/Downloads/Psicarte/database/schema.sql): agregar columnas `khipuPaymentId TEXT`, `khipuPaymentUrl TEXT` y `created_at DATETIME DEFAULT CURRENT_TIMESTAMP` a la tabla `bookings`
- [ ] 2.2 Eliminar `database.sqlite` para regenerar la DB desde cero
- [ ] 2.3 Arrancar el servidor brevemente para verificar que el schema se aplica sin errores y luego detenerlo

## Fase 3: Backend — Helpers y Configuración ([server.js](file:///c:/Users/CLEJPA/Downloads/Psicarte/server/server.js))
- [ ] 3.1 Agregar `require('dotenv').config()` y `const crypto = require('crypto')` al inicio de server.js
- [ ] 3.2 Leer y validar las variables de entorno de Khipu (`KHIPU_RECEIVER_ID`, `KHIPU_SECRET`, `KHIPU_SANDBOX`)
- [ ] 3.3 Definir constante `KHIPU_API_BASE` según el valor de `KHIPU_SANDBOX`
- [ ] 3.4 Implementar función `generateKhipuSignature(method, url, params, secret)` con HMAC-SHA256
- [ ] 3.5 Implementar función `callKhipuApi(method, path, params)` usando `fetch` nativo (Node v24)
- [ ] 3.6 Implementar función `cleanupPendingPayments()` que elimina reservas `Pending_Payment` con más de 1 hora de antigüedad
- [ ] 3.7 Registrar el cleanup al inicio del servidor y con `setInterval` cada 30 minutos

## Fase 4: Backend — Rutas ([server.js](file:///c:/Users/CLEJPA/Downloads/Psicarte/server/server.js))
- [ ] 4.1 Modificar `POST /api/bookings`: aceptar campo `adminMode` en el body; si es `true` → insertar como `Paid`; si no → insertar como `Pending_Payment` con `khipuPaymentId` y `khipuPaymentUrl` como NULL
- [ ] 4.2 Actualizar el INSERT de bookings para incluir las columnas `khipuPaymentId`, `khipuPaymentUrl` y `created_at`
- [ ] 4.3 Crear ruta `POST /api/khipu/create-payment`:
  - [ ] 4.3.1 Recibir `{ bookingId }` y buscar la reserva en la DB
  - [ ] 4.3.2 Validar que existe y está en `Pending_Payment`
  - [ ] 4.3.3 Llamar a `POST /api/2.0/payments` en Khipu con `subject`, `amount`, `currency`, `transaction_id`, `notify_url`, `payer_email`
  - [ ] 4.3.4 Guardar `payment_id` en `bookings.khipuPaymentId`
  - [ ] 4.3.5 Retornar `{ paymentId, paymentUrl }` al frontend
- [ ] 4.4 Crear ruta `POST /api/khipu/notify` (Webhook):
  - [ ] 4.4.1 Extraer `notification_token` del body
  - [ ] 4.4.2 Llamar a `GET /api/2.0/payments` con el token (firmando la petición)
  - [ ] 4.4.3 Si pago `done`: buscar reserva por `transaction_id`, re-validar conflictos, actualizar estado a `Paid` o `Payment_Conflict`
  - [ ] 4.4.4 Responder HTTP 200 a Khipu
- [ ] 4.5 Crear ruta `GET /api/bookings/:id/payment-status`: retornar `{ status }` de la reserva

## Fase 5: Frontend — HTML ([index.html](file:///c:/Users/CLEJPA/Downloads/Psicarte/public/index.html))
- [ ] 5.1 Agregar `<script src="https://js.khipu.com/v1/kws.js"></script>` en el `<head>`
- [ ] 5.2 Agregar `<div id="khipu-web-root"></div>` antes del cierre de `</body>`
- [ ] 5.3 Reemplazar la sección "Mock Payment Form" (líneas ~333-356) por un panel informativo con botón "Pagar de forma segura con Khipu"
- [ ] 5.4 Eliminar los inputs `card-number`, `card-exp`, `card-cvv` y sus labels

## Fase 6: Frontend — JavaScript ([app.js](file:///c:/Users/CLEJPA/Downloads/Psicarte/public/js/app.js))
- [ ] 6.1 Reescribir `processPayment()` (líneas ~933-1009):
  - [ ] 6.1.1 Validar datos del cliente (name, email, rut, phone)
  - [ ] 6.1.2 Crear reserva via `POST /api/bookings` (sin `adminMode`) → recibe `bookingId` con status `Pending_Payment`
  - [ ] 6.1.3 Solicitar cobro via `POST /api/khipu/create-payment` → recibe `paymentId`
  - [ ] 6.1.4 Iniciar Khipu Inside Web con `khipu.startOperation(paymentId, callback, options)`
  - [ ] 6.1.5 Manejar errores de red o rechazo del backend sin perder selecciones del usuario
- [ ] 6.2 Implementar `handleKhipuResult(result, bookingId)`:
  - [ ] 6.2.1 Si `result.result === 'OK'` → iniciar polling
  - [ ] 6.2.2 Si `result.result === 'ERROR'` → mostrar toast con `exitTitle`
  - [ ] 6.2.3 Si `result.result === 'WARNING'` → mostrar toast informativo
- [ ] 6.3 Implementar `pollPaymentStatus(bookingId, maxAttempts, interval)`:
  - [ ] 6.3.1 Polling a `GET /api/bookings/{id}/payment-status` cada 2s, máx 10 intentos
  - [ ] 6.3.2 Si `Paid` → toast de éxito, limpiar wizard, recargar datos
  - [ ] 6.3.3 Si timeout → mensaje "pago siendo procesado, recibirá confirmación por correo"
- [ ] 6.4 Actualizar override Admin Mode (líneas ~2838-2907): agregar `adminMode: true` al objeto `newBooking`
- [ ] 6.5 Actualizar badges de estado (líneas ~1224, ~1288, ~2546): agregar soporte para `Pending_Payment` con badge "Procesando Pago"

## Fase 7: Verificación
- [ ] 7.1 Crear `scripts/test-khipu-sign.js` para validar la generación de firmas HMAC-SHA256
- [ ] 7.2 Arrancar el servidor y verificar que no hay errores en consola
- [ ] 7.3 Verificar que el flujo Admin sigue funcionando (crear reserva como admin → estado `Paid` directo)
- [ ] 7.4 Verificar que el flujo de usuario llega hasta el modal de Khipu (o muestra error de credenciales placeholder)
- [ ] 7.5 Verificar que reservas `Pending_Payment` huérfanas se limpian correctamente
- [ ] 7.6 Verificar que los badges de estado se renderizan correctamente en los dashboards
- [ ] 7.7 Matar cualquier proceso de servidor iniciado por el agente (R17)
