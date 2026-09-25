const apiBase = import.meta.env.VITE_API_URL || "https://d5damfj543i9uno4kbv1.0ly8ed4d.apigw.yandexcloud.net";

async function request(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...options.headers,
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Не удалось выполнить запрос");
  return result;
}

export async function loadProducts(adminToken = "") {
  const result = await request("/products", { token: adminToken });
  return result.products || [];
}

export async function saveProduct(product, adminToken) {
  const path = product.id ? `/products/${product.id}` : "/products";
  const method = product.id ? "PUT" : "POST";
  const result = await request(path, { method, token: adminToken, body: JSON.stringify(product) });
  return result.product;
}

export async function deleteProduct(id, adminToken) {
  return request(`/products/${id}`, { method: "DELETE", token: adminToken });
}

export async function saveOrder(order) {
  return request("/orders", {
    method: "POST",
    body: JSON.stringify({ ...order, consent: true, source: window.location.hostname || "website" }),
  });
}

export async function loadOrders(adminToken) {
  const result = await request("/orders", { token: adminToken });
  return result.orders || [];
}

export async function validateAdminToken(adminToken) {
  await loadProducts(adminToken);
  return true;
}
