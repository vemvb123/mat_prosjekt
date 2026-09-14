# Mat prisfinner

Mat prisfinner er en React- og Node-basert søkeapp for norske dagligvarer.

Appen har to søkemoduser:

- **Produktsøk**: søker etter et produktnavn og rangerer treff etter lavest `compare_price_per_unit`, altså billigst per kg/l.
- **Næringssøk**: velger ett næringsstoff og rangerer produkter etter mest næring per krone.

Backend leser fra en ferdig **gold-tabell**. Tabellen kan komme fra Databricks i Azure, eller fra en lokal SQL Server-container når man utvikler lokalt.

## Arkitektur

```text
Frontend React/Vite
  -> /api/search
Backend Node/Azure Function
  -> optional Redis cache
  -> Databricks SQL warehouse eller lokal SQL Server
  -> product_nutritiens_gold
```

Gold-tabellen forventes å ha ferdig beregnede kolonner som:

```text
chain
title
brand
description
website_url
image_url
price_per_unit
compare_price_per_unit
compare_unit
subtitle
energy_amount
protein_amount
protein_per_package
protein_per_nok
...
```

Poenget er at applikasjonen ikke skal parse rå JSON eller bygge URL-er i runtime. Den skal bare filtrere, rangere og paginere.

## Viktige filer

### Backend

- `backend/server.mjs`  
  Lokal Node-server. Serverer `/api/search`, `/api/health` og frontend-build fra `frontend/dist`.

- `backend/src/functions/search.mjs`  
  Azure Functions-entrypoint for `/api/search`.

- `backend/routes/search.mjs`  
  Lokal Node-route for `/api/search`.

- `backend/search/databricks-gold.mjs`  
  Felles datalag for gold-tabellen. Velger mellom Databricks og lokal SQL Server.

- `backend/search/databricks-products.mjs`  
  Produktsøk. Matcher tekst mot produktfelt og sorterer på lavest pris per kg/l.

- `backend/search/databricks-nutrients.mjs`  
  Næringssøk. Mapper valgte næringsstoffer til gold-tabellens precompute-kolonner.

- `backend/cache/redis.mjs`  
  Valgfri Redis-cache. Cacher 10 sider om gangen og lar cache utløpe neste mandag kl. 03:00 Europe/Oslo.

- `backend/search/params.mjs`  
  Parser URL-parametere til et ryddig søkeobjekt.

### Frontend

- `frontend/src/App.jsx`  
  Holder URL-state og bytter mellom forsiden og resultatsiden.

- `frontend/src/components/SearchForm.jsx`  
  Søkeskjema. Produktsøk bruker tekstfelt; næringssøk bruker ett radio-valg.

- `frontend/src/components/ProductResults.jsx`  
  Viser produktsøk-resultater.

- `frontend/src/components/NutrientResults.jsx`  
  Viser næringssøk-resultater.

- `frontend/src/components/ProductCard.jsx`  
  Kortet som viser hvert produkt og åpner Meny/SPAR-søk for produktnavnet.

- `frontend/src/lib/api.js`  
  Frontend-wrapper for backendkall.

- `frontend/src/styles.css`  
  Global styling.

## Installere dependencies

Kjør fra prosjektroten:

```bash
cd backend
npm install

cd ../frontend
npm install
```

## Kjøre med Databricks

Dette er default for backend.

Sett miljøvariabler for Databricks:

```env
DATABRICKS_SERVER_HOSTNAME=...
DATABRICKS_HTTP_PATH=...
DATABRICKS_TOKEN=...
```

Valgfritt:

```env
GOLD_TABLE=hybrid_test.default.product_nutritiens_gold
```

Start backend:

```bash
cd backend
npm run dev
```

Start frontend:

```bash
cd frontend
npm run dev
```

Hvis frontend skal bruke lokal backend:

```env
VITE_API_BASE_URL=http://127.0.0.1:3001
```

## Kjøre lokalt med SQL Server i Docker

Start en lokal SQL Server-container:

```bash
docker run \
  --name mat-prosjekt-sql \
  -e "ACCEPT_EULA=Y" \
  -e "MSSQL_SA_PASSWORD=Your_strong_password123" \
  -p 1433:1433 \
  -d mcr.microsoft.com/mssql/server:2022-latest
```

Opprett database og importer/lag `dbo.product_nutritiens_gold` med samme kolonner som gold-tabellen i Databricks.

Sett miljøvariabler:

```env
LOCAL_SQL_HOST=localhost
LOCAL_SQL_PORT=1433
LOCAL_SQL_DATABASE=mat_prosjekt
LOCAL_SQL_USER=sa
LOCAL_SQL_PASSWORD=Your_strong_password123
LOCAL_SQL_GOLD_TABLE=dbo.product_nutritiens_gold
```

Start backend i lokal SQL-modus:

```bash
cd backend
npm run dev:local-sql
```

Dette tilsvarer:

```bash
node server.mjs --local-sql
```

Du kan sjekke aktiv datakilde:

```bash
curl http://127.0.0.1:3001/api/health
```

Forventet respons:

```json
{
  "ok": true,
  "goldQueryBackend": "sqlserver"
}
```

## Redis-cache

Redis er valgfritt. Hvis Redis ikke er satt opp, kjører backend direkte mot Databricks/SQL Server.

Miljøvariabler:

```env
REDIS_HOST=...
REDIS_PORT=10000
REDIS_PASSWORD=...
REDIS_TLS=true
```

Cache-nøkler inkluderer:

```text
mode
query
chains
compareUnit
page
pageSize
```

Når en side mangler i cache, henter backend 10 sider fra datakilden og lagrer dem enkeltvis.

## Bygge frontend for lokal Node-server

Hvis du vil at `backend/server.mjs` skal servere frontend-build:

```bash
cd frontend
npm run build

cd ../backend
npm run dev
```

Da serveres appen fra:

```text
http://127.0.0.1:3001
```

## Produksjon/Azure

I Azure brukes `backend/src/functions/search.mjs` som HTTP-trigger.

App settings må inneholde Databricks-variablene, og eventuelt Redis-variablene hvis cache skal være aktiv.

## Notater

- SQLite er fjernet fra aktiv kode.
- Produktsøk og næringssøk bruker samme gold-tabell.
- Lokal SQL-modus er ment for en SQL Server-container, ikke SQLite.
- Gold-tabellen bør oppdateres av Databricks-jobben din, og appen bør bare lese fra den.
