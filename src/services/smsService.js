const axios = require("axios");
const hashingService = require("./hashingService");
const CustomerHash = require("../models/CustomerHash");

class SMSService {
  constructor() {
    this.provider = process.env.SMS_PROVIDER;
    this.senderId = process.env.SMS_SENDER_ID;
  }

  /**
   * Send payment notification SMS
   */
  async sendPaymentNotification({
    phoneNumber,
    amount,
    transactionId,
    invoiceNumber,
  }) {
    try {
      // If phone number is not provided, try to find from hash
      if (!phoneNumber && transactionId) {
        phoneNumber = await this.getPhoneNumberFromTransaction(transactionId);
      }

      if (!phoneNumber) {
        console.log("No phone number available for SMS notification");
        return;
      }

      const message = this.formatPaymentMessage(amount, invoiceNumber);

      await this.sendSMS(phoneNumber, message);

      console.log(`Payment notification sent to ${phoneNumber}`);
    } catch (error) {
      console.error("Error sending payment notification:", error);
    }
  }

  /**
   * Send welcome SMS to new customer
   */
  async sendWelcomeSMS(customerData) {
    try {
      const { phoneNumber, name } = customerData;

      const message = `Welcome ${name || "Customer"}! Your account has been successfully registered. You can now make Mpesa payments to our Paybill ${process.env.MPESA_SHORTCODE}.`;

      await this.sendSMS(phoneNumber, message);
    } catch (error) {
      console.error("Error sending welcome SMS:", error);
    }
  }

  /**
   * Send admin alert for unmatched transactions
   */
  async sendAdminAlert({ message, transactionId }) {
    try {
      const adminPhoneNumbers =
        process.env.ADMIN_PHONE_NUMBERS?.split(",") || [];

      for (const adminPhone of adminPhoneNumbers) {
        await this.sendSMS(adminPhone, `[ADMIN ALERT] ${message}`);
      }
    } catch (error) {
      console.error("Error sending admin alert:", error);
    }
  }

  /**
   * Send invoice reminder
   */
  async sendInvoiceReminder(phoneNumber, invoiceNumber, amount, dueDate) {
    try {
      const message = `Reminder: Invoice ${invoiceNumber} of KES ${amount} is due on ${dueDate}. Please pay via Mpesa Paybill ${process.env.MPESA_SHORTCODE} with account ${invoiceNumber}.`;

      await this.sendSMS(phoneNumber, message);
    } catch (error) {
      console.error("Error sending invoice reminder:", error);
    }
  }

  /**
   * Generic SMS sender (supports multiple providers)
   */
  async sendSMS(phoneNumber, message) {
    try {
      // Normalize phone number
      const normalizedPhone = hashingService.normalizePhoneNumber(phoneNumber);

      switch (this.provider) {
        case "africastalking":
          await this.sendViaAfricaTalking(normalizedPhone, message);
          break;
        case "twilio":
          await this.sendViaTwilio(normalizedPhone, message);
          break;
        case "safaricom":
          await this.sendViaSafaricom(normalizedPhone, message);
          break;
        default:
          console.log("SMS provider not configured");
      }
    } catch (error) {
      throw new Error(`SMS sending failed: ${error.message}`);
    }
  }

  /**
   * Send via Africa's Talking
   */
  async sendViaAfricaTalking(phoneNumber, message) {
    const response = await axios.post(
      "https://api.africastalking.com/version1/messaging",
      {
        username: process.env.AFRICASTALKING_USERNAME,
        to: phoneNumber,
        message: message,
        from: this.senderId,
      },
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          apiKey: process.env.AFRICASTALKING_API_KEY,
        },
      },
    );

    return response.data;
  }

  /**
   * Send via Twilio
   */
  async sendViaTwilio(phoneNumber, message) {
    // Implement Twilio integration
    console.log("Twilio SMS sent (simulated)");
  }

  /**
   * Send via Safaricom (Mpesa) API
   */
  async sendViaSafaricom(phoneNumber, message) {
    // Implement Safaricom integration if available
    console.log("Safaricom SMS sent (simulated)");
  }

  /**
   * Format payment message
   */
  formatPaymentMessage(amount, invoiceNumber) {
    const timestamp = new Date().toLocaleString("en-KE", {
      timeZone: "Africa/Nairobi",
    });

    return `Payment of KES ${amount} received for invoice ${invoiceNumber || "N/A"} on ${timestamp}. Thank you for your business!`;
  }

  /**
   * Get phone number from transaction
   */
  async getPhoneNumberFromTransaction(transactionId) {
    try {
      // This would need access to the transaction log
      // Implement based on your data structure
      return null;
    } catch (error) {
      return null;
    }
  }
}

module.exports = new SMSService();
