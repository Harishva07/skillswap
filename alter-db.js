const db = require('./backend/config/db');

async function alterTable() {
  try {
    await db.query('ALTER TABLE exchange_requests MODIFY offered_skill_id INT NULL');
    console.log('Successfully altered exchange_requests table');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

alterTable();
