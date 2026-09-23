import { useEffect, useMemo, useState } from "react";
import { ArrowClockwise, ArrowLeft, Check, Eye, EyeSlash, MagnifyingGlass, NotePencil, Plus, SignOut, Trash, X } from "@phosphor-icons/react";
import { hasSupabase, loadOrders, supabase } from "./supabase.js";

const blankProduct = { name: "", description: "", price: 0, weight: "", image_url: "", is_active: true, sort_order: 100 };
const productImage = (value) => {
  if (!value) return "";
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  return `${import.meta.env.BASE_URL}${value.replace(/^\//, "")}`;
};

export function Admin() {
  const [session, setSession] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ordersToken, setOrdersToken] = useState(() => sessionStorage.getItem("orders-admin-token") || "");
  const [ordersError, setOrdersError] = useState("");
  const [draft, setDraft] = useState(blankProduct);
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  const showMessage = (text, type = "success") => { setMessage(text); setMessageType(type); };

  const refresh = async () => {
    setLoading(true);
    setOrdersError("");
    try {
      const [{ data: productData, error: productError }, orderData] = await Promise.all([
        supabase.from("products").select("*").order("sort_order"),
        ordersToken ? loadOrders(ordersToken).catch((error) => { setOrdersError(error.message); return []; }) : Promise.resolve([]),
      ]);
      if (productError) throw productError;
      setProducts(productData || []);
      setOrders(orderData || []);
    } catch (error) {
      showMessage(error.message || "Не удалось обновить данные", "error");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!hasSupabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => { if (session) refresh(); }, [session, ordersToken]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ru");
    if (!query) return products;
    return products.filter((product) => `${product.name} ${product.description}`.toLocaleLowerCase("ru").includes(query));
  }, [products, search]);

  const unlockOrders = async (event) => {
    event.preventDefault();
    const token = String(new FormData(event.currentTarget).get("orders-token") || "").trim();
    setOrdersError("");
    try {
      const nextOrders = await loadOrders(token);
      sessionStorage.setItem("orders-admin-token", token);
      setOrdersToken(token);
      setOrders(nextOrders);
    } catch (error) { setOrdersError(error.message); }
  };
  const lockOrders = () => { sessionStorage.removeItem("orders-admin-token"); setOrdersToken(""); setOrders([]); };
  const login = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({ email: form.get("email"), password: form.get("password") });
    if (error) showMessage(error.message, "error");
  };
  const updatePassword = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get("new-password") !== form.get("password-confirmation")) return showMessage("Пароли не совпадают", "error");
    const { error } = await supabase.auth.updateUser({ password: form.get("new-password") });
    showMessage(error ? error.message : "Пароль сохранён", error ? "error" : "success");
    if (!error) event.currentTarget.reset();
  };

  const saveProduct = async (product) => {
    const normalized = { ...product, name: product.name.trim(), description: product.description.trim(), weight: product.weight.trim(), image_url: product.image_url.trim(), price: Number(product.price), sort_order: Number(product.sort_order) };
    if (!normalized.name) return showMessage("Укажите название десерта", "error");
    if (!Number.isFinite(normalized.price) || normalized.price < 0) return showMessage("Проверьте цену десерта", "error");
    const { id, created_at, updated_at, ...payload } = normalized;
    setBusyId(id || "new");
    const query = id ? supabase.from("products").update(payload).eq("id", id) : supabase.from("products").insert(payload);
    const { error } = await query;
    setBusyId(null);
    showMessage(error ? error.message : id ? "Изменения сохранены" : "Десерт добавлен", error ? "error" : "success");
    if (!error) { setDraft(blankProduct); setIsAdding(false); setEditingId(null); await refresh(); }
  };
  const toggleProduct = async (product) => {
    setBusyId(product.id);
    const { error } = await supabase.from("products").update({ is_active: !product.is_active }).eq("id", product.id);
    setBusyId(null);
    if (error) return showMessage(error.message, "error");
    setProducts((items) => items.map((item) => item.id === product.id ? { ...item, is_active: !item.is_active } : item));
    showMessage(product.is_active ? "Десерт скрыт с сайта" : "Десерт опубликован");
  };
  const removeProduct = async (id) => {
    if (!window.confirm("Удалить десерт без возможности восстановления?")) return;
    setBusyId(id);
    const { error } = await supabase.from("products").delete().eq("id", id);
    setBusyId(null);
    if (error) return showMessage(error.message, "error");
    setProducts((items) => items.filter((item) => item.id !== id));
    setEditingId(null);
    showMessage("Десерт удалён");
  };

  if (!hasSupabase) return <AdminShell><p>Supabase ещё не подключён. Добавьте переменные из <code>.env.example</code>.</p></AdminShell>;
  if (!session) return <AdminShell><form className="admin-login" onSubmit={login}><p className="eyebrow">Шоколадное ателье</p><h2>Вход для администратора</h2><label>Email<input name="email" type="email" autoComplete="email" required /></label><label>Пароль<input name="password" type="password" autoComplete="current-password" required /></label><button className="button" type="submit">Войти</button>{message && <AdminMessage type={messageType}>{message}</AdminMessage>}</form></AdminShell>;

  const activeCount = products.filter((product) => product.is_active).length;
  return <AdminShell>
    <div className="admin-toolbar">
      <div><p className="eyebrow">Управление сайтом</p><h1>Каталог и заявки</h1></div>
      <div className="admin-toolbar-actions"><button className="admin-link" type="button" onClick={refresh} disabled={loading}><ArrowClockwise /> {loading ? "Обновляем…" : "Обновить"}</button><button className="admin-link" type="button" onClick={() => supabase.auth.signOut()}><SignOut /> Выйти</button></div>
    </div>
    {message && <AdminMessage type={messageType} onClose={() => setMessage("")}>{message}</AdminMessage>}
    <nav className="admin-nav" aria-label="Разделы панели"><a href="#products">Десерты <span>{products.length}</span></a><a href="#orders">Заявки <span>{ordersToken ? orders.length : "—"}</span></a><a href="#security">Доступ</a></nav>

    <section className="admin-section" id="products">
      <div className="admin-section-heading"><div><p className="eyebrow">{activeCount} опубликовано · {products.length - activeCount} скрыто</p><h2>Десерты</h2></div><button className="button" type="button" onClick={() => setIsAdding((value) => !value)}>{isAdding ? <X /> : <Plus />} {isAdding ? "Отменить" : "Добавить десерт"}</button></div>
      {isAdding && <ProductEditor product={draft} onChange={setDraft} onSave={saveProduct} busy={busyId === "new"} submitLabel="Добавить в каталог" title="Новый десерт" />}
      <label className="admin-search"><MagnifyingGlass /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Найти десерт" /></label>
      <div className="admin-product-list">
        {filteredProducts.length === 0 && <div className="admin-empty">По вашему запросу ничего не найдено.</div>}
        {filteredProducts.map((product) => <ProductRow key={product.id} product={product} editing={editingId === product.id} busy={busyId === product.id} onEdit={() => setEditingId((id) => id === product.id ? null : product.id)} onChange={(next) => setProducts((items) => items.map((item) => item.id === product.id ? next : item))} onSave={saveProduct} onToggle={() => toggleProduct(product)} onRemove={() => removeProduct(product.id)} />)}
      </div>
    </section>

    <section className="admin-section" id="orders">
      <div className="admin-section-heading"><div><p className="eyebrow">Обращения с сайта</p><h2>Заявки</h2></div></div>
      {!ordersToken ? <form className="admin-login admin-login-inline" onSubmit={unlockOrders}><p>Введите отдельный ключ заявок. Он хранится только до закрытия браузера.</p><label>Ключ заявок<input name="orders-token" type="password" autoComplete="off" required /></label><button className="button" type="submit">Открыть заявки</button>{ordersError && <AdminMessage type="error">{ordersError}</AdminMessage>}</form> : <><div className="orders-toolbar"><button className="admin-link" type="button" onClick={refresh}><ArrowClockwise /> Обновить заявки</button><button className="admin-link" type="button" onClick={lockOrders}>Закрыть доступ</button></div>{ordersError && <AdminMessage type="error">{ordersError}</AdminMessage>}<div className="admin-orders">{orders.length === 0 && <div className="admin-empty">Новых заявок пока нет.</div>}{orders.map((order) => <article key={order.id}><div className="order-field"><span>Клиент</span><strong>{order.customer_name}</strong></div><div className="order-field"><span>Десерт</span><strong>{order.product_name}</strong></div><div className="order-field"><span>Желаемая дата</span><strong>{order.desired_date || "Не указана"}</strong></div><div className="order-field"><span>Телефон</span><a href={order.customer_phone ? `tel:${order.customer_phone}` : undefined}>{order.customer_phone || "Не указан"}</a></div>{order.comment && <div className="order-comment"><span>Комментарий</span><p>{order.comment}</p></div>}</article>)}</div></>}
    </section>

    <section className="admin-section admin-security" id="security"><div><p className="eyebrow">Безопасность</p><h2>Пароль администратора</h2></div><form className="admin-login admin-login-inline" onSubmit={updatePassword}><p>Меняйте пароль только при необходимости. Минимальная длина — 8 символов.</p><label>Новый пароль<input name="new-password" type="password" minLength="8" autoComplete="new-password" required /></label><label>Повторите пароль<input name="password-confirmation" type="password" minLength="8" autoComplete="new-password" required /></label><button className="button" type="submit">Сохранить пароль</button></form></section>
  </AdminShell>;
}

