(() => {
  const bindHeroPrimarySmoothScroll = () => {
    const heroLinks = document.querySelectorAll('.FZ-hero__button--primary[href*="#"]');

    heroLinks.forEach((link) => {
      if (link.dataset.fzSmoothBound === "true") {
        return;
      }

      link.dataset.fzSmoothBound = "true";

      link.addEventListener("click", (event) => {
        const targetSelector = new URL(link.href, window.location.href).hash;

        if (!targetSelector || targetSelector.length <= 1) {
          return;
        }

        const target = document.querySelector(targetSelector);

        if (!target) {
          return;
        }

        event.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  };

  const normalizedPath = (window.location.pathname || "").replace(/\/+$/, "") || "/";
  const isHomePage = normalizedPath === "/" || /\/index\.html?$/i.test(normalizedPath);
  document.documentElement.classList.toggle("is-home", isHomePage);

  if (window.FZFeatures && typeof window.FZFeatures.initSmoothScroll === "function") {
    window.FZFeatures.initSmoothScroll();
  }

  if (window.FZFeatures && typeof window.FZFeatures.initLinesTabs === "function") {
    window.FZFeatures.initLinesTabs();
  }

  bindHeroPrimarySmoothScroll();
})();
