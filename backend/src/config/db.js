import mysql from 'mysql2/promise';

let pool = null;
let connected = false;

export function initDatabase() {
  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

  if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
    console.warn('MySQL env values missing; using in-memory demo mode.');
    return false;
  }

  try {
    pool = mysql.createPool({
      host: DB_HOST,
      port: Number(DB_PORT || 3306),
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    connected = true;
    console.log('MySQL pool initialized.');
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    return false;
  }
}

export async function queryDatabase(sql, params = []) {
  if (!pool) {
    throw new Error('Database not configured');
  }

  const [rows] = await pool.execute(sql, params);
  return rows;
}

export function isDatabaseReady() {
  return connected;
}
