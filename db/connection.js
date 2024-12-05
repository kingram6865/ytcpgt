import mysql from 'mysql2/promise';
import 'dotenv/config';
const db = "random_facts"
// const db = "test"

// Default: Mysql 5.5 Instances
const DBCONFIG = {
  host: process.env.MYSQLHOST,
  port: process.env.MYSQLPORT,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPWD,
  database: db,
  queueLimit: 0,
  idleTimeout: 3000,
}

const pool = mysql.createPool(DBCONFIG)

export async function executeSQL(sql) {
  const conn = await pool.getConnection()
  try {
    const [rows, fields] = await conn.query(sql);
    conn.destroy()
    return rows
  } catch(err) {
    throw err;
  }
}

export function formatSQL(sql, values) {
  let output = mysql.format(sql, values)
  return output
}
