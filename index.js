const { program } = require('commander');
const http = require('http');
const fs = require('fs').promises;
const path = require('path');

function preparing() {
    program
        .requiredOption('-h, --host <host>', 'Адреса сервера')
        .requiredOption('-p, --port <port>', 'Порт сервера')
        .requiredOption('-c, --cache <path>', 'Шлях до кешу');
    program.parse();
    const options = program.opts();
    
    return options;
}

const options = preparing();

async function getCachedImage(code) {
    const filePath = path.join(options.cache, `${code}.jpg`);
    try {
        return await fs.readFile(filePath);
    } catch {
        throw new Error('Not Found');
    }
}

async function cacheImage(code, data) {
    const filePath = path.join(options.cache, `${code}.jpg`);
    await fs.writeFile(filePath, data);
}

async function deleteCachedImage(code) {
    const filePath = path.join(options.cache, `${code}.jpg`);
    try {
        await fs.unlink(filePath);
    } catch {
        throw new Error('Not Found');
    }
}

async function requestHandler(req, res) {
    const code = req.url.slice(1);
    
    if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        return res.end('Bad Request');
    }

    switch (req.method) {
        case 'GET':
            try {
                const imageData = await getCachedImage(code);
                res.writeHead(200, { 'Content-Type': 'image/jpeg' });
                res.end(imageData);
            } catch {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not Found');
            }
            break;

        case 'PUT':
            let body = [];
            req.on('data', chunk => {
                body.push(chunk);
            }).on('end', async () => {
                try {
                    const imageData = Buffer.concat(body);
                    await cacheImage(code, imageData);
                    res.writeHead(201, { 'Content-Type': 'text/plain' });
                    res.end('Created');
                } catch {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Internal Server Error');
                }
            });
            break;

        case 'DELETE':
            try {
                await deleteCachedImage(code);
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('Deleted');
            } catch {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not Found');
            }
            break;

        default:
            res.writeHead(405, { 'Content-Type': 'text/plain' });
            res.end('Method Not Allowed');
            break;
    }
}

function startServer() {
    const server = http.createServer(requestHandler);
    server.listen(options.port, options.host, () => {
        console.log(`Сервер запущено на http://${options.host}:${options.port}`);
    });
}

startServer();   