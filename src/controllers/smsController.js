const axios = require('axios');
const logger = require('../utils/logger');

class SMSController {
	constructor() {
		// Initialize with your Bulk Textsms configuration
		this.BULK_TEXTSMS_API_KEY = process.env.BULK_TEXTSMS_API_KEY;
		this.BULK_TEXTSMS_PARTNER_ID = process.env.BULK_TEXTSMS_PARTNER_ID;
		this.BULK_TEXTSMS_URL =
			process.env.BULK_TEXTSMS_URL ||
			'https://sms.textsms.co.ke/api/services/sendsms/';
		this.DEFAULT_SHORTCODE = process.env.DEFAULT_SHORTCODE || 'DEFAULT';

		console.log(
			'SMS Controller initialized with API Key:',
			this.BULK_TEXTSMS_API_KEY
				? '****' + this.BULK_TEXTSMS_API_KEY.slice(-4)
				: 'Not set'
		);
		console.log(
			'SMS Controller initialized with Partner ID:',
			this.BULK_TEXTSMS_PARTNER_ID || 'Not set'
		);
	}

	/**
	 * Send SMS using Bulk Textsms
	 * Sends a single SMS to a customer using the configured Bulk Textsms account.
	 * @param {Object} req - Request object containing the message and mobile number.
	 * @param {Object} res - Response object to send the response.
	 * @returns {Promise} - Promise resolving to a JSON response.
	 */
	sendSMS = async (req, res) => {
		const startTime = Date.now();

		// Log the request (same as your original)
		console.log(
			' ----------------------------- Start - Send SMS -----------------------------'
		);

		try {
			const { message, mobile } = req.body;

			console.log('Mobile:', mobile);
			console.log('Message:', message);

			// Validate request body
			if (!message || !mobile) {
				console.log('Validation failed: Missing message or mobile');
				return res.status(400).json({
					error: 'Message and mobile number are required.',
				});
			}

			// Check if SMS provider is configured
			if (!this.BULK_TEXTSMS_API_KEY || !this.BULK_TEXTSMS_PARTNER_ID) {
				console.log('SMS provider not configured');
				logger.error('SMS provider not configured', {
					hasApiKey: !!this.BULK_TEXTSMS_API_KEY,
					hasPartnerId: !!this.BULK_TEXTSMS_PARTNER_ID,
				});
				return res.status(500).json({
					error: 'SMS service not configured',
					success: false,
				});
			}

			// Clean mobile number (remove spaces)
			const cleanMobile = mobile.replace(/\s+/g, '');
			console.log('Clean Mobile:', cleanMobile);

			// Prepare the request payload (exactly as your original)
			const payload = {
				apikey: this.BULK_TEXTSMS_API_KEY,
				partnerID: this.BULK_TEXTSMS_PARTNER_ID,
				message: message,
				shortcode: this.DEFAULT_SHORTCODE,
				mobile: cleanMobile,
			};

			console.log('Sending to Bulk Textsms API...');

			// Send SMS using POST method
			const response = await axios.post(this.BULK_TEXTSMS_URL, payload, {
				headers: {
					'Content-Type': 'application/json',
				},
				timeout: 10000, // 10 second timeout
			});

			const responseTime = Date.now() - startTime;
			console.log(`API Response Time: ${responseTime}ms`);

			// Handle success (matching your original logic)
			if (response.data && response.data.responses) {
				const smsResponse = response.data.responses[0];
				console.log('Sent Successfully:', smsResponse);

				// Log to Winston as well
				logger.info('SMS sent successfully', {
					mobile: cleanMobile.replace(
						/(\d{3})\d{4}(\d{2})/,
						'$1****$2'
					),
					message_length: message.length,
					response_time: `${responseTime}ms`,
					api_response: smsResponse,
				});

				console.log(
					' ----------------------------- End - Send SMS -----------------------------'
				);

				return res.status(200).json({
					success: true,
					message: 'SMS sent successfully.',
					details: smsResponse,
				});
			} else {
				// Handle unexpected API response
				console.log(
					'Failed to send - Invalid API response:',
					response.data
				);

				logger.error('Invalid API response from Bulk Textsms', {
					response: response.data,
				});

				console.log(
					' ----------------------------- End - Send SMS -----------------------------'
				);

				return res.status(500).json({
					error: 'Failed to send SMS. Invalid API response.',
					details: response.data,
					success: false,
				});
			}
		} catch (error) {
			const responseTime = Date.now() - startTime;

			// Handle errors from the API or network issues (matching your original)
			console.log('Failed to send:', error.message);

			if (error.response) {
				console.log('API Error Response:', error.response.data);
			}

			logger.error('SMS sending failed', {
				error: error.message,
				response_time: `${responseTime}ms`,
				details: error.response ? error.response.data : error.code,
			});

			console.log(
				' ----------------------------- End - Send SMS -----------------------------'
			);

			return res.status(500).json({
				error: 'Failed to send SMS.',
				details: error.response ? error.response.data : error.message,
				success: false,
			});
		}
	};

