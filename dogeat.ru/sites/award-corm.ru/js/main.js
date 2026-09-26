document.addEventListener("DOMContentLoaded", () => {
  const motionQuery =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null;
  const prefersReducedMotion = () => motionQuery?.matches ?? false;

  const getProductFromCard = (card) => {
    const image = card.querySelector(".AW-catalog-product__image");
    const name = card
      .querySelector(".AW-catalog-product__name")
      ?.textContent.trim()
      .replace(/\s+/g, " ") || "Товар AWARD";
    const weight =
      card.querySelector(".AW-catalog-product__weight")?.textContent.trim() ||
      "";
    const currentPrice =
      card.querySelector(".AW-catalog-product__current")?.textContent.trim() ||
      "";
    const oldPrice =
      card.querySelector(".AW-catalog-product__old")?.textContent.trim() || "";
    const discount =
      card.querySelector(".AW-catalog-product__discount")?.textContent.trim() ||
      "";
    const imageSrc = image?.getAttribute("src") || "";
    const key = [name, weight, currentPrice, imageSrc].join("|");

    return {
      key,
      name,
      weight,
      currentPrice,
      oldPrice,
      discount,
      imageSrc,
      imageAlt: image?.getAttribute("alt") || name,
    };
  };

  const getProductFromDetail = (detail) => {
    const image = detail.querySelector(".AW-product__image");
    const name =
      detail
        .querySelector(".AW-product__title")
        ?.textContent.trim()
        .replace(/\s+/g, " ") || "Товар AWARD";
    const weight =
      detail
        .querySelector(".AW-product__weight")
        ?.textContent.replace(/^Вес:\s*/, "")
        .trim() || "";
    const currentPrice =
      detail.querySelector(".AW-product__current")?.textContent.trim() || "";
    const oldPrice =
      detail.querySelector(".AW-product__old")?.textContent.trim() || "";
    const discount =
      detail.querySelector(".AW-product__discount")?.textContent.trim() || "";
    const imageSrc = image?.getAttribute("src") || "";
    const key = [name, weight, currentPrice, imageSrc].join("|");

    return {
      key,
      name,
      weight,
      currentPrice,
      oldPrice,
      discount,
      imageSrc,
      imageAlt: image?.getAttribute("alt") || name,
    };
  };

  const createCartStore = () => {
    const storageKey = "award-cart-v1";
    let storedItems = [];

    try {
      const storedValue = window.sessionStorage.getItem(storageKey);
      const parsedValue = storedValue ? JSON.parse(storedValue) : [];
      storedItems = Array.isArray(parsedValue)
        ? parsedValue.filter(
            (item) => item?.key && Number.isFinite(item?.quantity)
          )
        : [];
    } catch {
      storedItems = [];
    }

    const items = new Map(storedItems.map((item) => [item.key, item]));
    const subscribers = new Set();
    const getItems = () => Array.from(items.values());
    const persist = () => {
      try {
        window.sessionStorage.setItem(storageKey, JSON.stringify(getItems()));
      } catch {
        // The cart still works in memory when storage is unavailable.
      }
    };
    const notify = () => {
      persist();
      const currentItems = getItems();
      subscribers.forEach((subscriber) => subscriber(currentItems));
    };

    return {
      addProduct(product, quantity = 1) {
        const current = items.get(product.key);
        items.set(product.key, {
          ...(current || product),
          quantity: (current?.quantity || 0) + Math.max(1, quantity),
        });
        notify();
      },
      getItem(key) {
        return items.get(key) || null;
      },
      getItems,
      getQuantity(key) {
        return items.get(key)?.quantity || 0;
      },
      setQuantity(key, quantity) {
        const current = items.get(key);

        if (!current) {
          return;
        }

        if (quantity <= 0) {
          items.delete(key);
        } else {
          items.set(key, { ...current, quantity });
        }

        notify();
      },
      subscribe(subscriber) {
        subscribers.add(subscriber);
        subscriber(getItems());
      },
    };
  };

  const cartStore = createCartStore();
  const miniCart = document.querySelector("[data-js-mini-cart]");
  const miniCartCount = document.querySelector("[data-js-mini-cart-count]");
  const miniCartSummary = document.querySelector(
    "[data-js-mini-cart-summary]"
  );
  const miniCartPreview = document.querySelector(
    "[data-js-mini-cart-preview]"
  );
  const cartLive = document.querySelector("[data-js-cart-live]");
  const orderModal = document.querySelector("[data-js-order-modal]");
  const orderDialog = document.querySelector("[data-js-order-dialog]");
  const orderForm = document.querySelector("[data-js-order-form]");
  const orderTitle = document.querySelector("[data-js-order-title]");
  const orderProducts = document.querySelector("[data-js-order-products]");
  const orderCount = document.querySelector("[data-js-order-count]");
  const orderList = document.querySelector("[data-js-order-list]");
  const orderPagination = document.querySelector(
    "[data-js-order-pagination]"
  );
  const orderLive = document.querySelector("[data-js-order-live]");
  const productOverlay = document.querySelector("[data-js-product-overlay]");
  const productOverlayDialog = document.querySelector(
    "[data-js-product-overlay-dialog]"
  );
  const productOverlayStatus = document.querySelector(
    "[data-js-product-overlay-status]"
  );
  const productOverlayContent = document.querySelector(
    "[data-js-product-overlay-content]"
  );
  const orderSubmit = orderForm?.querySelector("[data-js-order-submit]") || null;
  const pageNodes = Array.from(
    document.querySelectorAll(
      ".AW > header, .AW > main, .AW > footer, [data-js-mini-cart]"
    )
  );
  let previouslyFocusedElement = null;
  let orderCloseTimeout = null;
  let cartFeedbackTimeout = null;
  let cartRevealTimeout = null;
  let currentFormMode = "order";
  let productPreviouslyFocusedElement = null;
  let productOverlayCloseTimeout = null;
  let productCatalogTitle = document.title;
  let activeProductUrl = null;
  const productPageCache = new Map();

  const getProductWord = (count) => {
    const lastTwoDigits = count % 100;
    const lastDigit = count % 10;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
      return "товаров";
    }

    if (lastDigit === 1) {
      return "товар";
    }

    if (lastDigit >= 2 && lastDigit <= 4) {
      return "товара";
    }

    return "товаров";
  };

  const escapeHtml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");

  const updateOrderPagination = () => {
    if (!orderList || !orderPagination) {
      return;
    }

    const items = Array.from(orderList.querySelectorAll("[data-js-order-item]"));
    const dots = Array.from(
      orderPagination.querySelectorAll("[data-js-order-dot]")
    );

    if (!items.length || !dots.length) {
      return;
    }

    const activeIndex = items.reduce(
      (closest, item, index) =>
        Math.abs(item.offsetLeft - orderList.scrollLeft) < closest.distance
          ? {
              index,
              distance: Math.abs(item.offsetLeft - orderList.scrollLeft),
            }
          : closest,
      { index: 0, distance: Number.POSITIVE_INFINITY }
    ).index;

    dots.forEach((dot, index) => {
      dot.classList.toggle("is-active", index === activeIndex);
      dot.setAttribute("aria-current", index === activeIndex ? "true" : "false");
    });
  };

  const updateOrderProductsVisibility = (items) => {
    if (!orderDialog || !orderProducts) {
      return;
    }

    const shouldShowProducts =
      currentFormMode === "order" && items.length > 0;

    orderProducts.hidden = !shouldShowProducts;
    orderDialog.classList.toggle("has-items", shouldShowProducts);
  };

  const renderCart = (items) => {
    if (
      !miniCart ||
      !miniCartCount ||
      !miniCartSummary ||
      !miniCartPreview ||
      !orderDialog ||
      !orderProducts ||
      !orderCount ||
      !orderList ||
      !orderPagination
    ) {
      return;
    }

    const totalQuantity = items.reduce(
      (total, item) => total + item.quantity,
      0
    );
    const wasHidden = miniCart.hidden;
    const previousScrollLeft = orderList.scrollLeft;

    miniCart.hidden = totalQuantity === 0;
    miniCartCount.textContent = String(totalQuantity);
    miniCartSummary.textContent = `${totalQuantity} ${getProductWord(
      totalQuantity
    )}`;
    orderCount.textContent = String(totalQuantity);
    updateOrderProductsVisibility(items);
    miniCart.setAttribute(
      "aria-label",
      `Открыть корзину: ${totalQuantity} ${getProductWord(totalQuantity)}`
    );

    const latestItem = items[items.length - 1];
    const miniCartTarget = miniCart.querySelector("[data-js-mini-cart-target]");

    miniCartPreview.hidden = !latestItem;

    if (latestItem) {
      miniCartPreview.src = latestItem.imageSrc;
    } else {
      miniCartPreview.removeAttribute("src");
    }
    miniCartTarget?.classList.toggle("has-preview", Boolean(latestItem));

    if (totalQuantity > 0 && wasHidden) {
      miniCart.classList.add("is-visible");

      if (cartRevealTimeout) {
        window.clearTimeout(cartRevealTimeout);
      }

      cartRevealTimeout = window.setTimeout(() => {
        miniCart.classList.remove("is-visible");
        cartRevealTimeout = null;
      }, 500);
    } else if (totalQuantity === 0) {
      miniCart.classList.remove("is-visible", "is-receiving");
    }

    orderList.innerHTML = items
      .map(
        (item) => `
          <article
            class="AW-order__item"
            data-js-order-item
            data-cart-key="${escapeHtml(item.key)}"
          >
            <div class="AW-order__item-media">
              <img
                class="AW-order__item-image"
                src="${escapeHtml(item.imageSrc)}"
                width="31"
                height="31"
                alt=""
              />
            </div>
            <div class="AW-order__item-content">
              <div class="AW-order__item-details">
                <div class="AW-order__item-copy">
                  <p class="AW-order__item-name">${escapeHtml(item.name)}</p>
                  <p class="AW-order__item-weight">${escapeHtml(item.weight)}</p>
                </div>
                <div class="AW-order__item-price-row">
                  <div class="AW-order__item-prices">
                    <span class="AW-order__item-current">${escapeHtml(
                      item.currentPrice
                    )}</span>
                    <span class="AW-order__item-old">${escapeHtml(
                      item.oldPrice
                    )}</span>
                  </div>
                  <span class="AW-order__item-discount">${escapeHtml(
                    item.discount
                  )}</span>
                </div>
              </div>
              <div class="AW-order__counter">
                <button
                  class="AW-btn AW-order__counter-button"
                  type="button"
                  aria-label="Уменьшить количество товара"
                  data-js-order-minus
                >
                  &minus;
                </button>
                <span>${item.quantity}</span>
                <button
                  class="AW-btn AW-order__counter-button"
                  type="button"
                  aria-label="Увеличить количество товара"
                  data-js-order-plus
                >
                  +
                </button>
              </div>
            </div>
          </article>
        `
      )
      .join("");

    orderPagination.innerHTML = items
      .map(
        (_, index) => `
          <button
            class="AW-order__pagination-dot${index === 0 ? " is-active" : ""}"
            type="button"
            aria-label="Показать товар ${index + 1}"
            aria-current="${index === 0 ? "true" : "false"}"
            data-js-order-dot
            data-cart-index="${index}"
          ></button>
        `
      )
      .join("");

    orderList.scrollLeft = Math.min(
      previousScrollLeft,
      Math.max(0, orderList.scrollWidth - orderList.clientWidth)
    );
    updateOrderPagination();
  };

  const showCartFeedback = (product, card) => {
    if (!miniCart || miniCart.hidden) {
      return;
    }

    const announceReceivedProduct = () => {
      miniCart.classList.remove("is-receiving");
      void miniCart.offsetWidth;
      miniCart.classList.add("is-receiving");

      if (cartLive) {
        cartLive.textContent = "";
        window.requestAnimationFrame(() => {
          cartLive.textContent = `${product.name} добавлен в корзину`;
        });
      }

      if (cartFeedbackTimeout) {
        window.clearTimeout(cartFeedbackTimeout);
      }

      cartFeedbackTimeout = window.setTimeout(() => {
        miniCart.classList.remove("is-receiving");
        cartFeedbackTimeout = null;
      }, 1850);
    };

    if (prefersReducedMotion()) {
      announceReceivedProduct();
      return;
    }

    const sourceImage = card?.querySelector(
      ".AW-catalog-product__image, .AW-product__image"
    );
    const target = miniCart.querySelector("[data-js-mini-cart-target]");

    if (!sourceImage || !target) {
      announceReceivedProduct();
      return;
    }

    const sourceRect = sourceImage.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const flyingImage = sourceImage.cloneNode(false);
    const flightX =
      targetRect.left + targetRect.width / 2 -
      (sourceRect.left + sourceRect.width / 2);
    const flightY =
      targetRect.top + targetRect.height / 2 -
      (sourceRect.top + sourceRect.height / 2);

    flyingImage.className = "AW-cart-fly";
    flyingImage.src = sourceImage.currentSrc || sourceImage.src;
    flyingImage.removeAttribute("srcset");
    flyingImage.removeAttribute("sizes");
    flyingImage.removeAttribute("loading");
    flyingImage.removeAttribute("decoding");
    flyingImage.style.left = `${sourceRect.left}px`;
    flyingImage.style.top = `${sourceRect.top}px`;
    flyingImage.style.width = `${sourceRect.width}px`;
    flyingImage.style.height = `${sourceRect.height}px`;
    flyingImage.style.setProperty("--aw-cart-flight-x", `${flightX}px`);
    flyingImage.style.setProperty("--aw-cart-flight-y", `${flightY}px`);
    document.body.append(flyingImage);

    window.requestAnimationFrame(() => {
      flyingImage.classList.add("is-flying");
    });

    window.setTimeout(() => {
      flyingImage.remove();
      announceReceivedProduct();
    }, 700);
  };

  const setPageInert = (isInert) => {
    pageNodes.forEach((node) => {
      node.inert = isInert;
    });
  };

  const openOrder = (mode = "order", trigger = null) => {
    if (!orderModal || !orderDialog || !orderTitle || !miniCart) {
      return;
    }

    if (orderCloseTimeout) {
      window.clearTimeout(orderCloseTimeout);
      orderCloseTimeout = null;
    }

    currentFormMode = mode === "contact" ? "contact" : "order";
    updateOrderProductsVisibility(cartStore.getItems());

    const triggerIsInsideMobileMenu =
      trigger instanceof Element && trigger.closest("[data-js-mobile-menu]");

    previouslyFocusedElement = triggerIsInsideMobileMenu
      ? document.querySelector("[data-js-menu-toggle]")
      : trigger instanceof HTMLElement
        ? trigger
        : document.activeElement;
    orderTitle.textContent =
      currentFormMode === "contact"
        ? "Связаться с нами"
        : "Купить товар в 1 клик";
    orderModal.hidden = false;
    orderModal.setAttribute("aria-hidden", "false");
    miniCart.setAttribute("aria-expanded", "true");
    const scrollbarWidth = Math.max(
      0,
      window.innerWidth - document.documentElement.clientWidth
    );

    document.body.style.setProperty(
      "--aw-order-scrollbar-width",
      `${scrollbarWidth}px`
    );
    document.body.classList.add("AW-order-open");
    setPageInert(true);

    if (productOverlay && !productOverlay.hidden) {
      productOverlay.inert = true;
    }

    window.requestAnimationFrame(() => {
      orderModal.classList.add("is-open");
      orderModal.querySelector("[data-js-order-close]")?.focus();
    });
  };

  const closeOrder = () => {
    if (!orderModal || orderModal.hidden || !miniCart) {
      return;
    }

    orderModal.classList.remove("is-open");
    orderModal.setAttribute("aria-hidden", "true");
    miniCart.setAttribute("aria-expanded", "false");
    document.body.classList.remove("AW-order-open");
    document.body.style.removeProperty("--aw-order-scrollbar-width");
    const isProductOpen = Boolean(productOverlay && !productOverlay.hidden);
    setPageInert(isProductOpen);

    if (productOverlay) {
      productOverlay.inert = false;
    }

    const fallbackFocusTarget = Array.from(
      document.querySelectorAll('[data-js-order-open="contact"]')
    ).find((element) => element.getClientRects().length > 0);
    const focusTarget =
      previouslyFocusedElement instanceof HTMLElement &&
      !previouslyFocusedElement.hidden &&
      previouslyFocusedElement.getClientRects().length > 0
        ? previouslyFocusedElement
        : fallbackFocusTarget;

    focusTarget?.focus();

    orderCloseTimeout = window.setTimeout(
      () => {
        orderModal.hidden = true;
        orderCloseTimeout = null;
      },
      prefersReducedMotion() ? 0 : 250
    );
  };

  cartStore.subscribe(renderCart);

  miniCart?.addEventListener("click", () => openOrder("order", miniCart));

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const opener = event.target.closest("[data-js-order-open]");

    if (opener) {
      openOrder(opener.getAttribute("data-js-order-open") || "order", opener);
    }
  });

  orderModal
    ?.querySelectorAll("[data-js-order-close]")
    .forEach((close) => close.addEventListener("click", closeOrder));

  orderModal?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeOrder();
      return;
    }

    if (event.key !== "Tab" || !orderDialog) {
      return;
    }

    const focusableElements = Array.from(
      orderDialog.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => !element.closest("[hidden]"));

    if (!focusableElements.length) {
      event.preventDefault();
      orderDialog.focus();
      return;
    }

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  orderList?.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const minus = event.target.closest("[data-js-order-minus]");
    const plus = event.target.closest("[data-js-order-plus]");

    if (!minus && !plus) {
      return;
    }

    const itemElement = event.target.closest("[data-cart-key]");
    const key = itemElement?.getAttribute("data-cart-key");
    const item = key ? cartStore.getItem(key) : null;

    if (!item) {
      return;
    }

    cartStore.setQuantity(
      item.key,
      plus ? item.quantity + 1 : item.quantity - 1
    );
  });

  orderList?.addEventListener("scroll", updateOrderPagination, {
    passive: true,
  });

  orderPagination?.addEventListener("click", (event) => {
    if (!(event.target instanceof Element) || !orderList) {
      return;
    }

    const dot = event.target.closest("[data-cart-index]");
    const index = Number(dot?.getAttribute("data-cart-index"));
    const item = orderList.querySelectorAll("[data-js-order-item]")[index];

    if (!dot || !item) {
      return;
    }

    orderList.scrollTo({
      left: item.offsetLeft,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  });

  orderForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!orderForm.reportValidity()) {
      return;
    }

    const formData = Object.fromEntries(new FormData(orderForm).entries());
    const submissionEvent = new CustomEvent("award:order-submit", {
      bubbles: true,
      detail: {
        mode: currentFormMode,
        customer: formData,
        items: currentFormMode === "order" ? cartStore.getItems() : [],
      },
    });

    orderForm.dispatchEvent(submissionEvent);

    if (orderSubmit) {
      const initialText = orderSubmit.textContent;
      orderSubmit.textContent = "Заявка принята";
      orderSubmit.disabled = true;

      window.setTimeout(() => {
        orderSubmit.textContent = initialText;
        orderSubmit.disabled = false;
      }, 2400);
    }

    if (orderLive) {
      orderLive.textContent =
        "Спасибо! Заявка принята. Менеджер свяжется с Вами в течение 15 минут.";
    }
  });

  const setProductTab = (activeTab) => {
    const detail = activeTab.closest("[data-js-product-detail]");
    const targetId = activeTab.getAttribute("aria-controls");

    if (!detail || !targetId) {
      return;
    }

    detail.querySelectorAll("[data-js-product-tab]").forEach((tab) => {
      const isActive = tab === activeTab;
      tab.setAttribute("aria-selected", String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
    });

    detail.querySelectorAll("[data-js-product-panel]").forEach((panelItem) => {
      panelItem.hidden = panelItem.id !== targetId;
    });
  };

  const setProductOverlayState = (isOpen) => {
    if (!productOverlay) {
      return;
    }

    if (productOverlayCloseTimeout) {
      window.clearTimeout(productOverlayCloseTimeout);
      productOverlayCloseTimeout = null;
    }

    if (isOpen) {
      const scrollbarWidth = Math.max(
        0,
        window.innerWidth - document.documentElement.clientWidth
      );

      productOverlay.hidden = false;
      productOverlay.inert = false;
      productOverlay.setAttribute("aria-hidden", "false");
      document.body.style.setProperty(
        "--aw-product-scrollbar-width",
        `${scrollbarWidth}px`
      );
      document.body.classList.add("AW-product-open");
      setPageInert(true);

      window.requestAnimationFrame(() => {
        productOverlay.classList.add("is-open");
      });
      return;
    }

    const focusTarget =
      productPreviouslyFocusedElement ||
      document.querySelector("[data-js-product-open]");
    productPreviouslyFocusedElement = null;

    productOverlay.classList.remove("is-open");
    productOverlay.inert = true;
    document.body.classList.remove("AW-product-open");
    document.body.style.removeProperty("--aw-product-scrollbar-width");
    setPageInert(false);
    focusTarget?.focus();
    productOverlay.setAttribute("aria-hidden", "true");
    document.title = productCatalogTitle;
    activeProductUrl = null;

    productOverlayCloseTimeout = window.setTimeout(
      () => {
        productOverlay.hidden = true;
        productOverlayContent?.replaceChildren();
        productOverlayCloseTimeout = null;
      },
      prefersReducedMotion() ? 0 : 220
    );
  };

  const loadProductPage = async (url) => {
    if (productPageCache.has(url)) {
      return productPageCache.get(url);
    }

    const response = await window.fetch(url, {
      headers: { "X-Requested-With": "AWARDProductOverlay" },
    });

    if (!response.ok) {
      throw new Error(`Product page returned ${response.status}`);
    }

    const productDocument = new DOMParser().parseFromString(
      await response.text(),
      "text/html"
    );
    const detail = productDocument.querySelector("[data-js-product-detail]");

    if (!detail) {
      throw new Error("Product page does not contain product details");
    }

    const result = {
      title: productDocument.title,
      markup: detail.outerHTML,
    };
    productPageCache.set(url, result);
    return result;
  };

  const openProduct = async (
    url,
    { pushHistory = true, trigger = null } = {}
  ) => {
    if (
      !productOverlay ||
      !productOverlayDialog ||
      !productOverlayStatus ||
      !productOverlayContent
    ) {
      window.location.assign(url);
      return;
    }

    const normalizedUrl = new URL(url, window.location.href).href;

    if (productOverlay.hidden) {
      productCatalogTitle = document.title;
    }

    if (trigger instanceof HTMLElement) {
      productPreviouslyFocusedElement = trigger;
    }

    if (pushHistory) {
      window.history.replaceState(
        {
          ...(window.history.state || {}),
          awardCatalog: true,
          awardCatalogScrollY: window.scrollY,
        },
        "",
        window.location.href
      );
      window.history.pushState(
        { awardProduct: true, awardProductUrl: normalizedUrl },
        "",
        normalizedUrl
      );
    }

    activeProductUrl = normalizedUrl;
    productOverlayContent.replaceChildren();
    productOverlayStatus.hidden = false;
    productOverlayStatus.textContent = "Загружаем товар…";
    productOverlay.scrollTop = 0;
    setProductOverlayState(true);
    productOverlayDialog.focus();

    try {
      const productPage = await loadProductPage(normalizedUrl);

      if (activeProductUrl !== normalizedUrl) {
        return;
      }

      const template = document.createElement("template");
      template.innerHTML = productPage.markup.trim();
      productOverlayContent.replaceChildren(template.content.cloneNode(true));
      productOverlayStatus.hidden = true;
      document.title = productPage.title;
      productOverlayContent
        .querySelector("[data-js-product-close]")
        ?.focus();
    } catch {
      window.location.assign(normalizedUrl);
    }
  };

  const closeProductFromOverlay = () => {
    if (!productOverlay || productOverlay.hidden) {
      return;
    }

    if (window.history.state?.awardProduct) {
      window.history.back();
      return;
    }

    setProductOverlayState(false);
  };

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const productLink = event.target.closest("[data-js-product-open]");

    if (
      productLink instanceof HTMLAnchorElement &&
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey &&
      !productLink.download &&
      productLink.target !== "_blank" &&
      new URL(productLink.href).origin === window.location.origin
    ) {
      event.preventDefault();
      openProduct(productLink.href, { trigger: productLink });
      return;
    }

    const productClose = event.target.closest("[data-js-product-close]");

    if (productClose && productOverlay && !productOverlay.hidden) {
      event.preventDefault();
      closeProductFromOverlay();
      return;
    }

    const productTab = event.target.closest("[data-js-product-tab]");

    if (productTab) {
      setProductTab(productTab);
      return;
    }

    const minus = event.target.closest("[data-js-product-minus]");
    const plus = event.target.closest("[data-js-product-plus]");

    if (minus || plus) {
      const detail = event.target.closest("[data-js-product-detail]");
      const quantity = detail?.querySelector("[data-js-product-quantity]");
      const currentValue = Number(quantity?.textContent) || 1;

      if (quantity) {
        quantity.textContent = String(
          Math.max(1, Math.min(99, currentValue + (plus ? 1 : -1)))
        );
      }
      return;
    }

    const productBuy = event.target.closest("[data-js-product-buy]");

    if (productBuy) {
      const detail = productBuy.closest("[data-js-product-detail]");

      if (!detail) {
        return;
      }

      const quantity = Math.max(
        1,
        Number(detail.querySelector("[data-js-product-quantity]")?.textContent) || 1
      );
      const product = getProductFromDetail(detail);

      cartStore.addProduct(product, quantity);
      showCartFeedback(product, detail);
      productBuy.classList.add("is-added");
      productBuy.textContent = "Добавлено";

      window.setTimeout(() => {
        productBuy.classList.remove("is-added");
        productBuy.textContent = "В корзину";
      }, 1600);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const productTab = event.target.closest("[data-js-product-tab]");

    if (
      productTab &&
      (event.key === "ArrowLeft" || event.key === "ArrowRight")
    ) {
      const tabs = Array.from(
        productTab
          .closest("[role='tablist']")
          ?.querySelectorAll("[data-js-product-tab]") || []
      );
      const currentIndex = tabs.indexOf(productTab);
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextTab = tabs[(currentIndex + direction + tabs.length) % tabs.length];

      if (nextTab) {
        event.preventDefault();
        nextTab.focus();
        setProductTab(nextTab);
      }
    }
  });

  productOverlay?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeProductFromOverlay();
      return;
    }

    if (event.key !== "Tab" || !productOverlayDialog) {
      return;
    }

    const focusableElements = Array.from(
      productOverlayDialog.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => !element.closest("[hidden]"));

    if (!focusableElements.length) {
      event.preventDefault();
      productOverlayDialog.focus();
      return;
    }

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  window.addEventListener("popstate", (event) => {
    if (event.state?.awardProduct && event.state.awardProductUrl) {
      openProduct(event.state.awardProductUrl, { pushHistory: false });
      return;
    }

    if (productOverlay && !productOverlay.hidden) {
      setProductOverlayState(false);
    }

    if (Number.isFinite(event.state?.awardCatalogScrollY)) {
      window.requestAnimationFrame(() => {
        window.scrollTo(0, event.state.awardCatalogScrollY);
      });
    }
  });

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
    const pagination = catalog.querySelector("[data-js-catalog-pagination]");
    const allLink = catalog.querySelector("[data-js-catalog-all]");
    const tablist = tabs[0]?.parentElement || null;

    if (!tabs.length || !panels.length || !viewport || !pagination || !tablist) {
      return;
    }

    const reducedMotionQuery =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    const prefersReducedMotion = () => reducedMotionQuery?.matches ?? false;
    const switchingClass = "is-switching";
    const switchingAnimationDuration = 550;
    const switchingStaggerDelay = 55;
    const switchingCleanupBuffer = 50;
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
    let dots = [];
    let paginationTargets = [];

    const setActiveDot = (activeIndex) => {
      dots.forEach((dot, index) => {
        const isActive = index === activeIndex;

        dot.classList.toggle("is-active", isActive);

        if (isActive) {
          dot.setAttribute("aria-current", "page");
        } else {
          dot.removeAttribute("aria-current");
        }
      });
    };

    const getActivePanel = () => panels.find((panelItem) => !panelItem.hidden);

    const createPaginationTargets = (panelItem, maxScroll) => {
      const step = getCardStep();
      const mergeDistance = step * 0.25;
      const targets = [0];
      const addTarget = (left) => {
        const clampedLeft = Math.max(0, Math.min(left, maxScroll));
        const previousLeft = targets[targets.length - 1];

        if (
          targets.length > 1 &&
          clampedLeft - previousLeft <= mergeDistance
        ) {
          targets[targets.length - 1] = clampedLeft;
          return;
        }

        targets.push(clampedLeft);
      };

      if (pagination.dataset.jsCatalogPagination === "products") {
        const panelRect = panelItem.getBoundingClientRect();
        const cards = Array.from(
          panelItem.querySelectorAll(".AW-catalog-product")
        );

        cards.slice(1).forEach((card) => {
          const cardLeft = card.getBoundingClientRect().left - panelRect.left;

          if (cardLeft < maxScroll) {
            addTarget(cardLeft);
          }
        });
      } else {
        const cardsPerPage = Math.max(
          1,
          Math.round(viewport.clientWidth / step)
        );
        const pageStep = cardsPerPage * step;

        for (let left = pageStep; left < maxScroll; left += pageStep) {
          addTarget(left);
        }
      }

      addTarget(maxScroll);
      return targets;
    };

    const renderPagination = () => {
      const itemLabel = pagination.dataset.jsCatalogPagination === "products"
        ? "позицию товара"
        : "страницу";
      const fragment = document.createDocumentFragment();

      paginationTargets.forEach((target, index) => {
        const dot = document.createElement("button");

        dot.className = "AW-catalog__pagination-dot";
        dot.type = "button";
        dot.dataset.jsCatalogDot = "";
        dot.setAttribute(
          "aria-label",
          `Показать ${itemLabel} ${index + 1} из ${paginationTargets.length}`
        );
        dot.addEventListener("click", () => {
          viewport.scrollTo({
            left: target,
            behavior: prefersReducedMotion() ? "auto" : "smooth",
          });
          setActiveDot(index);
        });
        fragment.append(dot);
      });

      pagination.replaceChildren(fragment);
      dots = Array.from(pagination.querySelectorAll("[data-js-catalog-dot]"));
    };

    const updatePagination = (panelItem) => {
      const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);

      if (!panelItem || maxScroll <= 1) {
        pagination.hidden = true;
        paginationTargets = [];
        dots = [];
        pagination.replaceChildren();
        return;
      }

      paginationTargets = createPaginationTargets(panelItem, maxScroll);
      pagination.hidden = paginationTargets.length < 2;
      renderPagination();
    };

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
      if (!panelItem || prefersReducedMotion()) {
        return;
      }

      const products = Array.from(
        panelItem.querySelectorAll(".AW-catalog-product")
      );

      products.forEach((product, index) => {
        product.style.setProperty("--aw-catalog-card-index", String(index));
      });

      panels.forEach((panel) => panel.classList.remove(switchingClass));
      void panelItem.offsetWidth;
      panelItem.classList.add(switchingClass);

      if (switchingTimeout) {
        window.clearTimeout(switchingTimeout);
      }

      const switchingClearDelay =
        switchingAnimationDuration +
        Math.max(products.length - 1, 0) * switchingStaggerDelay +
        switchingCleanupBuffer;

      switchingTimeout = window.setTimeout(() => {
        panelItem.classList.remove(switchingClass);
        switchingTimeout = null;
      }, switchingClearDelay);
    };

    const updateDotsByScroll = () => {
      if (!paginationTargets.length) {
        return;
      }

      const activeIndex = paginationTargets.reduce(
        (nearestIndex, target, index) =>
          Math.abs(target - viewport.scrollLeft) <
          Math.abs(paginationTargets[nearestIndex] - viewport.scrollLeft)
            ? index
            : nearestIndex,
        0
      );
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

      if (prefersReducedMotion()) {
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

    const createBuyState = ({ animate = true, quantity = 1 } = {}) => {
      const buy = document.createElement("div");

      buy.className = "AW-catalog-product__buy";
      buy.dataset.jsCatalogBuyState = "";

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
          <span data-js-catalog-quantity>${quantity}</span>
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
          data-js-order-open="order"
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
      if (prefersReducedMotion()) {
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
      if (
        prefersReducedMotion() ||
        quantity.classList.contains("is-changing")
      ) {
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

    const syncProductCards = () => {
      catalog.querySelectorAll("[data-js-catalog-product]").forEach((card) => {
        const product = getProductFromCard(card);
        const cartQuantity = cartStore.getQuantity(product.key);
        const buy = card.querySelector("[data-js-catalog-buy-state]");
        const primary = card.querySelector("[data-js-catalog-buy-primary]");

        if (cartQuantity > 0) {
          if (!buy && primary) {
            primary.replaceWith(
              createBuyState({ animate: false, quantity: cartQuantity })
            );
            return;
          }

          const quantity = buy?.querySelector("[data-js-catalog-quantity]");

          if (quantity && !quantity.classList.contains("is-changing")) {
            quantity.textContent = String(cartQuantity);
          }

          return;
        }

        if (buy) {
          buy.replaceWith(createPrimaryBuyButton());
        }
      });
    };

    cartStore.subscribe(syncProductCards);

    const setActiveTab = (activeTab, { animate = true } = {}) => {
      const activePanelId = activeTab.getAttribute("aria-controls");
      const previousTab = tabs.find((tab) => tab.getAttribute("aria-selected") === "true");
      const hasChanged = previousTab !== activeTab;
      let activePanel = null;

      tabs.forEach((tab) => {
        const isActive = tab === activeTab;
        tab.classList.toggle("is-active", isActive);
        tab.setAttribute("aria-selected", String(isActive));
        tab.tabIndex = isActive ? 0 : -1;
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
      if (allLink && activeTab.dataset.catalogUrl) {
        allLink.href = activeTab.dataset.catalogUrl;
      }
      stopScrollAnimation();
      viewport.scrollLeft = 0;
      updatePagination(activePanel);
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
        const card = primaryBuyButton.closest("[data-js-catalog-product]");

        if (!card) {
          return;
        }

        const product = getProductFromCard(card);

        primaryBuyButton.replaceWith(
          createBuyState({ animate: !prefersReducedMotion() })
        );
        cartStore.addProduct(product);
        showCartFeedback(product, card);
        return;
      }

      const minus = event.target.closest("[data-js-catalog-minus]");
      const plus = event.target.closest("[data-js-catalog-plus]");

      if (!minus && !plus) {
        return;
      }

      const counter = event.target.closest("[data-js-catalog-counter]");
      const quantity = counter?.querySelector("[data-js-catalog-quantity]");
      const card = event.target.closest("[data-js-catalog-product]");

      if (!quantity || !card) {
        return;
      }

      if (quantity.classList.contains("is-changing")) {
        return;
      }

      animateCounterButton(plus || minus);

      const product = getProductFromCard(card);
      const currentValue =
        cartStore.getQuantity(product.key) || Number(quantity.textContent) || 1;

      if (minus && currentValue <= 1) {
        const buy = counter.closest("[data-js-catalog-buy-state]");

        if (buy) {
          if (prefersReducedMotion()) {
            cartStore.setQuantity(product.key, 0);
          } else {
            buy.classList.add("is-leaving");
            window.setTimeout(() => {
              cartStore.setQuantity(product.key, 0);
            }, 320);
          }
        }

        return;
      }

      const nextValue = plus ? currentValue + 1 : currentValue - 1;
      updateQuantity(quantity, nextValue, plus ? "down" : "up");
      cartStore.setQuantity(product.key, nextValue);
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

      updatePagination(activePanel);
      updateDotsByScroll();
    });

    const initialTab = tabs.find((tab) => tab.id === "cats") ||
      tabs.find((tab) => tab.getAttribute("aria-selected") === "true");

    if (initialTab) {
      setActiveTab(initialTab, { animate: false });
    }
  });

  const catalogPage = document.querySelector("[data-js-catalog-page]");

  if (catalogPage) {
    const grid = catalogPage.querySelector("[data-js-catalog-grid]");
    const cards = Array.from(
      catalogPage.querySelectorAll("[data-js-catalog-page-product]")
    );
    const search = catalogPage.querySelector("[data-js-catalog-search]");
    const sort = catalogPage.querySelector("[data-js-catalog-sort]");
    const result = catalogPage.querySelector("[data-js-catalog-result]");
    const empty = catalogPage.querySelector("[data-js-catalog-empty]");
    const pagination = catalogPage.querySelector(
      "[data-js-catalog-pagination]"
    );
    const applied = catalogPage.querySelector("[data-js-catalog-applied]");
    const tags = catalogPage.querySelector("[data-js-catalog-tags]");
    const filterShell = catalogPage.querySelector(
      "[data-js-catalog-filters-shell]"
    );
    const filterDialog = catalogPage.querySelector(
      "[data-js-catalog-filters-dialog]"
    );
    const filtersOpen = catalogPage.querySelector(
      "[data-js-catalog-filters-open]"
    );
    const filtersTotal = catalogPage.querySelector(
      "[data-js-catalog-filters-total]"
    );
    const priceMin = catalogPage.querySelector("[data-js-catalog-price-min]");
    const priceMax = catalogPage.querySelector("[data-js-catalog-price-max]");
    const filterNodes = Array.from(
      catalogPage.querySelectorAll("[data-js-catalog-filter]")
    );
    const optionInputs = Array.from(
      catalogPage.querySelectorAll("[data-js-catalog-option]")
    );
    const mobileFiltersQuery = window.matchMedia(`(max-width: ${desktopBreakpoint}px)`);
    const filterKeys = Array.from(new Set(optionInputs.map((input) => input.name)));
    const validSorts = new Set(["default", "price-asc", "price-desc", "name"]);
    const catalogPageSize = 12;
    const collator = new Intl.Collator("ru", { sensitivity: "base" });
    let filtersAreOpen = false;
    let openFilter = null;
    let searchTimeout = null;
    let catalogAnimationFrame = null;
    let catalogAnimationTimer = null;
    let currentCatalogPage = 1;

    cards.forEach((card, index) => {
      try {
        card.catalogData = JSON.parse(card.dataset.catalogProduct || "{}");
      } catch {
        card.catalogData = { index, name: "", price: 0, search: "", filters: {} };
      }
    });

    const revealCatalogCards = (pageCards, { animate = true } = {}) => {
      if (catalogAnimationFrame !== null) {
        window.cancelAnimationFrame(catalogAnimationFrame);
        catalogAnimationFrame = null;
      }
      if (catalogAnimationTimer !== null) {
        window.clearTimeout(catalogAnimationTimer);
        catalogAnimationTimer = null;
      }

      cards.forEach((card) => {
        card.classList.remove("is-revealing");
        card.style.removeProperty("--aw-catalog-page-card-index");
      });

      if (!animate || prefersReducedMotion() || !pageCards.length) {
        return;
      }

      catalogAnimationFrame = window.requestAnimationFrame(() => {
        pageCards.forEach((card, index) => {
          card.style.setProperty("--aw-catalog-page-card-index", String(index));
          card.classList.add("is-revealing");
        });
        catalogAnimationFrame = null;

        const animationDuration = 420 + Math.max(pageCards.length - 1, 0) * 42;
        catalogAnimationTimer = window.setTimeout(() => {
          pageCards.forEach((card) => {
            card.classList.remove("is-revealing");
            card.style.removeProperty("--aw-catalog-page-card-index");
          });
          catalogAnimationTimer = null;
        }, animationDuration);
      });
    };

    const closeFilter = ({ restoreFocus = false } = {}) => {
      if (!openFilter) {
        return;
      }

      const toggle = openFilter.querySelector("[data-js-catalog-filter-toggle]");
      const panel = openFilter.querySelector("[data-js-catalog-filter-panel]");

      toggle?.setAttribute("aria-expanded", "false");
      if (panel) {
        panel.hidden = true;
      }
      if (restoreFocus) {
        toggle?.focus();
      }
      openFilter = null;
    };

    const toggleFilter = (filter) => {
      const shouldOpen = filter !== openFilter;

      closeFilter();
      if (!shouldOpen) {
        return;
      }

      const toggle = filter.querySelector("[data-js-catalog-filter-toggle]");
      const panel = filter.querySelector("[data-js-catalog-filter-panel]");

      toggle?.setAttribute("aria-expanded", "true");
      if (panel) {
        panel.hidden = false;
      }
      openFilter = filter;
    };

    const setFiltersState = (isOpen, { restoreFocus = true } = {}) => {
      if (!filterShell || !filtersOpen || !mobileFiltersQuery.matches) {
        return;
      }

      filtersAreOpen = isOpen;
      filterShell.classList.toggle("is-open", isOpen);
      filtersOpen.setAttribute("aria-expanded", String(isOpen));
      filterShell.inert = !isOpen;
      document.body.classList.toggle("AW-catalog-filters-open", isOpen);

      if (isOpen) {
        filterDialog?.setAttribute("role", "dialog");
        filterDialog?.setAttribute("aria-modal", "true");
        filterDialog?.setAttribute("aria-labelledby", "AW-catalog-page-filters-title");
        window.requestAnimationFrame(() => {
          filterDialog
            ?.querySelector("[data-js-catalog-filters-close]")
            ?.focus();
        });
        return;
      }

      closeFilter();
      filterDialog?.removeAttribute("role");
      filterDialog?.removeAttribute("aria-modal");
      filterDialog?.removeAttribute("aria-labelledby");
      if (restoreFocus) {
        filtersOpen.focus();
      }
    };

    const syncFiltersMode = () => {
      if (!filterShell || !filterDialog) {
        return;
      }

      if (mobileFiltersQuery.matches) {
        filterShell.inert = !filtersAreOpen;
        return;
      }

      filtersAreOpen = false;
      filterShell.inert = false;
      filterShell.classList.remove("is-open");
      filtersOpen?.setAttribute("aria-expanded", "false");
      filterDialog.removeAttribute("role");
      filterDialog.removeAttribute("aria-modal");
      filterDialog.removeAttribute("aria-labelledby");
      document.body.classList.remove("AW-catalog-filters-open");
    };

    const selectedFilters = () => {
      const selected = new Map();

      filterKeys.forEach((key) => {
        const values = optionInputs
          .filter((input) => input.name === key && input.checked)
          .map((input) => input.value);

        if (values.length) {
          selected.set(key, values);
        }
      });

      return selected;
    };

    const normalizePriceFields = () => {
      const min = Number(priceMin?.value) || null;
      const max = Number(priceMax?.value) || null;

      if (min !== null && max !== null && min > max) {
        priceMin.value = String(max);
        priceMax.value = String(min);
      }
    };

    const updateUrl = (selected) => {
      const url = new URL(window.location.href);

      ["q", "sort", "price_min", "price_max", "page", ...filterKeys].forEach(
        (key) => {
          url.searchParams.delete(key);
        }
      );

      const query = search?.value.trim() || "";
      if (query) {
        url.searchParams.set("q", query);
      }
      if (sort?.value && sort.value !== "default") {
        url.searchParams.set("sort", sort.value);
      }
      if (priceMin?.value) {
        url.searchParams.set("price_min", priceMin.value);
      }
      if (priceMax?.value) {
        url.searchParams.set("price_max", priceMax.value);
      }
      if (currentCatalogPage > 1) {
        url.searchParams.set("page", String(currentCatalogPage));
      }

      selected.forEach((values, key) => {
        values.forEach((value) => url.searchParams.append(key, value));
      });

      window.history.replaceState(
        { ...(window.history.state || {}), awardCatalogFilters: true },
        "",
        `${url.pathname}${url.search}${url.hash}`
      );
    };

    const createTag = ({ label, type, key = "", value = "" }) => {
      const button = document.createElement("button");

      button.className = "AW-btn AW-catalog-page__tag";
      button.type = "button";
      button.textContent = label;
      button.dataset.jsCatalogTag = type;
      if (key) {
        button.dataset.filterKey = key;
      }
      if (value) {
        button.dataset.filterValue = value;
      }
      button.setAttribute("aria-label", `Удалить фильтр: ${label}`);
      return button;
    };

    const renderTags = (selected) => {
      if (!tags || !applied) {
        return;
      }

      const fragment = document.createDocumentFragment();

      selected.forEach((values, key) => {
        const group = optionInputs.find((input) => input.name === key)?.closest(
          "[data-js-catalog-filter]"
        );
        const groupLabel = group
          ?.querySelector("[data-js-catalog-filter-toggle] > span")
          ?.textContent.trim();

        values.forEach((value) => {
          fragment.append(
            createTag({
              label: groupLabel ? `${groupLabel}: ${value}` : value,
              type: "option",
              key,
              value,
            })
          );
        });
      });

      if (priceMin?.value) {
        fragment.append(
          createTag({ label: `Цена от ${priceMin.value} р.`, type: "price-min" })
        );
      }
      if (priceMax?.value) {
        fragment.append(
          createTag({ label: `Цена до ${priceMax.value} р.`, type: "price-max" })
        );
      }

      tags.replaceChildren(fragment);
      applied.hidden = !tags.childElementCount;
    };

    const updateFilterCounts = () => {
      let total = 0;

      filterNodes.forEach((filter) => {
        const checkedCount = filter.querySelectorAll(
          "[data-js-catalog-option]:checked"
        ).length;
        const hasPrice = Boolean(
          filter.querySelector("[data-js-catalog-price-min]") &&
            (priceMin?.value || priceMax?.value)
        );
        const count = checkedCount + (hasPrice ? 1 : 0);
        const countNode = filter.querySelector("[data-js-catalog-filter-count]");

        total += count;
        if (countNode) {
          countNode.textContent = String(count);
          countNode.hidden = count === 0;
        }
      });

      if (filtersTotal) {
        filtersTotal.textContent = String(total);
        filtersTotal.hidden = total === 0;
      }
    };

    const createPaginationButton = ({
      label,
      page,
      current = false,
      disabled = false,
      modifier = "",
    }) => {
      const button = document.createElement("button");
      const modifiers = modifier.split(" ").filter(Boolean);
      const modifierClasses = modifiers
        .map((item) => ` AW-catalog-page__pagination-button--${item}`)
        .join("");

      button.className = `AW-btn AW-catalog-page__pagination-button${modifierClasses}`;
      button.type = "button";
      button.textContent = label;
      button.disabled = disabled;
      button.dataset.jsCatalogPageTarget = String(page);

      if (current) {
        button.setAttribute("aria-current", "page");
        button.setAttribute("aria-label", `Страница ${page}, текущая`);
      } else if (modifiers.includes("previous")) {
        button.setAttribute("aria-label", "Предыдущая страница каталога");
      } else if (modifiers.includes("next")) {
        button.setAttribute("aria-label", "Следующая страница каталога");
      } else {
        button.setAttribute("aria-label", `Перейти на страницу ${page}`);
      }

      return button;
    };

    const paginationSequence = (totalPages) => {
      if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
      }

      const pages = Array.from(
        new Set([
          1,
          totalPages,
          currentCatalogPage - 1,
          currentCatalogPage,
          currentCatalogPage + 1,
        ])
      )
        .filter((page) => page >= 1 && page <= totalPages)
        .sort((first, second) => first - second);
      const sequence = [];

      pages.forEach((page, index) => {
        if (index > 0 && page - pages[index - 1] > 1) {
          sequence.push("ellipsis");
        }
        sequence.push(page);
      });

      return sequence;
    };

    const renderPagination = (totalPages) => {
      if (!pagination) {
        return;
      }

      if (totalPages <= 1) {
        pagination.replaceChildren();
        pagination.hidden = true;
        return;
      }

      const fragment = document.createDocumentFragment();

      fragment.append(
        createPaginationButton({
          label: "Назад",
          page: currentCatalogPage - 1,
          disabled: currentCatalogPage === 1,
          modifier: "direction previous",
        })
      );

      paginationSequence(totalPages).forEach((item) => {
        if (item === "ellipsis") {
          const ellipsis = document.createElement("span");

          ellipsis.className = "AW-catalog-page__pagination-ellipsis";
          ellipsis.textContent = "…";
          ellipsis.setAttribute("aria-hidden", "true");
          fragment.append(ellipsis);
          return;
        }

        fragment.append(
          createPaginationButton({
            label: String(item),
            page: item,
            current: item === currentCatalogPage,
          })
        );
      });

      fragment.append(
        createPaginationButton({
          label: "Вперёд",
          page: currentCatalogPage + 1,
          disabled: currentCatalogPage === totalPages,
          modifier: "direction next",
        })
      );

      pagination.replaceChildren(fragment);
      pagination.hidden = false;
    };

    const applyCatalogState = ({
      syncUrl = true,
      resetPage = false,
      animate = true,
    } = {}) => {
      if (!grid || !search || !sort || !result || !empty) {
        return;
      }

      if (resetPage) {
        currentCatalogPage = 1;
      }
      normalizePriceFields();
      const selected = selectedFilters();
      const query = search.value.trim().toLocaleLowerCase("ru-RU");
      const min = Number(priceMin?.value) || Number.NEGATIVE_INFINITY;
      const max = Number(priceMax?.value) || Number.POSITIVE_INFINITY;
      const visibleCards = cards.filter((card) => {
        const data = card.catalogData;
        const matchesSearch = !query || String(data.search || "").includes(query);
        const matchesPrice = data.price >= min && data.price <= max;
        const matchesFilters = Array.from(selected.entries()).every(
          ([key, selectedValues]) => {
            const productValues = data.filters?.[key] || [];
            return selectedValues.some((value) => productValues.includes(value));
          }
        );

        return matchesSearch && matchesPrice && matchesFilters;
      });
      const sortedCards = [...cards].sort((first, second) => {
        if (sort.value === "price-asc") {
          return first.catalogData.price - second.catalogData.price;
        }
        if (sort.value === "price-desc") {
          return second.catalogData.price - first.catalogData.price;
        }
        if (sort.value === "name") {
          return collator.compare(first.catalogData.name, second.catalogData.name);
        }
        return first.catalogData.index - second.catalogData.index;
      });
      const filteredSet = new Set(visibleCards);
      const sortedVisibleCards = sortedCards.filter((card) => filteredSet.has(card));
      const totalPages = Math.ceil(sortedVisibleCards.length / catalogPageSize);
      const lastAvailablePage = Math.max(totalPages, 1);

      currentCatalogPage = Math.min(
        Math.max(currentCatalogPage, 1),
        lastAvailablePage
      );

      const pageStart = (currentCatalogPage - 1) * catalogPageSize;
      const pageCards = sortedVisibleCards.slice(
        pageStart,
        pageStart + catalogPageSize
      );
      const visibleSet = new Set(pageCards);

      sortedCards.forEach((card) => {
        card.hidden = !visibleSet.has(card);
        grid.append(card);
      });

      result.textContent = String(visibleCards.length);
      empty.hidden = visibleCards.length > 0;
      grid.hidden = visibleCards.length === 0;
      renderPagination(totalPages);
      renderTags(selected);
      updateFilterCounts();
      revealCatalogCards(pageCards, { animate });
      if (syncUrl) {
        updateUrl(selected);
      }
    };

    const clearCatalogState = () => {
      optionInputs.forEach((input) => {
        input.checked = false;
      });
      if (priceMin) {
        priceMin.value = "";
      }
      if (priceMax) {
        priceMax.value = "";
      }
      if (search) {
        search.value = "";
      }
      if (sort) {
        sort.value = "default";
      }
      applyCatalogState({ resetPage: true });
    };

    const restoreCatalogState = () => {
      const params = new URLSearchParams(window.location.search);

      optionInputs.forEach((input) => {
        input.checked = params.getAll(input.name).includes(input.value);
      });
      if (search) {
        search.value = params.get("q") || "";
      }
      if (priceMin) {
        priceMin.value = params.get("price_min") || "";
      }
      if (priceMax) {
        priceMax.value = params.get("price_max") || "";
      }
      if (sort) {
        const requestedSort = params.get("sort") || "default";
        sort.value = validSorts.has(requestedSort) ? requestedSort : "default";
      }
      const requestedPage = Number.parseInt(params.get("page") || "1", 10);
      currentCatalogPage =
        Number.isSafeInteger(requestedPage) && requestedPage > 0
          ? requestedPage
          : 1;
    };

    const createCatalogPageBuyState = (quantity) => {
      const buy = document.createElement("div");

      buy.className = "AW-catalog-product__buy";
      buy.dataset.jsCatalogBuyState = "";
      buy.innerHTML = `
        <div class="AW-catalog-product__counter" data-js-catalog-counter>
          <button
            class="AW-btn AW-catalog-product__counter-button"
            type="button"
            aria-label="Уменьшить количество"
            data-js-catalog-minus
          >&minus;</button>
          <span data-js-catalog-quantity>${quantity}</span>
          <button
            class="AW-btn AW-catalog-product__counter-button"
            type="button"
            aria-label="Увеличить количество"
            data-js-catalog-plus
          >+</button>
        </div>
        <button
          class="AW-btn AW-catalog-product__buy-button"
          type="button"
          data-js-order-open="order"
        >Купить</button>
      `;
      return buy;
    };

    const createCatalogPageBuyButton = () => {
      const button = document.createElement("button");

      button.className =
        "AW-btn AW-catalog-product__button AW-catalog-product__button--primary";
      button.type = "button";
      button.dataset.jsCatalogPageBuyPrimary = "";
      button.textContent = "Купить в 1 клик";
      return button;
    };

    const syncCatalogPageCards = () => {
      cards.forEach((card) => {
        const product = getProductFromCard(card);
        const quantity = cartStore.getQuantity(product.key);
        const buyState = card.querySelector("[data-js-catalog-buy-state]");
        const buyButton = card.querySelector("[data-js-catalog-page-buy-primary]");

        if (quantity > 0) {
          if (!buyState && buyButton) {
            buyButton.replaceWith(createCatalogPageBuyState(quantity));
            return;
          }

          const quantityNode = buyState?.querySelector("[data-js-catalog-quantity]");
          if (quantityNode) {
            quantityNode.textContent = String(quantity);
          }
          return;
        }

        if (buyState) {
          buyState.replaceWith(createCatalogPageBuyButton());
        }
      });
    };

    filterNodes.forEach((filter) => {
      filter
        .querySelector("[data-js-catalog-filter-toggle]")
        ?.addEventListener("click", () => toggleFilter(filter));
    });

    optionInputs.forEach((input) => {
      input.addEventListener("change", () =>
        applyCatalogState({ resetPage: true })
      );
    });

    catalogPage
      .querySelector("[data-js-catalog-price-apply]")
      ?.addEventListener("click", () => {
        applyCatalogState({ resetPage: true });
        closeFilter({ restoreFocus: true });
      });

    [priceMin, priceMax].forEach((input) => {
      input?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          applyCatalogState({ resetPage: true });
          closeFilter({ restoreFocus: true });
        }
      });
    });

    search?.addEventListener("input", () => {
      if (searchTimeout) {
        window.clearTimeout(searchTimeout);
      }
      searchTimeout = window.setTimeout(() => {
        applyCatalogState({ resetPage: true });
        searchTimeout = null;
      }, 160);
    });

    sort?.addEventListener("change", () =>
      applyCatalogState({ resetPage: true })
    );

    catalogPage.querySelectorAll("[data-js-catalog-clear]").forEach((button) => {
      button.addEventListener("click", clearCatalogState);
    });

    tags?.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const tag = event.target.closest("[data-js-catalog-tag]");
      if (!tag) {
        return;
      }

      if (tag.dataset.jsCatalogTag === "option") {
        const input = optionInputs.find(
          (item) =>
            item.name === tag.dataset.filterKey &&
            item.value === tag.dataset.filterValue
        );
        if (input) {
          input.checked = false;
        }
      } else if (tag.dataset.jsCatalogTag === "price-min" && priceMin) {
        priceMin.value = "";
      } else if (tag.dataset.jsCatalogTag === "price-max" && priceMax) {
        priceMax.value = "";
      }

      applyCatalogState({ resetPage: true });
    });

    pagination?.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const button = event.target.closest("[data-js-catalog-page-target]");
      const requestedPage = Number.parseInt(
        button?.dataset.jsCatalogPageTarget || "",
        10
      );

      if (
        !button ||
        button.hasAttribute("aria-current") ||
        button.disabled ||
        !Number.isSafeInteger(requestedPage) ||
        requestedPage < 1
      ) {
        return;
      }

      currentCatalogPage = requestedPage;
      applyCatalogState();
      result?.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start",
      });
    });

    filtersOpen?.addEventListener("click", () => setFiltersState(true));
    catalogPage
      .querySelectorAll("[data-js-catalog-filters-close]")
      .forEach((button) => {
        button.addEventListener("click", () => setFiltersState(false));
      });

    catalogPage.addEventListener("click", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const primaryBuy = event.target.closest(
        "[data-js-catalog-page-buy-primary]"
      );

      if (primaryBuy) {
        const card = primaryBuy.closest("[data-js-catalog-page-product]");
        if (card) {
          const product = getProductFromCard(card);
          cartStore.addProduct(product);
          showCartFeedback(product, card);
        }
        return;
      }

      const minus = event.target.closest("[data-js-catalog-minus]");
      const plus = event.target.closest("[data-js-catalog-plus]");

      if (!minus && !plus) {
        return;
      }

      const card = event.target.closest("[data-js-catalog-page-product]");
      if (!card) {
        return;
      }

      const product = getProductFromCard(card);
      const currentQuantity = cartStore.getQuantity(product.key);
      cartStore.setQuantity(
        product.key,
        plus ? currentQuantity + 1 : currentQuantity - 1
      );
    });

    document.addEventListener("click", (event) => {
      if (
        openFilter &&
        event.target instanceof Node &&
        !openFilter.contains(event.target)
      ) {
        closeFilter();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (filtersAreOpen) {
          setFiltersState(false);
        } else if (openFilter) {
          closeFilter({ restoreFocus: true });
        }
      }

      if (
        event.key !== "Tab" ||
        !filtersAreOpen ||
        !filterDialog
      ) {
        return;
      }

      const focusable = Array.from(
        filterDialog.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.closest("[hidden]"));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    });

    if (typeof mobileFiltersQuery.addEventListener === "function") {
      mobileFiltersQuery.addEventListener("change", syncFiltersMode);
    } else {
      mobileFiltersQuery.addListener(syncFiltersMode);
    }

    cartStore.subscribe(syncCatalogPageCards);
    restoreCatalogState();
    syncFiltersMode();
    applyCatalogState({ syncUrl: false, animate: false });
  }
});
