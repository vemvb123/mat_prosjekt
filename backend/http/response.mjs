// Små HTTP-hjelpere for lokal Node-server.
//
// Rutene bruker disse i stedet for å gjenta headers og JSON-serialisering.

// Skriver JSON med no-store, fordi søkeresultater caches eksplisitt i Redis.
function writeJson(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
  response.end(JSON.stringify(payload));
}

// Skriver ren tekst, brukt for enkle feil fra statisk filserver.
function writeText(response, statusCode, body) {
  response.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(body);
}

export { writeJson, writeText };
