import mysql from 'mysql2/promise';
import 'dotenv/config';
// const db = "random_facts"
// const db = "test"

// Default: Mysql 5.5 Instances
const DBCONFIG = {
  host: process.env.MYSQLHOST,
  port: process.env.MYSQLPORT,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPWD,
  queueLimit: 0,
  idleTimeout: 3000,
}

const DBCONFIG2 = {
  host: process.env.MYSQLHOST,
  port: process.env.MYSQLPORT,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPWD,
  queueLimit: 0,
  idleTimeout: 3000,
}

const DBCONFIG3 = {
  host: process.env.MYSQLHOST,
  port: process.env.MYSQLPORT,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPWD,
  queueLimit: 0,
  idleTimeout: 3000,
}

// export const db = (dbname) => DBCONFIG = {...DBCONFIG, database: dbname};
// export const pool = mysql.createPool(DBCONFIG)

// export async function executeSQL(sql) {
//   const conn = await pool.getConnection()
//   try {
//     const [rows, fields] = await conn.query(sql);
//     return rows
//   } catch(err) {
//     throw err;
//   }
// }

export function formatSQL(sql, values) {
  let output = mysql.format(sql, values)
  return output
}

const pools = {};

function getPool(dbsrc, db) {
  // console.log(`[DEBUG] getPool called with dbsrc: ${dbsrc}, db: ${db}`);
  const key = `${dbsrc}:${db}`
  if (!pools[key]) {
    // console.log(`[DEBUG] Creating new pool for key: ${key}`);
    let baseConfig;
    switch(dbsrc) {
      case 55:
        baseConfig = DBCONFIG;
        break;
      case 57:
        baseConfig = DBCONFIG3;
        break;
      case 80:
        baseConfig = DBCONFIG2;
        break;
      default:
        throw new Error(`No pool config for dbsrc ${dbsrc}`)
    }

    // console.log(`[DEBUG] Base config host: ${baseConfig.host}, port: ${baseConfig.port}`);
    pools[key] = mysql.createPool({ ...baseConfig, database: db, waitForConnections: true, connectionLimit: 10, })

    pools[key].getConnection()
      .then(conn => {
        // console.log(`[DEBUG] Pool connection test successful for ${key}`);
        conn.release();
      })
      .catch(err => {
        console.error(`[DEBUG] Pool connection test failed for ${key}:`, err.message);
      });
  } else {
    // console.log(`[DEBUG] Using existing pool for key: ${key}`);
  }

  return pools[key];
}

export async function executeSQL(sql, dbsrc, db, params = undefined) {
  // console.log(`[DEBUG] executeSQL called with dbsrc: ${dbsrc}, db: ${db}, sql: ${sql.substring(0, 50)}...`);
  const pool = getPool(dbsrc, db);
  // console.log(`[DEBUG] Pool retrieved:`, !!pool);
  let connection;

  try {
    connection = await pool.getConnection();
    // console.log(`[DEBUG] Got connection from pool for ${dbsrc}:${db}`);

    const queryArgs = (params && params.length) ? [sql, params] : [sql];

    const [rows] = await connection.query(...queryArgs);

    const insertId = rows.insertId ?? null;
    // console.log(`[DEBUG] Query successful, rows: ${(rows?.length > 0) ? rows.length : JSON.stringify(rows, null, 2)}`);
    return { success: true, rowCount: rows.length, data: rows, insertId };
  } catch (err) {
    // console.error(`[DEBUG] Query failed:`, err.message);
    if (err.sqlState === '45000') {
      return { success: false, error: { message: err.sqlMessage, sql: err.sql } };
    }
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

export async function closePool(dbsrc, db) {
  const key = `${dbsrc}:${db}`;
  const pool = pools[key];
  if (pool) {
    await pool.end();
    delete pools[key];
  }
}