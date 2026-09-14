import { GOLD_TABLE, executeGoldQuery, productFromGoldRow, rowValue, sqlString, sqlStringList } from "./databricks-gold.mjs";
import { normalizeText } from "./text.mjs";

function sqlLikePattern(value) {
  return sqlString(`%${value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")}%`);
}

async function queryDatabricksProductSearch({ query, chains, compareUnit, page, pageSize }) {
  return queryDatabricksProductSearchWindow({ query, chains, compareUnit, page, pageSize }, pageSize, (page - 1) * pageSize);
}

async function queryDatabricksProductSearchWindow({ query, chains, compareUnit, page, pageSize }, limit, offset) {
  const tokens = normalizeText(query).split(" ").filter(Boolean);
  const tokenFilters = tokens.map((token) => {
    const pattern = sqlLikePattern(token);
    return `(
      LOWER(title) LIKE ${pattern} ESCAPE '\\'
      OR LOWER(brand) LIKE ${pattern} ESCAPE '\\'
      OR LOWER(subtitle) LIKE ${pattern} ESCAPE '\\'
      OR LOWER(description) LIKE ${pattern} ESCAPE '\\'
    )`;
  });

  const rows = await executeGoldQuery(`
    WITH matched AS (
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
        LOWER(chain) AS chain_key
      FROM ${GOLD_TABLE}
      WHERE compare_unit = ${sqlString(compareUnit)}
        AND compare_price_per_unit > 0
        AND LOWER(chain) IN (${sqlStringList(chains)})
        ${tokenFilters.length > 0 ? `AND ${tokenFilters.join("\n        AND ")}` : ""}
    ),
    counted AS (
      SELECT *, COUNT(*) OVER () AS total
      FROM matched
    )
    SELECT *
    FROM counted
    ORDER BY price_per_compare_unit ASC, price ASC
    LIMIT ${limit}
    OFFSET ${offset}
  `);

  const items = rows.map(productFromGoldRow);
  const total = Number(rowValue(rows[0] || {}, "total") || 0);

  return {
    mode: "product",
    query,
    chains,
    compareUnit,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    snapshotWeek: "",
    snapshotCapturedAt: "",
    bestItem: items[0] || null,
    items,
  };
}

export { queryDatabricksProductSearch, queryDatabricksProductSearchWindow };