	/**
	 * Send bulk SMS (multiple recipients)
	 */
	sendBulkSMS = async (req, res) => {
		try {
			const { messages } = req.body;

			if (!Array.isArray(messages) || messages.length === 0) {
				return res.status(400).json({
					success: false,
					error: 'Messages array is required',
				});
			}

			// Check if SMS provider is configured
			if (!this.BULK_TEXTSMS_API_KEY || !this.BULK_TEXTSMS_PARTNER_ID) {
				logger.error('SMS provider not configured for bulk send');
				return res.status(500).json({
					success: false,
					error: 'SMS service not configured',
				});
			}

			console.log(
				`Processing bulk SMS for ${messages.length} recipients`
			);

			const results = [];
			const errors = [];

			for (const sms of messages) {
				try {
					const { message, mobile } = sms;

					if (!message || !mobile) {
						errors.push({
							mobile: mobile || 'unknown',
							error: 'Missing message or mobile',
						});
						continue;
					}

					// Prepare payload
					const payload = {
						apikey: this.BULK_TEXTSMS_API_KEY,
						partnerID: this.BULK_TEXTSMS_PARTNER_ID,
						message: message,
						shortcode: this.DEFAULT_SHORTCODE,
						mobile: mobile.replace(/\s+/g, ''),
					};

					// Send SMS
					const response = await axios.post(
						this.BULK_TEXTSMS_URL,
						payload,
						{
							timeout: 5000,
						}
					);

					if (response.data && response.data.responses) {
						results.push({
							mobile: mobile.replace(
								/(\d{3})\d{4}(\d{2})/,
								'$1****$2'
							),
							success: true,
							response: response.data.responses[0],
						});
					} else {
						errors.push({
							mobile: mobile.replace(
								/(\d{3})\d{4}(\d{2})/,
								'$1****$2'
							),
							error: 'Invalid API response',
						});
					}
				} catch (err) {
					errors.push({
						mobile:
							sms.mobile?.replace(
								/(\d{3})\d{4}(\d{2})/,
								'$1****$2'
							) || 'unknown',
						error: err.message,
					});
				}

				// Small delay to avoid rate limiting
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			logger.info('Bulk SMS processed', {
				total: messages.length,
				successful: results.length,
				failed: errors.length,
			});

			console.log(
				`Bulk SMS complete: ${results.length} sent, ${errors.length} failed`
			);

			res.status(200).json({
				success: true,
				processed: results.length,
				successful: results,
				errors: errors.length > 0 ? errors : undefined,
			});
		} catch (error) {
			logger.error('Error in bulk SMS:', error);
			console.error('Bulk SMS error:', error.message);

			res.status(500).json({
				success: false,
				error: 'Internal server error',
			});
		}
	};

	/**
	 * SMS service health check - FIXED: Using arrow function to preserve 'this'
	 */
	healthCheck = async (req, res) => {
		try {
			const status = {
				service: 'SMS Bridge (Bulk Textsms)',
				configured: !!(
					this.BULK_TEXTSMS_API_KEY && this.BULK_TEXTSMS_PARTNER_ID
				),
				api_url: this.BULK_TEXTSMS_URL,
				shortcode: this.DEFAULT_SHORTCODE,
				timestamp: new Date().toISOString(),
			};

			console.log('SMS Health Check - Configuration:', {
				hasApiKey: !!this.BULK_TEXTSMS_API_KEY,
				hasPartnerId: !!this.BULK_TEXTSMS_PARTNER_ID,
				apiUrl: this.BULK_TEXTSMS_URL,
			});

			// Test API connectivity in development
			if (process.env.NODE_ENV === 'development' && status.configured) {
				try {
					// Just check if the URL is reachable
					await axios.head(this.BULK_TEXTSMS_URL, { timeout: 3000 });
					status.api_reachable = true;
				} catch (error) {
					status.api_reachable = false;
					status.api_error = error.code;
				}
			}

			res.status(200).json(status);
		} catch (error) {
			logger.error('Error in SMS health check:', error);
			res.status(500).json({
				error: 'Health check failed',
				success: false,
			});
		}
	};

	/**
	 * Test endpoint to verify SMS configuration - FIXED: Using arrow function
	 */
	testSMS = async (req, res) => {
		try {
			const { mobile } = req.body;

			if (!mobile) {
				return res
					.status(400)
					.json({ error: 'Mobile number required' });
			}

			// Check if SMS provider is configured
			if (!this.BULK_TEXTSMS_API_KEY || !this.BULK_TEXTSMS_PARTNER_ID) {
				return res.status(500).json({
					error: 'SMS service not configured',
					success: false,
				});
			}

			const testMessage =
				'This is a test message from your Odoo-Mpesa Bridge. If you receive this, SMS is working correctly.';

			// Create a mock request object
			const mockReq = {
				body: {
					message: testMessage,
					mobile: mobile,
				},
			};

			const mockRes = {
				status: (code) => ({
					json: (data) => {
						res.status(code).json({
							test: true,
							...data,
						});
					},
				}),
			};

			// Call sendSMS
			await this.sendSMS(mockReq, mockRes);
		} catch (error) {
			logger.error('SMS test failed:', error);
			res.status(500).json({
				error: 'SMS test failed',
				details: error.message,
			});
		}
	};
}

module.exports = new SMSController();
