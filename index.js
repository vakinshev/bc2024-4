const { program } = require('commander');
const http = require('http');
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
function requestHandler(req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`Сервер працює на ${options.host}:${options.port} з кешем у ${options.cache}`);
    console.log(`Запит оброблено на ${options.host}:${options.port}`);
}
function startServer() {
    const server = http.createServer(requestHandler);
    server.listen(options.port, options.host, () => {
        console.log(`Сервер запущено на http://${options.host}:${options.port}`);
    });
}
startServer();