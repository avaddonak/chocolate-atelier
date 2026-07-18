import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarBlank,
  Check,
  Clock,
  Gift,
  HandHeart,
  Leaf,
  List,
  MapPin,
  Package,
  Phone,
  Star,
  TelegramLogo,
  WhatsappLogo,
  X,
} from "@phosphor-icons/react";

const PHONE = "79141999233";
const assetUrl = (path) => `${import.meta.env.BASE_URL}${path}`;

const products = [
  {
    name: "Тирамису «Мой хит!»",
    description:
      "Савоярди, насыщенный кофе и нежный крем из настоящего маскарпоне.",
    price: "1 200 ₽",
    weight: "600 г",
    image: assetUrl("images/tiramisu.webp"),
  },
  {
    name: "Прага с пралине",
    description:
      "Шоколадные коржи, ганаш и хрустящий слой фундука ручной обжарки.",
    price: "1 650 ₽",
    weight: "700 г",
    image: assetUrl("images/praline.webp"),
  },
  {
    name: "Павлова с ягодами",
    description:
      "Хрустящая меренга, воздушный крем и свежие сезонные ягоды.",
    price: "950 ₽",
    weight: "500 г",
    image: assetUrl("images/pavlova.webp"),
  },
];

const reviews = [
  {
    text: "Тирамису — это просто восторг! Нежный, в меру сладкий, тает во рту. Теперь только к Елене.",
    author: "Анна, Мурино",
  },
  {
    text: "Заказывали «Прагу» на юбилей. Гости были в восторге, а мы счастливы, что нашли своего мастера.",
    author: "Игорь, Санкт-Петербург",
  },
  {
    text: "Павлова лёгкая и воздушная, ягоды свежайшие. Красиво упаковано — можно сразу дарить.",
    author: "Мария, Мурино",
  },
];

