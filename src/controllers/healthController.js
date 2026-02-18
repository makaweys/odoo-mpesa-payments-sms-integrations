const logger = require("../utils/logger");

class HealthController {
  check(req, res) {
    const healthData = {
      status: "healthy",
      service: "Odoo-Mpesa Hash Bridge",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    };

    logger.debug("Health check performed", { ip: req.ip });
    res.status(200).json(healthData);
  }

  detailed(req, res) {
    // Check if detailed health info should be returned
    const apiKey = req.headers["x-api-key"];

    if (
      process.env.NODE_ENV === "production" &&
      apiKey !== process.env.API_SECRET_KEY
    ) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const detailedData = {
      status: "healthy",
      service: "Odoo-Mpesa Hash Bridge",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      environment: process.env.NODE_ENV,
      sms_api_configured: !!process.env.ODOO_SMS_API_URL,
      allowed_ips: (process.env.ALLOWED_IPS || "")
        .split(",")
        .filter((ip) => ip.trim()),
      version: process.env.npm_package_version || "1.0.0",
    };

    res.status(200).json(detailedData);
  }
}

module.exports = new HealthController();
