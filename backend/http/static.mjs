import { createReadStream, existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { distDir } from "../config.mjs";
import { writeText } from "./response.mjs";

function getMimeType(filePath) {
  switch (extname(filePath)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

function serveStatic(pathname, response) {
  if (!existsSync(distDir)) {
    writeText(response, 404, "Frontend build mangler. Kjør 'npm run build' i frontend/.");
    return;
  }

  const requested = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = normalize(join(distDir, requested));
  const safeRoot = normalize(distDir);
  if (!filePath.startsWith(safeRoot)) {
    writeText(response, 400, "Ugyldig sti.");
    return;
  }

  const finalPath = existsSync(filePath) ? filePath : join(distDir, "index.html");
  response.writeHead(200, { "Content-Type": getMimeType(finalPath) });
  createReadStream(finalPath).pipe(response);
}

export { serveStatic };
