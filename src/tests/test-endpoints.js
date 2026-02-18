// test/unified-server-test.js
const axios = require("axios");

const BASE_URL = "http://localhost:3000";

async function testAllEndpoints() {
  console.log("🧪 Testing Unified Server on Port 3000");
  console.log("=======================================\n");

  // Test 1: Root endpoint
  try {
    const rootRes = await axios.get(`${BASE_URL}/`);
    console.log("✅ Root endpoint:", rootRes.data.service);
  } catch (error) {
    console.log("❌ Root endpoint failed");
  }

  // Test 2: Health check
  try {
    const healthRes = await axios.get(`${BASE_URL}/health`);
    console.log("✅ Health check:", healthRes.data.status);
  } catch (error) {
    console.log("❌ Health check failed");
  }

  // Test 3: Hash generation
  try {
    const hashRes = await axios.post(
      `${BASE_URL}/api/hash/generate`,
      {
        customer_id: 12345,
        mobile_number: "0701 234 567",
      },
      {
        headers: { "X-API-Key": process.env.API_SECRET_KEY || "test-key" },
      },
    );
    console.log(
      "✅ Hash generation:",
      hashRes.data.mobile_hash_plus254.substring(0, 20) + "...",
    );
  } catch (error) {
    console.log(
      "❌ Hash generation failed:",
      error.response?.data || error.message,
    );
  }

  // Test 4: SMS sending (your Odoo endpoint)
  try {
    const smsRes = await axios.post(
      `${BASE_URL}/send-sms`,
      {
        message: "Test message from unified server",
        mobile: "0712345678",
      },
      {
        headers: { "X-API-Key": process.env.API_SECRET_KEY || "test-key" },
      },
    );
    console.log("✅ SMS endpoint:", smsRes.data.success ? "Success" : "Failed");
  } catch (error) {
    console.log(
      "❌ SMS endpoint failed:",
      error.response?.data || error.message,
    );
  }

  console.log("\n=======================================");
  console.log("✅ All tests completed");
}

testAllEndpoints();
