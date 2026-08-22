import { DatabaseSync } from "node:sqlite";
import { dbPath } from "./config.mjs";

const db = new DatabaseSync(dbPath, { readOnly: true });

function getLatestRun() {
  return db.prepare(`
    SELECT run_id, week_key, captured_at, warnings_json
    FROM import_runs
    WHERE status = 'completed'
    ORDER BY captured_at DESC
    LIMIT 1
  `).get();
}

export { db, getLatestRun };
