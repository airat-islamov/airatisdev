(function () {
  const menuItems = document.querySelectorAll(".FA-header__menu-li--submenu");
  if (!menuItems.length) return;

  const OPEN_CLASS = "FA-header__menu-li--submenu--open";
  const CLOSED_CLASS = "FA-header__menu-li--submenu--closed";

  const isDesktopHeader = () => window.innerWidth > 1080;
  const isTouchPointer = () =>
    typeof window.matchMedia === "function" &&
    window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  const shouldBlockCatalogClick = () => isDesktopHeader() && isTouchPointer();

  const closeAll = () => {
    menuItems.forEach((item) => {
      item.classList.remove(OPEN_CLASS);
      item.classList.remove(CLOSED_CLASS);
    });
  };

  menuItems.forEach((item) => {
    const trigger = item.querySelector(".FA-header__menu-link--submenu");
    const submenu = item.querySelector(".FA-header__submenu");
    if (!trigger || !submenu) return;

    trigger.addEventListener("click", (evt) => {
      if (!shouldBlockCatalogClick()) return;

      evt.preventDefault();
      evt.stopPropagation();

      const isOpen = item.classList.contains(OPEN_CLASS);

      if (isOpen) {
        closeAll();
        item.classList.add(CLOSED_CLASS);
        return;
      }

      closeAll();
      item.classList.add(OPEN_CLASS);
    });

    submenu.addEventListener("click", (evt) => evt.stopPropagation());
    item.addEventListener("mouseleave", () => {
      item.classList.remove(CLOSED_CLASS);
    });
  });

  document.addEventListener("click", (evt) => {
    if (!shouldBlockCatalogClick()) return;
    if (!evt.target.closest(".FA-header__menu-li--submenu")) closeAll();
  });

  window.addEventListener("keydown", (evt) => {
    if (evt.key === "Escape") closeAll();
  });

  window.addEventListener("resize", () => {
    if (!shouldBlockCatalogClick()) closeAll();
  });
})();
