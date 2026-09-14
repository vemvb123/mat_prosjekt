import pkg from "@databricks/sql";

// Felles tilgangslag for product_nutritiens_gold.
//
// Resten av backend trenger ikke vite om dataene kommer fra Databricks eller en
// lokal SQL Server-container. Denne filen velger riktig motor, kjører SQL og
// mapper radene til samme produktformat som frontend allerede bruker.
const { DBSQLClient } = pkg;

const GOLD_TABLE = process.env.GOLD_TABLE || "hybrid_test.default.product_nutritiens_gold";
const LOCAL_SQL_GOLD_TABLE = process.env.LOCAL_SQL_GOLD_TABLE || "dbo.product_nutritiens_gold";

let sqlServerPoolPromise = null;

// Velger spørringsmotor. Databricks er default, lokal SQL Server brukes ved flagg.
function getGoldQueryBackend() {
  return process.env.GOLD_QUERY_BACKEND === "sqlserver" ? "sqlserver" : "databricks";
}

// Stopper tidlig med tydelig feilmelding hvis Databricks-konfig mangler.
function requireDatabricksEnv() {
  const missing = ["DATABRICKS_SERVER_HOSTNAME", "DATABRICKS_HTTP_PATH", "DATABRICKS_TOKEN"].filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Mangler Databricks miljøvariabler: ${missing.join(", ")}`);
  }
}

// Lokal SQL Server trenger bare passord; resten har fornuftige defaults.
function requireSqlServerEnv() {
  const missing = ["LOCAL_SQL_PASSWORD"].filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Mangler SQL Server miljøvariabler: ${missing.join(", ")}`);
  }
}

// Leser en kolonne uavhengig av om driveren returnerer små eller store bokstaver.
function rowValue(row, key) {
  return row[key] ?? row[key.toUpperCase()] ?? row[key.toLowerCase()] ?? null;
}

// Kjører SQL mot valgt gold-table backend og returnerer rader.
async function executeGoldQuery(statement) {
  if (getGoldQueryBackend() === "sqlserver") {
    return executeSqlServerQuery(statement);
  }

  requireDatabricksEnv();

  const client = new DBSQLClient();
  try {
    // Databricks SQL krever host, HTTP path og token for hvert kall.
    await client.connect({
      host: process.env.DATABRICKS_SERVER_HOSTNAME,
      path: process.env.DATABRICKS_HTTP_PATH,
      token: process.env.DATABRICKS_TOKEN,
    });

    const session = await client.openSession();
    try {
      // runAsync lar Databricks håndtere spørringen asynkront mens klienten venter.
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

// Oppretter én delt connection pool mot lokal SQL Server-container.
async function getSqlServerPool() {
  requireSqlServerEnv();

  if (!sqlServerPoolPromise) {
    // mssql lastes bare i lokal SQL-modus, så produksjon trenger ikke bruke pakken.
    const sql = await import("mssql");
    const config = {
      server: process.env.LOCAL_SQL_HOST || "localhost",
      port: Number(process.env.LOCAL_SQL_PORT || "1433"),
      database: process.env.LOCAL_SQL_DATABASE || "mat_prosjekt",
      user: process.env.LOCAL_SQL_USER || "sa",
      password: process.env.LOCAL_SQL_PASSWORD,
      options: {
        encrypt: process.env.LOCAL_SQL_ENCRYPT === "true",
        trustServerCertificate: process.env.LOCAL_SQL_TRUST_CERT !== "false",
      },
    };

    sqlServerPoolPromise = sql.connect(config);
  }

  return sqlServerPoolPromise;
}

// Kjører samme SQL mot lokal SQL Server som mot Databricks, med dialektforskjeller
// håndtert i hjelpefunksjonene under.
async function executeSqlServerQuery(statement) {
  const pool = await getSqlServerPool();
  const result = await pool.request().query(statement);
  return result.recordset;
}

// Gir riktig tabellnavn for aktiv backend.
function goldTableName() {
  return getGoldQueryBackend() === "sqlserver" ? LOCAL_SQL_GOLD_TABLE : GOLD_TABLE;
}

// Databricks og SQL Server har ulik syntaks for paging.
function paginationClause(limit, offset) {
  return getGoldQueryBackend() === "sqlserver"
    ? `OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`
    : `LIMIT ${limit}\n      OFFSET ${offset}`;
}

// Escaper tekst trygt nok for verdiene vi selv bygger inn i SQL-strengene.
function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

// Lager en kommaseparert liste av SQL-strenger, brukt i IN (...).
function sqlStringList(values) {
  return values.map(sqlString).join(",");
}

// Mapper en rad fra gold-tabellen til det gamle produktobjektet frontend bruker.
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

export { executeGoldQuery, getGoldQueryBackend, goldTableName, paginationClause, productFromGoldRow, rowValue, sqlString, sqlStringList };