function AdminMessage({ children, type = "success", onClose }) {
  return <div className={`admin-message ${type === "error" ? "is-error" : ""}`} role="status"><Check /><span>{children}</span>{onClose && <button type="button" onClick={onClose} aria-label="Закрыть сообщение"><X /></button>}</div>;
}

function ProductRow({ product, editing, busy, onEdit, onChange, onSave, onToggle, onRemove }) {
  return <article className={`admin-product ${product.is_active ? "" : "is-hidden"}`}>
    <div className="admin-product-summary"><div className="admin-product-thumb">{product.image_url ? <img src={productImage(product.image_url)} alt="" /> : <span>Нет фото</span>}</div><div className="admin-product-copy"><div className="admin-product-title"><h3>{product.name}</h3><span className={`status-pill ${product.is_active ? "is-live" : ""}`}>{product.is_active ? "На сайте" : "Скрыт"}</span></div><p>{product.description || "Описание не заполнено"}</p><strong>{Number(product.price).toLocaleString("ru-RU")} ₽ {product.weight && <small>/ {product.weight}</small>}</strong></div><div className="admin-product-actions"><button className="admin-link" type="button" onClick={onEdit}><NotePencil /> {editing ? "Закрыть" : "Изменить"}</button><button className="admin-link" type="button" onClick={onToggle} disabled={busy}>{product.is_active ? <EyeSlash /> : <Eye />} {product.is_active ? "Скрыть" : "Показать"}</button></div></div>
    {editing && <ProductEditor product={product} onChange={onChange} onSave={onSave} onRemove={onRemove} busy={busy} submitLabel="Сохранить изменения" />}
  </article>;
}

