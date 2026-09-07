import { writeJson } from "../http/response.mjs";
import { buildCacheKey, withJsonCache } from "../cache/redis.mjs";
import { queryDatabricksNutrientRanking } from "../search/databricks-nutrients.mjs";
import { getSearchParams } from "../search/params.mjs";

async function handleSearchRequest(url, response) {
  const params = getSearchParams(url);
  if (!params.query) {
    writeJson(response, 400, { error: "Missing query" }, corsHeaders());
    return;
  }

  const payload = params.mode === "nutrient"
    ? await withJsonCache(buildCacheKey("search", params), () => queryDatabricksNutrientRanking(params))
    : await queryProductSearch(params);

  writeJson(response, 200, payload, corsHeaders());
}

async function queryProductSearch(params) {
  const module = await import("../search/products.mjs");
  return module.queryProductSearch(params);
}

export { handleSearchRequest };

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
