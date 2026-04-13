const fs = require("fs");
const mysql = require("mysql2/promise");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) {
      continue;
    }

    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function isTruthy(value) {
  if (!value) {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function createPool(env) {
  const poolConfig = {
    host: env.DB_HOST || "localhost",
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || "root",
    password: env.DB_PASSWORD || "",
    database: env.DB_NAME || "museumdb",
    waitForConnections: true,
    connectionLimit: 10,
  };

  if (isTruthy(env.DB_SSL)) {
    poolConfig.ssl = {
      rejectUnauthorized: false,
    };
  }

  return mysql.createPool(poolConfig);
}

module.exports = {
  createPool,
  loadEnv,
};
