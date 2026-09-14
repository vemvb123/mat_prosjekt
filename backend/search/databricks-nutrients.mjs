import { executeGoldQuery, goldTableName, paginationClause, productFromGoldRow, rowValue, sqlString, sqlStringList } from "./databricks-gold.mjs";
import { normalizeText, splitNutrientQueries } from "./text.mjs";

// Næringssøk mot gold-tabellen.
//
// Gold-tabellen inneholder ferdig utregnede verdier per 100 g, per pakke og per
// krone. Denne filen velger riktig næringskolonne og rangerer produkter etter
// mest næring per krone.

// Liste over næringer appen faktisk kan søke på.
// Hver entry peker på kolonnene som allerede finnes i product_nutritiens_gold.
const NUTRIENTS = [
  {
    name: "energy",
    displayName: "Energi",
    unit: "kj",
    amountColumn: "energy_amount",
    packageColumn: "energy_per_package",
    nokColumn: "energy_per_nok",
    aliases: ["energi", "energy", "kj"],
  },
  {
    name: "calories",
    displayName: "Kalorier",
    unit: "kcal",
    amountColumn: "calories_amount",
    packageColumn: "calories_per_package",
    nokColumn: "calories_per_nok",
    aliases: ["kalorier", "kalori", "calories", "calorie", "kcal"],
  },
  {
    name: "fat",
    displayName: "Fett",
    unit: "g",
    amountColumn: "fat_amount",
    packageColumn: "fat_per_package",
    nokColumn: "fat_per_nok",
    aliases: ["fett", "fat"],
  },
  {
    name: "saturated_fat",
    displayName: "Mettet fett",
    unit: "g",
    amountColumn: "saturated_fat_amount",
    packageColumn: "saturated_fat_per_package",
    nokColumn: "saturated_fat_per_nok",
    aliases: ["mettet fett", "saturated fat", "saturates"],
  },
  {
    name: "carbohydrates",
    displayName: "Karbohydrater",
    unit: "g",
    amountColumn: "carbohydrates_amount",
    packageColumn: "carbohydrates_per_package",
    nokColumn: "carbohydrates_per_nok",
    aliases: ["karbohydrater", "karbohydrat", "carbohydrates", "carbs"],
  },
  {
    name: "sugars",
    displayName: "Sukkerarter",
    unit: "g",
    amountColumn: "sugars_amount",
    packageColumn: "sugars_per_package",
    nokColumn: "sugars_per_nok",
    aliases: ["sukkerarter", "sukker", "sugars", "sugar"],
  },
  {
    name: "protein",
    displayName: "Protein",
    unit: "g",
    amountColumn: "protein_amount",
    packageColumn: "protein_per_package",
    nokColumn: "protein_per_nok",
    aliases: ["protein", "proteiner"],
  },
  {
    name: "salt",
    displayName: "Salt",
    unit: "g",
    amountColumn: "salt_amount",
    packageColumn: "salt_per_package",
    nokColumn: "salt_per_nok",
    aliases: ["salt"],
  },
];

// Finner næringen brukeren ba om. Frontend sender vanligvis name direkte, men
// aliaser gjør backend robust hvis man senere åpner for tekstsøk igjen.
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

// Mapper en gold-rad til produktformatet pluss næringsverdiene som UI viser.
function productFromDatabricksRow(row, nutrient) {
  return {
    ...productFromGoldRow(row),
    NutrientName: nutrient.displayName,
    NutrientUnit: nutrient.unit,
    NutrientAmountPer100g: Number(rowValue(row, "nutrient_per_100g") || 0),
    NutrientAmountPerPackage: Number(rowValue(row, "nutrient_per_package") || 0),
    NutrientAmountPerKrone: Number(rowValue(row, "nutrient_per_nok") || 0),
  };
}

// Henter én side med produkter rangert etter valgt næring.
async function queryDatabricksNutrientRanking({ query, chains, compareUnit, page, pageSize }) {
  return queryDatabricksNutrientRankingWindow({ query, chains, compareUnit, page, pageSize }, pageSize, (page - 1) * pageSize);
}

// Henter et større vindu med næringstreff, brukt av Redis-cache for ti sider.
async function queryDatabricksNutrientRankingWindow({ query, chains, compareUnit, page, pageSize }, limit, offset) {
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

  const chainList = sqlStringList(chains);
  // Sorteringen bruker ferdig utregnet per-krone-kolonne, og lav pris brukes som
  // tie-breaker når flere produkter gir like mye næring for pengene.
  const rows = await executeGoldQuery(`
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
        FROM ${goldTableName()}
        WHERE compare_unit = ${sqlString(compareUnit)}
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
      ${paginationClause(limit, offset)}
    `);

  // COUNT(*) OVER () ligger på hver rad, så første rad inneholder totalen.
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
}

export { queryDatabricksNutrientRanking, queryDatabricksNutrientRankingWindow };
