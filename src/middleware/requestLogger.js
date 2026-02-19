const logger = require("../utils/logger");

const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Store original end function
  const originalEnd = res.end;

  // Override end function to log after response
  res.end = function (chunk, encoding) {
    // Restore original end
    res.end = originalEnd;

    // Call original end
    res.end(chunk, encoding);

    // Calculate response time
    const responseTime = Date.now() - start;

    // Determine if this is a sensitive path that needs special handling
    const isSensitivePath =
      req.path.includes("/hash") || req.path.includes("/sms");

    // Log request details
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      response_time: `${responseTime}ms`,
      ip:
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.ip ||
        req.connection.remoteAddress,
      user_agent: req.headers["user-agent"],
    };

    // Add request body for non-sensitive data (mask sensitive info)
    if (req.body && Object.keys(req.body).length > 0 && !isSensitivePath) {
      logData.body = req.body;
    } else if (req.body && isSensitivePath) {
      // For sensitive paths, only log that data was received, not the content
      logData.body_received = true;
      logData.body_size = JSON.stringify(req.body).length;

      // Log specific fields if needed (with masking)
      if (req.body.mobile) {
        logData.mobile_masked = req.body.mobile.replace(
          /(\d{3})\d{4}(\d{2})/,
          "$1****$2",
        );
      }
      if (req.body.customer_id) {
        logData.customer_id = req.body.customer_id;
      }
    }

    // Log based on status code
    if (res.statusCode >= 500) {
      logger.error("Request failed", logData);
    } else if (res.statusCode >= 400) {
      logger.warn("Request warning", logData);
    } else {
      logger.info("Request completed", logData);
    }
  };

  next();
};

module.exports = { requestLogger };
