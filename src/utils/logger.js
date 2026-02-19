const winston = require('winston');
const path = require('path');

const { combine, timestamp, printf, colorize } = winston.format;

// Simple console format
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
	return `${timestamp} [${level}]: ${message}`;
});

// Create logger with SINGLE transport based on environment
const logger = winston.createLogger({
	level: process.env.LOG_LEVEL || 'info',
	format: combine(timestamp(), consoleFormat),
	transports: [],
});

// Add exactly ONE transport based on environment
if (process.env.NODE_ENV === 'production') {
	// In production: log to files
	logger.add(
		new winston.transports.File({
			filename: path.join(__dirname, '../../logs/error.log'),
			level: 'error',
			maxsize: 5242880,
			maxFiles: 5,
		})
	);

	logger.add(
		new winston.transports.File({
			filename: path.join(__dirname, '../../logs/combined.log'),
			maxsize: 5242880,
			maxFiles: 5,
		})
	);

	// Also log to console in production (single transport)
	logger.add(
		new winston.transports.Console({
			format: combine(timestamp(), consoleFormat),
		})
	);
} else {
	// Development: only console, no file logs (single transport)
	logger.add(
		new winston.transports.Console({
			format: combine(colorize(), timestamp(), consoleFormat),
		})
	);
}

module.exports = logger;
