import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const ordersApiUrl =
  import.meta.env.VITE_ORDERS_API_URL ||
  "https://d5damfj543i9uno4kbv1.0ly8ed4d.apigw.yandexcloud.net/orders";

export const hasSupabase = Boolean(url && anonKey);
export const supabase = hasSupabase
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

export async function loadProducts() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return data;
}

export async function saveOrder(order) {
  const response = await fetch(ordersApiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...order,
      consent: true,
      source: window.location.hostname || "website",
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || "Не удалось сохранить заявку");
  }

  return { stored: true, id: result.id };
}

export async function loadOrders(adminToken) {
  const response = await fetch(ordersApiUrl, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || "Не удалось загрузить заявки");
  }
  return result.orders || [];
}
