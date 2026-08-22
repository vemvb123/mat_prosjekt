import { db, getLatestRun } from "../db.mjs";
import { productFromRow } from "./products.mjs";
import { normalizeText, splitNutrientQueries } from "./text.mjs";

function findNutrientDefinition(searchQuery, rows) {
  const normalizedQuery = normalizeText(searchQuery);
  if (!normalizedQuery) {
    return null;
  }

  const definitions = new Map();
  for (const row of rows) {
    const nutrients = JSON.parse(row.nutritional_content_json);
    for (const nutrient of nutrients) {
      const name = String(nutrient.name || "");
      if (!name || definitions.has(name)) {
        continue;
      }
      definitions.set(name, {
        Name: name,
        DisplayName: String(nutrient.displayName || name),
        Unit: String(nutrient.unit || ""),
        SearchTokens: [normalizeText(nutrient.displayName), normalizeText(name)].filter(Boolean),
      });
    }
  }

  for (const definition of definitions.values()) {
    if (definition.SearchTokens.includes(normalizedQuery)) {
      return definition;
    }
  }

  for (const definition of definitions.values()) {
    for (const token of definition.SearchTokens) {
      if (token.includes(normalizedQuery) || normalizedQuery.includes(token)) {
        return definition;
      }
    }
  }

  return null;
}

function queryNutrientRanking({ query, chains, compareUnit, page, pageSize }) {
  const latestRun = getLatestRun();
  if (!latestRun) {
    throw new Error("Fant ingen ferdig import i SQLite ennå. Kjør import først.");
  }

  const placeholders = chains.map(() => "?").join(",");
  const rows = db.prepare(`
    SELECT *
    FROM products
    WHERE run_id = ?
      AND compare_unit = ?
      AND chain_key IN (${placeholders})
  `).all(latestRun.run_id, compareUnit, ...chains);

  const nutrientQueries = splitNutrientQueries(query);
  const missingQueries = [];
  let nutrient = null;
  for (const nutrientQuery of nutrientQueries.length > 0 ? nutrientQueries : [query]) {
    nutrient = findNutrientDefinition(nutrientQuery, rows);
    if (nutrient) {
      break;
    }
    missingQueries.push(nutrientQuery);
  }

  const warnings = JSON.parse(latestRun.warnings_json || "[]");
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
      snapshotWeek: latestRun.week_key,
      snapshotCapturedAt: latestRun.captured_at,
      nutrient: null,
      warnings,
      missingQueries,
      bestItem: null,
      items: [],
    };
  }

  const ranked = [];
  const seenUrls = new Set();
  for (const row of rows) {
    const price = Number(row.price || 0);
    const packageContentAmount = Number(row.package_content_amount || 0);
    if (price <= 0 || packageContentAmount <= 0) {
      continue;
    }

    const nutrients = JSON.parse(row.nutritional_content_json);
    const nutrientValue = nutrients.find((item) => String(item.name || "") === nutrient.Name);
    const amount = Number(nutrientValue?.amount || 0);
    if (amount <= 0) {
      continue;
    }
    if (seenUrls.has(row.product_url)) {
      continue;
    }

    const amountPerPackage = amount * (packageContentAmount / 100);
    const amountPerKrone = amountPerPackage / price;
    const pricePerCompareUnit = row.price_per_compare_unit ?? (price / packageContentAmount) * 1000;

    ranked.push({
      ...productFromRow(row),
      NutrientName: nutrient.DisplayName,
      NutrientUnit: String(nutrientValue?.unit || nutrient.Unit || ""),
      NutrientAmountPer100g: amount,
      NutrientAmountPerPackage: amountPerPackage,
      NutrientAmountPerKrone: amountPerKrone,
      PricePerCompareUnit: pricePerCompareUnit,
    });
    seenUrls.add(row.product_url);
  }

  ranked.sort((left, right) => {
    if (right.NutrientAmountPerKrone !== left.NutrientAmountPerKrone) {
      return right.NutrientAmountPerKrone - left.NutrientAmountPerKrone;
    }
    if ((left.PricePerCompareUnit ?? Infinity) !== (right.PricePerCompareUnit ?? Infinity)) {
      return (left.PricePerCompareUnit ?? Infinity) - (right.PricePerCompareUnit ?? Infinity);
    }
    return (left.Price ?? Infinity) - (right.Price ?? Infinity);
  });

  const total = ranked.length;
  const offset = (page - 1) * pageSize;
  const combinedWarnings = missingQueries.length > 0
    ? [...warnings, `Fant ikke næringsstoff for: ${missingQueries.join(", ")}`]
    : warnings;

  return {
    mode: "nutrient",
    query,
    chains,
    compareUnit,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    snapshotWeek: latestRun.week_key,
    snapshotCapturedAt: latestRun.captured_at,
    nutrient,
    warnings: combinedWarnings,
    missingQueries,
    bestItem: ranked[0] || null,
    items: ranked.slice(offset, offset + pageSize),
  };
}

export { queryNutrientRanking };
