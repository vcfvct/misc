const { createServer } = require('http');
const url = require('url');;
const { setTimeout } = require('timers/promises');

const port = 8000;
const apiDelaySecond = 3;

const server = createServer((request, response) => {
	const parsedUrl = url.parse(request.url, true);
	request.on('data', chunk => {
		data += chunk;
	});
	request.on('end', async () => {
		setCORSHeaders(response);
		if (request.method === 'OPTIONS') {
			response.writeHead(200);
			response.end();
			return; // for complex requests(POST etc)' CORS header
		}

		// for simple requests' CORS header
		setCORSHeaders(response);
		response.writeHead(200, { 'Content-Type': 'application/json' });
		await setTimeout(apiDelaySecond * 1000);
		const data = { message: `Responding '${parsedUrl.query?.q}' at ${new Date().toISOString()}` }
		response.end(JSON.stringify(data));
	});

});

function setCORSHeaders(res) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Request-Method', '*');
	res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, PUT, DELETE');
	res.setHeader('Access-Control-Allow-Headers', '*');
}

server.listen(port, () => console.info(`🚀  Server ready at http://localhost:${port} at '${new Date().toLocaleString()}'`));
