import { useEffect, useMemo, useState } from "react";
import { ArrowClockwise, ArrowLeft, Check, Eye, EyeSlash, MagnifyingGlass, NotePencil, Plus, SignOut, Trash, X } from "@phosphor-icons/react";
import { deleteProduct, loadOrders, loadProducts, saveProduct as saveProductRequest, validateAdminToken } from "./api.js";

const blankProduct = { name: "", description: "", price: 0, weight: "", image_url: "", image_data: "", is_active: true, sort_order: 100 };
const productImage = (value, imageData = "") => {
  if (imageData) return imageData;
  if (!value) return "";
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  return `${import.meta.env.BASE_URL}${value.replace(/^\//, "")}`;
};

export function Admin() {
  const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem("admin-token") || "");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
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
      const [productData, orderData] = await Promise.all([
        loadProducts(adminToken),
        loadOrders(adminToken).catch((error) => { setOrdersError(error.message); return []; }),
      ]);
      setProducts(productData || []);
      setOrders(orderData || []);
    } catch (error) {
      showMessage(error.message || "Не удалось обновить данные", "error");
    } finally { setLoading(false); }
  };

  useEffect(() => { if (adminToken) refresh(); }, [adminToken]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ru");
    if (!query) return products;
    return products.filter((product) => `${product.name} ${product.description}`.toLocaleLowerCase("ru").includes(query));
  }, [products, search]);

  const login = async (event) => {
    event.preventDefault();
    const token = String(new FormData(event.currentTarget).get("admin-token") || "").trim();
    try {
      await validateAdminToken(token);
      sessionStorage.setItem("admin-token", token);
      setAdminToken(token);
    } catch (error) { showMessage(error.message, "error"); }
  };
  const logout = () => { sessionStorage.removeItem("admin-token"); setAdminToken(""); setProducts([]); setOrders([]); };

  const saveProduct = async (product) => {
    const normalized = { ...product, name: product.name.trim(), description: product.description.trim(), weight: product.weight.trim(), image_url: product.image_url.trim(), price: Number(product.price), sort_order: Number(product.sort_order) };
    if (!normalized.name) return showMessage("Укажите название десерта", "error");
    if (!Number.isFinite(normalized.price) || normalized.price < 0) return showMessage("Проверьте цену десерта", "error");
    const { id } = normalized;
    setBusyId(id || "new");
    try {
      await saveProductRequest(normalized, adminToken);
      showMessage(id ? "Изменения сохранены" : "Десерт добавлен");
      setDraft(blankProduct); setIsAdding(false); setEditingId(null); await refresh();
    } catch (error) { showMessage(error.message, "error"); }
    finally { setBusyId(null); }
  };
  const toggleProduct = async (product) => {
    setBusyId(product.id);
    try {
      await saveProductRequest({ ...product, is_active: !product.is_active }, adminToken);
      setProducts((items) => items.map((item) => item.id === product.id ? { ...item, is_active: !item.is_active } : item));
      showMessage(product.is_active ? "Десерт скрыт с сайта" : "Десерт опубликован");
    } catch (error) { showMessage(error.message, "error"); }
    finally { setBusyId(null); }
  };
  const removeProduct = async (id) => {
    if (!window.confirm("Удалить десерт без возможности восстановления?")) return;
    setBusyId(id);
    try {
      await deleteProduct(id, adminToken);
      setProducts((items) => items.filter((item) => item.id !== id));
      setEditingId(null); showMessage("Десерт удалён");
    } catch (error) { showMessage(error.message, "error"); }
    finally { setBusyId(null); }
  };

  if (!adminToken) return <AdminShell><form className="admin-login" onSubmit={login}><p className="eyebrow">Шоколадное ателье</p><h2>Вход для администратора</h2><p>Введите ключ администратора Yandex Cloud.</p><label>Ключ администратора<input name="admin-token" type="password" autoComplete="off" required /></label><button className="button" type="submit">Войти</button>{message && <AdminMessage type={messageType}>{message}</AdminMessage>}</form></AdminShell>;

  const activeCount = products.filter((product) => product.is_active).length;
  return <AdminShell>
    <div className="admin-toolbar">
      <div><p className="eyebrow">Управление сайтом</p><h1>Каталог и заявки</h1></div>
      <div className="admin-toolbar-actions"><button className="admin-link" type="button" onClick={refresh} disabled={loading}><ArrowClockwise /> {loading ? "Обновляем…" : "Обновить"}</button><button className="admin-link" type="button" onClick={logout}><SignOut /> Выйти</button></div>
    </div>
    {message && <AdminMessage type={messageType} onClose={() => setMessage("")}>{message}</AdminMessage>}
    <nav className="admin-nav" aria-label="Разделы панели"><a href="#products">Десерты <span>{products.length}</span></a><a href="#orders">Заявки <span>{orders.length}</span></a><a href="#security">Доступ</a></nav>

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
      <div className="orders-toolbar"><button className="admin-link" type="button" onClick={refresh}><ArrowClockwise /> Обновить заявки</button></div>{ordersError && <AdminMessage type="error">{ordersError}</AdminMessage>}<div className="admin-orders">{orders.length === 0 && <div className="admin-empty">Новых заявок пока нет.</div>}{orders.map((order) => <article key={order.id}><div className="order-field"><span>Клиент</span><strong>{order.customer_name}</strong></div><div className="order-field"><span>Десерт</span><strong>{order.product_name}</strong></div><div className="order-field"><span>Желаемая дата</span><strong>{order.desired_date || "Не указана"}</strong></div><div className="order-field"><span>Телефон</span><a href={order.customer_phone ? `tel:${order.customer_phone}` : undefined}>{order.customer_phone || "Не указан"}</a></div>{order.comment && <div className="order-comment"><span>Комментарий</span><p>{order.comment}</p></div>}</article>)}</div>
    </section>

    <section className="admin-section admin-security" id="security"><div><p className="eyebrow">Безопасность</p><h2>Доступ администратора</h2></div><div className="admin-login admin-login-inline"><p>Каталог и заявки защищены единым ключом Yandex Cloud. Ключ хранится только до закрытия браузера.</p><button className="button" type="button" onClick={logout}>Закрыть доступ</button></div></section>
  </AdminShell>;
}

