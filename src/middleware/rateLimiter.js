const rateLimit = require("express-rate-limit");

const rateLimiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW || 15 * 60 * 1000, // 15 minutes default
  max: process.env.RATE_LIMIT_MAX || 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests",
    message: "You have exceeded the rate limit. Please try again later.",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req) => {
    // Use x-forwarded-for if available, otherwise use IP
    return (
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.ip ||
      req.connection.remoteAddress
    );
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === "/health" || req.path === "/";
  },
});

module.exports = { rateLimiter };
