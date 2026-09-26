(() => {
  const initHolisticCarousel = () => {
    const section = document.querySelector("[data-js-holistic]");

    if (!section) {
      return;
    }

    const viewport = section.querySelector("[data-js-holistic-viewport]");
    const track = section.querySelector("[data-js-holistic-track]");
    const pagination = section.querySelector("[data-js-holistic-pagination]");

    if (!viewport || !pagination || !track) {
      return;
    }

    if (typeof window.Swiper !== "function") {
      const updateFallbackGap = () => {
        track.style.gap = window.innerWidth <= 700 ? "16px" : "24px";
      };

      viewport.style.overflowX = "auto";
      viewport.style.overflowY = "hidden";
      viewport.style.scrollSnapType = "x mandatory";
      viewport.style.scrollBehavior = "smooth";
      track.style.width = "max-content";
      pagination.hidden = true;

      updateFallbackGap();
      window.addEventListener("resize", updateFallbackGap, { passive: true });

      return;
    }

    const carousel = new window.Swiper(viewport, {
      slidesPerView: "auto",
      slidesPerGroup: 1,
      slidesPerGroupAuto: true,
      watchOverflow: true,
      speed: 540,
      spaceBetween: 24,
      grabCursor: true,
      breakpoints: {
        0: {
          spaceBetween: 16,
        },
        701: {
          spaceBetween: 24,
        },
      },
      pagination: {
        el: pagination,
        clickable: true,
        bulletClass: "JD-btn JD-holistic__dot",
        bulletActiveClass: "is-active",
        renderBullet: (index, className) =>
          `<button class="${className}" type="button" aria-label="Показать слайд ${index + 1}"></button>`,
      },
      a11y: {
        enabled: true,
      },
      keyboard: {
        enabled: true,
        onlyInViewport: true,
      },
    });

    section.JDHolisticCarouselApi = {
      setPage: (pageIndex, speed = 540) => {
        carousel.slideTo(pageIndex, speed);
      },
      recalc: () => {
        carousel.update();
      },
    };
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHolisticCarousel);
  } else {
    initHolisticCarousel();
  }
})();
