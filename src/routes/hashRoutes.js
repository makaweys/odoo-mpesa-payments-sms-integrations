const express = require("express");
const hashController = require("../controllers/hashController");
const { authenticate } = require("../middleware/authMiddleware");
const router = express.Router();

// All hash routes require authentication
router.use(authenticate);

// Generate hashes for a single phone number
router.post("/generate", hashController.generateHashes);

// Generate hashes for multiple phone numbers
router.post("/batch-generate", hashController.batchGenerateHashes);

// Verify a hash against a phone number
router.post("/verify", hashController.verifyHash);

module.exports = router;
