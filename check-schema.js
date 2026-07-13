const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/settlement_sense' });

async function run() {
  // Test fixed getDoctors query
  console.log('--- Testing fixed getDoctors ---');
  try {
    const r = await pool.query(
      "SELECT u.id, u.full_name AS name, u.role, d.availability_json FROM users u INNER JOIN doctors d ON u.id = d.user_id WHERE u.role = 'doctor'"
    );
    console.log('getDoctors OK, rows:', r.rows.length, JSON.stringify(r.rows));
  } catch (e) {
    console.error('getDoctors ERROR:', e.message);
  }

  // Test checkPatient query
  console.log('\n--- Testing checkPatient ---');
  try {
    const r = await pool.query(
      "SELECT id, first_name, last_name, phone, email FROM patients LIMIT 3"
    );
    console.log('patients OK, rows:', r.rows.length, JSON.stringify(r.rows));
  } catch (e) {
    console.error('patients ERROR:', e.message);
  }

  await pool.end();
}

run().catch(e => { console.error(e.message); pool.end(); });
