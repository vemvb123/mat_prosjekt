import { join, resolve } from "node:path";

// Felles konfigurasjon for lokal Node-server.
//
// Her samles stier og port/host, slik at server og statisk filserver bruker de
// samme verdiene.
const rootDir = resolve(import.meta.dirname, "..");
const distDir = join(rootDir, "frontend", "dist");
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || "3001");

export { distDir, host, port, rootDir };
