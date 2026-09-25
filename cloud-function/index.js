import { Driver } from '@ydbjs/core';
import { query } from '@ydbjs/query';
import { MetadataCredentialsProvider } from '@ydbjs/auth/metadata';
import { randomUUID, timingSafeEqual } from 'node:crypto';

const allowedOrigins = new Set([
  'https://avaddonak.github.io',
  'http://localhost:5173',
]);

function response(statusCode, payload, origin) {
  const allowedOrigin = allowedOrigins.has(origin) ? origin : 'https://avaddonak.github.io';
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Vary': 'Origin',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(payload),
    isBase64Encoded: false,
  };
}

function clean(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function authorized(event) {
  const expected = process.env.ADMIN_TOKEN || '';
  const header = event.headers?.authorization || event.headers?.Authorization || '';
  const received = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!expected || expected.length !== received.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

function hasAuthorization(event) {
  return Boolean(event.headers?.authorization || event.headers?.Authorization);
}

function jsonSafe(value) {
  if (typeof value === 'bigint') return Number(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, jsonSafe(item)]));
  return value;
}

async function withDatabase(work) {
  const connectionString = process.env.YDB_CONNECTION_STRING;
  if (!connectionString) throw new Error('YDB_CONNECTION_STRING is missing');
  const driver = new Driver(connectionString, { credentialsProvider: new MetadataCredentialsProvider() });
  try {
    await driver.ready();
    return await work(query(driver));
  } finally { await driver.close(); }
}

function parseBody(event) {
  if (!event.body) return {};
  return typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
}

function productPayload(body) {
  const imageData = clean(body.image_data, 1_900_000);
  if (body.image_data && !imageData.startsWith('data:image/')) throw new Error('Некорректный формат фотографии');
  return {
    name: clean(body.name, 160),
    description: clean(body.description, 2500),
    price: Number(body.price),
    weight: clean(body.weight, 80),
    image_url: clean(body.image_url, 1200),
    image_data: imageData,
    is_active: body.is_active !== false,
    sort_order: Number.isFinite(Number(body.sort_order)) ? Math.trunc(Number(body.sort_order)) : 100,
  };
}

async function productsHandler(event, method, path, origin) {
  if (hasAuthorization(event) && !authorized(event)) return response(401, { error: 'Неверный ключ администратора' }, origin);
  const admin = authorized(event);

  if (method === 'GET') {
    try {
      const rows = await withDatabase(async (sql) => {
        const fields = `id, name, description, price, weight, image_url, image_data, is_active, sort_order, created_at, updated_at`;
        if (admin) {
          const [result] = await sql`SELECT id, name, description, price, weight, image_url, image_data, is_active, sort_order, created_at, updated_at FROM products ORDER BY sort_order, name`;
          return result || [];
        }
        const [result] = await sql`SELECT id, name, description, price, weight, image_url, image_data, is_active, sort_order, created_at, updated_at FROM products WHERE is_active = true ORDER BY sort_order, name`;
        return result || [];
      });
      return response(200, { products: jsonSafe(rows) }, origin);
    } catch (error) {
      console.error('Product list failed', error);
      return response(500, { error: 'Не удалось загрузить каталог' }, origin);
    }
  }

  if (!admin) return response(401, { error: 'Требуется ключ администратора' }, origin);
  const idFromPath = path.match(/\/products\/([^/?]+)/)?.[1];

  if (method === 'DELETE' && idFromPath) {
    try {
      await withDatabase(async (sql) => { await sql`DELETE FROM products WHERE id = ${idFromPath}`; });
      return response(200, { ok: true }, origin);
    } catch (error) {
      console.error('Product delete failed', error);
      return response(500, { error: 'Не удалось удалить десерт' }, origin);
    }
  }

  if ((method === 'POST' && path.endsWith('/products')) || (method === 'PUT' && idFromPath)) {
    let body;
    try { body = parseBody(event); } catch { return response(400, { error: 'Некорректный формат данных' }, origin); }
    let product;
    try { product = productPayload(body); } catch (error) { return response(400, { error: error.message }, origin); }
    if (!product.name) return response(400, { error: 'Укажите название десерта' }, origin);
    if (!Number.isFinite(product.price) || product.price < 0) return response(400, { error: 'Проверьте цену десерта' }, origin);
    const id = idFromPath || randomUUID();
    try {
      await withDatabase(async (sql) => {
        if (method === 'POST') {
          await sql`UPSERT INTO products (id, name, description, price, weight, image_url, image_data, is_active, sort_order, created_at, updated_at) VALUES (${id}, ${product.name}, ${product.description}, ${product.price}, ${product.weight}, ${product.image_url}, ${product.image_data}, ${product.is_active}, ${product.sort_order}, CurrentUtcTimestamp(), CurrentUtcTimestamp())`;
        } else {
          await sql`UPDATE products SET name = ${product.name}, description = ${product.description}, price = ${product.price}, weight = ${product.weight}, image_url = ${product.image_url}, image_data = ${product.image_data}, is_active = ${product.is_active}, sort_order = ${product.sort_order}, updated_at = CurrentUtcTimestamp() WHERE id = ${id}`;
        }
      });
      return response(method === 'POST' ? 201 : 200, { ok: true, product: { id, ...product } }, origin);
    } catch (error) {
      console.error('Product save failed', error);
      return response(500, { error: 'Не удалось сохранить десерт' }, origin);
    }
  }
  return response(405, { error: 'Метод не поддерживается' }, origin);
}

