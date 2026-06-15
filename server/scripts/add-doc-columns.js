import dotenv from 'dotenv';
dotenv.config();
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'koyoo_taxi',
});

try {
  const [rows] = await pool.query("SHOW COLUMNS FROM driver_profiles LIKE 'license_url'");
  if (rows.length === 0) {
    await pool.query('ALTER TABLE driver_profiles ADD COLUMN license_url VARCHAR(500) DEFAULT NULL AFTER vehicle_color');
    console.log('Added license_url column');
  } else {
    console.log('license_url already exists');
  }

  const [rows2] = await pool.query("SHOW COLUMNS FROM driver_profiles LIKE 'insurance_url'");
  if (rows2.length === 0) {
    await pool.query('ALTER TABLE driver_profiles ADD COLUMN insurance_url VARCHAR(500) DEFAULT NULL AFTER license_url');
    console.log('Added insurance_url column');
  } else {
    console.log('insurance_url already exists');
  }
} catch (e) {
  console.error('Error:', e.message);
}

pool.end();
