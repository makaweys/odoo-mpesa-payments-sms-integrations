const axios = require("axios");
const logger = require("../utils/logger");

class SMSController {
  constructor() {
    // Initialize with your Bulk Textsms configuration
    this.BULK_TEXTSMS_API_KEY = process.env.BULK_TEXTSMS_API_KEY;
    this.BULK_TEXTSMS_PARTNER_ID = process.env.BULK_TEXTSMS_PARTNER_ID;
    this.BULK_TEXTSMS_URL =
      process.env.BULK_TEXTSMS_URL ||
      "https://sms.textsms.co.ke/api/services/sendsms/";
    this.DEFAULT_SHORTCODE =
      process.env.DEFAULT_SHORTCODE || "COMPANY-SHORTCODE-CHANGE-IN-PRODUCTION";
  }

  /**
   * Send SMS using Bulk Textsms:
   * - Receives POST request with { message, mobile }
   * - Returns { success: true, details: {...} } on success
   * - Returns { error: "error message" } on failure
   */
  async sendSMS(req, res) {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(7);

    // Log the request (matching your Odoo debug style)
    console.log(
      `\n[${requestId}] ----------------------------- Start - Send SMS -----------------------------`,
    );
    console.log(`[${requestId}] Received SMS request from Odoo`);

    try {
      const { message, mobile } = req.body;

      // Log the received data (exactly as your Odoo does)
      console.log(`[${requestId}] Mobile:`, mobile);
      console.log(
        `[${requestId}] Message:`,
        message
          ? message.substring(0, 100) + (message.length > 100 ? "..." : "")
          : "undefined",
      );

      // Validate request body exactly as your Odoo expects
      if (!message || !mobile) {
        console.log(
          `[${requestId}] Validation failed: Missing message or mobile`,
        );

        // Log the error in Odoo-style
        logger.error("SMS validation failed", {
          requestId,
          hasMessage: !!message,
          hasMobile: !!mobile,
        });

        console.log(
          `[${requestId}] ----------------------------- End - Send SMS (Failed) -----------------------------\n`,
        );

        // Return error in format Odoo expects
        return res.status(400).json({
          error: "Message and mobile number are required.",
          success: false,
        });
      }

      // Clean mobile number (remove spaces) - exactly as your Odoo does
      const cleanMobile = mobile.replace(/\s+/g, "");
      console.log(`[${requestId}] Clean Mobile:`, cleanMobile);

      // Prepare the request payload for Bulk Textsms
      const payload = {
        apikey: this.BULK_TEXTSMS_API_KEY,
        partnerID: this.BULK_TEXTSMS_PARTNER_ID,
        message: message,
        shortcode: this.DEFAULT_SHORTCODE,
        mobile: cleanMobile,
      };

      console.log(`[${requestId}] Sending to Bulk Textsms API...`);

      // Send SMS using POST method
      const response = await axios.post(this.BULK_TEXTSMS_URL, payload, {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000, // 10 second timeout
      });

      const responseTime = Date.now() - startTime;
      console.log(`[${requestId}] API Response Time: ${responseTime}ms`);
      console.log(
        `[${requestId}] Bulk Textsms Response Status:`,
        response.status,
      );
      console.log(
        `[${requestId}] Bulk Textsms Response Data:`,
        JSON.stringify(response.data, null, 2),
      );

      // Handle the response in the format your Odoo expects
      if (
        response.data &&
        response.data.responses &&
        response.data.responses.length > 0
      ) {
        const smsResponse = response.data.responses[0];

        // Check if the SMS was sent successfully according to Bulk Textsms
        // Adjust this based on their actual response structure
        const isSuccess =
          smsResponse.status === "success" ||
          smsResponse.code === 200 ||
          smsResponse.responseCode === 200 ||
          (smsResponse.status && smsResponse.status.includes("success"));

        if (isSuccess) {
          console.log(
            `[${requestId}] ✅ SMS sent successfully to ${cleanMobile.replace(/(\d{3})\d{4}(\d{2})/, "$1****$2")}`,
          );

          // Log to Winston
          logger.info("SMS sent successfully", {
            requestId,
            mobile: cleanMobile.replace(/(\d{3})\d{4}(\d{2})/, "$1****$2"),
            message_length: message.length,
            response_time: `${responseTime}ms`,
            api_response: smsResponse,
          });

          console.log(
            `[${requestId}] ----------------------------- End - Send SMS (Success) -----------------------------\n`,
          );

          // Return success response in the format your Odoo expects
          return res.status(200).json({
            success: true,
            message: "SMS sent successfully.",
            details: smsResponse,
            requestId: requestId,
          });
        } else {
          // SMS provider returned failure
          console.log(
            `[${requestId}] ❌ SMS provider reported failure:`,
            smsResponse,
          );

          logger.error("SMS provider reported failure", {
            requestId,
            mobile: cleanMobile.replace(/(\d{3})\d{4}(\d{2})/, "$1****$2"),
            provider_response: smsResponse,
          });

          console.log(
            `[${requestId}] ----------------------------- End - Send SMS (Provider Failed) -----------------------------\n`,
          );

          return res.status(500).json({
            error: "SMS provider failed to send message",
            details: smsResponse,
            success: false,
          });
        }
      } else {
        // Unexpected API response format
        console.log(
          `[${requestId}] ❌ Invalid API response format:`,
          response.data,
        );

        logger.error("Invalid API response from Bulk Textsms", {
          requestId,
          response: response.data,
        });

        console.log(
          `[${requestId}] ----------------------------- End - Send SMS (Invalid Response) -----------------------------\n`,
        );

        return res.status(500).json({
          error: "Failed to send SMS. Invalid API response.",
          details: response.data,
          success: false,
        });
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Handle errors from the API or network issues
      console.log(`[${requestId}] ❌ Failed to send SMS:`, error.message);

      if (error.code === "ECONNABORTED") {
        console.log(`[${requestId}]    Timeout error`);
      } else if (error.code === "ENOTFOUND") {
        console.log(`[${requestId}]    Network error - host not found`);
      } else if (error.response) {
        console.log(
          `[${requestId}]    API Error Response:`,
          error.response.data,
        );
      }

      logger.error("SMS sending failed", {
        requestId,
        error: error.message,
        response_time: `${responseTime}ms`,
        code: error.code,
        details: error.response ? error.response.data : error.message,
      });

      console.log(
        `[${requestId}] ----------------------------- End - Send SMS (Exception) -----------------------------\n`,
      );

      // Return error in format Odoo expects
      return res.status(500).json({
        error: "Failed to send SMS.",
        details: error.response ? error.response.data : error.message,
        success: false,
      });
    }
  }

  /**
   * Health check endpoint for SMS service
   * Useful for Odoo to verify the service is running
   */
  async healthCheck(req, res) {
    const status = {
      service: "SMS Bridge (Bulk Textsms)",
      status: "operational",
      configured: !!(this.BULK_TEXTSMS_API_KEY && this.BULK_TEXTSMS_PARTNER_ID),
      api_url: this.BULK_TEXTSMS_URL,
      shortcode: this.DEFAULT_SHORTCODE,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };

    // Test API connectivity if in development
    if (process.env.NODE_ENV === "development" && status.configured) {
      try {
        await axios.head(this.BULK_TEXTSMS_URL, { timeout: 3000 });
        status.api_reachable = true;
      } catch (error) {
        status.api_reachable = false;
        status.api_error = error.code;
      }
    }

    res.status(200).json(status);
  }

  /**
   * Debug endpoint to test SMS configuration
   * This can be called from Odoo for testing
   */
  async testSMS(req, res) {
    try {
      const { mobile } = req.body;

      if (!mobile) {
        return res.status(400).json({
          error: "Mobile number required",
          success: false,
        });
      }

      const testMessage =
        "This is a test message from your Odoo-Mpesa Bridge. If you receive this, SMS is working correctly.";

      // Create a mock request object to reuse sendSMS logic
      req.body.message = testMessage;

      // Call sendSMS
      await this.sendSMS(req, res);
    } catch (error) {
      logger.error("SMS test failed:", error);
      res.status(500).json({
        error: "SMS test failed",
        details: error.message,
        success: false,
      });
    }
  }
}

module.exports = new SMSController();
