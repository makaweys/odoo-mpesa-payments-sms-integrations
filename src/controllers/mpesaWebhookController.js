const CustomerHash = require("../models/CustomerHash");
const TransactionLog = require("../models/TransactionLog");
const smsService = require("../services/smsService");
const hashingService = require("../services/hashingService");
const axios = require("axios");

class MpesaWebhookController {
  /**
   * Handle Mpesa payment confirmation
   * This is called by Safaricom when payment is received
   */
  async handleMpesaConfirmation(req, res) {
    try {
      const mpesaData = req.body;

      console.log(
        "Mpesa Confirmation Received:",
        JSON.stringify(mpesaData, null, 2),
      );

      // Extract relevant data
      const {
        MSISDN: phoneHash,
        TransID: transactionId,
        TransAmount: amount,
        BillRefNumber: invoiceNumber,
        FirstName,
        MiddleName,
        LastName,
        TransTime,
        BusinessShortCode,
      } = mpesaData;

      // Find customer by phone hash
      const customer = await CustomerHash.findOne({ phone_hash: phoneHash });

      // Create transaction log
      const transactionLog = await TransactionLog.create({
        transaction_id: transactionId,
        amount: parseFloat(amount),
        phone_hash: phoneHash,
        invoice_number: invoiceNumber,
        customer_id: customer?.customer_id,
        status: customer ? "matched" : "unmatched",
        raw_data: mpesaData,
        transaction_time: this.parseMpesaTime(TransTime),
        business_shortcode: BusinessShortCode,
        customer_name: `${FirstName} ${MiddleName} ${LastName}`.trim(),
      });

      // If customer found, post payment to Odoo
      if (customer) {
        await this.postPaymentToOdoo(transactionLog, customer);

        // Send SMS notification
        await smsService.sendPaymentNotification({
          phoneNumber: customer.encrypted_data
            ? this.decryptPhoneNumber(customer.encrypted_data)
            : null,
          amount,
          transactionId,
          invoiceNumber,
        });
      } else {
        // No matching customer - flag for manual intervention
        await this.flagUnmatchedTransaction(transactionLog);
      }

      // Respond to Mpesa (must accept within timeout)
      res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Success",
        ThirdPartyTransID: transactionId,
      });
    } catch (error) {
      console.error("Error processing Mpesa confirmation:", error);

      // Always respond with success to Mpesa to prevent retries
      res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Accepted",
        ThirdPartyTransID: req.body.TransID || "Unknown",
      });
    }
  }

  /**
   * Handle Mpesa validation (optional)
   */
  async handleMpesaValidation(req, res) {
    try {
      const validationData = req.body;

      console.log("Mpesa Validation Request:", validationData);

      // You can implement custom validation logic here
      // For now, accept all transactions

      res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Success",
      });
    } catch (error) {
      console.error("Error in Mpesa validation:", error);
      res.status(200).json({
        ResultCode: 1,
        ResultDesc: "Service unavailable",
      });
    }
  }

  /**
   * Post payment to Odoo
   */
  async postPaymentToOdoo(transaction, customer) {
    try {
      // Decrypt customer data
      const customerData = this.decryptCustomerData(customer.encrypted_data);

      // Prepare payment data for Odoo
      const paymentData = {
        partner_id: customer.partner_id,
        amount: transaction.amount,
        payment_date: transaction.transaction_time,
        reference: transaction.transaction_id,
        invoice_number: transaction.invoice_number,
        payment_method: "mpesa",
        journal_id: 1, // Configure based on your Odoo setup
        state: "posted", // or 'draft' if you want to review
      };

      // Send to Odoo
      const response = await axios.post(
        `${process.env.ODOO_BASE_URL}/api/payments`,
        paymentData,
        {
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": process.env.ODOO_API_KEY,
          },
        },
      );

      // Update transaction log with Odoo reference
      transaction.odoo_payment_id = response.data.payment_id;
      transaction.status = "posted";
      await transaction.save();

      console.log(`Payment posted to Odoo: ${transaction.transaction_id}`);
    } catch (error) {
      console.error("Error posting to Odoo:", error);

      transaction.status = "failed";
      transaction.error_message = error.message;
      await transaction.save();
    }
  }

  /**
   * Flag unmatched transaction for manual review
   */
  async flagUnmatchedTransaction(transaction) {
    transaction.status = "manual_review_required";
    await transaction.save();

    // Send alert to finance team
    await smsService.sendAdminAlert({
      message: `Unmatched Mpesa payment: ${transaction.amount} from unknown customer. Transaction ID: ${transaction.transaction_id}`,
      transactionId: transaction.transaction_id,
    });

    console.log(
      `Transaction flagged for manual review: ${transaction.transaction_id}`,
    );
  }

  /**
   * Parse Mpesa timestamp (YYYYMMDDHHMMSS)
   */
  parseMpesaTime(timestamp) {
    const year = timestamp.substring(0, 4);
    const month = timestamp.substring(4, 6);
    const day = timestamp.substring(6, 8);
    const hour = timestamp.substring(8, 10);
    const minute = timestamp.substring(10, 12);
    const second = timestamp.substring(12, 14);

    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
  }

  /**
   * Decrypt customer data
   */
  decryptCustomerData(encryptedData) {
    // Implement decryption logic
    // This should match the encryption in hashingService
    return JSON.parse(encryptedData); // Simplified - implement proper decryption
  }
}

module.exports = new MpesaWebhookController();
