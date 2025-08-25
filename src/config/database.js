const knex = require('knex');
const config = require('./index');

const knexConfig = {
  client: 'pg',
  connection: config.database.url,
  pool: {
    min: 2,
    max: 10
  },
  migrations: {
    directory: './database/migrations',
    tableName: 'knex_migrations'
  },
  seeds: {
    directory: './database/seeds'
  }
};

const db = knex(knexConfig);

module.exports = db;