function OrderButton({ product, className = "", children = "Оформить заказ", onOrder }) {
  return (
    <button className={`button ${className}`} type="button" onClick={() => onOrder(product)}>
      {children}
      <ArrowRight aria-hidden="true" weight="light" />
    </button>
  );
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [orderOpen, setOrderOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const nodes = document.querySelectorAll("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-visible");
        });
      },
      { threshold: 0.12 },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.overflow = orderOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [orderOpen]);

  const openOrder = (product = "") => {
    setSelectedProduct(product);
    setSubmitted(false);
    setOrderOpen(true);
    setMenuOpen(false);
  };

  const closeOrder = () => setOrderOpen(false);

  const submitOrder = (event) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Шоколадная мастерская — на главную">
          <span>Шоколадная</span>
          <span>мастерская</span>
          <small>Елены Кинаш</small>
        </a>
        <nav className={menuOpen ? "nav is-open" : "nav"} aria-label="Главная навигация">
          <a href="#collection" onClick={() => setMenuOpen(false)}>Коллекция</a>
          <a href="#about" onClick={() => setMenuOpen(false)}>О мастере</a>
          <a href="#reviews" onClick={() => setMenuOpen(false)}>Отзывы</a>
          <a href="#delivery" onClick={() => setMenuOpen(false)}>Доставка</a>
        </nav>
        <div className="header-contact">
          <span><MapPin aria-hidden="true" /> Мурино</span>
          <a href={`tel:+${PHONE}`}>+7 914 199-92-33</a>
        </div>
        <OrderButton onOrder={openOrder}>Оформить заказ</OrderButton>
        <button
          className="menu-toggle"
          type="button"
          aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? <X aria-hidden="true" /> : <List aria-hidden="true" />}
        </button>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-image" role="img" aria-label="Авторский шоколадный торт ручной работы" />
          <div className="hero-content" data-reveal>
            <p className="eyebrow">Шоколадное ателье · Мурино</p>
            <h1 id="hero-title">Авторские десерты<br />Елены Кинаш</h1>
            <span className="gold-line" aria-hidden="true" />
            <p className="hero-lead">Вкус, созданный вручную</p>
            <div className="hero-benefits">
              <span><Leaf aria-hidden="true" weight="light" /> Натуральные ингредиенты</span>
              <span><HandHeart aria-hidden="true" weight="light" /> Ручная работа</span>
              <span><Clock aria-hidden="true" weight="light" /> Готовность 1–2 дня</span>
            </div>
            <div className="hero-actions">
              <a className="button button-light" href="#collection">
                Выбрать десерт <ArrowRight aria-hidden="true" weight="light" />
              </a>
              <a
                className="icon-button whatsapp"
                href={`https://wa.me/${PHONE}?text=${encodeURIComponent("Здравствуйте! Хочу заказать десерт.")}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Написать в WhatsApp"
              >
                <WhatsappLogo aria-hidden="true" weight="fill" />
              </a>
              <a
                className="icon-button telegram"
                href={`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent("Хочу заказать десерт у Елены Кинаш")}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Поделиться в Telegram"
              >
                <TelegramLogo aria-hidden="true" weight="fill" />
              </a>
            </div>
            <p className="price-anchor">от <strong>650 ₽</strong></p>
          </div>
        </section>

        <section className="section collection" id="collection" aria-labelledby="collection-title">
          <div className="section-heading" data-reveal>
            <p className="eyebrow">Популярное</p>
            <h2 id="collection-title">Коллекция десертов</h2>
            <span className="gold-line" aria-hidden="true" />
          </div>
          <div className="product-grid">
            {products.map((product, index) => (
              <article className="product" key={product.name} data-reveal style={{ "--delay": `${index * 90}ms` }}>
                <div className="product-image">
                  <img src={product.image} alt={product.name} />
                </div>
                <h3>{product.name}</h3>
                <p>{product.description}</p>
                <div className="product-meta">
                  <span><strong>{product.price}</strong> / {product.weight}</span>
                  <button type="button" onClick={() => openOrder(product.name)}>
                    Заказать <ArrowRight aria-hidden="true" />
                  </button>
                </div>
              </article>
            ))}
          </div>
          <button className="outline-button" type="button" onClick={() => openOrder()}>
            Подобрать десерт
          </button>
        </section>

        <section className="about" id="about">
          <div className="about-photo" data-reveal>
            <img src={assetUrl("images/elena-workshop.webp")} alt="Елена Кинаш готовит десерты в своей мастерской" />
          </div>
          <div className="about-copy" data-reveal>
            <p className="eyebrow">О мастере</p>
            <h2>Елена Кинаш</h2>
            <p className="about-intro">
              Я создаю десерты, которые дарят радость и впечатления. В каждой рецептуре —
              отборные ингредиенты, внимание к деталям и душа.
            </p>
            <p>
              Для меня важно, чтобы каждый десерт был не просто вкусным, а особенным —
              моментом, который хочется запомнить.
            </p>
            <ul className="feature-list">
              <li><Leaf aria-hidden="true" weight="light" /><span>Только качественные продукты</span></li>
              <li><HandHeart aria-hidden="true" weight="light" /><span>Ручная работа и авторские рецептуры</span></li>
              <li><Star aria-hidden="true" weight="light" /><span>Десятки постоянных клиентов</span></li>
            </ul>
          </div>
        </section>

        <section className="gifting" id="delivery">
          <div className="gifting-image" role="img" aria-label="Подарочная коробка шоколадной мастерской" />
          <div className="gifting-copy" data-reveal>
            <p className="eyebrow">Подарочная коллекция</p>
            <h2>Дарите вкусные<br />впечатления</h2>
            <span className="gold-line" aria-hidden="true" />
            <p>Каждый десерт бережно упаковываю. Идеально для подарка и особенных моментов.</p>
            <ul>
              <li><Check aria-hidden="true" /> Праздники и дни рождения</li>
              <li><Check aria-hidden="true" /> Корпоративные подарки</li>
              <li><Check aria-hidden="true" /> Свадьбы и семейные события</li>
            </ul>
          </div>
        </section>

        <section className="steps section" aria-labelledby="steps-title">
          <div className="section-heading" data-reveal>
            <p className="eyebrow">Всё просто</p>
            <h2 id="steps-title">Как сделать заказ</h2>
          </div>
          <div className="steps-grid">
            <article data-reveal><Package aria-hidden="true" weight="light" /><span>01</span><h3>Выберите десерт</h3><p>Из коллекции или расскажите о своей идее.</p></article>
            <article data-reveal><CalendarBlank aria-hidden="true" weight="light" /><span>02</span><h3>Уточните дату</h3><p>Обычно заказ готов за 1–2 дня.</p></article>
            <article data-reveal><Gift aria-hidden="true" weight="light" /><span>03</span><h3>Получите заказ</h3><p>Самовывоз в Мурино или доставка.</p></article>
          </div>
        </section>

        <section className="reviews section" id="reviews" aria-labelledby="reviews-title">
          <div className="section-heading" data-reveal>
            <p className="eyebrow">Говорят клиенты</p>
            <h2 id="reviews-title">Отзывы</h2>
          </div>
          <div className="review-grid">
            {reviews.map((review) => (
              <blockquote key={review.author} data-reveal>
                <div className="stars" aria-label="Оценка 5 из 5">
                  {[1, 2, 3, 4, 5].map((star) => <Star key={star} aria-hidden="true" weight="fill" />)}
                </div>
                <p>«{review.text}»</p>
                <cite>{review.author}</cite>
              </blockquote>
            ))}
          </div>
        </section>

        <section className="final-cta">
          <div data-reveal>
            <p className="eyebrow">Ваш особенный десерт</p>
            <h2>Готовы порадовать<br />себя и близких?</h2>
            <p>Напишите мне — помогу с выбором, рассчитаю заказ и согласую удобное время.</p>
            <OrderButton className="button-light" onOrder={openOrder}>Оформить заказ</OrderButton>
          </div>
        </section>
      </main>

      <footer>
        <a className="brand footer-brand" href="#top">
          <span>Шоколадная мастерская</span><small>Елены Кинаш</small>
        </a>
        <div>
          <a href={`tel:+${PHONE}`}><Phone aria-hidden="true" /> +7 914 199-92-33</a>
          <span><MapPin aria-hidden="true" /> Мурино, Воронцовский б-р, 19</span>
        </div>
        <p>© 2026 Шоколадная мастерская Елены Кинаш</p>
      </footer>

      {orderOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeOrder();
        }}>
          <section className="order-modal" role="dialog" aria-modal="true" aria-labelledby="order-title">
            <button className="modal-close" type="button" onClick={closeOrder} aria-label="Закрыть">
              <X aria-hidden="true" />
            </button>
            {submitted ? (
              <div className="success-state" aria-live="polite">
                <span><Check aria-hidden="true" weight="bold" /></span>
                <p className="eyebrow">Заявка готова</p>
                <h2 id="order-title">Спасибо!</h2>
                <p>Для завершения заказа отправьте подготовленное сообщение Елене в WhatsApp.</p>
                <a
                  className="button"
                  href={`https://wa.me/${PHONE}?text=${encodeURIComponent(`Здравствуйте! Хочу оформить заказ${selectedProduct ? `: ${selectedProduct}` : ""}.`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Открыть WhatsApp <WhatsappLogo aria-hidden="true" weight="fill" />
                </a>
              </div>
            ) : (
              <>
                <p className="eyebrow">Индивидуальный заказ</p>
                <h2 id="order-title">Давайте выберем десерт</h2>
                <p>Оставьте детали — на следующем шаге откроется WhatsApp с готовым сообщением.</p>
                <form onSubmit={submitOrder}>
                  <label>Ваше имя<input name="name" autoComplete="name" required /></label>
                  <label>Что хотите заказать
                    <select value={selectedProduct} onChange={(event) => setSelectedProduct(event.target.value)} required>
                      <option value="">Помогите выбрать</option>
                      {products.map((product) => <option key={product.name}>{product.name}</option>)}
                      <option>Другой десерт</option>
                    </select>
                  </label>
                  <label>Желаемая дата<input name="date" type="date" /></label>
                  <button className="button" type="submit">Продолжить <ArrowRight aria-hidden="true" /></button>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}

export { App };
