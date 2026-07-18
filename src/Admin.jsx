import { useEffect, useState } from "react";
import { ArrowLeft, Check, Plus, SignOut, Trash } from "@phosphor-icons/react";
import { hasSupabase, supabase } from "./supabase.js";

const blankProduct = {
  name: "",
  description: "",
  price: 0,
  weight: "",
  image_url: "",
  is_active: true,
  sort_order: 100,
};

export function Admin() {
  const [session, setSession] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [draft, setDraft] = useState(blankProduct);
  const [message, setMessage] = useState("");

  const refresh = async () => {
    const [{ data: productData }, { data: orderData }] = await Promise.all([
      supabase.from("products").select("*").order("sort_order"),
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
    ]);
    setProducts(productData || []);
    setOrders(orderData || []);
  };

  useEffect(() => {
    if (!hasSupabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) refresh();
  }, [session]);

  const login = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.get("email"),
      password: form.get("password"),
    });
    setMessage(error ? error.message : "");
  };

  const saveProduct = async (product) => {
    const { id, created_at, updated_at, ...payload } = product;
    const query = id
      ? supabase.from("products").update(payload).eq("id", id)
      : supabase.from("products").insert(payload);
    const { error } = await query;
    setMessage(error ? error.message : "Изменения сохранены");
    if (!error) {
      setDraft(blankProduct);
      refresh();
    }
  };

  const removeProduct = async (id) => {
    if (!window.confirm("Удалить десерт?")) return;
    await supabase.from("products").delete().eq("id", id);
    refresh();
  };

  if (!hasSupabase) {
    return <AdminShell><p>Supabase ещё не подключён. Добавьте переменные из <code>.env.example</code>.</p></AdminShell>;
  }

  if (!session) {
    return (
      <AdminShell>
        <form className="admin-login" onSubmit={login}>
          <h2>Вход для администратора</h2>
          <label>Email<input name="email" type="email" required /></label>
          <label>Пароль<input name="password" type="password" required /></label>
          <button className="button" type="submit">Войти</button>
          {message && <p className="admin-message">{message}</p>}
        </form>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="admin-toolbar">
        <div><p className="eyebrow">Управление сайтом</p><h1>Каталог и заявки</h1></div>
        <button className="admin-link" type="button" onClick={() => supabase.auth.signOut()}><SignOut /> Выйти</button>
      </div>

      {message && <p className="admin-message"><Check /> {message}</p>}

      <section className="admin-section">
        <h2>Десерты</h2>
        <ProductEditor product={draft} onChange={setDraft} onSave={saveProduct} submitLabel="Добавить десерт" />
        <div className="admin-product-list">
          {products.map((product) => (
            <ProductEditor
              key={product.id}
              product={product}
              onChange={(next) => setProducts((items) => items.map((item) => item.id === product.id ? next : item))}
              onSave={saveProduct}
              onRemove={() => removeProduct(product.id)}
              submitLabel="Сохранить"
            />
          ))}
        </div>
      </section>

      <section className="admin-section">
        <h2>Заявки</h2>
        <div className="admin-orders">
          {orders.length === 0 && <p>Новых заявок пока нет.</p>}
          {orders.map((order) => (
            <article key={order.id}>
              <strong>{order.customer_name}</strong>
              <span>{order.product_name}</span>
              <span>{order.desired_date || "Дата не указана"}</span>
              <span>{order.customer_phone || "Телефон не указан"}</span>
              {order.comment && <p>{order.comment}</p>}
            </article>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}

function AdminShell({ children }) {
  return (
    <main className="admin-page">
      <a className="admin-link" href={import.meta.env.BASE_URL}><ArrowLeft /> На сайт</a>
      {children}
    </main>
  );
}

function ProductEditor({ product, onChange, onSave, onRemove, submitLabel }) {
  const field = (key, value) => onChange({ ...product, [key]: value });
  return (
    <article className="product-editor">
      <div className="editor-grid">
        <label>Название<input value={product.name} onChange={(e) => field("name", e.target.value)} /></label>
        <label>Цена, ₽<input type="number" min="0" value={product.price} onChange={(e) => field("price", Number(e.target.value))} /></label>
        <label>Вес<input value={product.weight} onChange={(e) => field("weight", e.target.value)} /></label>
        <label>Порядок<input type="number" value={product.sort_order} onChange={(e) => field("sort_order", Number(e.target.value))} /></label>
        <label className="editor-wide">Описание<textarea value={product.description} onChange={(e) => field("description", e.target.value)} /></label>
        <label className="editor-wide">Изображение: URL или images/имя.webp<input value={product.image_url} onChange={(e) => field("image_url", e.target.value)} /></label>
        <label className="editor-check"><input type="checkbox" checked={product.is_active} onChange={(e) => field("is_active", e.target.checked)} /> Показывать на сайте</label>
      </div>
      <div className="editor-actions">
        <button className="button" type="button" onClick={() => onSave(product)}><Plus /> {submitLabel}</button>
        {onRemove && <button className="danger-button" type="button" onClick={onRemove}><Trash /> Удалить</button>}
      </div>
    </article>
  );
}
