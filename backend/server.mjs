import "./env.mjs";
import { createServer } from "node:http";
import { URL } from "node:url";
import { host, port } from "./config.mjs";
import { getGoldQueryBackend } from "./search/databricks-gold.mjs";
import { writeJson } from "./http/response.mjs";
import { serveStatic } from "./http/static.mjs";
import { handleSearchRequest } from "./routes/search.mjs";

// Lokal Node-server for hele appen.
//
// Serveren tilbyr:
// - /api/search for produkt- og næringssøk
// - /api/health for enkel helsesjekk
// - statiske filer fra frontend/dist når frontend er bygget

// Velger Databricks som standard, eller lokal SQL Server når flagg sendes inn.
configureGoldQueryBackend();

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${host}:${port}`);

  try {
    // Preflight gjør at frontend kan kalle API-et fra annen origin i utvikling.
    if (request.method === "OPTIONS" && url.pathname === "/api/search") {
      writeCorsPreflight(response);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/search") {
      await handleSearchRequest(url, response);
      return;
    }

    // Health-endpointet viser også hvilken gold-backend som er aktiv.
    if (request.method === "GET" && url.pathname === "/api/health") {
      writeJson(response, 200, { ok: true, goldQueryBackend: getGoldQueryBackend() });
      return;
    }

    // Alt annet sendes til frontend, inkludert klientruter.
    serveStatic(url.pathname, response);
  } catch (error) {
    writeJson(response, 500, { error: error instanceof Error ? error.message : "Unknown error" });
  }
});

server.listen(port, host, () => {
  console.log(`Node backend listening on http://${host}:${port}`);
  console.log(`Using gold query backend: ${getGoldQueryBackend()}`);
});

// Leser CLI-flagg og setter backendvalg i miljøet før søkemodulene brukes.
function configureGoldQueryBackend() {
  if (process.argv.includes("--local-sql") || process.argv.includes("--sqlserver")) {
    process.env.GOLD_QUERY_BACKEND = "sqlserver";
    return;
  }

  if (process.argv.includes("--databricks")) {
    process.env.GOLD_QUERY_BACKEND = "databricks";
  }
}

// Svarer på CORS preflight uten body.
function writeCorsPreflight(response) {
  response.writeHead(204, {
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  response.end();
}
