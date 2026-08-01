import 'server-only';

import { getCloudflareContext } from '@opennextjs/cloudflare';

export function getDb() {
  const database = getCloudflareContext().env.DB;
  if (!database) {
    throw new Error('Binding D1 "DB" não configurado. Execute as migrações do Cloudflare D1.');
  }
  return database;
}

export async function all(sql, ...bindings) {
  const result = await getDb().prepare(sql).bind(...bindings).all();
  return result.results || [];
}

export async function first(sql, ...bindings) {
  return getDb().prepare(sql).bind(...bindings).first();
}

export async function run(sql, ...bindings) {
  return getDb().prepare(sql).bind(...bindings).run();
}
