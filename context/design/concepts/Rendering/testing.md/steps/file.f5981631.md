---
timestamp: 'Mon Oct 20 2025 01:18:59 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_011859.9a809d37.md]]'
content_id: f598163187db6e946c1e4a88c888fd04d0e6e04588cdfa737a9876d0905657e6
---

# file: src/utils/database.ts

```typescript
import { MongoClient, Db } from "npm:mongodb";
import { config } from "https://deno.land/std@0.200.0/dotenv/mod.ts";
import { ID } from "./types.ts";

// Load environment variables from .env file
const env = await config();

const MONGO_URL = env["MONGO_URL"] || "mongodb://localhost:27017";
const MONGO_DB_NAME = env["MONGO_DB_NAME"] || "concept_design_db";

let db: Db | null = null;
let client: MongoClient | null = null;

export const getDb = async (): Promise<[Db, MongoClient]> => {
  if (!db || !client) {
    client = new MongoClient(MONGO_URL);
    await client.connect();
    db = client.db(MONGO_DB_NAME);
    console.log(`Connected to MongoDB database: ${MONGO_DB_NAME}`);
  }
  // The client is guaranteed to be non-null here due to the conditional logic
  return [db!, client!];
};

export const closeDb = async () => {
  if (client) {
    await client.close();
    console.log("MongoDB connection closed.");
    db = null;
    client = null;
  }
};

// Helper function to generate a fresh ID for MongoDB _id fields
export const freshID = (): ID => crypto.randomUUID() as ID;

// Helper to assert a string as an ID
export const asID = (id: string): ID => id as ID;
```
