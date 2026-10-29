"use strict";

const pages = {
  "404": {
    title: "Страница не найдена",
    description: "По этому адресу страница не найдена. Похоже, даже наш поисковый робот потерял её след. Проверьте ссылку или перейдите на главную.",
    action: "На главную",
    home: true
  },
  "403": {
    title: "Доступ запрещён",
    description: "Доступ к этой странице ограничен. Наш цифровой охранник сегодня особенно строго проверяет пропуска. Перейдите на главную, чтобы продолжить покупки.",
    action: "На главную",
    home: true
  },
  "429": {
    title: "Немного сбавим темп",
    description: "Сервер временно ограничил доступ из-за слишком частых запросов. Даже серверам иногда нужно перевести дух. Подождите немного и попробуйте открыть страницу снова.",
    action: "На главную",
    home: true
  },
  "500": {
    title: "Что-то пошло не так",
    description: "Из-за внутреннего сбоя сервер не смог обработать запрос. Кажется, одна из шестерёнок взяла внеплановый выходной. Попробуйте обновить страницу.",
    action: "Обновить страницу"
  },
  "502": {
    title: "Связь прервалась",
    description: "Один из серверов получил некорректный ответ от другого. Похоже, машины немного не поняли друг друга. Попробуйте обновить страницу чуть позже.",
    action: "Обновить страницу"
  },
  "503": {
    title: "Сайт временно недоступен",
    description: "Сервер временно не может обработать запрос из-за высокой нагрузки или сбоя. Похоже, серверу тоже понадобился небольшой пит-стоп. Попробуйте обновить страницу чуть позже.",
    action: "Обновить страницу"
  },
  "504": {
    title: "Ответ немного задерживается",
    description: "Сервер не дождался ответа от другого сервера. Кажется, кто-то снова попросил «ещё пять минуточек». Попробуйте обновить страницу чуть позже.",
    action: "Обновить страницу"
  },
  maintenance: {
    title: "Скоро вернёмся",
    description: "Мы проводим плановые технические работы на сайте. Наши роботы надели каски и занялись внутренним благоустройством. Попробуйте обновить страницу чуть позже.",
    action: "Обновить страницу"
  }
};

const tabs = [...document.querySelectorAll("[data-page]")];
const codeElement = document.getElementById("error-code");
const titleElement = document.getElementById("error-title");
const descriptionElement = document.getElementById("error-description");
const imageElement = document.getElementById("error-image");
const contacts = document.getElementById("contacts");
const pageBrand = document.getElementById("page-brand");
const homeAction = document.getElementById("home-action");
const retryAction = document.getElementById("retry-action");
const retryLabel = document.getElementById("retry-label");
const announcement = document.getElementById("page-announcement");
let currentPage = "404";

function showPage(id, announce = true) {
  const safeId = Object.hasOwn(pages, id) ? id : "404";
  const page = pages[safeId];
  const maintenance = safeId === "maintenance";
  currentPage = safeId;
  codeElement.hidden = maintenance;
  codeElement.textContent = maintenance ? "" : safeId;
  if (maintenance) codeElement.removeAttribute("aria-label");
  else codeElement.setAttribute("aria-label", `Ошибка ${safeId}`);
  codeElement.parentElement.classList.toggle("error-copy--maintenance", maintenance);
  titleElement.textContent = page.title;
  descriptionElement.textContent = page.description;
  imageElement.src = `assets/${safeId}.png`;
  imageElement.width = safeId === "429" ? 1254 : 1536;
  imageElement.height = safeId === "429" ? 1254 : 1024;
  homeAction.hidden = !page.home;
  retryAction.hidden = Boolean(page.home);
  retryLabel.textContent = page.action;
  contacts.hidden = safeId === "404";
  pageBrand.hidden = safeId === "404";
  tabs.forEach(tab => tab.setAttribute("aria-pressed", String(tab.dataset.page === safeId)));
  document.title = `${maintenance ? "Технические работы" : safeId} — ${page.title} · Aspire Store`;
  if (announce) announcement.textContent = `${maintenance ? "Технические работы" : `Ошибка ${safeId}`}. ${page.title}`;
}

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    const id = tab.dataset.page;
    if (id === currentPage) return;
    history.pushState(null, "", `#${id}`);
    showPage(id);
  });
});

// Keep the selected example on reload and support browser Back / Forward.
window.addEventListener("hashchange", () => {
  const id = location.hash.slice(1);
  // Anchor links such as the keyboard skip link must not change the example.
  if (Object.hasOwn(pages, id) && id !== currentPage) showPage(id);
});
retryAction.addEventListener("click", () => location.reload());

async function copyContact(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  // Support local HTML files in browsers without the Clipboard API.
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
  const previousFocus = document.activeElement;
  document.body.append(field);
  try {
    field.select();
    if (!document.execCommand("copy")) throw new Error("Copy unavailable");
  } finally {
    field.remove();
    previousFocus?.focus({ preventScroll: true });
  }
}

document.querySelectorAll("[data-copy]").forEach(button => {
  const label = button.getAttribute("aria-label");
  let resetTimer;
  button.addEventListener("click", async () => {
    const target = document.getElementById(button.dataset.copy);
    const text = target.innerText.replace(/\s+/g, " ").trim();
    try {
      await copyContact(text);
      button.dataset.copied = "true";
      button.setAttribute("aria-label", "Скопировано");
      button.title = "Скопировано";
      announcement.textContent = "Телефон скопирован";
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        delete button.dataset.copied;
        button.setAttribute("aria-label", label);
        button.title = label;
      }, 2000);
    } catch {
      announcement.textContent = "Не удалось скопировать. Выделите текст и скопируйте его вручную.";
    }
  });
});

showPage(location.hash.slice(1), false);
