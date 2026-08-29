import Database, { type Database as SQLiteDatabase } from "better-sqlite3";

const dbConnections: Record<string, SQLiteDatabase> = {};
export const getDatabaseForService = (service: string): SQLiteDatabase => {
  if (dbConnections[service]) {
    return dbConnections[service];
  }

  const db = new Database(`logs_${service}.db`);

  db.exec(`
 CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY,
  timestamp TEXT NOT NULL,
  service TEXT NOT NULL,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  received_at TEXT NOT NULL,
  source_ip TEXT NOT NULL,
  env TEXT NOT NULL
)`);

  dbConnections[service] = db;

  return db;
};
