import { app } from "@azure/functions";
import pkg from "@databricks/sql";

const { DBSQLClient } = pkg;

app.http("search", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "search",

  handler: async (request, context) => {
    const client = new DBSQLClient();

    try {
      await client.connect({
        host: process.env.DATABRICKS_SERVER_HOSTNAME,
        path: process.env.DATABRICKS_HTTP_PATH,
        token: process.env.DATABRICKS_TOKEN
      });

      const session = await client.openSession();

      const operation = await session.executeStatement(`
        SELECT
    get_json_object(product_json, '$.title') AS product,

    CAST(get_json_object(product_json, '$.comparePricePerUnit') AS DOUBLE)
        AS price_per_kg,

    CAST(get_json_object(product_json, '$.nutritionalContent[6].amount') AS DOUBLE)
        AS protein_per_100g,

    ROUND(
        CAST(get_json_object(product_json, '$.nutritionalContent[6].amount') AS DOUBLE) * 10
        /
        CAST(get_json_object(product_json, '$.comparePricePerUnit') AS DOUBLE),
        2
    ) AS protein_per_nok

FROM products

WHERE get_json_object(product_json, '$.compareUnit') = 'kg'

ORDER BY protein_per_nok DESC

LIMIT 10;
        
        `,
        { runAsync: true }
      );

      const result = await operation.fetchAll();

      await operation.close();
      await session.close();
      await client.close();

      return {
        status: 200,
        jsonBody: {
          ok: true,
          databricks: result
        }
      };

    } catch (error) {
      context.error("Databricks connection failed:", error);

      try {
        await client.close();
      } catch {}

      return {
        status: 500,
        jsonBody: {
          ok: false,
          error: error instanceof Error ? error.message : "Unknown error"
        }
      };
    }
  }
});