import { writeJson } from "../http/response.mjs";
import { getSearchParams } from "../search/params.mjs";
import { queryNutrientRanking } from "../search/nutrients.mjs";
import { queryProductSearch } from "../search/products.mjs";

function handleSearchRequest(url, response) {
  const params = getSearchParams(url);
  if (!params.query) {
    writeJson(response, 400, { error: "Missing query" });
    return;
  }

  const payload = params.mode === "nutrient"
    ? queryNutrientRanking(params)
    : queryProductSearch(params);

  writeJson(response, 200, payload);
}

export { handleSearchRequest };
