require('dotenv').config();
const axios = require('axios');

// Configuration
const BASE_URL = process.env.BASE_URL;
const API_KEY = process.env.API_SECRET_KEY;
const TEST_MOBILE_1 = process.env.TEST_MOBILE_1;
const TEST_MOBILE_1_254 = process.env.TEST_MOBILE_1_254;
const TEST_MOBILE_2 = process.env.TEST_MOBILE_2;

// Test results tracking
const results = {
	passed: 0,
	failed: 0,
	total: 0,
};

// Helper function to print section headers
function printHeader(title) {
	console.log('\n' + '='.repeat(60));
	console.log(title);
	console.log('='.repeat(60));
}

// Helper function to print test result
function printResult(testName, passed, response = null, error = null) {
	results.total++;
	if (passed) {
		results.passed++;
		console.log(`✓ PASS: ${testName}`);
	} else {
		results.failed++;
		console.log(`✗ FAIL: ${testName}`);
		if (error) {
			console.log(`  Error: ${error.message || error}`);
			if (error.response) {
				console.log(`  Status: ${error.response.status}`);
				console.log(
					`  Response: ${JSON.stringify(error.response.data, null, 2)}`
				);
			}
		}
	}
}

// Test function wrapper
async function runTest(testName, testFn) {
	try {
		const response = await testFn();
		printResult(testName, true, response);
		return response;
	} catch (error) {
		printResult(testName, false, null, error);
		return null;
	}
}

