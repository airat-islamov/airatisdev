(() => {
  window.FZFeatures = window.FZFeatures || {};

  window.FZFeatures.initLinesTabs = () => {
    const sections = document.querySelectorAll(".FZ-lines");
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    sections.forEach((section, sectionIndex) => {
      const tabs = Array.from(section.querySelectorAll(".FZ-lines__tab[data-lines-target]"));
      const panels = Array.from(section.querySelectorAll(".FZ-lines__cards[data-lines-panel]"));
      const cards = Array.from(section.querySelectorAll(".FZ-lines__card"));
      const tabsTrack = section.querySelector(".FZ-lines__tabs[data-lines-tabs]");
      const compactViewQuery = window.matchMedia("(max-width: 1280px)");
      let animateTimeout = null;

      if (tabs.length === 0 || panels.length === 0) {
        return;
      }

      const updateTabIndicator = (target) => {
        if (!tabsTrack) {
          return;
        }

        const activeTab = tabs.find((tab) => tab.dataset.linesTarget === target);

        if (!activeTab) {
          return;
        }

        const trackRect = tabsTrack.getBoundingClientRect();
        const tabRect = activeTab.getBoundingClientRect();
        const tabLeft = tabRect.left - trackRect.left;

        tabsTrack.style.setProperty("--fz-tab-left", `${tabLeft}px`);
        tabsTrack.style.setProperty("--fz-tab-width", `${tabRect.width}px`);
      };

      const animateActivePanel = (panel) => {
        if (!panel || prefersReducedMotion) {
          return;
        }

        const cards = Array.from(panel.querySelectorAll(".FZ-lines__card"));
        cards.forEach((card, index) => {
          card.style.setProperty("--fz-card-index", `${index}`);
        });

        panel.classList.remove("FZ-lines__cards--switching");
        void panel.offsetWidth;
        panel.classList.add("FZ-lines__cards--switching");

        if (animateTimeout) {
          window.clearTimeout(animateTimeout);
        }

        animateTimeout = window.setTimeout(() => {
          panel.classList.remove("FZ-lines__cards--switching");
          animateTimeout = null;
        }, 900);
      };

      const setCardExpandedState = (card, button, expanded) => {
        card.classList.toggle("FZ-lines__card--expanded", expanded);
        button.setAttribute("aria-expanded", expanded ? "true" : "false");
        button.textContent = expanded ? "Свернуть" : "Подробнее";
      };

      const syncReadMoreState = () => {
        const isCompactView = compactViewQuery.matches;
        const activePanel = panels.find((panel) => !panel.hidden) || null;

        cards.forEach((card) => {
          const button = card.querySelector(".FZ-lines__card-more");
          const description = card.querySelector(".FZ-lines__card-description");

          if (!button || !description) {
            return;
          }

          if (!isCompactView) {
            button.hidden = true;
            setCardExpandedState(card, button, false);
            return;
          }

          if (!activePanel || !activePanel.contains(card)) {
            button.hidden = true;
            return;
          }

          const wasExpanded = card.classList.contains("FZ-lines__card--expanded");
          card.classList.remove("FZ-lines__card--expanded");

          const hasHiddenText = description.scrollHeight > description.clientHeight + 1;
          button.hidden = !hasHiddenText;

          if (!hasHiddenText) {
            setCardExpandedState(card, button, false);
            return;
          }

          setCardExpandedState(card, button, wasExpanded);
        });
      };

      const initReadMore = () => {
        cards.forEach((card, cardIndex) => {
          const button = card.querySelector(".FZ-lines__card-more");
          const description = card.querySelector(".FZ-lines__card-description");

          if (!button || !description) {
            return;
          }

          if (!description.id) {
            description.id = `fz-lines-description-${sectionIndex + 1}-${cardIndex + 1}`;
          }

          button.setAttribute("aria-controls", description.id);

          button.addEventListener("click", () => {
            if (!compactViewQuery.matches || button.hidden) {
              return;
            }

            const expanded = !card.classList.contains("FZ-lines__card--expanded");
            setCardExpandedState(card, button, expanded);
          });
        });

        syncReadMoreState();
      };

      const setActive = (target, shouldAnimate = true) => {
        tabs.forEach((tab) => {
          const isActive = tab.dataset.linesTarget === target;
          tab.classList.toggle("FZ-lines__tab--active", isActive);
          tab.setAttribute("aria-pressed", isActive ? "true" : "false");
        });

        panels.forEach((panel) => {
          const isActive = panel.dataset.linesPanel === target;
          panel.hidden = !isActive;
          panel.setAttribute("aria-hidden", isActive ? "false" : "true");
          panel.style.display = isActive ? "" : "none";
        });

        updateTabIndicator(target);

        if (shouldAnimate) {
          const activePanel = panels.find((panel) => panel.dataset.linesPanel === target);
          animateActivePanel(activePanel);
        }

        syncReadMoreState();
      };

      tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          const target = tab.dataset.linesTarget;

          if (!target) {
            return;
          }

          setActive(target, true);
        });
      });

      const defaultTarget =
        tabs.find((tab) => tab.classList.contains("FZ-lines__tab--active"))?.dataset.linesTarget || "dogs";

      initReadMore();
      setActive(defaultTarget, false);

      window.addEventListener("resize", () => {
        const activeTarget =
          tabs.find((tab) => tab.classList.contains("FZ-lines__tab--active"))?.dataset.linesTarget || "dogs";
        updateTabIndicator(activeTarget);
        syncReadMoreState();
      });

      if (typeof compactViewQuery.addEventListener === "function") {
        compactViewQuery.addEventListener("change", syncReadMoreState);
      } else if (typeof compactViewQuery.addListener === "function") {
        compactViewQuery.addListener(syncReadMoreState);
      }
    });
  };
})();
