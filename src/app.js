require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const { rateLimiter } = require('./middleware/rateLimiter');
const { requestLogger } = require('./middleware/requestLogger');
const { ipWhitelist } = require('./middleware/authMiddleware');
const hashRoutes = require('./routes/hashRoutes');
const smsRoutes = require('./routes/smsRoutes');
const healthRoutes = require('./routes/healthRoutes');
const logger = require('./utils/logger');

// Initialize single Express app
const app = express();

// Parse allowed IPs from environment
const allowedIPs = (process.env.ALLOWED_IPS || '')
	.split(',')
	.map((ip) => ip.trim());

// ==================== Global Middleware ====================
// Security headers
app.use(
	helmet({
		contentSecurityPolicy: false,
		crossOriginEmbedderPolicy: false,
	})
);

// IP Whitelist - restrict access to specified IPs
app.use(ipWhitelist(allowedIPs));

// CORS configuration
app.use(
	cors({
		origin: function (origin, callback) {
			if (!origin) return callback(null, true);
			callback(null, true);
		},
		credentials: true,
	})
);

// Compression for better performance
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting for API endpoints
app.use('/api/', rateLimiter);

// Request logging
app.use(requestLogger);

// ==================== Route Mounting ====================

// Mount route modules - ONLY these three as specified
app.use('/api/hash', hashRoutes); // All hash endpoints under /api/hash
app.use('/api/sms', smsRoutes); // All SMS endpoints under /api/sms
app.use('/health', healthRoutes); // Health check endpoints

// ==================== Root Information Endpoint ====================
app.get('/', (req, res) => {
	res.json({
		service: 'Odoo Mpesa Payments and SMS Integration',
		status: 'running',
		version: process.env.npm_package_version || '1.0.0',
		endpoints: {
			hash: {
				'POST /api/hash/generate':
					'Generate three hash formats for a phone number',
				'POST /api/hash/batch-generate':
					'Generate hashes for multiple customers',
				'POST /api/hash/verify': 'Verify a phone number against a hash',
				'GET /api/hash/test-formats':
					'Test phone number format handling',
			},
			sms: {
				'POST /api/sms/send': 'Send SMS notification',
				'POST /api/sms/bulk': 'Send bulk SMS messages',
				'GET /api/sms/health': 'SMS service health check',
				'POST /api/sms/test': 'Test SMS configuration',
			},
			health: {
				'GET /health': 'Basic health status',
				'GET /health/detailed': 'Detailed health information',
			},
		},
		timestamp: new Date().toISOString(),
	});
});

// ==================== 404 Handler ====================
app.use((req, res) => {
	logger.warn('404 - Route not found', {
		method: req.method,
		url: req.url,
		ip: req.ip,
	});

	res.status(404).json({
		error: 'Not Found',
		message: `Cannot ${req.method} ${req.url}`,
		available_endpoints: [
			'GET /',
			'GET /health',
			'GET /health/detailed',
			'POST /api/hash/generate',
			'POST /api/hash/batch-generate',
			'POST /api/hash/verify',
			'GET /api/hash/test-formats',
			'POST /api/sms/send',
			'POST /api/sms/bulk',
			'GET /api/sms/health',
			'POST /api/sms/test',
		],
	});
});

// ==================== Error Handler ====================
app.use((err, req, res, next) => {
	logger.error('Unhandled error:', err);

	res.status(err.status || 500).json({
		error:
			process.env.NODE_ENV === 'production'
				? 'Internal Server Error'
				: err.message,
		...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
	});
});

// ==================== Start Server ====================
const PORT = process.env.PORT || 3000;

// Only start server if not in test mode
if (require.main === module) {
	app.listen(PORT, () => {
		logger.info(`=================================`);
		logger.info(`Odoo Mpesa Payments and SMS Integration Started`);
		logger.info(`=================================`);
		logger.info(`Port: ${PORT}`);
		logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
		logger.info(`=================================`);
		logger.info(`Available Endpoints:`);
		logger.info(``);
		logger.info(`Hash Endpoints (for Odoo customer hashing):`);
		logger.info(`- POST /api/hash/generate`);
		logger.info(`- POST /api/hash/batch-generate`);
		logger.info(`- POST /api/hash/verify`);
		logger.info(`- GET  /api/hash/test-formats`);
		logger.info(``);
		logger.info(`SMS Endpoints (for Odoo payment confirmations):`);
		logger.info(`- POST /api/sms/send`);
		logger.info(`- POST /api/sms/bulk`);
		logger.info(`- GET  /api/sms/health`);
		logger.info(`- POST /api/sms/test`);
		logger.info(``);
		logger.info(`Health Endpoints:`);
		logger.info(`- GET  /health`);
		logger.info(`- GET  /health/detailed`);
		logger.info(`- GET  /`);
		logger.info(``);
		logger.info(`Security:`);
		logger.info(
			`IP Whitelist: ${allowedIPs.join(', ') || 'DISABLED - All IPs allowed'}`
		);
		logger.info(
			`Rate Limit: ${process.env.RATE_LIMIT_MAX || 100} requests per window`
		);
		logger.info(`=================================`);
	});
}

module.exports = app;
