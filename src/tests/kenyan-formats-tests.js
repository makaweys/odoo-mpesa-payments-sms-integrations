const axios = require("axios");

async function testKenyanFormats() {
  console.log("📱 Testing Kenyan Phone Number Formats");
  console.log("=======================================\n");

  const testNumbers = [
    // Traditional Safaricom (07)
    "0701 234 567",
    "0798 456 123",
    "0700 000 000",

    // New prefixes (01)
    "0110 345 678",
    "0111 222 333",
    "0100 123 456",

    // With country code
    "+254 701 234 567",
    "+254 110 345 678",
    "+254 798 456 123",

    // Without any formatting
    "0701234567",
    "0110345678",
    "701234567",
    "110345678",

    // Already in 254 format
    "254701234567",
    "254110345678",

    // Edge cases
    "0722 555-555",
    "+254-722-333-444",
    " 0733 444 555 ",
  ];

  for (const number of testNumbers) {
    console.log(`\n📤 Testing: "${number}"`);

    try {
      const response = await axios.post(
        "http://localhost:3000/api/hash/generate",
        {
          customer_id: 99999,
          mobile_number: number,
        },
        {
          headers: {
            "X-API-Key": process.env.API_SECRET_KEY || "your-api-key-here",
          },
        },
      );

      console.log("📥 Response:");
      console.log(`   Normalized: ${response.data.normalized_number || "N/A"}`);
      console.log(
        `   Hash (+254): ${response.data.mobile_hash_plus254.substring(0, 20)}...`,
      );
      console.log(
        `   Hash (07/01): ${response.data.mobile_hash_07.substring(0, 20)}...`,
      );
      console.log(
        `   Hash (254): ${response.data.mobile_hash_254.substring(0, 20)}...`,
      );

      // Verify that all three formats produce different hashes
      const hashes = [
        response.data.mobile_hash_plus254,
        response.data.mobile_hash_07,
        response.data.mobile_hash_254,
      ];
      const uniqueHashes = new Set(hashes);

      if (uniqueHashes.size === 3) {
        console.log("   ✅ All three hashes are unique (correct)");
      } else {
        console.log("   ⚠️  Warning: Some hashes are the same");
      }
    } catch (error) {
      console.log("❌ Error:", error.response?.data || error.message);
    }
  }
}

// Test verification
async function testVerification() {
  console.log("\n\n🔍 Testing Hash Verification");
  console.log("============================\n");

  // Test case: Same number, different formats should verify
  const testCases = [
    { original: "0701 234 567", verifyWith: "+254701234567" },
    { original: "0110 345 678", verifyWith: "254110345678" },
    { original: "+254 798 456 123", verifyWith: "0798456123" },
  ];

  for (const test of testCases) {
    console.log(`\nOriginal: "${test.original}"`);
    console.log(`Verify with: "${test.verifyWith}"`);

    try {
      // First generate hash from original
      const genResponse = await axios.post(
        "http://localhost:3000/api/hash/generate",
        {
          customer_id: 99999,
          mobile_number: test.original,
        },
      );

      // Then verify with different format
      const verifyResponse = await axios.post(
        "http://localhost:3000/api/hash/verify",
        {
          mobile_number: test.verifyWith,
          hash: genResponse.data.mobile_hash_254, // Use 254 format hash
        },
      );

      console.log(
        "Verification result:",
        verifyResponse.data.any_match ? "✅ MATCH" : "❌ NO MATCH",
      );

      if (verifyResponse.data.any_match) {
        console.log(`   Matched format: ${verifyResponse.data.matched_format}`);
      }
    } catch (error) {
      console.log("Error:", error.message);
    }
  }
}

// Run tests
async function runAllTests() {
  await testKenyanFormats();
  await testVerification();
}

runAllTests();
