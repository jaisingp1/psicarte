// test-khipu-endpoints.js
const http = require('http');

function postJson(path, dataObj) {
    return new Promise((resolve, reject) => {
        const bodyStr = JSON.stringify(dataObj);
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(bodyStr),
                'User-Agent': 'Khipu-Simulator-Test'
            }
        };

        const req = http.request(options, (res) => {
            let responseBody = '';
            res.on('data', (chunk) => {
                responseBody += chunk;
            });
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    body: responseBody
                });
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.write(bodyStr);
        req.end();
    });
}

async function runTests() {
    console.log('--- Iniciando Pruebas de Endpoints Khipu ---');

    // Test 1: Pago Instantáneo (API 1.3)
    try {
        console.log('1. Probando Notificación de Pago (API 1.3)...');
        // Usamos un mock-token que simula respuesta exitosa en sandbox del helper callKhipuApi
        const result = await postJson('/api/khipu/notify', {
            api_version: '1.3',
            notification_token: 'mock-token-bk-2',
            receiver_id: '123456',
            notification_sign: 'test-sign-123'
        });
        console.log(`Resultado: HTTP ${result.status} - ${result.body.trim()}`);
    } catch (e) {
        console.error('Error en Test 1:', e.message);
    }

    // Test 2: Reporte Diario de Rendición (DRN-2.0)
    try {
        console.log('2. Probando Notificación de Rendición (DRN-2.0)...');
        const result = await postJson('/api/khipu/notify/rendition', {
            api_version: 'DRN-2.0',
            report_id: 'drn-test-456',
            total_amount: 85990,
            status: 'success',
            transacciones: 3
        });
        console.log(`Resultado: HTTP ${result.status} - ${result.body.trim()}`);
    } catch (e) {
        console.error('Error en Test 2:', e.message);
    }

    // Test 3: Reporte Diario de Transacciones (DTN-1.0)
    try {
        console.log('3. Probando Notificación de Transacciones (DTN-1.0)...');
        const result = await postJson('/api/khipu/notify/transactions', {
            api_version: 'DTN-1.0',
            report_id: 'dtn-test-789',
            transactions_count: 5,
            conciliated_count: 5
        });
        console.log(`Resultado: HTTP ${result.status} - ${result.body.trim()}`);
    } catch (e) {
        console.error('Error en Test 3:', e.message);
    }

    console.log('--- Pruebas de Endpoints Khipu Finalizadas ---');
}

runTests();
