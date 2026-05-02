const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "dist");
const port = Number(process.env.PORT || 5174);

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png"
};

const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(root, safePath === "/" ? "index.html" : safePath);
    const finalPath = fs.existsSync(filePath) && fs.statSync(filePath).isFile()
      ? filePath
      : path.join(root, "index.html");
    res.setHeader("Content-Type", types[path.extname(finalPath)] || "application/octet-stream");
    fs.createReadStream(finalPath).pipe(res);
  });

server.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

server
  .listen(port, "127.0.0.1", () => {
    console.log(`static dist server http://127.0.0.1:${port}/`);
  });