async function ordersHandler(event, method, origin) {
  if (method === 'GET') {
    if (!authorized(event)) return response(401, { error: 'Требуется ключ администратора' }, origin);
    try {
      const rows = await withDatabase(async (sql) => {
        const [result] = await sql`SELECT id, created_at, customer_name, customer_phone, product_name, desired_date, comment, consent_given_at, consent_version, marketing_consent, source FROM orders ORDER BY created_at DESC LIMIT 500`;
        return result || [];
      });
      return response(200, { orders: jsonSafe(rows) }, origin);
    } catch (error) {
      console.error('Order list failed', error);
      return response(500, { error: 'Не удалось загрузить заявки' }, origin);
    }
  }
  if (method !== 'POST') return response(405, { error: 'Метод не поддерживается' }, origin);
  let body;
  try { body = parseBody(event); } catch { return response(400, { error: 'Некорректный формат заявки' }, origin); }
  if (body.website) return response(200, { ok: true }, origin);
  const customerName = clean(body.customer_name ?? body.name, 120);
  const customerPhone = clean(body.customer_phone ?? body.phone, 40);
  const productName = clean(body.product_name ?? body.product, 200);
  const desiredDate = clean(body.desired_date ?? body.date, 40);
  const comment = clean(body.comment, 1500);
  const consentVersion = clean(body.consent_version, 40) || '2026-09-08';
  const source = clean(body.source, 120) || 'website';
  const marketingConsent = body.marketing_consent === true;
  if (!customerName || customerName.length < 2) return response(400, { error: 'Укажите имя' }, origin);
  if (!/^\+?[0-9()\-\s]{7,24}$/.test(customerPhone)) return response(400, { error: 'Проверьте номер телефона' }, origin);
  if (!productName) return response(400, { error: 'Выберите десерт' }, origin);
  if (body.consent !== true && body.consent_given !== true) return response(400, { error: 'Необходимо согласие на обработку данных' }, origin);
  const id = randomUUID();
  try {
    await withDatabase(async (sql) => { await sql`UPSERT INTO orders (id, created_at, customer_name, customer_phone, product_name, desired_date, comment, consent_given_at, consent_version, marketing_consent, source) VALUES (${id}, CurrentUtcTimestamp(), ${customerName}, ${customerPhone}, ${productName}, ${desiredDate}, ${comment}, CurrentUtcTimestamp(), ${consentVersion}, ${marketingConsent}, ${source})`; });
    return response(201, { ok: true, id }, origin);
  } catch (error) {
    console.error('Order save failed', error);
    return response(500, { error: 'Не удалось сохранить заявку. Попробуйте ещё раз.' }, origin);
  }
}

export async function handler(event) {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const method = event.httpMethod || event.requestContext?.http?.method || 'POST';
  const path = event.path || event.rawPath || event.requestContext?.http?.path || '/orders';
  if (method === 'OPTIONS') return response(204, {}, origin);
  if (origin && !allowedOrigins.has(origin)) return response(403, { error: 'Источник запроса не разрешён' }, origin);
  if (path.startsWith('/products')) return productsHandler(event, method, path, origin);
  if (path.startsWith('/orders')) return ordersHandler(event, method, origin);
  return response(404, { error: 'Маршрут не найден' }, origin);
}
