import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

// Lettvekts .env-loader for lokal kjøring.
//
// Node leser ikke .env-filer automatisk. Denne filen gjør lokal utvikling
// enklere uten å legge inn en ekstra dependency bare for miljøvariabler.

const backendDir = import.meta.dirname;
const projectRoot = resolve(backendDir, "..");

// Filene leses i denne rekkefølgen. Senere filer overstyrer ikke variabler som
// allerede finnes i prosessen, slik at ekte shell-/Azure-variabler vinner.
const envFiles = [
  join(projectRoot, ".env"),
  join(projectRoot, ".env.local"),
  join(backendDir, ".env"),
  join(backendDir, ".env.local"),
];

// Fjerner enkle/doble anførselstegn rundt verdier hvis de finnes.
function unquote(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

// Parser KEY=value-linjer. Tomme linjer og kommentarer ignoreres.
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = unquote(trimmed.slice(separatorIndex + 1));
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

// Last alle relevante lokale env-filer når modulen importeres.
for (const filePath of envFiles) {
  loadEnvFile(filePath);
}
