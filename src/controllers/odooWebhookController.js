const hashingService = require("../services/hashingService");
const encryptionService = require("../services/encryptionService");
const CustomerHash = require("../models/CustomerHash");
const { validationResult } = require("express-validator");

class OdooWebhookController {
  /**
   * Handle customer creation/update from Odoo
   */
  async handleCustomerWebhook(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        customer_id,
        name,
        phone,
        email,
        action, // 'create' or 'update'
        partner_id, // Odoo partner ID
      } = req.body;

      // Validate required fields
      if (!phone || !customer_id) {
        return res.status(400).json({
          error: "Phone number and customer ID are required",
        });
      }

      // Hash the phone number
      const phoneHash = hashingService.hashPhoneNumber(phone);

      // Create encrypted record for additional security
      const encryptedData = encryptionService.encrypt({
        customer_id,
        name,
        email,
        original_phone: phone,
        partner_id,
      });

      // Store in database with TTL for privacy compliance
      const customerHash = await CustomerHash.findOneAndUpdate(
        { customer_id },
        {
          customer_id,
          phone_hash: phoneHash,
          encrypted_data: encryptedData,
          partner_id,
          last_sync: new Date(),
          sync_action: action,
        },
        { upsert: true, new: true },
      );

      // Store in Redis for quick lookup
      req.app.locals.redis.setEx(
        `customer:${customer_id}`,
        86400, // 24 hours TTL
        JSON.stringify({
          phone_hash: phoneHash,
          customer_id,
          partner_id,
        }),
      );

      // Return hashed data to Odoo
      res.status(200).json({
        success: true,
        data: {
          customer_id,
          phone_hash: phoneHash,
          msisdn: phoneHash, // For Mpesa compatibility
          reference: hashingService.generateTransactionReference(),
          timestamp: new Date().toISOString(),
        },
      });

      // Optional: Trigger any post-processing
      this.postProcessCustomer(customerHash);
    } catch (error) {
      console.error("Error processing Odoo webhook:", error);
      res.status(500).json({
        error: "Internal server error",
        message:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Handle bulk customer sync
   */
  async handleBulkCustomerSync(req, res) {
    try {
      const { customers } = req.body;

      if (!Array.isArray(customers)) {
        return res.status(400).json({ error: "Customers must be an array" });
      }

      const results = [];
      const bulkOps = [];

      for (const customer of customers) {
        const { customer_id, phone, name, email } = customer;

        if (phone && customer_id) {
          const phoneHash = hashingService.hashPhoneNumber(phone);
          const encryptedData = encryptionService.encrypt({
            customer_id,
            name,
            email,
            original_phone: phone,
          });

          results.push({
            customer_id,
            phone_hash: phoneHash,
            status: "processed",
          });

          bulkOps.push({
            updateOne: {
              filter: { customer_id },
              update: {
                customer_id,
                phone_hash: phoneHash,
                encrypted_data: encryptedData,
                last_sync: new Date(),
              },
              upsert: true,
            },
          });
        }
      }

      if (bulkOps.length > 0) {
        await CustomerHash.bulkWrite(bulkOps);
      }

      res.status(200).json({
        success: true,
        processed: results.length,
        data: results,
      });
    } catch (error) {
      console.error("Error processing bulk sync:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Post-processing after customer sync
   */
  async postProcessCustomer(customerHash) {
    try {
      // Add to queue for any additional processing
      // e.g., welcome SMS, data validation, etc.
      console.log(`Post-processing customer: ${customerHash.customer_id}`);

      // You could trigger welcome SMS here if needed
      // await smsService.sendWelcomeSMS(customerHash);
    } catch (error) {
      console.error("Error in post-processing:", error);
    }
  }

  /**
   * Verify customer hash
   */
  async verifyCustomerHash(req, res) {
    try {
      const { phone, hash } = req.body;

      if (!phone || !hash) {
        return res.status(400).json({ error: "Phone and hash are required" });
      }

      const isValid = hashingService.verifyPhoneNumber(phone, hash);

      res.status(200).json({
        valid: isValid,
        phone_normalized: hashingService.normalizePhoneNumber(phone),
      });
    } catch (error) {
      console.error("Error verifying hash:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

module.exports = new OdooWebhookController();
