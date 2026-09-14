import pkg from "@databricks/sql";

const { DBSQLClient } = pkg;

const GOLD_TABLE = "hybrid_test.default.product_nutritiens_gold";

function requireDatabricksEnv() {
  const missing = ["DATABRICKS_SERVER_HOSTNAME", "DATABRICKS_HTTP_PATH", "DATABRICKS_TOKEN"].filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Mangler Databricks miljøvariabler: ${missing.join(", ")}`);
  }
}

function rowValue(row, key) {
  return row[key] ?? row[key.toUpperCase()] ?? row[key.toLowerCase()] ?? null;
}

async function executeGoldQuery(statement) {
  requireDatabricksEnv();

  const client = new DBSQLClient();
  try {
    await client.connect({
      host: process.env.DATABRICKS_SERVER_HOSTNAME,
      path: process.env.DATABRICKS_HTTP_PATH,
      token: process.env.DATABRICKS_TOKEN,
    });

    const session = await client.openSession();
    try {
      const operation = await session.executeStatement(statement, { runAsync: true });
      try {
        return await operation.fetchAll();
      } finally {
        await operation.close();
      }
    } finally {
      await session.close();
    }
  } finally {
    await client.close();
  }
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlStringList(values) {
  return values.map(sqlString).join(",");
}

function productFromGoldRow(row) {
  const productUrl = rowValue(row, "website_url") || "";
  const name = rowValue(row, "name") || "Ukjent produkt";

  return {
    ProductKey: productUrl || name,
    Name: name,
    Brand: rowValue(row, "brand") || "",
    ProductUrl: productUrl,
    ImageUrl: rowValue(row, "image_url") || "",
    Price: Number(rowValue(row, "price") || 0),
    PricePerCompareUnit: Number(rowValue(row, "price_per_compare_unit") || 0),
    CompareUnit: rowValue(row, "compare_unit") || "",
    Description: rowValue(row, "description") || "",
    Subtitle: rowValue(row, "subtitle") || "",
    StoreName: rowValue(row, "store_name") || "",
    ChainName: rowValue(row, "chain_name") || "",
    ChainKey: rowValue(row, "chain_key") || "",
  };
}

export { GOLD_TABLE, executeGoldQuery, productFromGoldRow, rowValue, sqlString, sqlStringList };
