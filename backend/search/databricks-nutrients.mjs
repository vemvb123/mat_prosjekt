import pkg from "@databricks/sql";
import { normalizeText, splitNutrientQueries } from "./text.mjs";

const { DBSQLClient } = pkg;

const NUTRIENTS = [
  {
    name: "energy",
    displayName: "Energi",
    unit: "kj",
    index: 0,
    aliases: ["energi", "energy", "kj"],
  },
  {
    name: "calories",
    displayName: "Kalorier",
    unit: "kcal",
    index: 1,
    aliases: ["kalorier", "kalori", "calories", "calorie", "kcal"],
  },
  {
    name: "fat",
    displayName: "Fett",
    unit: "g",
    index: 2,
    aliases: ["fett", "fat"],
  },
  {
    name: "saturated_fat",
    displayName: "Mettet fett",
    unit: "g",
    index: 3,
    aliases: ["mettet fett", "saturated fat", "saturates"],
  },
  {
    name: "monounsaturated_fat",
    displayName: "Enumettet fett",
    unit: "g",
    index: 4,
    aliases: ["enumettet fett", "monounsaturated fat"],
  },
  {
    name: "polyunsaturated_fat",
    displayName: "Flerumettet fett",
    unit: "g",
    index: 5,
    aliases: ["flerumettet fett", "polyunsaturated fat"],
  },
  {
    name: "carbohydrates",
    displayName: "Karbohydrater",
    unit: "g",
    index: 6,
    aliases: ["karbohydrater", "karbohydrat", "carbohydrates", "carbs"],
  },
  {
    name: "sugars",
    displayName: "Sukkerarter",
    unit: "g",
    index: 7,
    aliases: ["sukkerarter", "sukker", "sugars", "sugar"],
  },
  {
    name: "sugar_alcohols",
    displayName: "Sukkeralkoholer",
    unit: "g",
    index: 8,
    aliases: ["sukkeralkoholer", "sugar alcohols", "polyols"],
  },
  {
    name: "fiber",
    displayName: "Kostfiber",
    unit: "g",
    index: 9,
    aliases: ["kostfiber", "fiber", "fibre"],
  },
  {
    name: "protein",
    displayName: "Protein",
    unit: "g",
    index: 10,
    aliases: ["protein", "proteiner"],
  },
  {
    name: "salt",
    displayName: "Salt",
    unit: "g",
    index: 11,
    aliases: ["salt"],
  },
];

function findNutrient(query) {
  const queries = splitNutrientQueries(query);
  for (const queryPart of queries.length > 0 ? queries : [query]) {
    const normalizedQuery = normalizeText(queryPart);
    const nutrient = NUTRIENTS.find((item) => {
      const aliases = [item.displayName, item.name, ...item.aliases].map(normalizeText);
      return aliases.some((alias) => alias === normalizedQuery || alias.includes(normalizedQuery) || normalizedQuery.includes(alias));
    });

    if (nutrient) {
      return { nutrient, missingQueries: queries.filter((item) => item !== queryPart) };
    }
  }

  return { nutrient: null, missingQueries: queries.length > 0 ? queries : [query] };
}

