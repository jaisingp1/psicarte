// test-webhook.js
const http = require('http');

const data = JSON.stringify({
    notification_token: 'dummy-token-for-testing'
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/khipu/notify',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    let responseBody = '';
    res.on('data', (chunk) => {
        responseBody += chunk;
    });
    res.on('end', () => {
        console.log(`Response: ${responseBody}`);
        if (res.statusCode === 500 && responseBody.includes('Verification failed')) {
            console.log('SUCCESS: Webhook correctly tried to contact Khipu and failed with dummy token.');
            process.exit(0);
        } else {
            console.error('FAILED: Unexpected response.');
            process.exit(1);
        }
    });
});

req.on('error', (err) => {
    console.error('Request Error:', err.message);
    process.exit(1);
});

req.write(data);
req.end();
