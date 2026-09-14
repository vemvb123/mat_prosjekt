-- Lokalt SQL Server-skjema for gold-tabellen appen leser fra.
--
-- Kjør denne mot den lokale databasen mat_prosjekt før du importerer data fra
-- Databricks-exporten. Kolonnenavnene matcher backend-spørringene direkte.

IF DB_ID(N'mat_prosjekt') IS NULL
BEGIN
  CREATE DATABASE mat_prosjekt;
END;
GO

USE mat_prosjekt;
GO

IF OBJECT_ID(N'dbo.product_nutritiens_gold', N'U') IS NOT NULL
BEGIN
  DROP TABLE dbo.product_nutritiens_gold;
END;
GO

CREATE TABLE dbo.product_nutritiens_gold (
  chain NVARCHAR(50) NOT NULL,
  title NVARCHAR(500) NOT NULL,
  brand NVARCHAR(500) NULL,
  description NVARCHAR(MAX) NULL,
  website_url NVARCHAR(1200) NULL,
  image_url NVARCHAR(1200) NULL,
  price_per_unit FLOAT NOT NULL,
  compare_price_per_unit FLOAT NOT NULL,
  compare_unit NVARCHAR(20) NOT NULL,
  subtitle NVARCHAR(500) NULL,
  ean NVARCHAR(100) NULL,
  energy_amount FLOAT NULL,
  calories_amount FLOAT NULL,
  fat_amount FLOAT NULL,
  saturated_fat_amount FLOAT NULL,
  carbohydrates_amount FLOAT NULL,
  sugars_amount FLOAT NULL,
  protein_amount FLOAT NULL,
  salt_amount FLOAT NULL,
  energy_per_package FLOAT NULL,
  calories_per_package FLOAT NULL,
  fat_per_package FLOAT NULL,
  saturated_fat_per_package FLOAT NULL,
  carbohydrates_per_package FLOAT NULL,
  sugars_per_package FLOAT NULL,
  protein_per_package FLOAT NULL,
  salt_per_package FLOAT NULL,
  energy_per_nok FLOAT NULL,
  calories_per_nok FLOAT NULL,
  fat_per_nok FLOAT NULL,
  saturated_fat_per_nok FLOAT NULL,
  carbohydrates_per_nok FLOAT NULL,
  sugars_per_nok FLOAT NULL,
  protein_per_nok FLOAT NULL,
  salt_per_nok FLOAT NULL
);
GO

CREATE INDEX IX_product_nutritiens_gold_product_search
ON dbo.product_nutritiens_gold (compare_unit, compare_price_per_unit, chain)
INCLUDE (title, brand, subtitle);
GO

CREATE INDEX IX_product_nutritiens_gold_nutrients
ON dbo.product_nutritiens_gold (compare_unit, chain, protein_per_nok, energy_per_nok, calories_per_nok);
GO