function requireDatabricksEnv() {
  const missing = ["DATABRICKS_SERVER_HOSTNAME", "DATABRICKS_HTTP_PATH", "DATABRICKS_TOKEN"].filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Mangler Databricks miljøvariabler: ${missing.join(", ")}`);
  }
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function rowValue(row, key) {
  return row[key] ?? row[key.toUpperCase()] ?? row[key.toLowerCase()] ?? null;
}

function productFromDatabricksRow(row, nutrient) {
  const productUrl = rowValue(row, "product_url") || "";
  const name = rowValue(row, "name") || rowValue(row, "Product") || "Ukjent produkt";

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
    NutrientName: nutrient.displayName,
    NutrientUnit: rowValue(row, "nutrient_unit") || nutrient.unit,
    NutrientAmountPer100g: Number(rowValue(row, "nutrient_per_100g") || 0),
    NutrientAmountPerPackage: Number(rowValue(row, "nutrient_per_package") || 0),
    NutrientAmountPerKrone: Number(rowValue(row, "nutrient_per_nok") || 0),
  };
}

async function queryDatabricksNutrientRanking({ query, chains, compareUnit, page, pageSize }) {
  const { nutrient, missingQueries } = findNutrient(query);
  if (!nutrient) {
    return {
      mode: "nutrient",
      query,
      chains,
      compareUnit,
      page,
      pageSize,
      total: 0,
      totalPages: 1,
      snapshotWeek: "",
      snapshotCapturedAt: "",
      nutrient: null,
      warnings: [`Fant ikke næringsstoff for: ${missingQueries.join(", ")}`],
      missingQueries,
      bestItem: null,
      items: [],
    };
  }

  requireDatabricksEnv();

  const client = new DBSQLClient();
  const offset = (page - 1) * pageSize;
  const nutrientAliases = [nutrient.displayName, nutrient.name, ...nutrient.aliases]
    .map(normalizeText)
    .map(sqlString)
    .join(",");

  try {
    await client.connect({
      host: process.env.DATABRICKS_SERVER_HOSTNAME,
      path: process.env.DATABRICKS_HTTP_PATH,
      token: process.env.DATABRICKS_TOKEN,
    });

    const session = await client.openSession();
    const operation = await session.executeStatement(`
      WITH parsed AS (
        SELECT
          COALESCE(get_json_object(product_json, '$.title'), get_json_object(product_json, '$.name')) AS name,
          COALESCE(get_json_object(product_json, '$.brand'), get_json_object(product_json, '$.brandName')) AS brand,
          COALESCE(get_json_object(product_json, '$.url'), get_json_object(product_json, '$.productUrl')) AS product_url,
          COALESCE(get_json_object(product_json, '$.imageUrl'), get_json_object(product_json, '$.image.url')) AS image_url,
          CAST(COALESCE(get_json_object(product_json, '$.price'), get_json_object(product_json, '$.currentPrice')) AS DOUBLE) AS price,
          CAST(get_json_object(product_json, '$.comparePricePerUnit') AS DOUBLE) AS price_per_compare_unit,
          get_json_object(product_json, '$.compareUnit') AS compare_unit,
          COALESCE(get_json_object(product_json, '$.subtitle'), get_json_object(product_json, '$.packageSize')) AS subtitle,
          COALESCE(get_json_object(product_json, '$.description'), '') AS description,
          COALESCE(get_json_object(product_json, '$.store.name'), get_json_object(product_json, '$.storeName')) AS store_name,
          COALESCE(get_json_object(product_json, '$.chain.name'), get_json_object(product_json, '$.chainName')) AS chain_name,
          LOWER(COALESCE(get_json_object(product_json, '$.chain.key'), get_json_object(product_json, '$.chainKey'))) AS chain_key,
          filter(
            from_json(
              get_json_object(product_json, '$.nutritionalContent'),
              'array<struct<name:string,displayName:string,amount:double,unit:string>>'
            ),
            item -> regexp_replace(
              lower(coalesce(item.displayName, item.name, '')),
              '[^a-z0-9]+',
              ' '
            ) IN (${nutrientAliases})
          )[0] AS nutrient
        FROM products
        WHERE get_json_object(product_json, '$.compareUnit') = '${compareUnit}'
      ),
      scored AS (
        SELECT
          *,
          CAST(nutrient.amount AS DOUBLE) AS nutrient_per_100g,
          CAST(nutrient.amount AS DOUBLE) * 10 AS nutrient_per_package,
          ROUND((CAST(nutrient.amount AS DOUBLE) * 10) / price_per_compare_unit, 2) AS nutrient_per_nok,
          COALESCE(nutrient.unit, '${nutrient.unit}') AS nutrient_unit
        FROM parsed
        WHERE price_per_compare_unit > 0
          AND nutrient IS NOT NULL
          AND CAST(nutrient.amount AS DOUBLE) > 0
      ),
      counted AS (
        SELECT *, COUNT(*) OVER () AS total
        FROM scored
      )
      SELECT *
      FROM counted
      ORDER BY nutrient_per_nok DESC, price_per_compare_unit ASC, price ASC
      LIMIT ${pageSize}
      OFFSET ${offset}
    `, { runAsync: true });

    const rows = await operation.fetchAll();
    await operation.close();
    await session.close();

    const items = rows.map((row) => productFromDatabricksRow(row, nutrient));
    const total = Number(rowValue(rows[0] || {}, "total") || 0);

    return {
      mode: "nutrient",
      query,
      chains,
      compareUnit,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      snapshotWeek: "",
      snapshotCapturedAt: "",
      nutrient: {
        Name: nutrient.name,
        DisplayName: nutrient.displayName,
        Unit: nutrient.unit,
      },
      warnings: missingQueries.length > 0 ? [`Fant ikke næringsstoff for: ${missingQueries.join(", ")}`] : [],
      missingQueries,
      bestItem: items[0] || null,
      items,
    };
  } finally {
    await client.close();
  }
}

export { queryDatabricksNutrientRanking };
