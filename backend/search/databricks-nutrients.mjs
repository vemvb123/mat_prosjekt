import pkg from "@databricks/sql";
import { normalizeText, splitNutrientQueries } from "./text.mjs";

const { DBSQLClient } = pkg;

const NUTRIENTS = [
  {
    name: "energy",
    displayName: "Energi",
    unit: "kj",
    index: 0,
    amountColumn: "energy_amount",
    packageColumn: "energy_per_package",
    nokColumn: "energy_per_nok",
    aliases: ["energi", "energy", "kj"],
  },
  {
    name: "calories",
    displayName: "Kalorier",
    unit: "kcal",
    index: 1,
    amountColumn: "calories_amount",
    packageColumn: "calories_per_package",
    nokColumn: "calories_per_nok",
    aliases: ["kalorier", "kalori", "calories", "calorie", "kcal"],
  },
  {
    name: "fat",
    displayName: "Fett",
    unit: "g",
    index: 2,
    amountColumn: "fat_amount",
    packageColumn: "fat_per_package",
    nokColumn: "fat_per_nok",
    aliases: ["fett", "fat"],
  },
  {
    name: "saturated_fat",
    displayName: "Mettet fett",
    unit: "g",
    index: 3,
    amountColumn: "saturated_fat_amount",
    packageColumn: "saturated_fat_per_package",
    nokColumn: "saturated_fat_per_nok",
    aliases: ["mettet fett", "saturated fat", "saturates"],
  },
  {
    name: "monounsaturated_fat",
    displayName: "Enumettet fett",
    unit: "g",
    index: null,
    amountColumn: null,
    packageColumn: null,
    nokColumn: null,
    aliases: ["enumettet fett", "monounsaturated fat"],
  },
  {
    name: "polyunsaturated_fat",
    displayName: "Flerumettet fett",
    unit: "g",
    index: null,
    amountColumn: null,
    packageColumn: null,
    nokColumn: null,
    aliases: ["flerumettet fett", "polyunsaturated fat"],
  },
  {
    name: "carbohydrates",
    displayName: "Karbohydrater",
    unit: "g",
    index: 4,
    amountColumn: "carbohydrates_amount",
    packageColumn: "carbohydrates_per_package",
    nokColumn: "carbohydrates_per_nok",
    aliases: ["karbohydrater", "karbohydrat", "carbohydrates", "carbs"],
  },
  {
    name: "sugars",
    displayName: "Sukkerarter",
    unit: "g",
    index: 5,
    amountColumn: "sugars_amount",
    packageColumn: "sugars_per_package",
    nokColumn: "sugars_per_nok",
    aliases: ["sukkerarter", "sukker", "sugars", "sugar"],
  },
  {
    name: "sugar_alcohols",
    displayName: "Sukkeralkoholer",
    unit: "g",
    index: null,
    amountColumn: null,
    packageColumn: null,
    nokColumn: null,
    aliases: ["sukkeralkoholer", "sugar alcohols", "polyols"],
  },
  {
    name: "fiber",
    displayName: "Kostfiber",
    unit: "g",
    index: null,
    amountColumn: null,
    packageColumn: null,
    nokColumn: null,
    aliases: ["kostfiber", "fiber", "fibre"],
  },
  {
    name: "protein",
    displayName: "Protein",
    unit: "g",
    index: 6,
    amountColumn: "protein_amount",
    packageColumn: "protein_per_package",
    nokColumn: "protein_per_nok",
    aliases: ["protein", "proteiner"],
  },
  {
    name: "salt",
    displayName: "Salt",
    unit: "g",
    index: 7,
    amountColumn: "salt_amount",
    packageColumn: "salt_per_package",
    nokColumn: "salt_per_nok",
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

function rowValue(row, key) {
  return row[key] ?? row[key.toUpperCase()] ?? row[key.toLowerCase()] ?? null;
}

function productFromDatabricksRow(row, nutrient) {
  const chainKey = rowValue(row, "chain_key") || "";
  const productUrl = rowValue(row, "website_url") || "";
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
    ChainKey: chainKey,
    NutrientName: nutrient.displayName,
    NutrientUnit: nutrient.unit,
    NutrientAmountPer100g: Number(rowValue(row, "nutrient_per_100g") || 0),
    NutrientAmountPerPackage: Number(rowValue(row, "nutrient_per_package") || 0),
    NutrientAmountPerKrone: Number(rowValue(row, "nutrient_per_nok") || 0),
  };
}

async function queryDatabricksNutrientRanking({ query, chains, compareUnit, page, pageSize }) {
  const { nutrient, missingQueries } = findNutrient(query);
  if (!nutrient || !nutrient.amountColumn || !nutrient.packageColumn || !nutrient.nokColumn) {
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
      nutrient: nutrient ? {
        Name: nutrient.name,
        DisplayName: nutrient.displayName,
        Unit: nutrient.unit,
      } : null,
      warnings: [nutrient ? `${nutrient.displayName} finnes ikke i gold-tabellen fra Databricks.` : `Fant ikke næringsstoff for: ${missingQueries.join(", ")}`],
      missingQueries,
      bestItem: null,
      items: [],
    };
  }

  requireDatabricksEnv();

  const client = new DBSQLClient();
  const offset = (page - 1) * pageSize;
  const chainList = chains.map((chain) => `'${chain.replaceAll("'", "''")}'`).join(",");

  try {
    await client.connect({
      host: process.env.DATABRICKS_SERVER_HOSTNAME,
      path: process.env.DATABRICKS_HTTP_PATH,
      token: process.env.DATABRICKS_TOKEN,
    });

    const session = await client.openSession();
    const operation = await session.executeStatement(`
      WITH scored AS (
        SELECT
          title AS name,
          brand,
          website_url,
          image_url,
          price_per_unit AS price,
          compare_price_per_unit AS price_per_compare_unit,
          compare_unit,
          subtitle,
          description,
          chain AS chain_name,
          LOWER(chain) AS chain_key,
          ${nutrient.amountColumn} AS nutrient_per_100g,
          ${nutrient.packageColumn} AS nutrient_per_package,
          ${nutrient.nokColumn} AS nutrient_per_nok
        FROM hybrid_test.default.product_nutritiens_gold
        WHERE compare_unit = '${compareUnit}'
          AND compare_price_per_unit > 0
          AND ${nutrient.amountColumn} > 0
          AND ${nutrient.nokColumn} > 0
          AND LOWER(chain) IN (${chainList})
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
