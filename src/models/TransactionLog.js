const mongoose = require("mongoose");

const transactionLogSchema = new mongoose.Schema(
  {
    transaction_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    phone_hash: {
      type: String,
      required: true,
      index: true,
    },
    customer_id: {
      type: String,
      index: true,
    },
    invoice_number: {
      type: String,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "matched",
        "unmatched",
        "posted",
        "failed",
        "manual_review_required",
      ],
      default: "unmatched",
    },
    odoo_payment_id: {
      type: Number,
    },
    raw_data: {
      type: mongoose.Schema.Types.Mixed,
    },
    transaction_time: {
      type: Date,
      required: true,
    },
    business_shortcode: String,
    customer_name: String,
    error_message: String,
    retry_count: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for reporting
transactionLogSchema.index({ status: 1, createdAt: -1 });
transactionLogSchema.index({ customer_id: 1, transaction_time: -1 });

module.exports = mongoose.model("TransactionLog", transactionLogSchema);