function AdminShell({ children }) { return <main className="admin-page"><a className="admin-link" href={import.meta.env.BASE_URL}><ArrowLeft /> На сайт</a>{children}</main>; }

function ProductEditor({ product, onChange, onSave, onRemove, submitLabel, title, busy }) {
  const field = (key, value) => onChange({ ...product, [key]: value });
  return <div className="product-editor">{title && <h3>{title}</h3>}<div className="editor-layout"><div className="editor-grid"><label>Название *<input required value={product.name} onChange={(e) => field("name", e.target.value)} placeholder="Например, Медовик" /></label><label>Цена, ₽ *<input type="number" min="0" step="1" required value={product.price} onChange={(e) => field("price", e.target.value)} /></label><label>Вес или количество<input value={product.weight} onChange={(e) => field("weight", e.target.value)} placeholder="600 г или 6 шт." /></label><label>Порядок на сайте<input type="number" value={product.sort_order} onChange={(e) => field("sort_order", e.target.value)} /></label><label className="editor-wide">Описание<textarea value={product.description} onChange={(e) => field("description", e.target.value)} placeholder="Состав, вкус и особенности десерта" /></label><label className="editor-wide">Ссылка на изображение<input value={product.image_url} onChange={(e) => field("image_url", e.target.value)} placeholder="images/desert.webp или https://…" /><small>Можно использовать адрес изображения или путь к фотографии в проекте.</small></label><label className="editor-check"><input type="checkbox" checked={product.is_active} onChange={(e) => field("is_active", e.target.checked)} /> Показывать десерт на сайте</label></div><div className="editor-preview"><span>Предпросмотр</span>{product.image_url ? <img src={productImage(product.image_url)} alt={`Предпросмотр: ${product.name || "десерт"}`} /> : <div>Добавьте ссылку на фотографию</div>}</div></div><div className="editor-actions"><button className="button" type="button" disabled={busy} onClick={() => onSave(product)}><Check /> {busy ? "Сохраняем…" : submitLabel}</button>{onRemove && <button className="danger-button" type="button" disabled={busy} onClick={onRemove}><Trash /> Удалить</button>}</div></div>;
}
