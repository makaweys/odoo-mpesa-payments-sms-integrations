const crypto = require("crypto");

class AuthMiddleware {
  /**
   * Verify that request comes from Odoo
   */
  verifyOdooRequest(req, res, next) {
    const signature = req.headers["x-odoo-signature"];
    const timestamp = req.headers["x-odoo-timestamp"];

    if (!signature || !timestamp) {
      return res.status(401).json({ error: "Missing authentication headers" });
    }

    // Check timestamp freshness (prevent replay attacks)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    if (parseInt(timestamp) < fiveMinutesAgo) {
      return res.status(401).json({ error: "Request too old" });
    }

    // Verify signature
    const payload = timestamp + JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac("sha256", process.env.ODOO_WEBHOOK_SECRET)
      .update(payload)
      .digest("hex");

    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      )
    ) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    next();
  }

  /**
   * IP whitelist middleware
   */
  ipWhitelist(allowedIPs) {
    return (req, res, next) => {
      const clientIP = req.ip || req.connection.remoteAddress;

      if (allowedIPs.includes(clientIP)) {
        next();
      } else {
        res.status(403).json({ error: "Access denied from this IP" });
      }
    };
  }

  /**
   * API key authentication
   */
  apiKeyAuth(req, res, next) {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey || apiKey !== process.env.API_SECRET_KEY) {
      return res.status(401).json({ error: "Invalid API key" });
    }

    next();
  }
}

module.exports = new AuthMiddleware();
