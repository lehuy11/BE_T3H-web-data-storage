const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "2905",
  database: "asset_management",
});

module.exports = pool;
