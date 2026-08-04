# Plan de Integración de Khipu Instant Payments (v2 — Revisado)

Reemplazar el simulador de pagos actual ("PsicArte Pay") por la pasarela de pagos real **Khipu** utilizando:
- **Backend**: API REST de Khipu (`POST /api/2.0/payments`, `GET /api/2.0/payments`) con autenticación HMAC-SHA256.
- **Frontend**: Khipu Inside Web SDK (`kws.js` + `khipu.startOperation()`) en modo **Modal**.

## Decisiones Confirmadas

| # | Pregunta | Decisión |
|---|----------|----------|
| 1 | Entorno (Sandbox vs Producción) | **Opción A**: Archivo `.env` con `KHIPU_RECEIVER_ID`, `KHIPU_SECRET`, `KHIPU_SANDBOX`. |
| 2 | Modalidad UI (Modal vs Embebido) | **Opción A**: Modal con overlay. |
| 3 | Bloqueo de Horarios | **Opción A**: Cita se crea como `Pending_Payment`, **NO bloquea** el slot. Solo `Paid` bloquea. |

---

## Análisis de Impacto y Riesgos

> [!WARNING]
> **Nueva dependencia npm**: Se necesita instalar `dotenv` para cargar las variables de entorno del archivo `.env`. Esto incrementa las dependencias de 3 (`express`, `cors`, `sqlite3`) a 4. Es un paquete estándar, liviano, sin subdependencias transitivas.

