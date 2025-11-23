import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import pg from 'pg'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const { Pool } = pg

async function createSchema() {
  // Database connection config
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'megaquant_db',
    user: process.env.DB_USER || process.env.USER || 'zhenhaowu',
    password: process.env.DB_PASSWORD || '',
  })

  try {
    console.log('🔌 Connecting to database...')
    console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`)
    console.log(`   Database: ${process.env.DB_NAME || 'megaquant_db'}`)
    console.log(`   User: ${process.env.DB_USER || process.env.USER || 'zhenhaowu'}`)

    // Test connection
    await pool.query('SELECT NOW()')
    console.log('✅ Database connection successful!')

    // Read schema file
    const schemaPath = join(__dirname, 'schema.sql')
    console.log(`📄 Reading schema from: ${schemaPath}`)
    const schema = readFileSync(schemaPath, 'utf-8')

    // Execute schema
    console.log('🔨 Creating database schema...')
    await pool.query(schema)
    console.log('✅ Database schema created successfully!')

    // Verify tables
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)

    console.log('\n📊 Created tables:')
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`)
    })

    console.log('\n🎉 Database initialization complete!')
  } catch (error: any) {
    console.error('❌ Error creating schema:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run if called directly
createSchema()
