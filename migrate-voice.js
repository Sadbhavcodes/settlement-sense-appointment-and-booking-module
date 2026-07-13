const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/settlement_sense'
});

async function migrate() {
  try {
    const sqlPath = path.join(__dirname, 'db', 'migration-voice-ai.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Running Voice AI Database Migration...');
    await pool.query(sql);
    console.log('✅ Migration completed successfully!');
    
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

migrate();
