const hashingService = require("../services/hashingService");
const logger = require("../utils/logger");

class HashController {
  /**
   * Generate SHA256 hashes for a phone number
   * Handles all Kenyan formats (07, 01, +254, 254, etc.)
   */
  async generateHashes(req, res) {
    try {
      const { customer_id, mobile_number } = req.body;

      // Validate input
      if (!mobile_number) {
        logger.warn("Hash generation attempted without mobile number", {
          customer_id,
        });
        return res.status(400).json({
          error: "Mobile number is required",
        });
      }

      if (!customer_id) {
        logger.warn("Hash generation attempted without customer ID", {
          mobile_number,
        });
        return res.status(400).json({
          error: "Customer ID is required",
        });
      }

      // Log the incoming request (mask phone number partially)
      const maskedMobile = mobile_number.replace(
        /(\d{3})\d{4}(\d{2})/,
        "$1****$2",
      );
      logger.info("Processing hash generation request", {
        customer_id,
        mobile_number: maskedMobile,
      });

      // Generate all three hash formats
      const hashes = hashingService.generateAllHashes(mobile_number);

      // Log success
      logger.info("SHA256 hashes generated successfully", {
        customer_id,
        normalized: hashes.normalized,
        hash_plus254_preview:
          hashes.mobile_hash_plus254.substring(0, 10) + "...",
        hash_07_preview: hashes.mobile_hash_07.substring(0, 10) + "...",
        hash_254_preview: hashes.mobile_hash_254.substring(0, 10) + "...",
      });

      // Return exactly what Odoo expects
      return res.status(200).json({
        customer_id: customer_id,
        mobile_hash_plus254: hashes.mobile_hash_plus254,
        mobile_hash_07: hashes.mobile_hash_07,
        mobile_hash_254: hashes.mobile_hash_254,
        normalized_number: hashes.normalized, // Optional: helpful for debugging
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("Error generating hashes:", error);

      return res.status(500).json({
        error: "Failed to generate hashes",
        message:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Test endpoint to demonstrate handling of various Kenyan formats
   */
  async testFormats(req, res) {
    try {
      const results = hashingService.testAllFormats();

      return res.status(200).json({
        message: "Kenyan phone number format test completed",
        total_tested: Object.keys(results).length,
        results: results,
        note: "All formats normalized to 254XXXXXXXXX before hashing",
      });
    } catch (error) {
      logger.error("Error testing formats:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Batch generate hashes for multiple phone numbers
   */
  async batchGenerateHashes(req, res) {
    try {
      const { customers } = req.body;

      if (!Array.isArray(customers)) {
        return res.status(400).json({
          error: "Customers must be an array",
        });
      }

      const results = [];
      const errors = [];

      for (const customer of customers) {
        try {
          const { customer_id, mobile_number } = customer;

          if (!mobile_number || !customer_id) {
            errors.push({
              customer_id: customer_id || "unknown",
              error: "Missing required fields",
            });
            continue;
          }

          const hashes = hashingService.generateAllHashes(mobile_number);

          results.push({
            customer_id,
            mobile_hash_plus254: hashes.mobile_hash_plus254,
            mobile_hash_07: hashes.mobile_hash_07,
            mobile_hash_254: hashes.mobile_hash_254,
            normalized: hashes.normalized,
          });
        } catch (err) {
          errors.push({
            customer_id: customer.customer_id || "unknown",
            error: err.message,
          });
        }
      }

      logger.info("Batch hash generation completed", {
        total: customers.length,
        successful: results.length,
        failed: errors.length,
      });

      return res.status(200).json({
        success: true,
        processed: results.length,
        results,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      logger.error("Error in batch hash generation:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Verify if a phone number matches a given hash
   */
  async verifyHash(req, res) {
    try {
      const { mobile_number, hash } = req.body;

      if (!mobile_number || !hash) {
        return res.status(400).json({
          error: "Mobile number and hash are required",
        });
      }

      const generatedHashes = hashingService.generateAllHashes(mobile_number);

      // Check all three formats
      const matches = {
        plus254: generatedHashes.mobile_hash_plus254 === hash,
        "07/01": generatedHashes.mobile_hash_07 === hash,
        254: generatedHashes.mobile_hash_254 === hash,
      };

      const anyMatch = matches.plus254 || matches["07/01"] || matches["254"];
      const matchedFormat = anyMatch
        ? matches.plus254
          ? "plus254"
          : matches["07/01"]
            ? "07/01"
            : "254"
        : null;

      return res.status(200).json({
        mobile_number: mobile_number.replace(/(\d{3})\d{4}(\d{2})/, "$1****$2"),
        normalized: generatedHashes.normalized,
        hash,
        matches: matches,
        any_match: anyMatch,
        matched_format: matchedFormat,
        all_hashes: {
          mobile_hash_plus254: generatedHashes.mobile_hash_plus254,
          mobile_hash_07: generatedHashes.mobile_hash_07,
          mobile_hash_254: generatedHashes.mobile_hash_254,
        },
      });
    } catch (error) {
      logger.error("Error verifying hash:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Normalize a phone number without hashing
   * Useful for debugging
   */
  async normalizeNumber(req, res) {
    try {
      const { mobile_number } = req.body;

      if (!mobile_number) {
        return res.status(400).json({ error: "Mobile number required" });
      }

      const normalized =
        hashingService.normalizeKenyanPhoneNumber(mobile_number);
      const formats = {
        original: mobile_number,
        normalized: normalized,
        plus254: `+254${normalized.substring(3)}`,
        local: `0${normalized.substring(3)}`,
        international: normalized,
      };

      return res.status(200).json(formats);
    } catch (error) {
      logger.error("Error normalizing number:", error);
      return res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new HashController();
