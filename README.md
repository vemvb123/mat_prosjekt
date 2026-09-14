# Mat prisfinner

Mat prisfinner er en React- og Node-basert søkeapp for norske dagligvarer.

Appen har to søkemoduser:

- **Produktsøk**: søker etter et produktnavn og rangerer treff billigst per kg/l.
- **Næringssøk**: velger ett næringsstoff og rangerer produkter etter mest næring per krone.

Backend leser fra en ferdig **gold-tabell**. Tabellen kan komme fra Databricks i Azure, eller fra en lokal SQL Server-container når man utvikler lokalt.

Dette repoet inneholder koden for å hente data, og lage tabeller:

https://github.com/vemvb123/mat-prosjekt-databricks


# Bilder fra nettsiden

Man kan søke etter billigste produkter for en viss type næringsinnhold:

<img width="1181" height="482" alt="image" src="https://github.com/user-attachments/assets/d6989a86-1cb4-46ea-bf16-6320cb00fd98" />

Resultatene kan se slik ut. De viser rangert de billigste produktene for et visst næringsinnhold, i dette tilfellet protein.
Altså, rangert ut i fra hvor mye protein man får for pengene.

<img width="1146" height="887" alt="image" src="https://github.com/user-attachments/assets/c1b87a5a-0188-4b87-877f-28843c3e711e" />


Man kan også søke etter produkter. For eksempel søke etter hvilket produkt som har sjokolade i seg, som gir mest mat for pengene.

<img width="1162" height="947" alt="image" src="https://github.com/user-attachments/assets/8760f6da-056d-47d5-aea6-50a09d0caf0b" />





## Arkitektur

```text
Frontend React/Vite
  -> /api/search
Backend Node/Azure Function
  -> optional Redis cache
  -> Databricks SQL warehouse eller lokal SQL Server
  -> gold tabell
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


## Noen viktige filer

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

## Kjøre hele prosjektet lokalt

Lokal modus bruker:

- SQL Server i Docker for `product_nutritiens_gold`
- Redis i Docker for cache
- Node-backend på `http://127.0.0.1:3001`
- Vite-frontend på `http://127.0.0.1:5173`

### 1. Lag lokale env-filer

Kopier eksempel-filene:

```bash
cp backend/.env.local.example backend/.env.local
cp frontend/.env.local.example frontend/.env.local
```

Standardverdiene matcher `docker-compose.local.yml`, så du trenger normalt ikke
endre noe bare for lokal utvikling.

### 2. Start SQL Server og Redis

Fra prosjektroten:

```bash
docker compose -f docker-compose.local.yml --env-file backend/.env.local up -d
```

Dette starter:

```text
localhost:1433  SQL Server
localhost:6379  Redis
```

### 3. Opprett gold-tabellen lokalt

Kjør SQL-skjemaet i `backend/sql/product_nutritiens_gold.sql` mot den lokale SQL
Server-databasen.

For eksempel med `sqlcmd` hvis du har det installert lokalt:

```bash
sqlcmd \
  -S localhost,1433 \
  -U sa \
  -P Your_strong_password123 \
  -C \
  -i backend/sql/product_nutritiens_gold.sql
```

Etterpå må du importere data til:

```text
dbo.product_nutritiens_gold
```


### 4. Start backend i lokal modus

```bash
cd backend
npm run dev:local
```

Dette laster `backend/.env.local`, bruker SQL Server som datakilde og Redis som
cache.

Sjekk at backend bruker lokal SQL Server:

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

### 5. Start frontend

I en ny terminal:

```bash
cd frontend
npm run dev
```

Åpne:

```text
http://127.0.0.1:5173
```

### Stoppe lokal infrastruktur

```bash
docker compose -f docker-compose.local.yml --env-file backend/.env.local down
```

Hvis du også vil slette SQL Server- og Redis-dataene:

```bash
docker compose -f docker-compose.local.yml --env-file backend/.env.local down -v
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

Den anbefalte lokale måten er `docker-compose.local.yml`, som starter både SQL
Server og Redis:

```bash
docker compose -f docker-compose.local.yml --env-file backend/.env.local up -d
```

Opprett database/tabell med:

```text
backend/sql/product_nutritiens_gold.sql
```

Sett miljøvariabler:

```env
LOCAL_SQL_HOST=localhost
LOCAL_SQL_PORT=1433
LOCAL_SQL_DATABASE=mat_prosjekt
LOCAL_SQL_USER=sa
LOCAL_SQL_PASSWORD=Your_strong_password123
LOCAL_SQL_GOLD_TABLE=dbo.product_nutritiens_gold
LOCAL_SQL_ENCRYPT=false
LOCAL_SQL_TRUST_CERT=true
```

Start backend i lokal SQL-modus:

```bash
cd backend
npm run dev:local
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

Redis er valgfritt, men lokal Docker Compose starter Redis automatisk slik at
lokal kjøring bruker samme cacheflyt som Azure.

Hvis Redis ikke er satt opp, kjører backend direkte mot Databricks/SQL Server.

Miljøvariabler:

```env
REDIS_HOST=...
REDIS_PORT=6379
REDIS_PASSWORD=...
REDIS_TLS=false
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
