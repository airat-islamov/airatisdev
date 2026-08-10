document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector("[data-js-menu-toggle]");
  const panel = document.querySelector("[data-js-mobile-menu]");
  const closeButton = document.querySelector("[data-js-menu-close]");
  const links = document.querySelectorAll("[data-js-mobile-link]");

  const desktopBreakpoint = 991;

  if (toggle && panel && closeButton) {
    let previouslyFocusedElement = null;

    const setMenuState = (isOpen, { restoreFocus = true } = {}) => {
      panel.classList.toggle("is-open", isOpen);
      panel.setAttribute("aria-hidden", String(!isOpen));
      panel.inert = !isOpen;
      toggle.setAttribute("aria-expanded", String(isOpen));
      document.body.classList.toggle("AW-menu-open", isOpen);

      if (isOpen) {
        previouslyFocusedElement = document.activeElement;
        closeButton.focus();
        return;
      }

      if (restoreFocus && previouslyFocusedElement instanceof HTMLElement) {
        previouslyFocusedElement.focus();
      }
    };

    toggle.addEventListener("click", () => {
      const isOpen = toggle.getAttribute("aria-expanded") === "true";
      setMenuState(!isOpen);
    });

    closeButton.addEventListener("click", () => setMenuState(false));

    links.forEach((link) => {
      link.addEventListener("click", () => setMenuState(false, { restoreFocus: false }));
    });

    document.addEventListener("click", (event) => {
      if (toggle.getAttribute("aria-expanded") !== "true") {
        return;
      }

      if (panel.contains(event.target) || toggle.contains(event.target)) {
        return;
      }

      setMenuState(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setMenuState(false);
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > desktopBreakpoint) {
        setMenuState(false, { restoreFocus: false });
      }
    });
  }

  const catalogs = document.querySelectorAll("[data-js-catalog]");

  catalogs.forEach((catalog) => {
    const tabs = Array.from(catalog.querySelectorAll("[data-js-catalog-tab]"));
    const panels = Array.from(catalog.querySelectorAll("[data-js-catalog-panel]"));
    const viewport = catalog.querySelector("[data-js-catalog-viewport]");
    const dots = Array.from(catalog.querySelectorAll("[data-js-catalog-dot]"));
    const tablist = tabs[0]?.parentElement || null;

    if (!tabs.length || !panels.length || !viewport || !tablist) {
      return;
    }

    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const switchingClass = "is-switching";
    const switchingClearDelay = 900;
    let switchingTimeout = null;
    let isPointerDown = false;
    let isDragging = false;
    let suppressClick = false;
    let dragStartX = 0;
    let dragStartScrollLeft = 0;
    let dragAnimationFrame = null;
    let dragPointerId = null;
    let dragLastX = 0;
    let dragLastTime = 0;
    let dragVelocity = 0;

    const setActiveDot = (activeIndex) => {
      dots.forEach((dot, index) => {
        dot.classList.toggle("is-active", index === activeIndex);
      });
    };

    const getActivePanel = () => panels.find((panelItem) => !panelItem.hidden);

    const updateTabIndicator = (activeTab) => {
      const tablistRect = tablist.getBoundingClientRect();
      const tabRect = activeTab.getBoundingClientRect();

      tablist.style.setProperty(
        "--aw-catalog-tab-left",
        `${tabRect.left - tablistRect.left}px`
      );
      tablist.style.setProperty("--aw-catalog-tab-width", `${tabRect.width}px`);
    };

    const animateActivePanel = (panelItem) => {
      if (!panelItem || prefersReducedMotion) {
        return;
      }

      panelItem.querySelectorAll(".AW-catalog-product").forEach((product, index) => {
        product.style.setProperty("--aw-catalog-card-index", String(index));
      });

      panelItem.classList.remove(switchingClass);
      void panelItem.offsetWidth;
      panelItem.classList.add(switchingClass);

      if (switchingTimeout) {
        window.clearTimeout(switchingTimeout);
      }

      switchingTimeout = window.setTimeout(() => {
        panelItem.classList.remove(switchingClass);
        switchingTimeout = null;
      }, switchingClearDelay);
    };

    const updateDotsByScroll = () => {
      if (!dots.length) {
        return;
      }

      const maxScroll = viewport.scrollWidth - viewport.clientWidth;

      if (maxScroll <= 0) {
        setActiveDot(0);
        return;
      }

      const activeIndex = Math.round((viewport.scrollLeft / maxScroll) * (dots.length - 1));
      setActiveDot(activeIndex);
    };

    const clampScrollLeft = (value) => {
      const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      return Math.max(0, Math.min(value, maxScroll));
    };

    const stopScrollAnimation = () => {
      if (!dragAnimationFrame) {
        return;
      }

      window.cancelAnimationFrame(dragAnimationFrame);
      dragAnimationFrame = null;
    };

    const getCardStep = () => {
      const activePanel = getActivePanel();
      const firstCard = activePanel?.querySelector(".AW-catalog-product");

      if (!firstCard) {
        return viewport.clientWidth;
      }

      const panelStyle = window.getComputedStyle(activePanel);
      const gap = parseFloat(panelStyle.columnGap || panelStyle.gap) || 0;
      return firstCard.getBoundingClientRect().width + gap;
    };

    const getSettledScrollLeft = () => {
      const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      const step = getCardStep();
      const projectedScrollLeft = viewport.scrollLeft - dragVelocity * 180;
      const snappedScrollLeft = Math.round(projectedScrollLeft / step) * step;

      return Math.max(0, Math.min(snappedScrollLeft, maxScroll));
    };

    const animateScrollTo = (targetScrollLeft, duration = 450) => {
      stopScrollAnimation();

      if (prefersReducedMotion) {
        viewport.scrollLeft = targetScrollLeft;
        return;
      }

      const startScrollLeft = viewport.scrollLeft;
      const scrollDistance = targetScrollLeft - startScrollLeft;
      const startTime = performance.now();

      const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);

      const tick = (currentTime) => {
        const progress = Math.min((currentTime - startTime) / duration, 1);
        viewport.scrollLeft = startScrollLeft + scrollDistance * easeOutCubic(progress);

        if (progress < 1) {
          dragAnimationFrame = window.requestAnimationFrame(tick);
          return;
        }

        dragAnimationFrame = null;
      };

      dragAnimationFrame = window.requestAnimationFrame(tick);
    };

    const createBuyState = ({ animate = true } = {}) => {
      const buy = document.createElement("div");

      buy.className = "AW-catalog-product__buy";

      if (animate) {
        buy.classList.add("is-entering");
        window.setTimeout(() => {
          buy.classList.remove("is-entering");
        }, 420);
      }

      buy.innerHTML = `
        <div class="AW-catalog-product__counter" data-js-catalog-counter>
          <button
            class="AW-btn AW-catalog-product__counter-button"
            type="button"
            aria-label="Уменьшить количество"
            data-js-catalog-minus
          >
            &minus;
          </button>
          <span data-js-catalog-quantity>1</span>
          <button
            class="AW-btn AW-catalog-product__counter-button"
            type="button"
            aria-label="Увеличить количество"
            data-js-catalog-plus
          >
            +
          </button>
        </div>
        <button
          class="AW-btn AW-catalog-product__buy-button"
          type="button"
        >
          Купить
        </button>
      `;

      return buy;
    };

    const createPrimaryBuyButton = () => {
      const button = document.createElement("button");

      button.className = "AW-btn AW-catalog-product__button AW-catalog-product__button--primary";
      button.type = "button";
      button.dataset.jsCatalogBuyPrimary = "";
      button.textContent = "Купить в 1 клик";

      return button;
    };

    const animateCounterButton = (button) => {
      if (prefersReducedMotion) {
        return;
      }

      button.classList.remove("is-pressing");
      void button.offsetWidth;
      button.classList.add("is-pressing");

      window.setTimeout(() => {
        button.classList.remove("is-pressing");
      }, 220);
    };

    const updateQuantity = (quantity, nextValue, direction) => {
      if (prefersReducedMotion || quantity.classList.contains("is-changing")) {
        quantity.textContent = String(nextValue);
        return;
      }

      const currentValue = quantity.textContent.trim();
      const directionClass = direction === "up" ? "is-changing-up" : "is-changing-down";

      quantity.classList.add("is-changing", directionClass);
      quantity.innerHTML = `
        <span class="AW-catalog-product__quantity-value AW-catalog-product__quantity-value--old">
          ${currentValue}
        </span>
        <span class="AW-catalog-product__quantity-value AW-catalog-product__quantity-value--new">
          ${nextValue}
        </span>
      `;

      window.setTimeout(() => {
        quantity.textContent = String(nextValue);
        quantity.classList.remove("is-changing", directionClass);
      }, 260);
    };

    const setActiveTab = (activeTab, { animate = true } = {}) => {
      const activePanelId = activeTab.getAttribute("aria-controls");
      const previousTab = tabs.find((tab) => tab.getAttribute("aria-selected") === "true");
      const hasChanged = previousTab !== activeTab;
      let activePanel = null;

      tabs.forEach((tab) => {
        const isActive = tab === activeTab;
        tab.classList.toggle("is-active", isActive);
        tab.setAttribute("aria-selected", String(isActive));
      });

      panels.forEach((panelItem) => {
        const isActive = panelItem.id === activePanelId;
        panelItem.hidden = !isActive;
        panelItem.classList.toggle("is-active", isActive);

        if (isActive) {
          activePanel = panelItem;
        }
      });

      updateTabIndicator(activeTab);
      stopScrollAnimation();
      viewport.scrollLeft = 0;
      setActiveDot(0);

      if (hasChanged && animate) {
        animateActivePanel(activePanel);
      }
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => {
        setActiveTab(tab);
      });

      tab.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
          return;
        }

        event.preventDefault();

        const direction = event.key === "ArrowRight" ? 1 : -1;
        const nextIndex = (index + direction + tabs.length) % tabs.length;
        tabs[nextIndex].focus();
        setActiveTab(tabs[nextIndex]);
      });
    });

    dots.forEach((dot, index) => {
      dot.addEventListener("click", () => {
        const maxScroll = viewport.scrollWidth - viewport.clientWidth;
        const left = dots.length > 1 ? (maxScroll / (dots.length - 1)) * index : 0;

        viewport.scrollTo({ left, behavior: "smooth" });
        setActiveDot(index);
      });
    });

    viewport.addEventListener("pointerdown", (event) => {
      if (
        !(event.target instanceof Element) ||
        event.pointerType !== "mouse" ||
        event.button !== 0 ||
        event.target.closest("button, a")
      ) {
        return;
      }

      isPointerDown = true;
      isDragging = false;
      dragStartX = event.clientX;
      dragStartScrollLeft = viewport.scrollLeft;
      dragPointerId = event.pointerId;
      dragLastX = event.clientX;
      dragLastTime = performance.now();
      dragVelocity = 0;
      stopScrollAnimation();
      viewport.setPointerCapture(dragPointerId);
    });

    viewport.addEventListener("pointermove", (event) => {
      if (!isPointerDown || event.pointerId !== dragPointerId) {
        return;
      }

      const distance = event.clientX - dragStartX;

      if (!isDragging && Math.abs(distance) > 4) {
        isDragging = true;
        viewport.classList.add("is-dragging");
      }

      if (!isDragging) {
        return;
      }

      event.preventDefault();
      const currentTime = performance.now();
      const elapsed = Math.max(currentTime - dragLastTime, 16);

      dragVelocity = (event.clientX - dragLastX) / elapsed;
      dragLastX = event.clientX;
      dragLastTime = currentTime;
      viewport.scrollLeft = clampScrollLeft(dragStartScrollLeft - distance);
    });

    const stopDragging = (event) => {
      if (!isPointerDown || event.pointerId !== dragPointerId) {
        return;
      }

      isPointerDown = false;
      suppressClick = isDragging;

      if (isDragging) {
        animateScrollTo(getSettledScrollLeft());
      }

      isDragging = false;
      dragPointerId = null;
      viewport.classList.remove("is-dragging");
    };

    viewport.addEventListener("pointerup", stopDragging);
    viewport.addEventListener("pointercancel", stopDragging);
    viewport.addEventListener("lostpointercapture", () => {
      isPointerDown = false;
      suppressClick = isDragging;

      if (isDragging) {
        animateScrollTo(getSettledScrollLeft());
      }

      isDragging = false;
      dragPointerId = null;
      viewport.classList.remove("is-dragging");
    });

    viewport.addEventListener("click", (event) => {
      if (!suppressClick) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
    }, true);

    catalog.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const primaryBuyButton = event.target.closest("[data-js-catalog-buy-primary]");

      if (primaryBuyButton) {
        primaryBuyButton.replaceWith(createBuyState({ animate: !prefersReducedMotion }));
        return;
      }

      const minus = event.target.closest("[data-js-catalog-minus]");
      const plus = event.target.closest("[data-js-catalog-plus]");

      if (!minus && !plus) {
        return;
      }

      const counter = event.target.closest("[data-js-catalog-counter]");
      const quantity = counter?.querySelector("[data-js-catalog-quantity]");

      if (!quantity) {
        return;
      }

      if (quantity.classList.contains("is-changing")) {
        return;
      }

      animateCounterButton(plus || minus);

      const currentValue = Number(quantity.textContent) || 1;

      if (minus && currentValue <= 1) {
        const buy = counter.closest(".AW-catalog-product__buy");

        if (buy) {
          if (prefersReducedMotion) {
            buy.replaceWith(createPrimaryBuyButton());
          } else {
            buy.classList.add("is-leaving");
            window.setTimeout(() => {
              buy.replaceWith(createPrimaryBuyButton());
            }, 320);
          }
        }

        return;
      }

      const nextValue = plus ? currentValue + 1 : currentValue - 1;
      updateQuantity(quantity, nextValue, plus ? "down" : "up");
    });

    viewport.addEventListener("scroll", updateDotsByScroll, { passive: true });
    window.addEventListener("resize", () => {
      const activePanel = getActivePanel();
      const activeTab = tabs.find((tab) => tab.getAttribute("aria-selected") === "true");

      if (activePanel) {
        const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);

        viewport.scrollLeft = Math.min(
          viewport.scrollLeft,
          maxScroll
        );
      }

      if (activeTab) {
        updateTabIndicator(activeTab);
      }

      updateDotsByScroll();
    });

    const initialTab = tabs.find((tab) => tab.id === "cats") ||
      tabs.find((tab) => tab.getAttribute("aria-selected") === "true");

    if (initialTab) {
      setActiveTab(initialTab, { animate: false });
    }
  });
});
