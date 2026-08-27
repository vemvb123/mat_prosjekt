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

      const operation = await session.executeStatement(
        "SELECT 1 AS test_value",
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