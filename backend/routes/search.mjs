import { writeJson } from "../http/response.mjs";
import { withPagedJsonCache } from "../cache/redis.mjs";
import { queryDatabricksNutrientRankingWindow } from "../search/databricks-nutrients.mjs";
import { queryDatabricksProductSearchWindow } from "../search/databricks-products.mjs";
import { getSearchParams } from "../search/params.mjs";

async function handleSearchRequest(url, response) {
  const params = getSearchParams(url);
  if (!params.query) {
    writeJson(response, 400, { error: "Missing query" }, corsHeaders());
    return;
  }

  const payload = await withPagedJsonCache(
    params,
    (blockStart, limit, offset) => params.mode === "nutrient"
      ? queryDatabricksNutrientRankingWindow({ ...params, page: blockStart }, limit, offset)
      : queryDatabricksProductSearchWindow({ ...params, page: blockStart }, limit, offset),
  );

  writeJson(response, 200, payload, corsHeaders());
}

export { handleSearchRequest };

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
