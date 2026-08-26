const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "shashank@9473",
  database: "job_portal",
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;