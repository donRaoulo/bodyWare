import { initDatabase } from './database';

// Initialize database when this module is imported
let initialized = false;

export function ensureDatabaseInitialized() {
  if (!initialized) {
    initialized = true;
    // fire-and-forget initialization
    initDatabase().catch((err) => {
      console.error('Database init failed', err);
      initialized = false;
    });
  }
}

// Auto-initialize when imported
ensureDatabaseInitialized();
