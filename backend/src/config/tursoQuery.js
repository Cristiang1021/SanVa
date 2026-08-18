const { getTursoClient } = require('./tursoClient');

const rowsToObjects = (result) => {
  const { columns, rows } = result;
  return rows.map((row) => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
};

const tursoExecute = async (sql, args = []) => {
  const client = getTursoClient();
  if (!client) throw new Error('Turso no configurado');
  return client.execute({ sql, args });
};

const tursoAll = async (sql, args = []) => {
  const result = await tursoExecute(sql, args);
  return rowsToObjects(result);
};

const tursoGet = async (sql, args = []) => {
  const rows = await tursoAll(sql, args);
  return rows[0] || null;
};

module.exports = { tursoExecute, tursoAll, tursoGet, rowsToObjects };
