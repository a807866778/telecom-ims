import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

export { schema };

// Lazy initialization - only connects when actually needed
let _db = null;

export function getDb() {
  if (!_db) {
    // During build phase, DATABASE_URL won't be set, so skip
    if (!process.env.DATABASE_URL && process.env.NODE_ENV === "production") {
      return null;
    }
    const url = process.env.DATABASE_URL || "file:./data/project-inventory.db";
    const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
    _db = drizzle(client, { schema });
  }
  return _db;
}

// Export a db-like object that returns empty results when not available
export const db = new Proxy({}, {
  get(target, prop) {
    const database = getDb();
    if (!database) {
      // Return a function that returns empty results
      return () => Promise.resolve(prop === '$count' ? 0 : []);
    }
    const value = database[prop];
    if (typeof value === 'function') {
      return value.bind(database);
    }
    return value;
  }
});
