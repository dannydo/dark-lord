const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { getClientHistory } = require('./wings-api-handler');

const PORT = 3000;
const SCRIPT_PATH = '/Users/dannydo/web/WingsLashes_releases/WingsLashes/ai/cron_report.py';

const server = http.createServer((req, res) => {
    // Basic static file server
    if (req.url === '/' || req.url === '/index.html') {
        serveFile(res, 'index.html', 'text/html');
    } else if (req.url === '/style.css') {
        serveFile(res, 'style.css', 'text/css');
    } else if (req.url === '/app.js') {
        serveFile(res, 'app.js', 'text/javascript');
    } else if (req.url.endsWith('.png')) {
        serveFile(res, req.url.slice(1), 'image/png');
    } 
    // API Endpoint for Analysis
    else if (req.url === '/api/analyze' && req.method === 'POST') {
        handleAnalyze(res);
    } 
    // API Endpoint for Wings AI Client History
    else if (req.url === '/api/wings/client-history' && req.method === 'POST') {
        handleClientHistory(req, res);
    }
    else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

function serveFile(res, filename, contentType) {
    const filePath = path.join(__dirname, filename);
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(500);
            res.end('Error loading ' + filename);
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
}

function handleAnalyze(res) {
    res.writeHead(200, {
        'Content-Type': 'text/plain',
        'Transfer-Encoding': 'chunked'
    });

    const pythonProcess = spawn('python3', [SCRIPT_PATH]);

    pythonProcess.stdout.on('data', (data) => {
        res.write(data.toString());
    });

    pythonProcess.stderr.on('data', (data) => {
        res.write(`[ERROR] ${data.toString()}`);
    });

    pythonProcess.on('close', (code) => {
        res.write(`\n--- ANALYSIS COMPLETE (EXIT CODE ${code}) ---`);
        res.end();
    });
}

function handleClientHistory(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
        try {
            const data = JSON.parse(body);
            const phone = data.phone;
            
            if (!phone) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Phone number required' }));
            }

            console.log(`[Wings API] Looking up history for: ${phone}`);
            const history = await getClientHistory(phone);

            if (!history) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'No history found' }));
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', data: history }));
        } catch (err) {
            console.error(err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Server error' }));
        }
    });
}

server.listen(PORT, () => {
    console.log(`Obsidian Matrix Server running at http://localhost:${PORT}`);
    console.log(`Bridge active for script: ${SCRIPT_PATH}`);
});
