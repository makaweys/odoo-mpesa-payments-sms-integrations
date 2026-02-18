const axios = require("axios");

// This script simulates exactly what your Odoo code does
async function testOdooSMSIntegration() {
  console.log("🧪 Testing Odoo SMS Integration");
  console.log("================================\n");

  // Test case 1: Normal SMS (like your Odoo sends)
  const testData = {
    message:
      "Dear John Doe, Sale Amt: KES 1500.00, Cumulative Bal: KES 5000.00, Sale savings: KES 150.00, Cumulative Savings: KES 450.00. Pay to TILL NO: 4649840 (NO CASH). Big3Bakers",
    mobile: "0712345678",
  };

  console.log("📤 Test Case 1: Normal SMS");
  console.log("   Sending to Odoo SMS endpoint...");
  console.log("   Mobile:", testData.mobile);
  console.log(
    "   Message preview:",
    testData.message.substring(0, 80) + "...\n",
  );

  try {
    const startTime = Date.now();

    // This is EXACTLY what your Odoo code does
    const response = await axios.post(
      "http://localhost:4308/send-sms",
      testData,
      {
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": process.env.API_SECRET_KEY || "your-api-key-here",
        },
        timeout: 10000,
      },
    );

    const responseTime = Date.now() - startTime;

    console.log("📥 Response:");
    console.log(`   Status: ${response.status}`);
    console.log(`   Time: ${responseTime}ms`);
    console.log("   Body:", JSON.stringify(response.data, null, 2));

    // Check if response matches what Odoo expects
    if (response.status === 200 && response.data.success === true) {
      console.log("\n✅ Test PASSED - Response matches Odoo expectations");
      console.log('   Odoo will log: "SMS sent successfully"');
    } else {
      console.log(
        "\n❌ Test FAILED - Response does not match Odoo expectations",
      );
      console.log("   Odoo expects: { success: true, details: {...} }");
    }
  } catch (error) {
    console.log("📥 Response (Error):");
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log("   Body:", JSON.stringify(error.response.data, null, 2));

      // Check if error response matches what Odoo expects
      if (error.response.data.error) {
        console.log("\n⚠️  Error response matches Odoo expectations");
        console.log('   Odoo will log: "Failed to send SMS: [error message]"');
      }
    } else {
      console.log("   Error:", error.message);
    }
    console.log("\n❌ Test FAILED");
  }

  console.log("\n================================\n");

  // Test case 2: Missing mobile number
  console.log("📤 Test Case 2: Missing mobile number");
  try {
    await axios.post("http://localhost:4308/send-sms", {
      message: "Test message",
    });
  } catch (error) {
    if (error.response) {
      console.log("📥 Response (Expected Error):");
      console.log(`   Status: ${error.response.status}`);
      console.log("   Body:", JSON.stringify(error.response.data, null, 2));
      console.log("\n✅ Test PASSED - Proper error response");
    }
  }
}

if (require.main === module) {
  // Run the test
  testOdooSMSIntegration();
}

// Export the test function
module.exports = testOdooSMSIntegration;
