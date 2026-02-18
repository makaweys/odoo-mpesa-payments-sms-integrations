const express = require("express");
const healthController = require("../controllers/healthController");
const router = express.Router();

// Basic health check (no auth required)
router.get("/", healthController.check);
router.get("/health", healthController.check);
router.get("/api/health", healthController.check);

// Detailed health check (may require auth in production)
router.get("/health/detailed", healthController.detailed);

module.exports = router;
