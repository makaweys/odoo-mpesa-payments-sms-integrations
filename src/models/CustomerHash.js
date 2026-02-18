const mongoose = require("mongoose");

const customerHashSchema = new mongoose.Schema(
  {
    customer_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    phone_hash: {
      type: String,
      required: true,
      index: true,
    },
    partner_id: {
      type: Number,
      index: true,
    },
    encrypted_data: {
      type: String,
      required: true,
    },
    last_sync: {
      type: Date,
      default: Date.now,
    },
    sync_action: {
      type: String,
      enum: ["create", "update", "delete"],
      default: "create",
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  },
);

// TTL index for privacy compliance (e.g., 90 days)
customerHashSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model("CustomerHash", customerHashSchema);
