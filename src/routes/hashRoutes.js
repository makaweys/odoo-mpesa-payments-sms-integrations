const express = require("express");
const hashController = require("../controllers/hashController");
const { authenticate } = require("../middleware/authMiddleware");
const router = express.Router();

// Public test endpoint (no auth required for testing)
router.get("/test-formats", hashController.testFormats);

// All other hash endpoints require authentication
router.use(authenticate);

// Generate hashes for a single phone number
router.post("/generate", hashController.generateHashes);

// Generate hashes for multiple phone numbers
router.post("/batch-generate", hashController.batchGenerateHashes);

// Verify a hash against a phone number
router.post("/verify", hashController.verifyHash);

// Normalize a phone number without hashing
router.post("/normalize", hashController.normalizeNumber);

module.exports = router;
