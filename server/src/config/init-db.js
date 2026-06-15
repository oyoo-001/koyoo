import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function initDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  const schemaSql = fs.readFileSync(
    path.join(__dirname, 'schema.sql'),
    'utf8'
  );

  const statements = schemaSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  try {
    for (const statement of statements) {
      await connection.query(statement);
    }
    console.log('Database initialized successfully!');
  } catch (error) {
    console.error('Database initialization error:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

initDatabase();
