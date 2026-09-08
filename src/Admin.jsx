import { useEffect, useState } from "react";
import { ArrowLeft, Check, Plus, SignOut, Trash } from "@phosphor-icons/react";
import { hasSupabase, loadOrders, supabase } from "./supabase.js";

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
  const [ordersToken, setOrdersToken] = useState(() => sessionStorage.getItem("orders-admin-token") || "");
  const [ordersError, setOrdersError] = useState("");
  const [draft, setDraft] = useState(blankProduct);
  const [message, setMessage] = useState("");

  const refresh = async () => {
    const [{ data: productData }, orderData] = await Promise.all([
      supabase.from("products").select("*").order("sort_order"),
      ordersToken ? loadOrders(ordersToken).catch((error) => {
        setOrdersError(error.message);
        return [];
      }) : Promise.resolve([]),
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
  }, [session, ordersToken]);

  const unlockOrders = async (event) => {
    event.preventDefault();
    const token = String(new FormData(event.currentTarget).get("orders-token") || "").trim();
    setOrdersError("");
    try {
      const nextOrders = await loadOrders(token);
      sessionStorage.setItem("orders-admin-token", token);
      setOrdersToken(token);
      setOrders(nextOrders);
    } catch (error) {
      setOrdersError(error.message);
    }
  };

  const lockOrders = () => {
    sessionStorage.removeItem("orders-admin-token");
    setOrdersToken("");
    setOrders([]);
  };

  const login = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.get("email"),
      password: form.get("password"),
    });
    setMessage(error ? error.message : "");
  };

  const updatePassword = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = form.get("new-password");
    const confirmation = form.get("password-confirmation");

    if (password !== confirmation) {
      setMessage("Пароли не совпадают");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    setMessage(error ? error.message : "Пароль сохранён");
    if (!error) event.currentTarget.reset();
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
        <h2>Пароль администратора</h2>
        <form className="admin-login" onSubmit={updatePassword}>
          <p>При первом входе задайте пароль, который будете использовать в дальнейшем.</p>
          <label>Новый пароль<input name="new-password" type="password" minLength="8" required /></label>
          <label>Повторите пароль<input name="password-confirmation" type="password" minLength="8" required /></label>
          <button className="button" type="submit">Сохранить пароль</button>
        </form>
      </section>

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
        {!ordersToken ? (
          <form className="admin-login" onSubmit={unlockOrders}>
            <p>Введите отдельный ключ заявок. Он хранится только до закрытия браузера.</p>
            <label>Ключ заявок<input name="orders-token" type="password" autoComplete="off" required /></label>
            <button className="button" type="submit">Открыть заявки</button>
            {ordersError && <p className="admin-message">{ordersError}</p>}
          </form>
        ) : (
          <>
            <div className="orders-toolbar">
              <button className="admin-link" type="button" onClick={refresh}>Обновить заявки</button>
              <button className="admin-link" type="button" onClick={lockOrders}>Закрыть доступ</button>
            </div>
            {ordersError && <p className="admin-message">{ordersError}</p>}
            <div className="admin-orders">
              {orders.length === 0 && <p>Новых заявок пока нет.</p>}
              {orders.map((order) => (
            <article key={order.id}>
              <div className="order-field">
                <span>Клиент</span>
                <strong>{order.customer_name}</strong>
              </div>
              <div className="order-field">
                <span>Десерт</span>
                <strong>{order.product_name}</strong>
              </div>
              <div className="order-field">
                <span>Желаемая дата</span>
                <strong>{order.desired_date || "Не указана"}</strong>
              </div>
              <div className="order-field">
                <span>Телефон</span>
                <a href={order.customer_phone ? `tel:${order.customer_phone}` : undefined}>
                  {order.customer_phone || "Не указан"}
                </a>
              </div>
              {order.comment && (
                <div className="order-comment">
                  <span>Комментарий</span>
                  <p>{order.comment}</p>
                </div>
              )}
            </article>
              ))}
            </div>
          </>
        )}
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
