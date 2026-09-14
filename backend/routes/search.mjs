import { writeJson } from "../http/response.mjs";
import { withPagedJsonCache } from "../cache/redis.mjs";
import { queryDatabricksNutrientRankingWindow } from "../search/databricks-nutrients.mjs";
import { queryDatabricksProductSearchWindow } from "../search/databricks-products.mjs";
import { getSearchParams } from "../search/params.mjs";

// Lokal Node-rute for /api/search.
//
// Azure Function-entrypointet bruker de samme søkemodulene, men denne filen
// håndterer HTTP-responsen når backend kjøres som egen Node-server.
async function handleSearchRequest(url, response) {
  const params = getSearchParams(url);
  if (!params.query) {
    writeJson(response, 400, { error: "Missing query" }, corsHeaders());
    return;
  }

  const payload = await withPagedJsonCache(
    params,
    // Cache-laget spør etter et vindu på ti sider, så vi sender inn riktig
    // søkefunksjon basert på om brukeren er i produkt- eller næringsmodus.
    (blockStart, limit, offset) => params.mode === "nutrient"
      ? queryDatabricksNutrientRankingWindow({ ...params, page: blockStart }, limit, offset)
      : queryDatabricksProductSearchWindow({ ...params, page: blockStart }, limit, offset),
  );

  writeJson(response, 200, payload, corsHeaders());
}

export { handleSearchRequest };

// CORS-headere for lokal utvikling og enkel deploy.
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
