const express = require("express");
const smsController = require("../controllers/smsController");
const { authenticate } = require("../middleware/authMiddleware");
const router = express.Router();

// Public health check (no auth required)
router.get("/health", smsController.healthCheck);

// All SMS endpoints require authentication
router.use(authenticate);

// Send SMS endpoint
router.post("/send", smsController.sendSMS);

// Bulk send endpoint
router.post("/bulk", smsController.sendBulkSMS);

// Test endpoint
router.post("/test", smsController.testSMS);

module.exports = router;
