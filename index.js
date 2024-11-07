const { program } = require("commander");
const http = require("http");
const fsp = require("node:fs/promises");
const path = require("node:path");
const superagent = require("superagent");
function preparing() {
    program
        .option("-h, --host <value>", "Host location")
        .option("-p, --port <value>", "Port location")
        .option("-c, --cache <value>", "Cache location");
    program.parse();

    const options = program.opts();

    if (!options.host || !options.port || !options.cache) {
        throw new Error("Please, specify necessary parameters.");
    }

    return options;
}

const options = preparing();

function getCachedPicture(way) {
    return fsp.readFile(way);
}

function cachePicture(way, data) {
    return fsp.writeFile(way, data);
}

function deleteCachedPicture(way) {
    return fsp.unlink(way);
}

function downloadPicture(code) {
    const url = `https://http.cat/${code}`;
    return superagent.get(url).buffer(true);
}

function debug(req, code) {
    console.log(`Request method: ${req.method}\tResponse code: ${code}`);
}

//--------------------------------------------//
function requestListener(req, res) {
    if (req.url === "/") {
        res.writeHead(404);
        res.end();
        debug(req, 404);
        return;
    }

    const code = req.url.slice(1);
    const way = path.join(__dirname, options.cache, `${code}.jpg`);

    switch (req.method) {
        case "GET":
            getCachedPicture(way)
                .then((result) => {
                    res.writeHead(200, { "Content-Type": "image/jpeg" });
                    res.end(result);
                    debug(req, 200);
                })
                .catch(() => {
                    downloadPicture(code)
                        .then((result) => {
                            cachePicture(way, result.body);
                            res.writeHead(200, { "Content-Type": "image/jpeg" });
                            res.end(result.body);
                            debug(req, 200);
                        })
                        .catch(() => {
                            res.writeHead(404);
                            res.end();
                            debug(req, 404);
                        });
                });
            break;

        case "PUT":
            let data = [];
            req.on("data", (chunk) => {
                data.push(chunk);
            });
            req.on("end", () => {
                cachePicture(way, Buffer.concat(data))
                    .then(() => {
                        res.writeHead(201);
                        res.end();
                        debug(req, 201);
                    })
                    .catch(() => {
                        res.writeHead(500);
                        res.end("Internal Server Error");
                    });
            });
            break;

        case "DELETE":
            deleteCachedPicture(way)
                .then(() => {
                    res.writeHead(200);
                    res.end();
                    debug(req, 200);
                })
                .catch(() => {
                    res.writeHead(404);
                    res.end();
                    debug(req, 404);
                });
            break;

        default:
            res.writeHead(405);
            res.end();
            debug(req, 405);
            break;
    }
}
//--------------------------------------------------//
function main() {
    const server = http.createServer(requestListener);

    server.listen(options.port, options.host, () => {
        console.log(`Server running at http://${options.host}:${options.port}`);
    });
}

main();