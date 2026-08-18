const { createClient } = require('@libsql/client');
const { useTurso } = require('./database');

let tursoClient = null;

const getTursoClient = () => {
  if (!useTurso) return null;
  if (!tursoClient) {
    tursoClient = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return tursoClient;
};

module.exports = { getTursoClient };
