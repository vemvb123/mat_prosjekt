import { app } from "@azure/functions";
import { buildCacheKey, withJsonCache } from "../../cache/redis.mjs";
import { queryDatabricksNutrientRanking } from "../../search/databricks-nutrients.mjs";
import { getSearchParams } from "../../search/params.mjs";

app.http("search", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "search",

  handler: async (request, context) => {
    try {
      if (request.method === "OPTIONS") {
        return {
          status: 204,
          headers: corsHeaders(),
        };
      }

      const params = getSearchParams(new URL(request.url));
      if (!params.query) {
        return {
          status: 400,
          headers: corsHeaders(),
          jsonBody: { error: "Missing query" },
        };
      }

      if (params.mode !== "nutrient") {
        return {
          status: 400,
          headers: corsHeaders(),
          jsonBody: { error: "Azure search endpoint supports Næringssøk only." },
        };
      }

      const cacheKey = buildCacheKey("search", params);
      const payload = await withJsonCache(cacheKey, () => queryDatabricksNutrientRanking(params), context);
      return {
        status: 200,
        headers: corsHeaders(),
        jsonBody: payload,
      };
    } catch (error) {
      context.error("Databricks nutrient search failed:", error);

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

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
