require('dotenv').config();

const axios = require('axios');

async function testHealth(testName) {
	const headers = { headers: { 'X-API-Key': process.env.API_SECRET_KEY } };

	try {
		const response = await axios.get(`${process.env.BASE_URL}/health`);
		console.log(`  Test: ${testName}`);
		console.log(`  Status: ${response.data.status}`);
		console.log(`  Uptime: ${Math.floor(response.data.uptime)} seconds`);
		return response;
	} catch (error) {
		console.log(`URL`, `${process.env.BASE_URL}/health`);
		console.log(`ERROR - Health Status: ${error.message}`);
		return null;
	}
}

testHealth('GET /health - Basic health check').catch((error) => {
	console.error('Fatal error running tests:', error);
});
