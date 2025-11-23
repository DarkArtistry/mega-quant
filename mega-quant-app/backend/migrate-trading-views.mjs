import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'config.db');
console.log(`Migrating database at: ${dbPath}`);

try {
  const db = new Database(dbPath);
  
  // Check if trading_views column exists
  const tableInfo = db.prepare("PRAGMA table_info(strategies)").all();
  const hasColumn = tableInfo.some(col => col.name === 'trading_views');
  
  if (!hasColumn) {
    console.log('Adding trading_views column...');
    db.prepare("ALTER TABLE strategies ADD COLUMN trading_views TEXT DEFAULT '[]'").run();
    console.log('✅ Successfully added trading_views column');
  } else {
    console.log('✅ trading_views column already exists');
  }
  
  db.close();
} catch (error) {
  console.error('Migration error:', error.message);
  process.exit(1);
}
