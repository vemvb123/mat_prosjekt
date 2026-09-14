import { executeGoldQuery, goldTableName, paginationClause, productFromGoldRow, rowValue, sqlString, sqlStringList } from "./databricks-gold.mjs";
import { normalizeText } from "./text.mjs";

// Produktsøk mot gold-tabellen.
//
// Brukeren skriver et vanlig produktnavn, og vi rangerer treffene etter lavest
// sammenligningspris. Det betyr at "mest mat for pengene" kommer først.

// Lager LIKE-mønster og bruker felles escaping for SQL-strenger.
function sqlLikePattern(value) {
  return sqlString(`%${value}%`);
}

// Henter én side med produkttreff.
async function queryDatabricksProductSearch({ query, chains, compareUnit, page, pageSize }) {
  return queryDatabricksProductSearchWindow({ query, chains, compareUnit, page, pageSize }, pageSize, (page - 1) * pageSize);
}

// Henter et større vindu med produkttreff. Cache-laget bruker denne for å hente
// ti sider om gangen, mens vanlig paging bruker samme funksjon med én side.
async function queryDatabricksProductSearchWindow({ query, chains, compareUnit, page, pageSize }, limit, offset) {
  // Del søket i ord slik at "litago melk" må matche begge ordene et sted i raden.
  const tokens = normalizeText(query).split(" ").filter(Boolean);
  const tokenFilters = tokens.map((token) => {
    const pattern = sqlLikePattern(token);
    return `(
      LOWER(title) LIKE ${pattern}
      OR LOWER(brand) LIKE ${pattern}
      OR LOWER(subtitle) LIKE ${pattern}
      OR LOWER(description) LIKE ${pattern}
    )`;
  });

  // Gold-tabellen har ferdige URL-er, ferdige navn og ferdig sammenligningspris.
  // Derfor trenger denne spørringen bare å filtrere og sortere.
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
      FROM ${goldTableName()}
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
    ${paginationClause(limit, offset)}
  `);

  // COUNT(*) OVER () gir totalen på hver rad, så første rad er nok.
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
