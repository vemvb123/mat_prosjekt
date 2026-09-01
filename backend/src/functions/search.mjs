import { app } from "@azure/functions";
import { queryDatabricksNutrientRanking } from "../../search/databricks-nutrients.mjs";
import { getSearchParams } from "../../search/params.mjs";

app.http("search", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "search",

  handler: async (request, context) => {
    try {
      const params = getSearchParams(new URL(request.url));
      if (!params.query) {
        return {
          status: 400,
          jsonBody: { error: "Missing query" },
        };
      }

      if (params.mode !== "nutrient") {
        return {
          status: 400,
          jsonBody: { error: "Azure search endpoint supports Næringssøk only." },
        };
      }

      const payload = await queryDatabricksNutrientRanking(params);
      return {
        status: 200,
        jsonBody: payload,
      };
    } catch (error) {
      context.error("Databricks nutrient search failed:", error);

      return {
        status: 500,
        jsonBody: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  },
});
