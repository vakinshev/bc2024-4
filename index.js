const http = require("http");
const { program } = require("commander");
const fs = require("fs").promises;
const path = require("path");
const superagent = require("superagent");

function preparing() {
  program
    .requiredOption("-h, --host <host>", "Server host")
    .requiredOption("-p, --port <port>", "Server port")
    .requiredOption("-c, --cache <path>", "Path to cache directory")
    .parse(process.argv);

  const options = program.opts();

  if (!options.host || !options.port || !options.cache) {
    throw Error("Please specify necessary parameters: host, port, and cache path");
  }

  return options;
}

const options = preparing();
const getCacheFilePath = (code) => path.join(options.cache, `${code}.jpg`);

async function getPicture(filePath) {
  return fs.readFile(filePath);
}

async function savePicture(filePath, data) {
  return fs.writeFile(filePath, data);
}

async function deletePicture(filePath) {
  return fs.unlink(filePath);
}

async function downloadPicture(code) {
  const response = await superagent.get(`https://http.cat/${code}`);
  return response.body;
}

function debug(req, code) {
  console.log(`Request method: ${req.method} \t Response code: ${code}`);
}

const requestListener = async (req, res) => {
  const urlParts = req.url.split("/");
  const code = urlParts[1];

  if (!code) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("HTTP code not specified");
    debug(req, 400);
    return;
  }

  const filePath = getCacheFilePath(code);

  try {
    switch (req.method) {
      case "GET":
        try {
          const data = await getPicture(filePath);
          res.writeHead(200, { "Content-Type": "image/jpeg" });
          res.end(data);
          debug(req, 200);
        } catch (error) {
          if (error.code === "ENOENT") {
            try {
              const imageData = await downloadPicture(code);
              await savePicture(filePath, imageData);
              res.writeHead(200, { "Content-Type": "image/jpeg" });
              res.end(imageData);
              debug(req, 200);
            } catch (fetchError) {
              res.writeHead(404, { "Content-Type": "text/plain" });
              res.end("Image not found on http.cat");
              debug(req, 404);
            }
          } else {
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end("Server error");
            debug(req, 500);
          }
        }
        break;

      case "PUT":
        let body = [];
        req.on("data", (chunk) => {
          body.push(chunk);
        }).on("end", async () => {
          body = Buffer.concat(body);
          await savePicture(filePath, body);
          res.writeHead(201, { "Content-Type": "text/plain" });
          res.end("Image saved");
          debug(req, 201);
        });
        break;

      case "DELETE":
        try {
          await deletePicture(filePath);
          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end("Image deleted");
          debug(req, 200);
        } catch (error) {
          if (error.code === "ENOENT") {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("Image not found");
            debug(req, 404);
          } else {
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end("Server error");
            debug(req, 500);
          }
        }
        break;

      default:
        res.writeHead(405, { "Content-Type": "text/plain" });
        res.end("Method not allowed");
        debug(req, 405);
    }
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Server error");
    debug(req, 500);
  }
};

const server = http.createServer(requestListener);
server.listen(options.port, options.host, () => {
  console.log(`Server running at http://${options.host}:${options.port}/`);
});