import { initDatabase, getDatabase, closeDatabase, query as sqliteQuery, execute as sqliteExecute, withTransaction as sqliteTransaction } from './sqlite.js'

// Export initialization
export { initDatabase, closeDatabase }

// Compatibility layer to match PostgreSQL API
export async function query(sql: string, params: any[] = []): Promise<{ rows: any[] }> {
  try {
    const rows = sqliteQuery(sql, params)
    return { rows }
  } catch (error: any) {
    console.error('Database query error:', error.message)
    throw error
  }
}

export async function execute(sql: string, params: any[] = []): Promise<{ rows: any[], rowCount: number }> {
  try {
    const result = sqliteExecute(sql, params)

    // For INSERT statements, get the inserted row
    if (sql.trim().toUpperCase().startsWith('INSERT') && sql.includes('RETURNING')) {
      // SQLite doesn't support RETURNING, so we need to get the last inserted row
      const db = getDatabase()
      const lastId = result.lastInsertRowid

      // Extract table name from INSERT statement
      const tableMatch = sql.match(/INSERT\s+INTO\s+(\w+)/i)
      if (tableMatch && lastId) {
        const tableName = tableMatch[1]
        const rows = sqliteQuery(`SELECT * FROM ${tableName} WHERE rowid = ?`, [lastId])
        return { rows, rowCount: result.changes }
      }
    }

    return { rows: [], rowCount: result.changes }
  } catch (error: any) {
    console.error('Database execute error:', error.message)
    throw error
  }
}

export async function withTransaction<T>(callback: () => Promise<T>): Promise<T> {
  const db = getDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(callback)
    try {
      const result = transaction()
      resolve(result)
    } catch (error) {
      reject(error)
    }
  })
}
