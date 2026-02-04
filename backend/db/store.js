const { join } = require('path');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');

const file = join(__dirname, 'data.json');
const adapter = new JSONFile(file);
const defaultData = {
  users: [],
  products: [],
  carts: {} // userId -> { items: [{ productId, quantity }] }
};

async function getDb() {
  const db = new Low(adapter, defaultData);
  await db.read();
  db.data ||= defaultData;
  return db;
}

module.exports = { getDb };
