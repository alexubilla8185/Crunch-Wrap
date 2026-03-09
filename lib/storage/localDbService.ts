import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Insight } from '../schemas';

interface CrispyBaconDB extends DBSchema {
  pending_insights: {
    key: string;
    value: Insight;
    indexes: { 'by-status': string, 'by-processing-status': string };
  };
}

const DB_NAME = 'crispy_bacon_v2';
const STORE_NAME = 'pending_insights';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<CrispyBaconDB>> | null = null;

function getDB() {
  if (typeof window === 'undefined') {
    return null; // IndexedDB is not available on the server
  }
  
  if (!dbPromise) {
    dbPromise = openDB<CrispyBaconDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        if (oldVersion < 1) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('by-status', 'sync_status');
        }
        if (oldVersion < 2) {
          const store = transaction.objectStore(STORE_NAME);
          if (!store.indexNames.contains('by-processing-status')) {
            store.createIndex('by-processing-status', 'processing_status');
          }
        }
      },
    });
  }
  return dbPromise;
}

export async function saveInsight(insight: Insight): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.put(STORE_NAME, insight);
}

export async function getInsight(id: string): Promise<Insight | undefined> {
  const db = await getDB();
  if (!db) return undefined;
  return db.get(STORE_NAME, id);
}

export async function getAllLocalInsights(): Promise<Insight[]> {
  const db = await getDB();
  if (!db) return [];
  // Return all insights so the orchestrator can filter them based on status
  return db.getAll(STORE_NAME);
}

export async function getAllUploadingOrAnalyzingInsights(): Promise<Insight[]> {
  const db = await getDB();
  if (!db) return [];
  const uploading = await db.getAllFromIndex(STORE_NAME, 'by-processing-status', 'uploading');
  const analyzing = await db.getAllFromIndex(STORE_NAME, 'by-processing-status', 'analyzing');
  return [...uploading, ...analyzing];
}

export async function getAllInsights(): Promise<Insight[]> {
  const db = await getDB();
  if (!db) return [];
  return db.getAll(STORE_NAME);
}

export async function deleteInsight(id: string): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.delete(STORE_NAME, id);
}

export async function clearAllInsights(): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.clear(STORE_NAME);
}