// Main test function
async function testAllEndpoints() {
	console.log('ODOO MPESA PAYMENTS AND SMS INTEGRATION - ENDPOINT TESTING');
	console.log('Base URL: ' + BASE_URL);
	console.log('Started at: ' + new Date().toISOString());

	// ==================== HEALTH ENDPOINTS ====================
	printHeader('TESTING HEALTH ENDPOINTS');

	// Test root endpoint
	await runTest('GET / - Root endpoint', async () => {
		const response = await axios.get(`${BASE_URL}/`);
		console.log(`  Service: ${response.data.service}`);
		console.log(`  Status: ${response.data.status}`);
		console.log(
			`  Available endpoints: ${Object.keys(response.data.endpoints).length} categories`
		);
		return response;
	});

	// Test basic health
	await runTest('GET /health - Basic health check', async () => {
		const response = await axios.get(`${BASE_URL}/health`);
		console.log(`  Status: ${response.data.status}`);
		console.log(`  Uptime: ${Math.floor(response.data.uptime)} seconds`);
		return response;
	});

	// Test detailed health
	await runTest('GET /health/detailed - Detailed health', async () => {
		const response = await axios.get(`${BASE_URL}/health/detailed`, {
			headers: { 'X-API-Key': API_KEY },
		});
		console.log(`  Status: ${response.data.status}`);
		console.log(`  Memory: ${JSON.stringify(response.data.memory)}`);
		return response;
	});

	// ==================== HASH ENDPOINTS ====================
	printHeader('TESTING HASH ENDPOINTS');

	// Test hash generation with various phone formats
	const testPhones = [
		{ desc: 'Traditional Safaricom', number: '0701 234 567' },
		{ desc: 'New prefix (01)', number: '0110 345 678' },
		{ desc: 'With country code', number: '+254 701 234 567' },
		{ desc: 'Without prefix', number: '701234567' },
		{ desc: 'Already normalized', number: '254701234567' },
	];

	for (const phone of testPhones) {
		await runTest(`POST /api/hash/generate - ${phone.desc}`, async () => {
			const response = await axios.post(
				`${BASE_URL}/api/hash/generate`,
				{
					customer_id: 12345,
					mobile_number: phone.number,
				},
				{
					headers: { 'X-API-Key': API_KEY },
				}
			);

			console.log(`  Input: "${phone.number}"`);
			console.log(`  Normalized: ${response.data.normalized_number}`);
			console.log(
				`  Hash (+254): ${response.data.mobile_hash_plus254.substring(0, 20)}...`
			);
			console.log(
				`  Hash (07): ${response.data.mobile_hash_07.substring(0, 20)}...`
			);
			console.log(
				`  Hash (254): ${response.data.mobile_hash_254.substring(0, 20)}...`
			);

			return response;
		});
	}

	// Test batch hash generation
	await runTest(
		'POST /api/hash/batch-generate - Batch hash generation',
		async () => {
			const response = await axios.post(
				`${BASE_URL}/api/hash/batch-generate`,
				{
					customers: [
						{ customer_id: 1, mobile_number: TEST_MOBILE_1 },
						{ customer_id: 2, mobile_number: TEST_MOBILE_2 },
					],
				},
				{
					headers: { 'X-API-Key': API_KEY },
				}
			);

			console.log(`  Processed: ${response.data.processed} customers`);
			console.log(`  Successful: ${response.data.results.length}`);

			return response;
		}
	);

	// Test hash verification
	await runTest('POST /api/hash/verify - Hash verification', async () => {
		// First generate a hash
		const genResponse = await axios.post(
			`${BASE_URL}/api/hash/generate`,
			{
				customer_id: 12345,
				mobile_number: TEST_MOBILE_1,
			},
			{
				headers: { 'X-API-Key': API_KEY },
			}
		);

		// Then verify it with a different format
		const verifyResponse = await axios.post(
			`${BASE_URL}/api/hash/verify`,
			{
				mobile_number: TEST_MOBILE_1_254,
				hash: genResponse.data.mobile_hash_254,
			},
			{
				headers: { 'X-API-Key': API_KEY },
			}
		);

		console.log(
			`  Verification result: ${verifyResponse.data.any_match ? 'MATCH' : 'NO MATCH'}`
		);
		console.log(
			`  Matched format: ${verifyResponse.data.matched_format || 'none'}`
		);

		return verifyResponse;
	});

	// Test format testing endpoint
	await runTest('GET /api/hash/test-formats - Test formats', async () => {
		const response = await axios.get(`${BASE_URL}/api/hash/test-formats`);
		console.log(`  Total formats tested: ${response.data.total_tested}`);
		return response;
	});

	// Test number normalization
	await runTest(
		'POST /api/hash/normalize - Number normalization',
		async () => {
			const response = await axios.post(
				`${BASE_URL}/api/hash/normalize`,
				{
					mobile_number: '0701 234 567',
				},
				{
					headers: { 'X-API-Key': API_KEY },
				}
			);

			console.log(`  Original: ${response.data.original}`);
			console.log(`  Normalized: ${response.data.normalized}`);
			console.log(
				`  Formats: +${response.data.plus254}, ${response.data.local}`
			);

			return response;
		}
	);

	// ==================== SMS ENDPOINTS ====================
	printHeader('TESTING SMS ENDPOINTS');

	// Test SMS health
	await runTest('GET /api/sms/health - SMS service health', async () => {
		const response = await axios.get(`${BASE_URL}/api/sms/health`);
		console.log(`  Service: ${response.data.service}`);
		console.log(`  Configured: ${response.data.configured}`);
		console.log(`  Shortcode: ${response.data.shortcode}`);
		return response;
	});

	// Test send SMS (mocking the actual SMS sending)
	await runTest('POST /api/sms/send - Send SMS', async () => {
		const response = await axios.post(
			`${BASE_URL}/api/sms/send`,
			{
				message: 'Test message from Odoo Mpesa Integration',
				mobile: TEST_MOBILE_1,
			},
			{
				headers: { 'X-API-Key': API_KEY },
			}
		);

		console.log(`  Success: ${response.data.success}`);
		if (response.data.details) {
			console.log(`  Details: ${JSON.stringify(response.data.details)}`);
		}

		return response;
	});

	// Test bulk SMS
	await runTest('POST /api/sms/bulk - Bulk SMS', async () => {
		const response = await axios.post(
			`${BASE_URL}/api/sms/bulk`,
			{
				messages: [
					{ message: 'First bulk message', mobile: TEST_MOBILE_1 },
					{ message: 'Second bulk message', mobile: TEST_MOBILE_2 },
				],
			},
			{
				headers: { 'X-API-Key': API_KEY },
			}
		);

		console.log(`  Processed: ${response.data.processed}`);
		console.log(`  Successful: ${response.data.successful?.length || 0}`);
		if (response.data.errors && response.data.errors.length > 0) {
			console.log(`  Errors: ${response.data.errors.length}`);
		}

		return response;
	});

	// Test SMS test endpoint
	await runTest('POST /api/sms/test - Test SMS', async () => {
		const response = await axios.post(
			`${BASE_URL}/api/sms/test`,
			{
				mobile: TEST_MOBILE_1,
			},
			{
				headers: { 'X-API-Key': API_KEY },
			}
		);

		return response;
	});

	// ==================== ERROR TESTING ====================
	printHeader('TESTING ERROR HANDLING');

	// Test missing required fields
	await runTest(
		'POST /api/hash/generate - Missing mobile number',
		async () => {
			try {
				await axios.post(
					`${BASE_URL}/api/hash/generate`,
					{
						customer_id: 12345,
						// Missing mobile_number
					},
					{
						headers: { 'X-API-Key': API_KEY },
					}
				);
				return false; // Should not succeed
			} catch (error) {
				if (error.response && error.response.status === 400) {
					console.log(
						`  Expected error: ${error.response.data.error}`
					);
					return true;
				}
				throw error;
			}
		}
	);

	await runTest('POST /api/sms/send - Missing message', async () => {
		try {
			await axios.post(
				`${BASE_URL}/api/sms/send`,
				{
					mobile: TEST_MOBILE_1,
					// Missing message
				},
				{
					headers: { 'X-API-Key': API_KEY },
				}
			);
			return false; // Should not succeed
		} catch (error) {
			if (error.response && error.response.status === 400) {
				console.log(`  Expected error: ${error.response.data.error}`);
				return true;
			}
			throw error;
		}
	});

	// Test invalid authentication
	await runTest('GET /health/detailed - Invalid API key', async () => {
		try {
			await axios.get(`${BASE_URL}/health/detailed`, {
				headers: { 'X-API-Key': 'invalid-key-12345' },
			});
			return false; // Should not succeed
		} catch (error) {
			if (error.response && error.response.status === 403) {
				console.log(`  Expected error: ${error.response.data.error}`);
				return true;
			}
			throw error;
		}
	});

	// Test non-existent endpoint
	await runTest('GET /non-existent - 404 handling', async () => {
		try {
			await axios.get(`${BASE_URL}/non-existent-endpoint`);
			return false; // Should not succeed
		} catch (error) {
			if (error.response && error.response.status === 404) {
				console.log(`  Expected 404: ${error.response.data.error}`);
				return true;
			}
			throw error;
		}
	});

	// ==================== SUMMARY ====================
	printHeader('TEST SUMMARY');
	console.log(`Total tests: ${results.total}`);
	console.log(`Passed: ${results.passed}`);
	console.log(`Failed: ${results.failed}`);
	console.log(
		`Success rate: ${((results.passed / results.total) * 100).toFixed(1)}%`
	);
	console.log('\nCompleted at: ' + new Date().toISOString());
}

// Run the tests
console.log('Starting endpoint tests...');
testAllEndpoints().catch((error) => {
	console.error('Fatal error running tests:', error);
});
