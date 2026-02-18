require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const { rateLimiter } = require("./middleware/rateLimiter");
const { requestLogger } = require("./middleware/requestLogger");
const { ipWhitelist } = require("./middleware/authMiddleware");
const hashRoutes = require("./routes/hashRoutes");
const smsRoutes = require("./routes/smsRoutes");
const healthRoutes = require("./routes/healthRoutes");
const logger = require("./utils/logger");

// Initialize single Express app
const app = express();

// Parse allowed IPs from environment
const allowedIPs = (process.env.ALLOWED_IPS || "")
  .split(",")
  .map((ip) => ip.trim());

// ==================== Global Middleware ====================
// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

// IP Whitelist - restrict access to specified IPs
app.use(ipWhitelist(allowedIPs));

// CORS configuration
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl)
      if (!origin) return callback(null, true);
      // In production, you might want to restrict this further
      callback(null, true);
    },
    credentials: true,
  }),
);

// Compression for better performance
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting for API endpoints
app.use("/api/", rateLimiter);

// Request logging
app.use(requestLogger);

// ==================== Routes ====================

// Health check routes (public)
app.use("/health", healthRoutes);
app.get("/", (req, res) => {
  res.json({
    service: "Odoo-Mpesa Hash Bridge",
    status: "running",
    endpoints: {
      hash: "/api/hash/generate",
      sms: "/send-sms",
      health: "/health",
      test: "/api/hash/test-formats",
    },
    timestamp: new Date().toISOString(),
  });
});

// Hash generation routes (protected)
app.use("/api/hash", hashRoutes);

// SMS routes - exactly matching your Odoo expectations
// Note: These are at root level to match your Odoo's /send-sms endpoint
app.post("/send-sms", (req, res) => {
  require("./controllers/smsController").sendSMS(req, res);
});

// Additional SMS endpoints
app.post("/bulk-send", (req, res) => {
  require("./controllers/smsController").sendBulkSMS(req, res);
});

app.get("/sms-health", (req, res) => {
  require("./controllers/smsController").healthCheck(req, res);
});

app.post("/test-sms", (req, res) => {
  require("./controllers/smsController").testSMS(req, res);
});

// You can also mount SMS routes under /api if desired
app.use("/api/sms", smsRoutes);

// ==================== 404 Handler ====================
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Cannot ${req.method} ${req.url}`,
    available_endpoints: {
      hash: [
        "POST /api/hash/generate",
        "POST /api/hash/batch-generate",
        "POST /api/hash/verify",
        "GET /api/hash/test-formats",
      ],
      sms: [
        "POST /send-sms",
        "POST /bulk-send",
        "GET /sms-health",
        "POST /test-sms",
      ],
      health: ["GET /health", "GET /"],
    },
  });
});

// ==================== Error Handler ====================
app.use((err, req, res, next) => {
  logger.error("Unhandled error:", err);

  res.status(err.status || 500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ==================== Start Server ====================
const PORT = process.env.PORT || 3000;

// Only start server if not in test mode
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`=================================`);
    logger.info(`Server started successfully`);
    logger.info(`=================================`);
    logger.info(`Port: ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
    logger.info(`=================================`);
    logger.info(`Endpoints:`);
    logger.info(`   Health Check:`);
    logger.info(`   - GET  /`);
    logger.info(`   - GET  /health`);
    logger.info(``);
    logger.info(`   Hash Generation (for Odoo):`);
    logger.info(`   - POST /api/hash/generate`);
    logger.info(`   - POST /api/hash/batch-generate`);
    logger.info(`   - POST /api/hash/verify`);
    logger.info(`   - GET  /api/hash/test-formats`);
    logger.info(``);
    logger.info(`   SMS Sending (for Odoo):`);
    logger.info(
      `   - POST /send-sms        ← Your Odoo sends to this endpoint`,
    );
    logger.info(`   - POST /bulk-send`);
    logger.info(`   - GET  /sms-health`);
    logger.info(`   - POST /test-sms`);
    logger.info(``);
    logger.info(`   API Routes (alternative):`);
    logger.info(`   - POST /api/sms/send`);
    logger.info(`   - GET  /api/sms/health`);
    logger.info(`=================================`);
    logger.info(`Security:`);
    logger.info(
      `   IP Whitelist: ${allowedIPs.join(", ") || "Disabled - ALL IPS ALLOWED!"}`,
    );
    logger.info(
      `   Rate Limit: ${process.env.RATE_LIMIT_MAX || 100} requests per ${process.env.RATE_LIMIT_WINDOW || 15} minutes`,
    );
    logger.info(`=================================`);
  });
}

module.exports = app;
