# API Pagos Instantáneos

La API Instant Payment de Khipu (versión 3.0) permite a comerciantes iniciar, consultar, confirmar,  reembolsar o eliminar pagos inmediatos mediante transferencias bancarias en tiempo real.  Entre sus principales funcionalidades se encuentran: obtener la lista de bancos disponibles  con detalles como límites, tarifas y logos; crear un pago especificando un banco o dejar que el  usuario elija; confirmar o solicitar el reembolso de un pago mediante su ID; y predecir el estado  de un pago usando machine learning. Esta API maneja autenticación mediante clave secreta en el  encabezado x-api-key, no requiere firmas, y utiliza certificados SSL de validación extendida para  asegurar la comunicación

Version: v3.0
License: API Pagos Instantáneos

## Servers

Producción
```
https://payment-api.khipu.com
```

## Security

### Api-Key

Type: apiKey
In: header
Name: x-api-key

## Download OpenAPI description

 - [API Pagos Instantáneos](https://docs.khipu.com/_bundle/apis/v3/instant-payments/openapi.yaml)

 - [GET /v3/banks](https://docs.khipu.com/apis/v3/instant-payments/openapi/other/getbanks.md): Este método obtiene la lista de bancos que se pueden utilizar para pagar en esta cuenta de cobro.
 - [POST /v3/payments/{id}/confirm](https://docs.khipu.com/apis/v3/instant-payments/openapi/other/postpaymentconfirmbyid.md): **Advertencia: Esta función sólo está disponible para los clientes que la hayan contratado de forma independiente. Para utilizarla, póngase en contacto con nosotros en soporte@khipu.com** Confirmar el
 - [GET /v3/payments/{id}](https://docs.khipu.com/apis/v3/instant-payments/openapi/other/getpaymentbyid.md): Información completa del pago. Datos con los que fue creado y el estado actual del pago.
 - [DELETE /v3/payments/{id}](https://docs.khipu.com/apis/v3/instant-payments/openapi/other/deletepaymentbyid.md): Borrar un pago. Solo se pueden borrar pagos que estén pendientes de pagar. Esta operación no puede deshacerse.
 - [POST /v3/payments](https://docs.khipu.com/apis/v3/instant-payments/openapi/other/postpayment.md): Crea un pago en Khipu y obtiene las URLs para redirección al usuario para que complete el pago.
 - [POST /v3/payments/{id}/void](https://docs.khipu.com/apis/v3/instant-payments/openapi/other/voidpaymentbyid.md): Anula el monto total de un pago. Esta operación solo se puede realizar en los comercios que recauden en cuenta Khipu y antes de la rendición de los fondos correspondientes.
 - [POST /v3/refunds](https://docs.khipu.com/apis/v3/instant-payments/openapi/other/postrefund.md): Devolución total o parcial del monto de un pago. Con `type=full` el monto completo disponible para devolver queda marcado para devolución al pagador; con `type=partial` queda marcada la parte indicada
 - [GET /v3/refund-wallet/balance](https://docs.khipu.com/apis/v3/instant-payments/openapi/other/getrefundwalletbalance.md): Obtiene el saldo disponible de la billetera de devoluciones del comercio. Para que las devoluciones se concreten, la billetera debe mantener un saldo mayor a las devoluciones del día; puede recargarse
 - [GET /v3/predict](https://docs.khipu.com/apis/v3/instant-payments/openapi/other/getpredict.md): Predicción acerca del resultado de un pago, si podrá o no funcionar. Información adicional como máximo posible de transferir a un nuevo destinatario.
 - [GET /v3/predict/all](https://docs.khipu.com/apis/v3/instant-payments/openapi/other/getpredictall.md): Predicción acerca del resultado de un pago para cada uno de los bancos disponibles para la cuenta de cobro, sin necesidad de indicar un banco. Permite ofrecerle al pagador solo los bancos con los que
 - [POST /v3/receivers](https://docs.khipu.com/apis/v3/instant-payments/openapi/other/postreceiver.md): **Advertencia: Esta función sólo está disponible para los clientes que la hayan contratado de forma independiente. Para utilizarla, póngase en contacto con nosotros en soporte@khipu.com** Crear una nu
 - [GET /v3/receivers/children](https://docs.khipu.com/apis/v3/instant-payments/openapi/other/getreceivers.md): **Advertencia: Esta función sólo está disponible para los clientes que la hayan contratado de forma independiente. Para utilizarla, póngase en contacto con nosotros en soporte@khipu.com** Obtener la l
 - [GET /v3/merchants/{id}/paymentMethods](https://docs.khipu.com/apis/v3/instant-payments/openapi/other/getmerchantpaymentmethodsbyid.md): Obtiene el listado de medios de pago disponible para una cuenta de cobrador.
 - [POST /v3/payments/{id}/refunds](https://docs.khipu.com/apis/v3/instant-payments/openapi/other/postpaymentrefundsbyid.md): **Obsoleto:** este método fue reemplazado por [*Void payment by Id*](#operation/voidPaymentById) (`POST /v3/payments/{id}/void`). Reembolsa el monto total de un pago. Esta operación solo se puede real


# Get banks

Este método obtiene la lista de bancos que se pueden utilizar para pagar en esta cuenta de cobro.

Endpoint: GET /v3/banks
Version: v3.0
Security: Api-Key

## Security:

  - `Api-Key` (unknown)
    apiKey in header x-api-key

## Response 200:

  - `200` (unknown)
    Operación exitosa. Devuelve un objeto JSON con el conjunto de bancos disponibles.

## Response 200 fields (application/json):

  - `banks` (array, required)
    Arreglo con listado de bancos.

  - `banks.bank_id` (string, required)
    Identificador del banco.
    Example: SDdGj

  - `banks.name` (string, required)
    Nombre del banco.
    Example: Banco Estado

  - `banks.message` (string, required)
    Mensaje con particularidades del banco.
    Example: Tarifa de $300 de transferencia a otros bancos, usando CuentaRUT.

  - `banks.min_amount` (number, required)
    Monto mínimo que acepta el banco en un pago.
    Example: 1000

  - `banks.type` (string, required)
    Tipo de banco.
    Enum: "Persona", "Empresa"

  - `banks.parent` (string, required)
    Identificador del banco padre (si un banco tiene banca personas y empresas, el primero será el padre del segundo).

  - `banks.logo_url` (string)
    URL del logo del banco.
    Example: https://s3.amazonaws.com/static.khipu.com/logos/bancos/chile/estado-icon.png

## Response 400:

  - `400` (unknown)
    Bad request - Solicitud mal formada

## Response 401:

  - `401` (unknown)
    Unauthorized - Credenciales no válidas o faltantes

## Response 403:

  - `403` (unknown)
    Forbidden - Cliente no tiene privilegios

## Response 404:

  - `404` (unknown)
    Not found - Recurso no disponible

## Response 500:

  - `500` (unknown)
    Internal server error - Servidor no pudo completar la solicitud

example:
import fetch from 'node-fetch';

async function run() {
  const resp = await fetch(
    `https://payment-api.khipu.com/v3/banks`,
    {
      method: 'GET',
      headers: {
        'x-api-key': 'YOUR_API_KEY_HERE'
      }
    }
  );

  const data = await resp.text();
  console.log(data);
}

run();

# Confirm payment by Id

**Advertencia: Esta función sólo está disponible para los clientes que la hayan contratado de forma independiente.
Para utilizarla, póngase en contacto con nosotros en soporte@khipu.com**
Confirmar el pago. Al confirmar el pago, este será rendido al día hábil
siguiente.

Endpoint: POST /v3/payments/{id}/confirm
Version: v3.0
Security: Api-Key

## Security:

  - `Api-Key` (unknown)
    apiKey in header x-api-key

## Path parameters:

  - `id` (string, required)
    Identificador del pago

## Response 200:

  - `200` (unknown)
    Operación exitosa.

## Response 200 fields (application/json):

  - `message` (string, required)
    Mensaje a desplegar al usuario.
    Example: Message.

## Response 400:

  - `400` (unknown)
    Bad request - Solicitud mal formada

## Response 401:

  - `401` (unknown)
    Unauthorized - Credenciales no válidas o faltantes

## Response 403:

  - `403` (unknown)
    Forbidden - Cliente no tiene privilegios

## Response 404:

  - `404` (unknown)
    Not found - Recurso no disponible

## Response 500:

  - `500` (unknown)
    Internal server error - Servidor no pudo completar la solicitud

example:
import fetch from 'node-fetch';

async function run() {
  const id = 'YOUR_id_PARAMETER';
  const resp = await fetch(
    `https://payment-api.khipu.com/v3/payments/${id}/confirm`,
    {
      method: 'POST',
      headers: {
        'x-api-key': 'YOUR_API_KEY_HERE'
      }
    }
  );

  const data = await resp.text();
  console.log(data);
}

run();

# Get payment by Id

Información completa del pago. Datos con los que fue creado y el estado actual del pago.

Endpoint: GET /v3/payments/{id}
Version: v3.0
Security: Api-Key

## Security:

  - `Api-Key` (unknown)
    apiKey in header x-api-key

## Path parameters:

  - `id` (string, required)
    Identificador del pago

## Response 200:

  - `200` (unknown)
    Operación exitosa. Devuelve un objeto JSON con la información de pago.

## Response 200 fields (application/json):

  - `payment_id` (string, required)
    Identificador único del pago, es una cadena alfanumérica de 12 caracteres. Como este identificador es único, se puede usar, por ejemplo, para evitar procesar una notificación repetida. (Khipu espera un código 200 al notificar un pago, si esto no ocurre se reintenta hasta por dos días).
    Example: gqzdy6chjne9

  - `payment_url` (string, required)
    URL principal del pago, si el usuario no ha elegido previamente un método de pago se le muestran las opciones.
    Example: https://khipu.com/payment/info/gqzdy6chjne9

  - `simplified_transfer_url` (string, required)
    URL de pago simplificado.
    Example: https://app.khipu.com/payment/simplified/gqzdy6chjne9

  - `transfer_url` (string, required)
    URL de pago normal.
    Example: https://khipu.com/payment/manual/gqzdy6chjne9

  - `app_url` (string, required)
    URL para invocar el pago desde un dispositivo móvil usando la APP de Khipu.
    Example: khipu:///pos/gqzdy6chjne9

  - `ready_for_terminal` (boolean, required)
    Es `true` si el pago ya cuenta con todos los datos necesarios para abrir directamente la aplicación de pagos Khipu.
    Example: false

  - `notification_token` (string, required)
    Cadena de caracteres alfanuméricos que identifican unicamente al pago, es el identificador que el servidor de Khipu enviará al servidor del comercio cuando notifique que un pago está conciliado.
    Example: 9dec8aa176c5223026919b3b5579a4776923e646ff3be686b9e6b62ec042e91f

  - `receiver_id` (integer, required)
    Identificador único de una cuenta de cobro.
    Example: 985101

  - `conciliation_date` (string, required)
    Fecha y hora de conciliación del pago. Formato ISO-8601.
    Example: 2017-03-01T13:00:00.000Z

  - `subject` (string, required)
    Motivo del pago.
    Example: Test

  - `amount` (string, required)
    El monto del cobro.
    Example: 1000.0000

  - `currency` (string, required)
    El código de moneda en formato ISO-4217.
    Example: CLP

  - `status` (string, required)
    Estado del pago, puede ser `pending` (el pagador aún no comienza a pagar), `verifying` (se está verificando el pago) o `done`, cuando el pago ya está confirmado.
    Enum: "pending", "verifying", "done"

  - `status_detail` (string, required)
    Detalle del estado del pago:
`pending` (el pagador aún no comienza a pagar),
`normal` (el pago fue verificado y fue cancelado por algún medio de pago estándar),
`marked-paid-by-receiver` (el cobrador marcó el cobro como pagado por otro medio),
`rejected-by-payer` (el pagador declaró que no pagará),
`marked-as-abuse` (el pagador declaró que no pagará y que el cobro fue no solicitado),
`reversed` (el pago fue anulado por el comercio y el monto quedó marcado para devolución al pagador),
`partially-refunded` (una parte del monto del pago quedó marcada para devolución al pagador mediante devoluciones parciales), y
`fully-refunded` (el monto total del pago quedó marcado para devolución al pagador mediante una o más devoluciones).
    Enum: "pending", "normal", "marked-paid-by-receiver", "rejected-by-payer", "marked-as-abuse", "reversed", "partially-refunded", "fully-refunded"

  - `body` (string, required)
    Detalle del cobro.
    Example: Test

  - `picture_url` (string, required)
    URL con imagen del cobro.
    Example: https://micomercio.com/picture_url

  - `receipt_url` (string, required)
    URL del comprobante de pago.
    Example: https://micomercio.com/order/receipt_url

  - `return_url` (string, required)
    URL donde se redirige al pagador luego que termina el pago.
    Example: https://micomercio.com/order/return_url

  - `cancel_url` (string, required)
    URL donde se redirige al pagador luego de que desiste hacer el pago.
    Example: https://micomercio.com/order/cancel_url

  - `notify_url` (string, required)
    URL del webservice donde se notificará el pago.
    Example: https://micomercio.com/webhook/notify_url

  - `notify_api_version` (string, required)
    Versión de la API de notificación.
    Example: 3.0

  - `expires_date` (string, required)
    Fecha máxima para ejecutar el pago (en formato ISO-8601). El cliente podrá realizar varios intentos de pago hasta dicha fecha. Cada intento tiene un plazo individual de 3 horas para su ejecución.
    Example: 2023-12-31T15:45:00-04:00

  - `attachment_urls` (array, required)
    Arreglo de URLs de archivos adjuntos al pago.

  - `bank` (string, required)
    Nombre del banco seleccionado por el pagador.
    Example: Banco de Chile (Edwards Citi)

  - `bank_id` (string, required)
    Identificador del banco seleccionado por el pagador.
    Example: dfFbF

  - `payer_name` (string, required)
    Nombre del pagador.
    Example: Nombre Pagador

  - `payer_email` (string, required)
    Correo electrónico del pagador.
    Example: pagador@email.com

  - `personal_identifier` (string, required)
    Identificador personal del pagador.
    Example: 11.000.111-9

  - `bank_account_number` (string, required)
    Número de cuenta bancaria del pagador.
    Example: 001120490689

  - `out_of_date_conciliation` (boolean, required)
    Es `true` si la conciliación del pago fue hecha luego de la fecha de expiración.
    Example: true

  - `transaction_id` (string, required)
    Identificador del pago asignado por el cobrador.
    Example: zwo3wqz6uulcvajt

  - `authorizer_operation_code` (string)
    Identificador único de la transacción otorgado por el organismo autorizador de la operación.
    Example: AUT-20240418-0001

  - `custom` (string, required)
    Campo genérico que asigna el cobrador al momento de hacer el pago.
    Example: <xml>...</xml>

  - `responsible_user_email` (string, required)
    Correo electrónico de la persona responsable del pago.
    Example: responsible@email.com

  - `send_reminders` (boolean, required)
    Es `true` cuando este es un cobro por correo electrónico y Khipu enviará recordatorios.
    Example: true

  - `send_email` (boolean, required)
    Es `true` cuando Khipu enviará el cobro por correo electrónico.
    Example: true

  - `payment_method` (string, required)
    Método de pago usado por el pagador, puede ser `regular_transfer` (transferencia normal) o `simplified_transfer` (transferencia simplificada).
    Enum: "regular_transfer", "simplified_transfer", "not_available"

  - `funds_source` (string, required)
    Origen de fondos usado por el pagador, puede ser `debit` para pago con débito, `prepaid` para pago con prepago, `credit` para pago con crédito, o vacío en el caso de que se haya pagado mediante transferencia bancaria.
    Enum: "debit", "prepaid", "credit", "not-available", ""

  - `discount` (string)
    Monto a descontar del valor pagado.
    Example: 0.0000

  - `third_party_authorization_details` (string)
    Ignorar este campo.

  - `refunds` (array)
    Devoluciones solicitadas sobre este pago, de la más antigua a la más reciente. Solo aparece cuando el pago tiene devoluciones. Un pago anulado no admite devoluciones: esa operación se informa con `void_payout_date`.

  - `refunds.id` (string, required)
    Identificador único de la devolución, el mismo que entrega la respuesta de `POST /v3/refunds`.
    Example: b31bd9aa-273b-4aed-9516-85866d47a931

  - `refunds.status` (string, required)
    Estado de la devolución:
`pending` (solicitada, aún sin confirmar),
`authorized` (Khipu se hace responsable de la devolución),
`paid` (los fondos fueron entregados al pagador, confirmado por la conciliación bancaria), y
`expired` (la devolución no se confirmó dentro de 15 días hábiles y ya no se realizará).
    Enum: "pending", "authorized", "paid", "expired"

  - `refunds.amount` (string, required)
    Monto de la devolución.
    Example: 5000.0000

  - `refunds.currency` (string, required)
    El código de moneda en formato ISO-4217.
    Example: CLP

  - `refunds.request_date` (string, required)
    Fecha y hora en que se solicitó la devolución. Formato ISO-8601.
    Example: 2026-08-28T14:03:22.000Z

  - `refunds.authorization_date` (string)
    Fecha y hora en que la devolución quedó autorizada. Solo aparece cuando ya fue autorizada. Formato ISO-8601.
    Example: 2026-08-28T14:05:12.000Z

  - `refunds.payout_date` (string)
    Fecha y hora en que los fondos fueron entregados al pagador. Solo aparece cuando la devolución ya fue pagada. Formato ISO-8601.
    Example: 2026-09-01T09:30:00.000Z

  - `refunds.expiration_date` (string)
    Fecha y hora en que la devolución expiró. Solo aparece cuando la devolución expiró. Formato ISO-8601.
    Example: 2026-08-31T03:00:00.000Z

  - `total_refunded` (string)
    Monto total devuelto al pagador en este pago. Solo aparece cuando el pago tiene devoluciones. Las devoluciones expiradas no se suman.
    Example: 5000.0000

  - `void_payout_date` (string)
    Fecha y hora en que los fondos de la anulación fueron entregados al pagador. Solo aparece en pagos anulados (`status_detail: reversed`) cuya anulación ya fue pagada al pagador. Formato ISO-8601.
    Example: 2026-09-02T09:30:00.000Z

## Response 400:

  - `400` (unknown)
    Bad request - Solicitud mal formada

## Response 401:

  - `401` (unknown)
    Unauthorized - Credenciales no válidas o faltantes

## Response 403:

  - `403` (unknown)
    Forbidden - Cliente no tiene privilegios

## Response 404:

  - `404` (unknown)
    Not found - Recurso no disponible

## Response 500:

  - `500` (unknown)
    Internal server error - Servidor no pudo completar la solicitud

## Response 200 examples:

  - `Pago con devoluciones` (unknown)

  - `Pago anulado` (unknown)

example:
import fetch from 'node-fetch';

async function run() {
  const id = 'YOUR_id_PARAMETER';
  const resp = await fetch(
    `https://payment-api.khipu.com/v3/payments/${id}`,
    {
      method: 'GET',
      headers: {
        'x-api-key': 'YOUR_API_KEY_HERE'
      }
    }
  );

  const data = await resp.text();
  console.log(data);
}

run();

# Delete payment by Id

Borrar un pago. Solo se pueden borrar pagos que estén pendientes de pagar. Esta operación no puede deshacerse.

Endpoint: DELETE /v3/payments/{id}
Version: v3.0
Security: Api-Key

## Security:

  - `Api-Key` (unknown)
    apiKey in header x-api-key

## Path parameters:

  - `id` (string, required)
    Identificador del pago

## Response 200:

  - `200` (unknown)
    Operación exitosa.

## Response 200 fields (application/json):

  - `message` (string, required)
    Mensaje a desplegar al usuario.
    Example: Message.

## Response 400:

  - `400` (unknown)
    Bad request - Solicitud mal formada

## Response 401:

  - `401` (unknown)
    Unauthorized - Credenciales no válidas o faltantes

## Response 403:

  - `403` (unknown)
    Forbidden - Cliente no tiene privilegios

## Response 404:

  - `404` (unknown)
    Not found - Recurso no disponible

## Response 500:

  - `500` (unknown)
    Internal server error - Servidor no pudo completar la solicitud

example:
import fetch from 'node-fetch';

async function run() {
  const id = 'YOUR_id_PARAMETER';
  const resp = await fetch(
    `https://payment-api.khipu.com/v3/payments/${id}`,
    {
      method: 'DELETE',
      headers: {
        'x-api-key': 'YOUR_API_KEY_HERE'
      }
    }
  );

  const data = await resp.text();
  console.log(data);
}

run();

# Create payment

Crea un pago en Khipu y obtiene las URLs para redirección al usuario para que complete el pago.

Endpoint: POST /v3/payments
Version: v3.0
Security: Api-Key

## Security:

  - `Api-Key` (unknown)
    apiKey in header x-api-key

## Request fields (application/json):

  - `amount` (number, required)
    El monto del cobro. Sin separador de miles y usando '.' como separador de decimales. Hasta 4 lugares decimales, dependiendo de la moneda.
    Example: 1000

  - `currency` (string, required)
    El código de moneda en formato ISO-4217.
    Enum: "CLP", "CLF", "ARS", "PEN", "MXN", "USD", "EUR", "BOB", "COP"

  - `subject` (string, required)
    Motivo.
    Example: Cobro de prueba

  - `transaction_id` (string)
    Identificador propio de la transacción. Ej: número de factura u orden de compra.
    Example: zwo3wqz6uulcvajt

  - `custom` (string)
    Parámetro para enviar información personalizada de la transacción. Ej: documento XML con el detalle del carro de compra.
    Example: <xml>...</xml>

  - `body` (string)
    Descripción del cobro.
    Example: Cobro de orden de compra #123-abcdef

  - `bank_id` (string)
    Identificador del banco para usar en el pago.
    Example: SDdGj

  - `return_url` (string)
    La dirección URL a donde enviar al cliente mientras el pago está siendo verificado.
    Example: https://micomercio.com/order/return_url

  - `cancel_url` (string)
    La dirección URL a donde enviar al cliente si decide no hacer hacer la transacción.
    Example: https://micomercio.com/order/cancel_url

  - `picture_url` (string)
    Una dirección URL de una foto de tu producto o servicio.
    Example: https://micomercio.com/picture_url

  - `notify_url` (string)
    La dirección del web-service que utilizará khipu para notificar cuando el pago esté conciliado.
    Example: https://micomercio.com/webhook/notify_url

  - `contract_url` (string)
    La dirección URL del archivo PDF con el contrato a firmar mediante este pago. El cobrador debe estar habilitado para este servicio y el campo `fixed_payer_personal_identifier` es obligatorio.
    Example: https://micomercio.com/contract_url

  - `notify_api_version` (string)
    Versión de la API de notificaciones para recibir avisos por web-service.
    Example: 3.0

  - `expires_date` (string)
    Fecha máxima para ejecutar el pago (en formato ISO-8601). El cliente podrá realizar varios intentos de pago hasta dicha fecha. Cada intento tiene un plazo individual de 3 horas para su ejecución.
    Example: 2023-12-31T15:45:00-04:00

  - `send_email` (boolean)
    Si es `true`, se enviará una solicitud de cobro al correo especificado en `payer_email`.
    Example: false

  - `payer_name` (string)
    Nombre del pagador. Es obligatorio cuando `send_email` es `true`.
    Example: Nombre Pagador

  - `payer_email` (string)
    Correo del pagador. Es obligatorio cuando `send_email` es `true`.
    Example: pagador@email.com

  - `send_reminders` (boolean)
    Si es `true`, se enviarán recordatorios de cobro.
    Example: true

  - `responsible_user_email` (string)
    Correo electrónico del responsable de este cobro, debe corresponder a un usuario Khipu con permisos para cobrar usando esta cuenta de cobro.
    Example: responsible@email.com

  - `fixed_payer_personal_identifier` (string)
    Identificador personal. Si se especifica, solo podrá ser pagado usando ese identificador.
    Example: 11.000.111-9

  - `integrator_fee` (string)
    Comisión para el integrador. Sólo es válido si la cuenta de cobro tiene una cuenta de integrador asociada.
    Example: 100

  - `collect_account_uuid` (string)
    Para cuentas de cobro con más cuenta propia. Permite elegir la cuenta donde debe ocurrir la transferencia.
    Example: 007367340234

  - `confirm_timeout_date` (string)
    Fecha de rendición del cobro. Es también la fecha final para poder reembolsar el cobro. Formato ISO-8601.
    Example: 2017-03-01T13:00:00Z

  - `mandatory_payment_method` (string)
    El cobro sólo se podrá pagar utilizando el medio de pago especificado. Los posibles valores para este campo se encuentran en el campo `id` de la respuesta del endpoint `/v3/merchants/{id}/paymentMethods`.
    Example: SIMPLIFIED_TRANSFER

  - `psp_client_merchant_name` (string)
    Nombre del comercio final para quien un proveedor de servicios de pago procesa un pago. Requerido para transacciones de clientes PSP; no aplicable para otros. En caso de tratarse de un PSP de PSP, estos deben ingresarse separados por '->'.
    Example: PSP 1->PSP 2->Client Name

  - `psp_client_merchant_logo_url` (string)
    URL del logo del comercio final al que corresponde el pago procesado por el proveedor de servicios de pago. Opcional para transacciones de clientes PSP; no aplicable para otros.
    Example: https://micomercio.com/logo.png

## Response 200:

  - `200` (unknown)
    Operación exitosa. Devuelve un objeto JSON con la información del pago creado.

## Response 200 fields (application/json):

  - `payment_id` (string, required)
    Identificador único del pago, es una cadena alfanumérica de 12 caracteres. Como este identificador es único, se puede usar, por ejemplo, para evitar procesar una notificación repetida. (Khipu espera un código 200 al notificar un pago, si esto no ocurre se reintenta hasta por dos días).
    Example: gqzdy6chjne9

  - `payment_url` (string, required)
    URL principal del pago, si el usuario no ha elegido previamente un método de pago se le muestran las opciones.
    Example: https://khipu.com/payment/info/gqzdy6chjne9

  - `simplified_transfer_url` (string, required)
    URL de pago simplificado.
    Example: https://app.khipu.com/payment/simplified/gqzdy6chjne9

  - `transfer_url` (string, required)
    URL de pago normal.
    Example: https://khipu.com/payment/manual/gqzdy6chjne9

  - `app_url` (string, required)
    URL para invocar el pago desde un dispositivo móvil usando la APP de Khipu.
    Example: khipu:///pos/gqzdy6chjne9

  - `ready_for_terminal` (boolean, required)
    Es `true` si el pago ya cuenta con todos los datos necesarios para abrir directamente la aplicación de pagos Khipu.
    Example: false

## Response 400:

  - `400` (unknown)
    Bad request - Solicitud mal formada

## Response 401:

  - `401` (unknown)
    Unauthorized - Credenciales no válidas o faltantes

## Response 403:

  - `403` (unknown)
    Forbidden - Cliente no tiene privilegios

## Response 404:

  - `404` (unknown)
    Not found - Recurso no disponible

## Response 500:

  - `500` (unknown)
    Internal server error - Servidor no pudo completar la solicitud

example:
import fetch from 'node-fetch';

async function run() {
  const resp = await fetch(
    `https://payment-api.khipu.com/v3/payments`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'YOUR_API_KEY_HERE'
      },
      body: JSON.stringify({
        amount: 1000,
        currency: 'CLP',
        subject: 'Cobro de prueba'
      })
    }
  );

  const data = await resp.json();
  console.log(data);
}

run();

# Void payment by Id

Anula el monto total de un pago. Esta operación solo se puede realizar en los comercios que recauden en cuenta Khipu y antes de la rendición de los fondos correspondientes.

Endpoint: POST /v3/payments/{id}/void
Version: v3.0
Security: Api-Key

## Security:

  - `Api-Key` (unknown)
    apiKey in header x-api-key

## Path parameters:

  - `id` (string, required)
    Identificador del pago

## Response 200:

  - `200` (unknown)
    Operación exitosa.

## Response 200 fields (application/json):

  - `message` (string, required)
    Mensaje a desplegar al usuario.
    Example: Message.

## Response 400:

  - `400` (unknown)
    Bad request - Solicitud mal formada

## Response 401:

  - `401` (unknown)
    Unauthorized - Credenciales no válidas o faltantes

## Response 403:

  - `403` (unknown)
    Forbidden - Cliente no tiene privilegios

## Response 404:

  - `404` (unknown)
    Not found - Recurso no disponible

## Response 500:

  - `500` (unknown)
    Internal server error - Servidor no pudo completar la solicitud

example:
import fetch from 'node-fetch';

async function run() {
  const id = 'YOUR_id_PARAMETER';
  const resp = await fetch(
    `https://payment-api.khipu.com/v3/payments/${id}/void`,
    {
      method: 'POST',
      headers: {
        'x-api-key': 'YOUR_API_KEY_HERE'
      }
    }
  );

  const data = await resp.text();
  console.log(data);
}

run();

# Refund payment

Devolución total o parcial del monto de un pago. Con `type=full` el monto completo disponible para devolver queda marcado para devolución al pagador; con `type=partial` queda marcada la parte indicada en `amount`. Se pueden realizar varias devoluciones parciales mientras la billetera de devoluciones tenga saldo y el pago mantenga monto disponible para devolver.
Esta operación requiere habilitación previa: el comercio debe solicitarla a soporte@khipu.com. El comercio gestiona una billetera de devoluciones que debe mantener con saldo suficiente (recargándola) para concretar las devoluciones; el saldo se puede consultar con [*Get refund wallet balance*](#operation/getRefundWalletBalance). Solo se pueden devolver pagos conciliados, hasta 180 días después de su conciliación.

Endpoint: POST /v3/refunds
Version: v3.0
Security: Api-Key

## Security:

  - `Api-Key` (unknown)
    apiKey in header x-api-key

## Request fields (application/json):

  - `type` (string, required)
    Tipo de devolución. `full` devuelve el monto completo disponible para devolver del pago; `partial` devuelve el monto indicado en `amount`.
    Enum: "full", "partial"

  - `payment_id` (string, required)
    Identificador del pago a devolver.
    Example: xsthgfkmvyvb

  - `amount` (string)
    El monto a devolver. Obligatorio cuando `type` es `partial`; no puede ser utilizado cuando `type` es `full`. Sin separador de miles y usando '.' como separador de decimales. Hasta el número de decimales que admita la moneda. No puede superar el saldo del pago disponible para devolver.
    Example: 1000

## Response 200:

  - `200` (unknown)
    Operación exitosa. Devuelve un objeto JSON con el resultado de la devolución.

## Response 200 fields (application/json):

  - `id` (string, required)
    Identificador único de la devolución.
    Example: b31bd9aa-273b-4aed-9516-85866d47a931

  - `payment_id` (string, required)
    Identificador del pago devuelto.
    Example: xsthgfkmvyvb

  - `refunded_amount` (string, required)
    Monto devuelto en esta operación. Sin separador de miles, usando '.' como separador de decimales y siempre con 4 decimales.
    Example: 1000.0000

  - `total_refunded` (string, required)
    Monto total devuelto del pago, sumando todas las devoluciones.
    Example: 1000.0000

  - `remaining` (string, required)
    Saldo del pago aún disponible para devolver.
    Example: 2000.0000

  - `currency` (string, required)
    Código de la moneda de los montos.
    Example: CLP

  - `message` (string)
    Mensaje informativo opcional sobre el estado de la billetera de devoluciones; por ejemplo, cuando su saldo es insuficiente para concretar las devoluciones del día.

## Response 400:

  - `400` (unknown)
    Bad request - Solicitud mal formada

## Response 401:

  - `401` (unknown)
    Unauthorized - Credenciales no válidas o faltantes

## Response 403:

  - `403` (unknown)
    Forbidden - Cliente no tiene privilegios

## Response 404:

  - `404` (unknown)
    Not found - Recurso no disponible

## Response 500:

  - `500` (unknown)
    Internal server error - Servidor no pudo completar la solicitud

example:
import fetch from 'node-fetch';

async function run() {
  const resp = await fetch(
    `https://payment-api.khipu.com/v3/refunds`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'YOUR_API_KEY_HERE'
      },
      body: JSON.stringify({
        type: 'partial',
        payment_id: 'xsthgfkmvyvb'
      })
    }
  );

  const data = await resp.json();
  console.log(data);
}

run();

# Get refund wallet balance

Obtiene el saldo disponible de la billetera de devoluciones del comercio. Para que las devoluciones se concreten, la billetera debe mantener un saldo mayor a las devoluciones del día; puede recargarse en el enlace indicado en `add_funds_url`.
Esta operación requiere habilitación previa: el comercio debe solicitarla a soporte@khipu.com.

Endpoint: GET /v3/refund-wallet/balance
Version: v3.0
Security: Api-Key

## Security:

  - `Api-Key` (unknown)
    apiKey in header x-api-key

## Response 200:

  - `200` (unknown)
    Operación exitosa. Devuelve un objeto JSON con el saldo de la billetera de devoluciones.

## Response 200 fields (application/json):

  - `balance` (string, required)
    Saldo disponible de la billetera de devoluciones. Sin separador de miles, usando '.' como separador de decimales y siempre con 4 decimales.
    Example: 5000.0000

  - `currency` (string, required)
    Código de la moneda del saldo.
    Example: CLP

  - `add_funds_url` (string, required)
    URL para recargar la billetera de devoluciones.
    Example: https://khipu.com/dashboard/bills

## Response 400:

  - `400` (unknown)
    Bad request - Solicitud mal formada

## Response 401:

  - `401` (unknown)
    Unauthorized - Credenciales no válidas o faltantes

## Response 403:

  - `403` (unknown)
    Forbidden - Cliente no tiene privilegios

## Response 404:

  - `404` (unknown)
    Not found - Recurso no disponible

## Response 500:

  - `500` (unknown)
    Internal server error - Servidor no pudo completar la solicitud

## Response 503:

  - `503` (unknown)
    Service unavailable - No fue posible obtener el saldo de la billetera, intente más tarde

example:
import fetch from 'node-fetch';

async function run() {
  const resp = await fetch(
    `https://payment-api.khipu.com/v3/refund-wallet/balance`,
    {
      method: 'GET',
      headers: {
        'x-api-key': 'YOUR_API_KEY_HERE'
      }
    }
  );

  const data = await resp.text();
  console.log(data);
}

run();

# Get payment prediction

Predicción acerca del resultado de un pago, si podrá o no funcionar. Información adicional como máximo posible de transferir a un nuevo destinatario.

Endpoint: GET /v3/predict
Version: v3.0
Security: Api-Key

## Security:

  - `Api-Key` (unknown)
    apiKey in header x-api-key

## Query parameters:

  - `payer_email` (string, required)
    Correo electrónico del pagador

  - `bank_id` (string, required)
    Identificador del banco de origen

  - `amount` (string, required)
    Monto del pago

  - `currency` (string, required)
    Moneda en formato ISO-4217

## Response 200:

  - `200` (unknown)
    Operación exitosa. Devuelve un objeto JSON con la predicción junto con información adiciónal.

## Response 200 fields (application/json):

  - `result` (string, required)
    El resultado de la predicción.
    Enum: "OK", "NEW_DESTINATARY_AMOUNT_EXCEEDED", "MAX_AMOUNT_EXCEEDED", "NEW_DESTINATARY_COOL_DOWN", "NOT_AVAILABLE_ACCOUNT"

  - `max_amount` (number, required)
    El monto máximo posible para transferir.
    Example: 5000000

  - `cool_down_date` (string, required)
    Fecha de término para la restricción de monto en formato ISO-8601
    Example: 2024-06-21T11:23:09.123Z

  - `new_destinatary_max_amount` (number, required)
    Monto máximo para transferir a un nuevo destinatario.
    Example: 100000

## Response 400:

  - `400` (unknown)
    Bad request - Solicitud mal formada

## Response 401:

  - `401` (unknown)
    Unauthorized - Credenciales no válidas o faltantes

## Response 403:

  - `403` (unknown)
    Forbidden - Cliente no tiene privilegios

## Response 404:

  - `404` (unknown)
    Not found - Recurso no disponible

## Response 500:

  - `500` (unknown)
    Internal server error - Servidor no pudo completar la solicitud


example:
import fetch from 'node-fetch';

async function run() {
  const query = new URLSearchParams({
    payer_email: 'string',
    bank_id: 'string',
    amount: 'string',
    currency: 'string'
  }).toString();

  const resp = await fetch(
    `https://payment-api.khipu.com/v3/predict?${query}`,
    {
      method: 'GET',
      headers: {
        'x-api-key': 'YOUR_API_KEY_HERE'
      }
    }
  );

  const data = await resp.text();
  console.log(data);
}

run();

# Get payment prediction for all banks

Predicción acerca del resultado de un pago para cada uno de los bancos disponibles para la cuenta de cobro, sin necesidad de indicar un banco. Permite ofrecerle al pagador solo los bancos con los que el pago podría funcionar.
Los bancos incluidos son los mismos que devuelve `GET /v3/banks`, en el mismo orden. La respuesta incluye todos los bancos, no solo aquellos cuyo resultado es `OK`; el integrador debe filtrar por el campo `result`. Si la cuenta de cobro no tiene bancos disponibles, el arreglo `banks` viene vacío.
Se realiza una predicción por banco, por lo que el tiempo de respuesta crece con la cantidad de bancos disponibles.

Endpoint: GET /v3/predict/all
Version: v3.0
Security: Api-Key

## Security:

  - `Api-Key` (unknown)
    apiKey in header x-api-key

## Query parameters:

  - `payer_email` (string, required)
    Correo electrónico del pagador

  - `amount` (string, required)
    Monto del pago

  - `currency` (string, required)
    Moneda en formato ISO-4217

## Response 200:

  - `200` (unknown)
    Operación exitosa. Devuelve un objeto JSON con la predicción para cada banco disponible.

## Response 200 fields (application/json):

  - `banks` (array, required)
    Arreglo con la predicción para cada banco, en el mismo orden que `GET /v3/banks`. Puede venir vacío si no hay bancos disponibles.

  - `banks.bank_id` (string, required)
    Identificador del banco, el mismo que usan `GET /v3/banks` y `GET /v3/predict`.
    Example: Bawdf

  - `banks.name` (string, required)
    Nombre del banco.
    Example: Banco Ejemplo

  - `banks.result` (string, required)
    El resultado de la predicción.
    Enum: "OK", "NEW_DESTINATARY_AMOUNT_EXCEEDED", "MAX_AMOUNT_EXCEEDED", "NEW_DESTINATARY_COOL_DOWN", "NOT_AVAILABLE_ACCOUNT"

  - `banks.max_amount` (number, required)
    El monto máximo posible para transferir.
    Example: 5000000

  - `banks.cool_down_date` (string, required)
    Fecha de término para la restricción de monto en formato ISO-8601
    Example: 2024-06-21T11:23:09.123Z

  - `banks.new_destinatary_max_amount` (number, required)
    Monto máximo para transferir a un nuevo destinatario.
    Example: 100000

## Response 400:

  - `400` (unknown)
    Bad request - Solicitud mal formada

## Response 401:

  - `401` (unknown)
    Unauthorized - Credenciales no válidas o faltantes

## Response 403:

  - `403` (unknown)
    Forbidden - Cliente no tiene privilegios

## Response 404:

  - `404` (unknown)
    Not found - Recurso no disponible

## Response 500:

  - `500` (unknown)
    Internal server error - Servidor no pudo completar la solicitud


example:
import fetch from 'node-fetch';

async function run() {
  const query = new URLSearchParams({
    payer_email: 'string',
    amount: 'string',
    currency: 'string'
  }).toString();

  const resp = await fetch(
    `https://payment-api.khipu.com/v3/predict/all?${query}`,
    {
      method: 'GET',
      headers: {
        'x-api-key': 'YOUR_API_KEY_HERE'
      }
    }
  );

  const data = await resp.text();
  console.log(data);
}

run();

# Post receiver

**Advertencia: Esta función sólo está disponible para los clientes que la hayan contratado de forma independiente.
Para utilizarla, póngase en contacto con nosotros en soporte@khipu.com**
Crear una nueva cuenta de cobro asociada a un integrador. Necesita datos
de la cuenta de usuario asociada, datos de facturación y datos de contacto.

Endpoint: POST /v3/receivers
Version: v3.0
Security: Api-Key

## Security:

  - `Api-Key` (unknown)
    apiKey in header x-api-key

## Request fields (application/json):

  - `admin_first_name` (string, required)
    Nombre de pila del administrador de la cuenta de cobro a crear.
    Example: Nombre

  - `admin_last_name` (string, required)
    Apellido del administrador de la cuenta de cobro a crear.
    Example: Apellido

  - `admin_email` (string, required)
    Correo electrónico del administrador de la cuenta de cobro a crear.
    Example: admin@email.com

  - `country_code` (string, required)
    Código alfanumérico de dos caracteres ISO 3166-1 del país de la cuenta de cobro a crear.
    Example: CL

  - `business_identifier` (string, required)
    Identificador tributario del cobrador asociado a la cuenta de cobro a crear.
    Example: 99.999.999-9

  - `business_category` (string, required)
    Categoría tributaria o rubro tributario del cobrador asociado a la cuenta de cobro a crear.
    Example: VENTA AL POR MAYOR DE FRUTAS Y VERDURAS

  - `business_name` (string, required)
    Nombre tributario del cobrador asociado a la cuenta de cobro a crear.
    Example: Nombre Tributario

  - `business_phone` (string, required)
    Teléfono del cobrador asociado a la cuenta de cobro a crear.
    Example: +56988887777

  - `business_address_line_1` (string, required)
    Dirección del cobrador de la cuenta de cobro a crear.
    Example: Calle principal 1111

  - `business_address_line_2` (string, required)
    Segunda línea de la dirección del cobrador de la cuenta de cobro a crear.
    Example: Oficina 3-A

  - `business_address_line_3` (string, required)
    Tercera línea de la dirección del cobrador de la cuenta de cobro a crear.
    Example: Santiago

  - `contact_full_name` (string, required)
    Nombre del contacto del cobrador.
    Example: Nombre Contacto

  - `contact_job_title` (string, required)
    Cargo del contacto del cobrador.
    Example: Tesorero

  - `contact_email` (string, required)
    Correo electrónico del contacto del cobrador.
    Example: contacto@email.com

  - `contact_phone` (string, required)
    Teléfono del contacto del cobrador.
    Example: +56955553333

  - `bank_account_bank_id` (string)
    Identificador del banco.
    Example: SDdGj

  - `bank_account_type` (string)
    Tipo de cuenta. Es obligatorio si se utiliza el modelo alternativo de integrador de confianza.
    Example: Cuenta Corriente

  - `bank_account_identifier` (string)
    Identificador personal del dueño de la cuenta de banco.
    Example: 11.333.555-7

  - `bank_account_name` (string)
    Nombre de la cuenta de banco.
    Example: Alias Cuenta

  - `bank_account_number` (string)
    Número de la cuenta en el banco.
    Example: 00347909823

  - `notify_url` (string)
    URL por omisión para el webservice donde se notificará el pago.
    Example: http://micomercio.com/account/notify_url

  - `rendition_url` (string)
    URL para el webservice donde se notificará la rendición.
    Example: http://micomercio.com/account/rendition_url

## Response 200:

  - `200` (unknown)
    Operación exitosa. Devuelve un objeto JSON con el identificador y secreto de la nueva cuenta de cobro.

## Response 200 fields (application/json):

  - `receiver_id` (string, required)
    Identificador único de la cuenta de cobro.
    Example: 934568

  - `secret` (string, required)
    Llave secreta de la cuenta de cobro, se usa para firmar todas las peticiones.
    Example: b2025dc47a29a04592fa3c1191110370db0e208c

  - `api_key` (string)
    API key de la cuenta de cobro creada.
    Example: d6ec59c7-e299-4704-840d-300442546982

## Response 400:

  - `400` (unknown)
    Bad request - Solicitud mal formada

## Response 401:

  - `401` (unknown)
    Unauthorized - Credenciales no válidas o faltantes

## Response 403:

  - `403` (unknown)
    Forbidden - Cliente no tiene privilegios

## Response 404:

  - `404` (unknown)
    Not found - Recurso no disponible

## Response 500:

  - `500` (unknown)
    Internal server error - Servidor no pudo completar la solicitud

example:
import fetch from 'node-fetch';

async function run() {
  const resp = await fetch(
    `https://payment-api.khipu.com/v3/receivers`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'YOUR_API_KEY_HERE'
      },
      body: JSON.stringify({
        admin_first_name: 'Nombre',
        admin_last_name: 'Apellido',
        admin_email: 'admin@email.com',
        country_code: 'CL',
        business_identifier: '99.999.999-9',
        business_category: 'VENTA AL POR MAYOR DE FRUTAS Y VERDURAS',
        business_name: 'Nombre Tributario',
        business_phone: '+56988887777',
        business_address_line_1: 'Calle principal 1111',
        business_address_line_2: 'Oficina 3-A',
        business_address_line_3: 'Santiago',
        contact_full_name: 'Nombre Contacto',
        contact_job_title: 'Tesorero',
        contact_email: 'contacto@email.com',
        contact_phone: '+56955553333'
      })
    }
  );

  const data = await resp.json();
  console.log(data);
}

run();

# Get receivers

**Advertencia: Esta función sólo está disponible para los clientes que la hayan contratado de forma independiente.
Para utilizarla, póngase en contacto con nosotros en soporte@khipu.com**
Obtener la lista de cuentas de cobro asociadas a un integrador.

Endpoint: GET /v3/receivers/children
Version: v3.0
Security: Api-Key

## Security:

  - `Api-Key` (unknown)
    apiKey in header x-api-key

## Query parameters:

  - `offset` (integer)
    Número de registros a saltar para paginación.

  - `max` (integer)
    Cantidad máxima de registros a retornar.

  - `sort` (string)
    Campo por el cual ordenar los resultados.

  - `order` (string)
    Dirección del ordenamiento.

## Response 200:

  - `200` (unknown)
    Operación exitosa. Devuelve un objeto JSON con la lista de cuentas de cobro asociadas al integrador.

## Response 200 fields (application/json):

  - `total` (integer, required)
    Cantidad total de cuentas de cobro asociadas al integrador.
    Example: 150

  - `receivers` (array, required)
    Lista de cuentas de cobro asociadas al integrador.

  - `receivers.id` (integer, required)
    Identificador único de la cuenta de cobro.
    Example: 302026

  - `receivers.name` (string, required)
    Nombre de la cuenta de cobro.
    Example: Cobrador 20260311115756

  - `receivers.date_created` (string, required)
    Fecha de creación de la cuenta de cobro.
    Example: 2026-03-11T14:57:56Z

  - `receivers.disabled` (boolean, required)
    Indica si la cuenta de cobro está deshabilitada.
    Example: false

  - `receivers.can_collect` (boolean, required)
    Indica si la cuenta de cobro puede recibir pagos.
    Example: true

## Response 400:

  - `400` (unknown)
    Bad request - Solicitud mal formada

## Response 401:

  - `401` (unknown)
    Unauthorized - Credenciales no válidas o faltantes

## Response 403:

  - `403` (unknown)
    Forbidden - Cliente no tiene privilegios

## Response 404:

  - `404` (unknown)
    Not found - Recurso no disponible

## Response 500:

  - `500` (unknown)
    Internal server error - Servidor no pudo completar la solicitud

example:
import fetch from 'node-fetch';

async function run() {
  const query = new URLSearchParams({
    offset: '0',
    max: '100',
    sort: 'name',
    order: 'asc'
  }).toString();

  const resp = await fetch(
    `https://payment-api.khipu.com/v3/receivers/children?${query}`,
    {
      method: 'GET',
      headers: {
        'x-api-key': 'YOUR_API_KEY_HERE'
      }
    }
  );

  const data = await resp.text();
  console.log(data);
}

run();

# Get payment methods

Obtiene el listado de medios de pago disponible para una cuenta de cobrador.

Endpoint: GET /v3/merchants/{id}/paymentMethods
Version: v3.0
Security: Api-Key

## Security:

  - `Api-Key` (unknown)
    apiKey in header x-api-key

## Path parameters:

  - `id` (number, required)
    Identificador de la cuenta de cobro

## Response 200:

  - `200` (unknown)
    Operación exitosa. Devuelve un objeto JSON con la variedad de métodos de pago disponibles.

## Response 200 fields (application/json):

  - `paymentMethods` (array, required)
    Arreglo con métodos de pago disponibles.

  - `paymentMethods.id` (string, required)
    Identificador del medio de pago.
    Example: SIMPLIFIED_TRANSFER

  - `paymentMethods.name` (string, required)
    Nombre del medio de pago.
    Example: SIMPLIFIED_TRANSFER

  - `paymentMethods.logo_url` (string, required)
    URL del logo sugerido para mostrar.
    Example: https://s3.amazonaws.com/static.khipu.com/buttons/2015/150x50-transparent.png

## Response 400:

  - `400` (unknown)
    Bad request - Solicitud mal formada

## Response 401:

  - `401` (unknown)
    Unauthorized - Credenciales no válidas o faltantes

## Response 403:

  - `403` (unknown)
    Forbidden - Cliente no tiene privilegios

## Response 404:

  - `404` (unknown)
    Not found - Recurso no disponible

## Response 500:

  - `500` (unknown)
    Internal server error - Servidor no pudo completar la solicitud
example:
import fetch from 'node-fetch';

async function run() {
  const id = 'YOUR_id_PARAMETER';
  const resp = await fetch(
    `https://payment-api.khipu.com/v3/merchants/${id}/paymentMethods`,
    {
      method: 'GET',
      headers: {
        'x-api-key': 'YOUR_API_KEY_HERE'
      }
    }
  );

  const data = await resp.text();
  console.log(data);
}

run();

# Refund payment by Id (deprecated)

**Obsoleto:** este método fue reemplazado por [*Void payment by Id*](#operation/voidPaymentById) (`POST /v3/payments/{id}/void`).
Reembolsa el monto total de un pago. Esta operación solo se puede realizar en los comercios que recauden en cuenta Khipu y antes de la rendición de los fondos correspondientes.

Endpoint: POST /v3/payments/{id}/refunds
Version: v3.0
Security: Api-Key

## Security:

  - `Api-Key` (unknown)
    apiKey in header x-api-key

## Path parameters:

  - `id` (string, required)
    Identificador del pago

## Response 200:

  - `200` (unknown)
    Operación exitosa.

## Response 200 fields (application/json):

  - `message` (string, required)
    Mensaje a desplegar al usuario.
    Example: Message.

## Response 400:

  - `400` (unknown)
    Bad request - Solicitud mal formada

## Response 401:

  - `401` (unknown)
    Unauthorized - Credenciales no válidas o faltantes

## Response 403:

  - `403` (unknown)
    Forbidden - Cliente no tiene privilegios

## Response 404:

  - `404` (unknown)
    Not found - Recurso no disponible

## Response 500:

  - `500` (unknown)
    Internal server error - Servidor no pudo completar la solicitud

example:
import fetch from 'node-fetch';

async function run() {
  const id = 'YOUR_id_PARAMETER';
  const resp = await fetch(
    `https://payment-api.khipu.com/v3/payments/${id}/refunds`,
    {
      method: 'POST',
      headers: {
        'x-api-key': 'YOUR_API_KEY_HERE'
      }
    }
  );

  const data = await resp.text();
  console.log(data);
}

run();


# API de Generación de Descriptores de Operaciones

La **API Generadora de Descriptores de Operación** (versión 1.0) de Khipu permite  a los comercios crear un identificador único de operación junto con un descriptor  cifrado para iniciar transferencias bancarias. A través de un único  endpoint (`POST /v1/descriptor/payment`), se envía el ID del banco de origen y los  detalles de la transacción, como monto, moneda, datos del pagador y cuenta de destino.  Si la solicitud es exitosa, la API devuelve un objeto JSON con un `operation.id` (UUID)  y un `operation.description`, que es un descriptor cifrado en Base64, diseñado para ser  utilizado en flujos seguros de transferencia bancaria. La autenticación se realiza  mediante la cabecera `x-api-key`.

Version: v1.0
License: API de Descriptor de operaciones de Khipu

## Servers

Production
```
https://api.khipu.com
```

## Security

### Api-Key

Type: apiKey
In: header
Name: x-api-key

## Download OpenAPI description

 - [API de Generación de Descriptores de Operaciones](https://docs.khipu.com/_bundle/apis/v1/operation-descriptor/openapi.yaml)

 - [POST /v1/descriptor/payment](https://docs.khipu.com/apis/v1/operation-descriptor/openapi/other/createpayment.md): Éste método crea un nuevo identificador de operación y un descriptor de operación para una nueva transferencia.

 # Crea un descriptor de operación para una nueva transferencia

Éste método crea un nuevo identificador de operación y un descriptor de operación para una nueva transferencia.

Endpoint: POST /v1/descriptor/payment
Version: v1.0
Security: Api-Key

## Security:

  - `Api-Key` (unknown)
    apiKey in header x-api-key

## Request fields (application/json):

  - `bank` (string, required)
    El ID del banco origen para esta operación.
    Example: dSXgfesd

  - `params` (object, required)
    Parametros necesarios para crear un nuevo descriptor de operación.

  - `params.subject` (string)
    Una descripción de la operación de transferencia.
    Example: Ejemplo de transferencia

  - `params.amount` (number)
    Monto de la transferencia.
    Example: 1000

  - `params.currency_code` (string)
    El código de moneda en el formato ISO 4217.
    Example: CLP

  - `params.payer_email` (string)
    El correo electrónico del pagador.
    Example: someone@example.com

  - `params.payer_name` (string)
    El nombre del pagador.
    Example: Jane Doe

  - `params.target_account_bank` (string)
    El nombre del banco del destinatario de la transferencia.
    Example: Awesome Bank

  - `params.target_account_alias` (string)
    Un alias para la nueva cuenta en caso de que sea la primera transferencia.
    Example: My friend

  - `params.target_account_name` (string)
    El nombre del titular de la cuenta del destinatario.
    Example: John Doe

  - `params.target_account_number` (string)
    En número de cuenta del destinatario.
    Example: 123459876

  - `params.target_account_personal_identifier` (string)
    El identificador personal del destinatario, como un RUT o DNI.
    Example: 12.345.678-9

## Response 200:

  - `200` (unknown)
    Operación exitosa. Retorna un objeto JSON con un nuevo identificador de operación y el descriptor encriptado.

## Response 200 fields (application/json):

  - `operation` (object, required)

  - `operation.id` (string)
    Identificador único de la operación.
    Example: 13a0f1aa-5e47-4894-aa8b-282dd19593ec

  - `operation.description` (string)
    El descriptor cifrado a enviar codificado en Base64.
    Example: eyJtIjoicVlvQU92VllMWm5NVDg2UEovNjNJcGFtRnFQUUNDY lNDcHZBZ283OFNlM01VWVBJZU1sZk05a0NzSWVwRkJPcnZlbG FwSCtaS3pCRmd3YTBybkVKamtaV3gxYm1iTjd2ZzhhNGtuV1N FV3BwclhtVHBkcXRQRXlsVHlhSGtsdTdYTkRtVHZadzlGZlox …

## Response 400:

  - `400` (unknown)
    Solicitud incorrecta

## Response 401:

  - `401` (unknown)
    No autorizado - Credenciales inválidas o faltantes

## Response 404:

  - `404` (unknown)
    No encontrado - Recurso no disponible

## Response 500:

  - `500` (unknown)
    Error en el servicio remoto :(

example:
import fetch from 'node-fetch';

async function run() {
  const resp = await fetch(
    `https://api.khipu.com/v1/descriptor/payment`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'YOUR_API_KEY_HERE'
      },
      body: JSON.stringify({
        bank: 'dSXgfesd',
        params: {}
      })
    }
  );

  const data = await resp.json();
  console.log(data);
}

run();

https://docs.khipu.com/apis/v3/instant-payments/openapi