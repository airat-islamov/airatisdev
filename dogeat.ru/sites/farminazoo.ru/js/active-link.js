(function () {
  const FILE_PROTOCOL = "file:";

  const detectFileRootPath = () => {
    if (window.location.protocol !== FILE_PROTOCOL) return "";

    const script = document.querySelector('script[src$="js/active-link.js"]');
    if (script && script.getAttribute("src")) {
      try {
        const scriptPath = new URL(script.getAttribute("src"), window.location.href).pathname;
        return scriptPath.replace(/\/js\/active-link\.js$/i, "");
      } catch (_) {
        // ignore and keep empty root path
      }
    }

    return "";
  };

  const fileRootPath = detectFileRootPath();

  // Текущий путь страницы, без завершающего слеша
  const normalizePath = (path) => {
    let cleaned = (path || "").replace(/\\/g, "/");

    // Локальный файл: сохраняем структуру каталогов, а не только имя файла
    if (window.location.protocol === FILE_PROTOCOL) {
      if (fileRootPath && cleaned.startsWith(fileRootPath)) {
        cleaned = cleaned.slice(fileRootPath.length) || "/";
      }

      cleaned = cleaned.replace(/\/index\.html?$/i, "/");
      cleaned = cleaned.replace(/\.html?$/i, "");
      cleaned = cleaned.replace(/\/+$/, "");
      cleaned = cleaned.replace(/\/{2,}/g, "/");

      if (!cleaned || cleaned === "/index") return "/";
      return cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
    }

    cleaned = cleaned.replace(/\/$/, ""); // убираем конечный слеш
    if (cleaned === "") cleaned = "/";
    cleaned = cleaned.replace(/\/index\.html?$/, ""); // /index.html => /
    cleaned = cleaned.replace(/\.html?$/, ""); // убираем .html у остальных файлов
    return cleaned || "/";
  };

  const currentPath = normalizePath(window.location.pathname);

  // Все ссылки в шапке (верхнее меню + подменю + мобильное меню)
  const links = document.querySelectorAll(
    ".FA-header__menu-link, .FA-header__submenu-link, .FA-mobile-menu__link, .FA-mobile-menu__sublink"
  );

  links.forEach((link) => {
    const href = link.getAttribute("href");
    if (!href) return;

    // Игнорируем якорные ссылки вида #dog-lines
    if (href.startsWith("#")) return;

    // Превращаем относительные ссылки в абсолютный URL и берём только путь.
    // В режиме file:// window.location.origin == "null", поэтому используем href текущей страницы как базу.
    let linkPath = null;
    try {
      linkPath = normalizePath(new URL(href, window.location.href).pathname);
    } catch (_) {
      return;
    }

    // Если путь совпадает с текущим — помечаем ссылку активной
    if (linkPath === currentPath) {
      if (link.classList.contains("FA-header__submenu-link")) {
        link.classList.add("FA-header__submenu-link--current");
      }
      if (link.classList.contains("FA-mobile-menu__sublink")) {
        link.classList.add("FA-mobile-menu__sublink--current");
      }
      if (link.classList.contains("FA-header__menu-link")) {
        link.classList.add("FA-header__menu-link--current");
      }
      if (link.classList.contains("FA-mobile-menu__link")) {
        link.classList.add("FA-mobile-menu__link--current");
      }
    }
  });

  // Если активным оказался пункт каталога в мобильном меню — раскрываем аккордеон
  const mobileCatalog = document.querySelector(".FA-mobile-menu__accordion");
  const mobileCatalogToggle = document.querySelector(".FA-mobile-menu__link--accordion");
  const mobileSubmenu = document.querySelector(".FA-mobile-menu__submenu");
  if (
    mobileCatalog &&
    mobileCatalogToggle &&
    mobileSubmenu &&
    mobileSubmenu.querySelector(".FA-mobile-menu__sublink--current") &&
    currentPath !== "/" // на главной не раскрываем по умолчанию
  ) {
    mobileCatalog.classList.add("FA-mobile-menu__accordion--open");
    mobileSubmenu.hidden = false;
  }
})();
