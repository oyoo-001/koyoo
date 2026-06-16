import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config({ path: new URL('../../.env', import.meta.url).pathname });

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  const migrations = [
    `ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS paystack_reference VARCHAR(100) DEFAULT NULL AFTER status`,
    `ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT NULL AFTER paystack_reference`,
    `ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS current_heading DECIMAL(5,1) DEFAULT NULL AFTER current_lng`,
    `ALTER TABLE rides ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP NULL DEFAULT NULL AFTER completed_at`,
    `ALTER TABLE rides ADD COLUMN IF NOT EXISTS pickup_region VARCHAR(20) DEFAULT NULL AFTER driver_vehicle_type`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_restricted BOOLEAN DEFAULT FALSE AFTER avatar_url`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS restriction_reason VARCHAR(255) DEFAULT NULL AFTER is_restricted`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS restricted_at TIMESTAMP NULL DEFAULT NULL AFTER restriction_reason`,
    `ALTER TABLE rider_profiles ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5,2) DEFAULT 0.00 AFTER total_spent`,
    `ALTER TABLE rider_profiles ADD COLUMN IF NOT EXISTS discount_eligible_rides INT DEFAULT 5 AFTER discount_percent`,
    `ALTER TABLE rider_profiles ADD COLUMN IF NOT EXISTS rides_since_discount INT DEFAULT 0 AFTER discount_eligible_rides`,
  ];

  for (const sql of migrations) {
    try {
      await conn.query(sql);
      console.log('OK:', sql.slice(0, 80));
    } catch (e) {
      console.log('SKIP:', e.message.slice(0, 80));
    }
  }

  await conn.end();
  console.log('Migration complete');
}

migrate().catch((e) => {
  console.error('Migration failed:', e.message);
  console.error('Stack:', e.stack);
  process.exit(1);
});
