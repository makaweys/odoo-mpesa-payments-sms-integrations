const crypto = require("crypto");

class HashingService {
  constructor() {
    this.salt = process.env.HASH_SALT || "default-salt-change-in-production";
    this.algorithm = process.env.HASH_ALGORITHM || "sha256";
  }

  /**
   * Create SHA256 hash (as used by Safaricom Mpesa)
   */
  createSHA256Hash(data) {
    if (!data) return "";

    const hash = crypto.createHash(this.algorithm).update(data).digest("hex");

    return hash;
  }

  /**
   * Clean and normalize Kenyan phone numbers
   * Handles various formats:
   * - 0701 234 567 -> 254701234567
   * - 0798 456 123 -> 254798456123
   * - 0110 345 678 -> 254110345678
   * - +254 701 234 567 -> 254701234567
   * - 701234567 -> 254701234567
   * - 254701234567 -> 254701234567
   */
  normalizeKenyanPhoneNumber(phoneNumber) {
    if (!phoneNumber) return "";

    // Convert to string and trim
    let cleaned = String(phoneNumber).trim();

    // Remove all non-digit characters (spaces, hyphens, parentheses)
    cleaned = cleaned.replace(/\D/g, "");

    // Handle different Kenyan formats
    if (cleaned.startsWith("0")) {
      // Local format: 07XXXXXXXX or 01XXXXXXXX
      // Remove leading 0 and add 254
      cleaned = "254" + cleaned.substring(1);
    } else if (cleaned.startsWith("7") || cleaned.startsWith("1")) {
      // Format without prefix: 7XXXXXXXX or 1XXXXXXXX
      // Add 254
      cleaned = "254" + cleaned;
    } else if (cleaned.startsWith("2547") || cleaned.startsWith("2541")) {
      // Already in correct format, keep as is
      // Do nothing
    } else if (cleaned.startsWith("2540")) {
      // Wrong format: 2540XXXXXXXX (extra zero)
      // Remove the zero after 254
      cleaned = "254" + cleaned.substring(4);
    } else if (cleaned.startsWith("254") && cleaned.length > 9) {
      // Has 254 but might have extra digits
      cleaned = "254" + cleaned.substring(3).replace(/^0+/, "");
    }

    // Ensure we have exactly 12 digits for Kenyan numbers (254 + 9 digits)
    if (cleaned.length === 12 && cleaned.startsWith("254")) {
      return cleaned;
    } else if (cleaned.length > 12 && cleaned.startsWith("254")) {
      // Too long, take first 12 digits
      return cleaned.substring(0, 12);
    } else {
      // If we can't normalize properly, return as is
      // This will still be hashed but might not match
      return cleaned;
    }
  }

  /**
   * Generate all three hash formats needed by Odoo
   * Now properly handles all Kenyan number formats
   */
  generateAllHashes(phoneNumber) {
    // First normalize to international format (254XXXXXXXXX)
    const normalizedInternational =
      this.normalizeKenyanPhoneNumber(phoneNumber);

    // Extract the local part (9 digits after 254)
    const localPart = normalizedInternational.startsWith("254")
      ? normalizedInternational.substring(3)
      : normalizedInternational;

    // Generate the three required formats
    const plus254Format = `+254${localPart}`;
    const zeroSevenFormat = `0${localPart}`; // For both 07 and 01 prefixes
    const twoFiveFourFormat = `254${localPart}`;

    console.log("Phone number normalization:", {
      original: phoneNumber,
      normalized: normalizedInternational,
      localPart: localPart,
      formats: {
        plus254: plus254Format,
        "07/01": zeroSevenFormat,
        254: twoFiveFourFormat,
      },
    });

    return {
      mobile_hash_plus254: this.createSHA256Hash(plus254Format),
      mobile_hash_07: this.createSHA256Hash(zeroSevenFormat),
      mobile_hash_254: this.createSHA256Hash(twoFiveFourFormat),
      original_format: {
        plus254: plus254Format,
        "07/01": zeroSevenFormat,
        254: twoFiveFourFormat,
      },
      normalized: normalizedInternational,
      local_part: localPart,
    };
  }

  /**
   * Test function to demonstrate handling of various Kenyan formats
   */
  testAllFormats() {
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
      "254798456123",

      // With extra spaces and dashes
      "0701-234-567",
      "+254-701-234-567",
      " 0701 234 567 ",
    ];

    console.log("🧪 Testing Kenyan Phone Number Normalization");
    console.log("=============================================\n");

    const results = {};

    testNumbers.forEach((number) => {
      console.log(`Input: "${number}"`);

      const normalized = this.normalizeKenyanPhoneNumber(number);
      console.log(`  Normalized: ${normalized}`);

      const hashes = this.generateAllHashes(number);

      console.log(`  Hashes:`);
      console.log(
        `    +254 format: ${hashes.mobile_hash_plus254.substring(0, 16)}...`,
      );
      console.log(
        `    07/01 format: ${hashes.mobile_hash_07.substring(0, 16)}...`,
      );
      console.log(
        `    254 format: ${hashes.mobile_hash_254.substring(0, 16)}...`,
      );
      console.log("  ---");

      results[number] = {
        normalized,
        hashes: {
          plus254_preview: hashes.mobile_hash_plus254.substring(0, 16),
          zero_preview: hashes.mobile_hash_07.substring(0, 16),
          twoFiveFour_preview: hashes.mobile_hash_254.substring(0, 16),
        },
      };
    });

    return results;
  }

  /**
   * Verify if a phone number matches any of the stored hashes
   */
  verifyPhoneNumber(phoneNumber, storedHashes) {
    const generatedHashes = this.generateAllHashes(phoneNumber);

    const matches = {
      matches_plus254:
        generatedHashes.mobile_hash_plus254 ===
        storedHashes?.mobile_hash_plus254,
      matches_07:
        generatedHashes.mobile_hash_07 === storedHashes?.mobile_hash_07,
      matches_254:
        generatedHashes.mobile_hash_254 === storedHashes?.mobile_hash_254,
      any_match: false,
    };

    matches.any_match =
      matches.matches_plus254 || matches.matches_07 || matches.matches_254;

    return matches;
  }

  /**
   * Get the normalized international format
   * Useful for storing in database
   */
  getNormalizedFormat(phoneNumber) {
    return this.normalizeKenyanPhoneNumber(phoneNumber);
  }

  /**
   * Check if two phone numbers are the same after normalization
   */
  areSameNumber(phone1, phone2) {
    const norm1 = this.normalizeKenyanPhoneNumber(phone1);
    const norm2 = this.normalizeKenyanPhoneNumber(phone2);
    return norm1 === norm2;
  }
}

module.exports = new HashingService();
