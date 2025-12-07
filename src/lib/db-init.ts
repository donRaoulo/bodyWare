import { initializeDatabase } from './database';

// Initialize database when this module is imported
let initialized = false;

export function ensureDatabaseInitialized() {
  if (!initialized) {
    initializeDatabase();
    initialized = true;
  }
}

// Auto-initialize when imported
ensureDatabaseInitialized();