// test-khipu-sign.js
const crypto = require('crypto');

function percentEncode(str) {
    return encodeURIComponent(str)
        .replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function generateKhipuSignature(method, url, params, secret) {
    const sortedKeys = Object.keys(params).sort();
    const paramPairs = sortedKeys.map(key => {
        const encodedKey = percentEncode(key);
        const encodedValue = percentEncode(String(params[key]));
        return `${encodedKey}=${encodedValue}`;
    });
    const parameterString = paramPairs.join('&');
    const baseString = [
        method.toUpperCase(),
        percentEncode(url),
        percentEncode(parameterString)
    ].join('&');
    
    console.log("Base String to Sign:", baseString);
    
    return crypto
        .createHmac('sha256', secret)
        .update(baseString)
        .digest('hex');
}

// TEST CASES
console.log("--- Testing percentEncode ---");
const testStr = "hello world! (test)*'";
console.log("Input:", testStr);
console.log("Encoded:", percentEncode(testStr));

console.log("\n--- Testing generateKhipuSignature ---");
const method = "GET";
const url = "https://sandbox.khipu.com/api/2.0/payments";
const params = { notification_token: "abc-123-xyz" };
const secret = "my-khipu-secret-key";

const sig = generateKhipuSignature(method, url, params, secret);
console.log("Generated Signature:", sig);

const expectedBaseString = "GET&https%3A%2F%2Fsandbox.khipu.com%2Fapi%2F2.0%2Fpayments&notification_token%3Dabc-123-xyz";
const expectedSig = crypto.createHmac('sha256', secret).update(expectedBaseString).digest('hex');

if (sig === expectedSig) {
    console.log("SUCCESS: Signature matches standard HMAC calculation!");
} else {
    console.error("FAIL: Signature mismatch!");
    process.exit(1);
}
