(() => {
  window.FZFeatures = window.FZFeatures || {};

  window.FZFeatures.initSmoothScroll = () => {
    const navLinks = document.querySelectorAll(
      '.FZ-header__link[href^="#"], .FZ-footer__link[href="#lines"]'
    );

    navLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        const targetSelector = link.getAttribute("href");

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
})();
