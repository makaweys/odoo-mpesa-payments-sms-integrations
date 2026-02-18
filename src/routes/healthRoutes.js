const express = require("express");
const healthController = require("../controllers/healthController");
const router = express.Router();

// Basic health check
router.get("/", healthController.check);

// Detailed health check (may require auth in production)
router.get("/detailed", healthController.detailed);

module.exports = router;
