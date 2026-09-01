import { writeJson } from "../http/response.mjs";
import { queryDatabricksNutrientRanking } from "../search/databricks-nutrients.mjs";
import { getSearchParams } from "../search/params.mjs";

async function handleSearchRequest(url, response) {
  const params = getSearchParams(url);
  if (!params.query) {
    writeJson(response, 400, { error: "Missing query" });
    return;
  }

  const payload = params.mode === "nutrient"
    ? await queryDatabricksNutrientRanking(params)
    : await queryProductSearch(params);

  writeJson(response, 200, payload);
}

async function queryProductSearch(params) {
  const module = await import("../search/products.mjs");
  return module.queryProductSearch(params);
}

export { handleSearchRequest };
