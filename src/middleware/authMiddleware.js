const { IpDeniedError, IpFilter } = require('express-ipfilter');
const logger = require('../utils/logger');

/**
 * IP Whitelist middleware
 * Restricts access to specific IP addresses
 */
const ipWhitelist = (allowedIPs = []) => {
	// If no IPs are specified, log a warning but don't block
	if (
		!allowedIPs ||
		allowedIPs.length === 0 ||
		(allowedIPs.length === 1 && allowedIPs[0] === '')
	) {
		logger.warn(
			'IP whitelist is empty - ALL IPS ARE ALLOWED! Set ALLOWED_IPS in .env for security'
		);
		return (req, res, next) => next();
	}

	logger.info(`IP whitelist enabled. Allowed IPs: ${allowedIPs.join(', ')}`);

	return IpFilter(allowedIPs, {
		mode: 'allow',
		log: false,
		/**
		 * Detect the real IP of the client from request headers.
		 * Tries to get the IP from the following headers in order:
		 * - X-Forwarded-For
		 * - X-Real-IP
		 * - Connection.remoteAddress
		 * - Socket.remoteAddress
		 * @param {Request} req - Express request object
		 * @returns {string} - Detected IP of the client
		 */
		detectIp: (req) => {
			// Try to get real IP from various headers
			const forwardedFor = req.headers['x-forwarded-for'];
			if (forwardedFor) {
				// Get the first IP in the list (client IP)
				const clientIp = forwardedFor.split(',')[0].trim();
				return clientIp;
			}

			const realIp = req.headers['x-real-ip'];
			if (realIp) {
				return realIp;
			}

			// Fall back to connection remote address
			return req.connection.remoteAddress || req.socket.remoteAddress;
		},
		/**
		 * Handles blocked requests from unauthorized IPs.
		 * Logs a warning and sends a 403 response with an error message.
		 * @param {Request} req - Express request object
		 * @param {Response} res - Express response object
		 */
		onDenied: (req, res) => {
			const clientIp = req.ip || req.connection.remoteAddress;
			logger.warn(`Blocked request from unauthorized IP: ${clientIp}`);

			res.status(403).json({
				error: 'Access denied',
				message: 'Your IP is not authorized to access this service',
			});
		},
	});
};

/**
 * API Key authentication middleware
 */
const apiKeyAuth = (req, res, next) => {
	const apiKey = req.headers['x-api-key'];

	if (!apiKey) {
		logger.warn('API request missing API key', {
			ip: req.ip,
			path: req.path,
		});

		return res.status(401).json({
			error: 'API key required',
			message: 'Please provide an API key in the X-API-Key header',
		});
	}

	// Validate API key
	if (apiKey !== process.env.API_SECRET_KEY) {
		logger.warn('Invalid API key used', {
			ip: req.ip,
			key_preview: apiKey.substring(0, 5) + '...',
		});

		return res.status(403).json({
			error: 'Invalid API key',
			message: 'The provided API key is invalid',
		});
	}

	next();
};

/**
 * Check API key if needed
 */
const authenticate = (req, res, next) => {
	if (!process.env.API_SECRET_KEY) {
		logger.error(
			'API key is not set! Set API_SECRET_KEY in .env for security'
		);
		return res.status(403).json({
			error: 'Authentication failed! Check with system Administrator',
		});
	}
	// Then check API key if present (optional for this bridge)
	const apiKey = req.headers['x-api-key'];
	if (apiKey && apiKey !== process.env.API_SECRET_KEY) {
		logger.warn('Invalid API key used');
		return res.status(403).json({ error: 'Invalid API key' });
	} else if (!apiKey) {
		logger.warn('API request missing API key');
		return res.status(401).json({ error: 'API key required' });
	}

	next();
};

module.exports = {
	ipWhitelist,
	apiKeyAuth,
	authenticate,
};
