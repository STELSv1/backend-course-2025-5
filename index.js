#!/usr/bin/env node
const http = require("http");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const { Command } = require("commander");
const superagent = require("superagent");

const program = new Command();
program
  .requiredOption("-H, --host <host>", "Host of the server") // <-- Використовуємо -H
  .requiredOption("-p, --port <port>", "Port of the server")
  .requiredOption("-c, --cache <path>", "Path to cache directory");
program.parse(process.argv);
const options = program.opts();

if (!fs.existsSync(options.cache)) {
  fs.mkdirSync(options.cache, { recursive: true });
}

const server = http.createServer(async (req, res) => {
  const code = req.url.slice(1);
  const filePath = path.join(options.cache, `${code}.jpg`);

  try {
    if (req.method === "GET") {
      if (fs.existsSync(filePath)) {
        const img = await fsp.readFile(filePath);
        res.writeHead(200, { "Content-Type": "image/jpeg" });
        res.end(img);
      } else {
        try {
          const response = await superagent.get(`https://http.cat/${code}`);
          await fsp.writeFile(filePath, response.body);
          res.writeHead(200, { "Content-Type": "image/jpeg" });
          res.end(response.body);
        } catch {
          res.writeHead(404);
          res.end("Not Found");
        }
      }
    } else if (req.method === "PUT") {
      const buffers = [];
      req.on("data", chunk => buffers.push(chunk));
      req.on("end", async () => {
        await fsp.writeFile(filePath, Buffer.concat(buffers));
        res.writeHead(201);
        res.end("Created");
      });
    } else if (req.method === "DELETE") {
      if (fs.existsSync(filePath)) {
        await fsp.unlink(filePath);
        res.writeHead(200);
        res.end("Deleted");
      } else {
        res.writeHead(404);
        res.end("Not Found");
      }
    } else {
      res.writeHead(405);
      res.end("Method Not Allowed");
    }
  } catch {
    res.writeHead(500);
    res.end("Server Error");
  }
});

server.listen(options.port, options.host, () => {
  console.log(`Server running at http://${options.host}:${options.port}/`);
});