> [!IMPORTANT]
> **Reinicio de Base de Datos**: Agregar columnas a `bookings` requiere modificar [schema.sql](file:///c:/Users/CLEJPA/Downloads/Psicarte/database/schema.sql) y eliminar `database.sqlite` para regenerar (regla R13). Las citas de prueba existentes se pierden.

> [!IMPORTANT]
> **Webhook requiere HTTPS público**: Para que Khipu notifique el estado de pago al backend, la URL `notify_url` debe ser accesible desde internet. En desarrollo local se necesita **ngrok** o similar. En producción, el servidor debe tener un dominio HTTPS válido.

### Riesgo: Double-booking con pagos simultáneos
Dado que `Pending_Payment` no bloquea el slot, dos usuarios podrían intentar pagar el mismo horario en paralelo. **Mitigación**: El webhook de Khipu, al confirmar el pago, ejecutará las mismas validaciones de conflicto que ya existen en `POST /api/bookings` (líneas 243-268 de [server.js](file:///c:/Users/CLEJPA/Downloads/Psicarte/server/server.js)). Si el slot ya fue tomado, la reserva del segundo usuario quedará como `Payment_Conflict` y se le notificará.

### Riesgo: Reservas `Pending_Payment` huérfanas
Usuarios que abandonan el flujo de pago dejan reservas en `Pending_Payment` indefinidamente. **Mitigación**: Agregar una limpieza automática al inicio del servidor y periódicamente (cada 30 minutos) que elimine reservas `Pending_Payment` con más de 1 hora de antigüedad.

---

## Proposed Changes

### 1. Base de Datos

#### [MODIFY] [schema.sql](file:///c:/Users/CLEJPA/Downloads/Psicarte/database/schema.sql)
Agregar 2 columnas a la tabla `bookings`:
```diff
 CREATE TABLE IF NOT EXISTS bookings (
     id TEXT PRIMARY KEY,
     ...
     status TEXT,
-    rescheduleCount INTEGER DEFAULT 0
+    rescheduleCount INTEGER DEFAULT 0,
+    khipuPaymentId TEXT,
+    khipuPaymentUrl TEXT
 );
```

---

### 2. Configuración del Entorno

#### [NEW] .env (root del proyecto)
Archivo de configuración de credenciales (se agregará a `.gitignore`):
```
KHIPU_RECEIVER_ID=tu_receiver_id_aqui
KHIPU_SECRET=tu_secret_aqui
KHIPU_SANDBOX=true
```

#### [MODIFY] [.gitignore](file:///c:/Users/CLEJPA/Downloads/Psicarte/.gitignore)
Agregar `.env` a la lista de ignorados (si no está ya).

#### Instalar `dotenv`
```bash
npm install dotenv
```

---

### 3. Backend — [server.js](file:///c:/Users/CLEJPA/Downloads/Psicarte/server/server.js)

#### 3.1. Configuración inicial (inicio del archivo)
- Agregar `require('dotenv').config()` y `const crypto = require('crypto')` al inicio.
- Leer `process.env.KHIPU_RECEIVER_ID`, `process.env.KHIPU_SECRET`, `process.env.KHIPU_SANDBOX`.
- Definir constante `KHIPU_API_BASE` que apunte a `https://khipu.com` (producción) o sandbox según la variable de entorno.

#### 3.2. Helper de firma HMAC-SHA256
Función `generateKhipuSignature(method, url, params, secret)` que:
1. Ordena los parámetros alfabéticamente por clave.
2. Codifica claves y valores con `encodeURIComponent` (RFC 3986).
3. Construye la cadena `METHOD&encodedURL&encodedParams`.
4. Firma con `crypto.createHmac('sha256', secret).update(stringToSign).digest('hex')`.

#### 3.3. Helper de llamada a API Khipu
Función `callKhipuApi(method, path, params)` que:
1. Genera la firma HMAC.
2. Hace la petición HTTP con `fetch` nativo (Node v24 soporta `fetch` global).
3. Maneja errores de red y respuestas no-200 de Khipu.

#### 3.4. Modificar `POST /api/bookings` (líneas 225-295)
**Cambio de comportamiento**:
- Si la petición viene con `adminMode: true` → insertar con estado `Paid` directamente (flujo admin sin pago, tal como funciona hoy).
- Si NO es admin → insertar con estado `Pending_Payment`. Ya NO insertar directamente como `Paid`. La reserva queda pendiente hasta confirmación de Khipu.
- El INSERT debe incluir los nuevos campos `khipuPaymentId` y `khipuPaymentUrl` (inicialmente NULL).

> [!NOTE]
> Las **validaciones de conflicto** existentes (sickness blocks, provider overlap, room conflict en líneas 234-268) se mantienen intactas y siguen verificando solo contra estado `Paid`, por lo que una `Pending_Payment` no bloquea slots para otros usuarios.

#### 3.5. Nueva ruta `POST /api/khipu/create-payment`
Recibe: `{ bookingId }`.
1. Busca la reserva en la DB para obtener `price`, `serviceName`, `clientEmail`.
2. Valida que exista y esté en `Pending_Payment`.
3. Llama a `POST /api/2.0/payments` en Khipu con:
   - `subject`: `"Reserva PsicArte: {serviceName}"`.
   - `amount`: precio del servicio.
   - `currency`: `"CLP"`.
   - `transaction_id`: `bookingId`.
   - `notify_url`: `{BASE_URL}/api/khipu/notify`.
   - `payer_email`: email del cliente.
4. Guarda el `payment_id` devuelto por Khipu en `bookings.khipuPaymentId`.
5. Retorna `{ paymentId, paymentUrl }` al frontend.

#### 3.6. Nueva ruta `POST /api/khipu/notify` (Webhook)
1. Extrae `notification_token` del body del POST.
2. Llama a `GET /api/2.0/payments` con el `notification_token` (firmando la petición) para obtener los detalles reales del pago directamente de Khipu.
3. Si el pago tiene estado `done`:
   - Busca la reserva por `transaction_id` (= `bookingId`).
   - **Re-ejecuta las validaciones de conflicto** (provider overlap + room conflict) contra bookings `Paid` existentes.
   - Si no hay conflicto → actualiza estado a `Paid`.
   - Si hay conflicto → actualiza estado a `Payment_Conflict` (se necesitará gestión manual o reembolso).
4. Responde HTTP 200 a Khipu (obligatorio para que Khipu no reintente).

#### 3.7. Nueva ruta `GET /api/bookings/:id/payment-status`
Endpoint ligero para que el frontend haga polling después de cerrar el modal de Khipu:
- Retorna `{ status: booking.status }`.

#### 3.8. Limpieza de reservas huérfanas
Al inicio del servidor y con `setInterval` cada 30 minutos:
```javascript
function cleanupPendingPayments() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    db.run("DELETE FROM bookings WHERE status = 'Pending_Payment' AND created_at < ?", [oneHourAgo]);
}
```

> [!IMPORTANT]
> Esto requiere agregar la columna `created_at` a la tabla `bookings` en [schema.sql](file:///c:/Users/CLEJPA/Downloads/Psicarte/database/schema.sql):
> ```sql
> created_at DATETIME DEFAULT CURRENT_TIMESTAMP
> ```

---

### 4. Frontend — [index.html](file:///c:/Users/CLEJPA/Downloads/Psicarte/public/index.html)

#### 4.1. Incluir Khipu Web SDK
Agregar en el `<head>`:
```html
<script src="https://js.khipu.com/v1/kws.js"></script>
```

#### 4.2. Agregar elemento ancla para Khipu
Agregar antes del cierre del `</body>`:
```html
<div id="khipu-web-root"></div>
```

#### 4.3. Reemplazar el formulario de pago simulado
Eliminar la sección "Mock Payment Form" (líneas 333-356 aprox.):
- Eliminar los inputs `card-number`, `card-exp`, `card-cvv`.
- Reemplazar por un panel informativo que muestre el monto total, una descripción del servicio, y un botón "Pagar de forma segura con Khipu" con el logo de Khipu.

---

### 5. Frontend — [app.js](file:///c:/Users/CLEJPA/Downloads/Psicarte/public/js/app.js)

#### 5.1. Reescribir `processPayment()` (líneas 933-1009)
**Flujo nuevo**:
1. Validar que los datos del cliente estén completos (`name`, `email`, `rut`, `phone`).
2. Crear la reserva en el backend: `POST /api/bookings` → recibe `bookingId` con status `Pending_Payment`.
3. Solicitar cobro a Khipu: `POST /api/khipu/create-payment` con `{ bookingId }` → recibe `{ paymentId }`.
4. Iniciar Khipu Inside Web:
   ```javascript
   const khipu = new Khipu();
   khipu.startOperation(paymentId, handleKhipuResult, {
       mountElement: document.getElementById('khipu-web-root'),
       modal: true,
       modalOptions: { maxWidth: 450, maxHeight: 860 },
       options: {
           style: { primaryColor: '#bfa15f', fontFamily: 'Outfit' },
           skipExitPage: false
       }
   });
   ```
5. Si algún paso falla (error de red, backend rechaza), mostrar toast de error sin perder las selecciones del usuario.

#### 5.2. Nueva función `handleKhipuResult(result)`
```javascript
async function handleKhipuResult(result) {
    if (result.result === 'OK') {
        // Polling al backend para confirmar que el webhook procesó el pago
        await pollPaymentStatus(bookingId, maxAttempts=10, intervalMs=2000);
    } else if (result.result === 'ERROR') {
        showToast(result.exitTitle || 'Error en el pago', 'error');
    } else if (result.result === 'WARNING') {
        showToast(result.exitTitle || 'Pago pendiente de verificación', 'warning');
    }
}
```

#### 5.3. Nueva función `pollPaymentStatus(bookingId, maxAttempts, interval)`
- Llama a `GET /api/bookings/${bookingId}/payment-status` cada 2 segundos, hasta 10 intentos.
- Si recibe `status === 'Paid'`:
  - Muestra toast de éxito.
  - Limpia el estado del wizard.
  - Recarga datos y vuelve al paso 1.
- Si se agotan los intentos:
  - Muestra mensaje de que el pago está siendo procesado y que recibirá confirmación por correo.

#### 5.4. Actualizar el override de Admin Mode (líneas 2838-2907)
- El flujo admin (`sessionStorage.admin_booking_mode === 'true'`) debe enviar `adminMode: true` en el body de `POST /api/bookings` para que el backend inserte directamente como `Paid` (sin pasar por Khipu). No requiere cambios significativos, solo agregar el campo `adminMode: true` al objeto `newBooking`.

#### 5.5. Actualizar badges de estado
Las líneas 1224, 1288, 2546 que renderizan badges ya soportan estados genéricos (`Paid`, `Cancelled`, y un default "Pendiente"). Agregar soporte explícito para `Pending_Payment`:
```javascript
bk.status === 'Pending_Payment' ? '<span class="badge badge-warning">Procesando Pago</span>'
```

---

## Archivos Impactados (Resumen)

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| [schema.sql](file:///c:/Users/CLEJPA/Downloads/Psicarte/database/schema.sql) | MODIFY | Agregar `khipuPaymentId`, `khipuPaymentUrl`, `created_at` a `bookings` |
| `.env` | NEW | Credenciales Khipu (no versionado) |
| [.gitignore](file:///c:/Users/CLEJPA/Downloads/Psicarte/.gitignore) | MODIFY | Agregar `.env` |
| `package.json` | MODIFY | Agregar `dotenv` como dependencia |
| [server.js](file:///c:/Users/CLEJPA/Downloads/Psicarte/server/server.js) | MODIFY | Helpers Khipu, rutas de creación de cobro, webhook, cleanup |
| [index.html](file:///c:/Users/CLEJPA/Downloads/Psicarte/public/index.html) | MODIFY | SDK script, ancla div, reemplazar formulario simulado |
| [app.js](file:///c:/Users/CLEJPA/Downloads/Psicarte/public/js/app.js) | MODIFY | `processPayment()`, callback handler, polling, badges |

---

## Verification Plan

### Automated Tests
1. **Script de firma**: Crear `scripts/test-khipu-sign.js` que genere firmas HMAC-SHA256 con inputs conocidos y compare contra el resultado esperado.
2. **Webhook simulado**: Script `scripts/test-webhook.js` que envíe un POST a `/api/khipu/notify` con un `notification_token` falso para verificar que el servidor lo rechaza correctamente (validación de firma).

### Manual Verification
1. **Flujo completo Sandbox**:
   - Reservar una cita como usuario normal.
   - Verificar que se crea con estado `Pending_Payment`.
   - Completar el pago en el modal de Khipu (sandbox).
   - Verificar que el webhook actualiza el estado a `Paid`.
   - Verificar que el horario queda bloqueado para otros usuarios.
2. **Flujo Admin**:
   - Reservar como administrador y verificar que sigue creándose directamente como `Paid` sin pasar por Khipu.
3. **Cancelación de pago**:
   - Iniciar un pago y cerrarlo/cancelarlo en el modal.
   - Verificar que la reserva queda como `Pending_Payment` y no bloquea el slot.
   - Esperar 1 hora (o forzar el cleanup) y verificar que se elimina automáticamente.
4. **Double-booking protection**:
   - Crear dos reservas `Pending_Payment` para el mismo slot.
   - Confirmar el pago de la primera → status `Paid`.
   - Confirmar el pago de la segunda → status `Payment_Conflict`.
