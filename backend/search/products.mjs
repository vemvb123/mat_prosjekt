import { db, getLatestRun } from "../db.mjs";
import { normalizeText } from "./text.mjs";

function productFromRow(row) {
  return {
    ProductKey: row.product_key,
    Name: row.name,
    Brand: row.brand,
    ProductUrl: row.product_url,
    ImageUrl: row.image_url,
    Price: row.price,
    PricePerCompareUnit: row.price_per_compare_unit,
    CompareUnit: row.compare_unit,
    Description: row.description,
    Subtitle: row.subtitle,
    StoreName: row.store_name,
    ChainName: row.chain_name,
    ChainKey: row.chain_key,
  };
}

function queryProductSearch({ query, chains, compareUnit, page, pageSize }) {
  const latestRun = getLatestRun();
  if (!latestRun) {
    throw new Error("Fant ingen ferdig import i SQLite ennå. Kjør import først.");
  }

  const queryTokens = normalizeText(query).split(" ").filter(Boolean);
  const placeholders = chains.map(() => "?").join(",");
  const rows = db.prepare(`
    SELECT *
    FROM products
    WHERE run_id = ?
      AND compare_unit = ?
      AND chain_key IN (${placeholders})
    ORDER BY
      CASE WHEN price_per_compare_unit IS NULL THEN 1 ELSE 0 END,
      price_per_compare_unit ASC,
      price ASC
  `).all(latestRun.run_id, compareUnit, ...chains);

  const filtered = [];
  const seenUrls = new Set();
  for (const row of rows) {
    const haystack = [row.name_normalized, row.brand_normalized, row.subtitle_normalized, row.description_normalized]
      .filter(Boolean)
      .join(" ");
    if (queryTokens.length > 0 && !queryTokens.every((token) => haystack.includes(token))) {
      continue;
    }
    if (seenUrls.has(row.product_url)) {
      continue;
    }
    seenUrls.add(row.product_url);
    filtered.push(productFromRow(row));
  }

  const total = filtered.length;
  const offset = (page - 1) * pageSize;

  return {
    mode: "product",
    query,
    chains,
    compareUnit,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    snapshotWeek: latestRun.week_key,
    snapshotCapturedAt: latestRun.captured_at,
    bestItem: filtered[0] || null,
    items: filtered.slice(offset, offset + pageSize),
  };
}

export { productFromRow, queryProductSearch };
