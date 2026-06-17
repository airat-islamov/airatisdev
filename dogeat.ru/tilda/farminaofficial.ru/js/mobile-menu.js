(function () {
  const menu = document.querySelector(".FA-mobile-menu");
  const toggleBtn = document.querySelector(".FA-header__mobmenu-button");
  if (!menu || !toggleBtn) return;

  const closeBtn = menu.querySelector(".FA-mobile-menu__close");
  const panel = menu.querySelector(".FA-mobile-menu__panel");
  const accordion = menu.querySelector(".FA-mobile-menu__accordion");
  const accordionToggle = menu.querySelector(
    ".FA-mobile-menu__link--accordion"
  );
  const submenu = menu.querySelector(".FA-mobile-menu__submenu");
  const links = menu.querySelectorAll("a");
  const body = document.body;

  let isOpen = false;

  const setMenuState = (nextState) => {
    isOpen = nextState;
    menu.classList.toggle("FA-mobile-menu--open", isOpen);
    toggleBtn.classList.toggle("is-open", isOpen);
    body.classList.toggle("FA-mobile-menu-open", isOpen);
  };

  function setAccordionState(expanded) {
    if (!accordionToggle || !submenu || !accordion) return;
    accordion.classList.toggle("FA-mobile-menu__accordion--open", expanded);
    submenu.hidden = !expanded;
  }

  const closeMenu = () => {
    setAccordionState(false);
    setMenuState(false);
  };
  const toggleMenu = () => setMenuState(!isOpen);

  toggleBtn.addEventListener("click", toggleMenu);
  closeBtn?.addEventListener("click", closeMenu);
  menu.addEventListener("click", (evt) => {
    if (!panel || panel.contains(evt.target)) return;
    closeMenu();
  });
  panel?.addEventListener("click", (evt) => evt.stopPropagation());

  // Закрываем меню при изменении ширины экрана или по Esc
  window.addEventListener("resize", () => {
    if (window.innerWidth > 1080 && isOpen) {
      closeMenu();
    }
  });

  window.addEventListener("keydown", (evt) => {
    if (evt.key === "Escape" && isOpen) {
      closeMenu();
    }
  });

  accordionToggle?.addEventListener("click", () => {
    const expanded = accordion.classList.contains("FA-mobile-menu__accordion--open");
    setAccordionState(!expanded);
  });

  // Старт: аккордеон скрыт
  setAccordionState(false);

  // Закрываем меню после перехода по ссылке
  links.forEach((link) => {
    link.addEventListener("click", () => {
      // Даем браузеру инициировать переход/скролл и закрываем меню
      setTimeout(closeMenu, 50);
    });
  });

  // Открываем меню вручную можно через класс .FA-mobile-menu--open
  if (menu.classList.contains("FA-mobile-menu--open")) {
    setMenuState(true);
  }
})();
