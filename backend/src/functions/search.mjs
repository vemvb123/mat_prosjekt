import { app } from "@azure/functions";
import { withPagedJsonCache } from "../../cache/redis.mjs";
import { queryDatabricksNutrientRankingWindow } from "../../search/databricks-nutrients.mjs";
import { queryDatabricksProductSearchWindow } from "../../search/databricks-products.mjs";
import { getSearchParams } from "../../search/params.mjs";

// Azure Functions-entrypoint for /api/search i produksjon.
//
// Den deler søkemoduler, parameterparser og Redis-cache med lokal Node-server,
// slik at lokal og deployet oppførsel er mest mulig lik.
app.http("search", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "search",

  handler: async (request, context) => {
    try {
      // Nettleseren sender OPTIONS før enkelte kryss-origin-kall.
      if (request.method === "OPTIONS") {
        return {
          status: 204,
          headers: corsHeaders(),
        };
      }

      const params = getSearchParams(new URL(request.url));
      // Frontend skal alltid sende q, men backend validerer likevel.
      if (!params.query) {
        return {
          status: 400,
          headers: corsHeaders(),
          jsonBody: { error: "Missing query" },
        };
      }

      const payload = await withPagedJsonCache(
        params,
        // Redis henter/cache-er ti sider av gangen. Søkemodulen velges ut fra mode.
        (blockStart, limit, offset) => params.mode === "nutrient"
          ? queryDatabricksNutrientRankingWindow({ ...params, page: blockStart }, limit, offset)
          : queryDatabricksProductSearchWindow({ ...params, page: blockStart }, limit, offset),
        context,
      );
      return {
        status: 200,
        headers: corsHeaders(),
        jsonBody: payload,
      };
    } catch (error) {
      context.error("Databricks search failed:", error);

      return {
        status: 500,
        headers: corsHeaders(),
        jsonBody: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  },
});

// CORS-headere for frontend. ALLOWED_ORIGIN kan låse dette til eget domene.
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
