import { createServer } from "node:http";
import { URL } from "node:url";
import { dbPath, host, port } from "./config.mjs";
import { writeJson } from "./http/response.mjs";
import { serveStatic } from "./http/static.mjs";
import { handleSearchRequest } from "./routes/search.mjs";

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${host}:${port}`);

  try {
    if (request.method === "GET" && url.pathname === "/api/search") {
      await handleSearchRequest(url, response);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/health") {
      writeJson(response, 200, { ok: true, database: dbPath });
      return;
    }

    serveStatic(url.pathname, response);
  } catch (error) {
    writeJson(response, 500, { error: error instanceof Error ? error.message : "Unknown error" });
  }
});

server.listen(port, host, () => {
  console.log(`Node backend listening on http://${host}:${port}`);
  console.log(`Using SQLite database at ${dbPath}`);
});
