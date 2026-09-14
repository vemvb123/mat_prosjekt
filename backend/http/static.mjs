import { createReadStream, existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { distDir } from "../config.mjs";
import { writeText } from "./response.mjs";

// Statisk filserver for den bygde Vite-frontenden.
//
// Den server vanlige assets fra frontend/dist og faller tilbake til index.html
// når brukeren går direkte til en klientrute.

// Velger Content-Type ut fra filendelse.
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

// Server en fil fra dist-mappen, med beskyttelse mot path traversal.
function serveStatic(pathname, response) {
  if (!existsSync(distDir)) {
    writeText(response, 404, "Frontend build mangler. Kjør 'npm run build' i frontend/.");
    return;
  }

  const requested = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = normalize(join(distDir, requested));
  const safeRoot = normalize(distDir);
  // Avvis stier som prøver å gå ut av frontend/dist.
  if (!filePath.startsWith(safeRoot)) {
    writeText(response, 400, "Ugyldig sti.");
    return;
  }

  const finalPath = existsSync(filePath) ? filePath : join(distDir, "index.html");
  response.writeHead(200, { "Content-Type": getMimeType(finalPath) });
  createReadStream(finalPath).pipe(response);
}

export { serveStatic };