function AdminMessage({ children, type = "success", onClose }) {
  return <div className={`admin-message ${type === "error" ? "is-error" : ""}`} role="status"><Check /><span>{children}</span>{onClose && <button type="button" onClick={onClose} aria-label="Закрыть сообщение"><X /></button>}</div>;
}

function ProductRow({ product, editing, busy, onEdit, onChange, onSave, onToggle, onRemove }) {
  return <article className={`admin-product ${product.is_active ? "" : "is-hidden"}`}>
    <div className="admin-product-summary"><div className="admin-product-thumb">{product.image_url || product.image_data ? <img src={productImage(product.image_url, product.image_data)} alt="" /> : <span>Нет фото</span>}</div><div className="admin-product-copy"><div className="admin-product-title"><h3>{product.name}</h3><span className={`status-pill ${product.is_active ? "is-live" : ""}`}>{product.is_active ? "На сайте" : "Скрыт"}</span></div><p>{product.description || "Описание не заполнено"}</p><strong>{Number(product.price).toLocaleString("ru-RU")} ₽ {product.weight && <small>/ {product.weight}</small>}</strong></div><div className="admin-product-actions"><button className="admin-link" type="button" onClick={onEdit}><NotePencil /> {editing ? "Закрыть" : "Изменить"}</button><button className="admin-link" type="button" onClick={onToggle} disabled={busy}>{product.is_active ? <EyeSlash /> : <Eye />} {product.is_active ? "Скрыть" : "Показать"}</button></div></div>
    {editing && <ProductEditor product={product} onChange={onChange} onSave={onSave} onRemove={onRemove} busy={busy} submitLabel="Сохранить изменения" />}
  </article>;
}

function AdminShell({ children }) { return <main className="admin-page"><a className="admin-link" href={import.meta.env.BASE_URL}><ArrowLeft /> На сайт</a>{children}</main>; }

function ProductEditor({ product, onChange, onSave, onRemove, submitLabel, title, busy }) {
  const field = (key, value) => onChange({ ...product, [key]: value });
  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imageData = await compressImage(file);
      onChange({ ...product, image_data: imageData, image_url: "" });
    } catch (error) { window.alert(error.message); }
    event.target.value = "";
  };
  const preview = productImage(product.image_url, product.image_data);
  return <div className="product-editor">{title && <h3>{title}</h3>}<div className="editor-layout"><div className="editor-grid"><label>Название *<input required value={product.name} onChange={(e) => field("name", e.target.value)} placeholder="Например, Медовик" /></label><label>Цена, ₽ *<input type="number" min="0" step="1" required value={product.price} onChange={(e) => field("price", e.target.value)} /></label><label>Вес или количество<input value={product.weight} onChange={(e) => field("weight", e.target.value)} placeholder="600 г или 6 шт." /></label><label>Порядок на сайте<input type="number" value={product.sort_order} onChange={(e) => field("sort_order", e.target.value)} /></label><label className="editor-wide">Описание<textarea value={product.description} onChange={(e) => field("description", e.target.value)} placeholder="Состав, вкус и особенности десерта" /></label><label className="editor-wide image-upload">Фотография<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadImage} /><small>Выберите JPG, PNG или WebP. Фотография автоматически уменьшится перед загрузкой.</small></label><label className="editor-wide">Или ссылка на изображение<input value={product.image_url} onChange={(e) => onChange({ ...product, image_url: e.target.value, image_data: "" })} placeholder="images/desert.webp или https://…" /></label><label className="editor-check"><input type="checkbox" checked={product.is_active} onChange={(e) => field("is_active", e.target.checked)} /> Показывать десерт на сайте</label></div><div className="editor-preview"><span>Предпросмотр</span>{preview ? <img src={preview} alt={`Предпросмотр: ${product.name || "десерт"}`} /> : <div>Добавьте фотографию</div>}{preview && <button className="admin-link" type="button" onClick={() => onChange({ ...product, image_url: "", image_data: "" })}><Trash /> Убрать фото</button>}</div></div><div className="editor-actions"><button className="button" type="button" disabled={busy} onClick={() => onSave(product)}><Check /> {busy ? "Сохраняем…" : submitLabel}</button>{onRemove && <button className="danger-button" type="button" disabled={busy} onClick={onRemove}><Trash /> Удалить</button>}</div></div>;
}

function compressImage(file) {
  if (file.size > 12 * 1024 * 1024) return Promise.reject(new Error("Файл слишком большой. Максимум 12 МБ."));
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/webp", .82);
      if (data.length > 1_800_000) reject(new Error("После обработки фотография всё ещё слишком большая. Выберите другое изображение."));
      else resolve(data);
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Не удалось прочитать изображение.")); };
    image.src = url;
  });
}
