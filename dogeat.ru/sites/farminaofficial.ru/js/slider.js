(function () {
  const clampIndex = (i, len) => Math.max(0, Math.min(i, len - 1));
  const SLIDER_SECTION_SELECTOR = ".FA-slider";
  if (typeof window.Swiper !== "function") return;

  const topTabsEl = document.querySelector(".top-tabs");
  if (topTabsEl) {
    new Swiper(topTabsEl, {
      slidesPerView: "auto",
      freeMode: true,
      allowTouchMove: true,
    });
  }

  const spTabs = [
    document.getElementById("sp-tab-dogs"),
    document.getElementById("sp-tab-cats"),
  ];
  const spPanels = [
    document.getElementById("sp-panel-dogs"),
    document.getElementById("sp-panel-cats"),
  ];
  const sliderSection = document.querySelector(SLIDER_SECTION_SELECTOR);

  function setSpeciesActive(index, { focus = false, reset = true } = {}) {
    spTabs.forEach((btn, i) => {
      const sel = i === index;
      btn?.classList.toggle("is-active", sel);
    });
    spPanels.forEach((panel, i) => {
      const show = i === index;
      if (panel) panel.hidden = !show;
    });

    const activeSet = index === 0 ? dogs : cats;
    if (activeSet?.bot) {
      requestAnimationFrame(() => {
        activeSet.bot.update();
        activeSet.bot.updateAutoHeight(0);
      });
    }

    if (focus) spTabs[index]?.focus();
    if (reset) resetLines(index);
  }

  spTabs.forEach((btn, i) => {
    btn?.addEventListener("click", () => {
      setSpeciesActive(i, { focus: true });

      const hashValue = i === 0 ? "#sp-tab-dogs" : "#sp-tab-cats";
      scrollToHashTarget(hashValue, { smooth: true });
      requestAnimationFrame(() => {
        scrollToHashTarget(hashValue, { smooth: true });
      });
    });
  });

  function createLineSwipers(scopeSelector) {
    const midSel = scopeSelector + " .mid-tabs";
    const botSel = scopeSelector + " .bot-panels";
    const midEl = document.querySelector(midSel);
    const botEl = document.querySelector(botSel);

    if (!midEl || !botEl) {
      return { bot: null, setActive: () => {} };
    }

    const mid = new Swiper(midEl, {
      slidesPerView: "auto",
      spaceBetween: 8,
      breakpoints: {
        376: {
          spaceBetween: 19,
        },
      },
      centeredSlides: false,
      slideToClickedSlide: true,
      watchSlidesProgress: true,
      observeParents: true,
      observer: true,
      speed: 450,
    });

    const bot = new Swiper(botEl, {
      autoHeight: true,
      observeParents: true,
      observer: true,
      preloadImages: true,
      speed: 450,
    });

    const tabBtns = Array.from(midEl.querySelectorAll(".tab-btn--line"));
    const len = tabBtns.length;

    let internal = false;
    let activeIndex = 0;

    function setActive(i, { focus = false } = {}) {
      if (!len) return;
      i = clampIndex(i, len);
      activeIndex = i;
      internal = true;
      bot.slideTo(i);
      mid.slideTo(i);
      tabBtns.forEach((btn, idx) => {
        const sel = idx === i;
        btn.classList.toggle("is-active", sel);
      });
      bot.updateAutoHeight(0);
      if (focus) tabBtns[i].focus();
      internal = false;
    }

    tabBtns.forEach((btn, i) => {
      btn.addEventListener("click", () => setActive(i));
      btn.addEventListener("keydown", (e) => {
        const cur = activeIndex;
        if (e.key === "ArrowRight") {
          e.preventDefault();
          setActive(cur + 1, { focus: true });
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          setActive(cur - 1, { focus: true });
        }
        if (e.key === "Home") {
          e.preventDefault();
          setActive(0, { focus: true });
        }
        if (e.key === "End") {
          e.preventDefault();
          setActive(len - 1, { focus: true });
        }
      });
    });

    bot.on("slideChange", () => {
      if (!internal) setActive(bot.activeIndex);
    });
    bot.on("imagesReady", () => {
      bot.updateAutoHeight(0);
    });

    setActive(0);
    return { bot, setActive };
  }

  const dogs = createLineSwipers("#sp-panel-dogs");
  const cats = createLineSwipers("#sp-panel-cats");

  function resetLines(speciesIndex) {
    if (speciesIndex === 0) dogs?.setActive(0);
    else cats?.setActive(0);
  }

  setSpeciesActive(0);

  function parseHash(hashValue) {
    const id = (hashValue || "").replace(/^#/, "");
    if (!id) return null;

    if (id === "sp-tab-dogs" || id === "sp-panel-dogs") {
      return { speciesIndex: 0 };
    }
    if (id === "sp-tab-cats" || id === "sp-panel-cats") {
      return { speciesIndex: 1 };
    }

    let match = id.match(/^dogs-line-(\d+)$/);
    if (match) {
      return { speciesIndex: 0, lineIndex: Number(match[1]) - 1 };
    }

    match = id.match(/^cats-line-(\d+)$/);
    if (match) {
      return { speciesIndex: 1, lineIndex: Number(match[1]) - 1 };
    }

    return null;
  }

  function syncFromHash(parsed) {
    if (!parsed) return;

    const isLineTarget = Number.isInteger(parsed.lineIndex);
    setSpeciesActive(parsed.speciesIndex, { reset: !isLineTarget });

    if (isLineTarget) {
      const lineSet = parsed.speciesIndex === 0 ? dogs : cats;
      lineSet.setActive(parsed.lineIndex);
    }
  }

  function getScrollTarget(hashValue) {
    const id = (hashValue || "").replace(/^#/, "");
    if (!id) return;

    if (sliderSection) return sliderSection;

    return document.getElementById(id);
  }

  function scrollToHashTarget(hashValue, { smooth = false } = {}) {
    const target = getScrollTarget(hashValue);
    if (!target) return;

    const y = target.getBoundingClientRect().top + window.scrollY;
    const top = Math.max(0, y);

    if (smooth && "scrollBehavior" in document.documentElement.style) {
      const prefersReducedMotion =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (!prefersReducedMotion) {
        window.scrollTo({ top, behavior: "smooth" });
        return;
      }
    }

    window.scrollTo(0, top);
  }

  function applyHashState(hashValue, parsedHash, { smoothScroll = false } = {}) {
    const parsed = parsedHash ?? parseHash(hashValue);
    if (!parsed) return;

    syncFromHash(parsed);
    scrollToHashTarget(hashValue, { smooth: smoothScroll });

    // Повторяем прокрутку после переключения вкладок, чтобы зафиксировать позицию
    // после возможного пересчёта высоты слайдера.
    requestAnimationFrame(() => {
      scrollToHashTarget(hashValue, { smooth: smoothScroll });
    });
  }

  requestAnimationFrame(() => {
    applyHashState(window.location.hash);
  });

  window.addEventListener("hashchange", () => applyHashState(window.location.hash));

  // Управляем hash-навигацией вручную, чтобы контролировать порядок
  // переключения вкладок и прокрутки к блоку слайдера.
  document.addEventListener("click", (evt) => {
    if (evt.defaultPrevented) return;
    if (evt.button !== 0) return;
    if (evt.metaKey || evt.ctrlKey || evt.shiftKey || evt.altKey) return;

    const link = evt.target.closest('a[href^="#"]');
    if (!link) return;
    if (link.target && link.target !== "_self") return;
    if (link.hasAttribute("download")) return;

    const href = link.getAttribute("href");
    const parsed = parseHash(href);
    if (!parsed) return;

    evt.preventDefault();

    if (href !== window.location.hash) {
      history.pushState(null, "", href);
    }

    const smoothScroll = href === "#sp-tab-dogs" || href === "#sp-tab-cats";
    applyHashState(href, parsed, { smoothScroll });
  });
})();
