(() => {
  const AUTOPLAY_DELAY = 4200;
  const AUTOPLAY_RESTART_DELAY = 5200;

  const initCareSlider = () => {
    const careSection = document.querySelector("[data-js-care]");

    if (!careSection) {
      return;
    }

    const slider = careSection.querySelector("[data-js-care-cards]");
    const track = careSection.querySelector("[data-js-care-track]");
    if (!slider || !track) {
      return;
    }

    const originalCards = Array.from(track.querySelectorAll("[data-js-care-card]"));

    if (originalCards.length === 0) {
      return;
    }

    const loopEnabled = originalCards.length > 1;

    if (loopEnabled) {
      const firstClone = originalCards[0].cloneNode(true);
      const lastClone = originalCards[originalCards.length - 1].cloneNode(true);

      firstClone.setAttribute("data-js-care-clone", "first");
      lastClone.setAttribute("data-js-care-clone", "last");

      track.insertBefore(lastClone, originalCards[0]);
      track.append(firstClone);
    }

    const slides = Array.from(track.querySelectorAll("[data-js-care-card]"));
    const realSlides = slides.filter(
      (slide) => !slide.hasAttribute("data-js-care-clone"),
    );
    const realSlidesCount = realSlides.length;

    let activeSlideIndex = loopEnabled ? 1 : 0;
    let cardHeight = 0;
    let currentTranslate = 0;
    let pointerId = null;
    let startY = 0;
    let startTranslate = 0;
    let isPointerDown = false;
    let autoplayTimer = null;

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    const setTrackTransitionEnabled = (enabled) => {
      track.style.transition = enabled ? "" : "none";
    };

    const applyTranslate = (value) => {
      currentTranslate = value;
      track.style.transform = `translate3d(0, ${value}px, 0)`;
    };

    const getMinTranslate = () => -Math.max(0, (slides.length - 1) * cardHeight);

    const getRealIndexFromSlide = (slideIndex) => {
      if (!loopEnabled) {
        return clamp(slideIndex, 0, realSlidesCount - 1);
      }

      if (slideIndex <= 0) {
        return realSlidesCount - 1;
      }

      if (slideIndex >= slides.length - 1) {
        return 0;
      }

      return slideIndex - 1;
    };

    const getSlideIndexFromReal = (realIndex) => {
      const normalizedRealIndex =
        ((realIndex % realSlidesCount) + realSlidesCount) % realSlidesCount;

      if (!loopEnabled) {
        return normalizedRealIndex;
      }

      return normalizedRealIndex + 1;
    };

    const setSlideIndex = (nextSlideIndex, { instant = false } = {}) => {
      if (!cardHeight) {
        return;
      }

      activeSlideIndex = clamp(nextSlideIndex, 0, slides.length - 1);

      if (instant) {
        setTrackTransitionEnabled(false);
        applyTranslate(-activeSlideIndex * cardHeight);
        // Sync layout before turning transition back on.
        track.getBoundingClientRect();
        setTrackTransitionEnabled(true);
        return;
      }

      applyTranslate(-activeSlideIndex * cardHeight);
    };

    const normalizeLoopPosition = () => {
      if (!loopEnabled || !cardHeight) {
        return;
      }

      if (activeSlideIndex === 0) {
        setSlideIndex(realSlidesCount, { instant: true });
        return;
      }

      if (activeSlideIndex === slides.length - 1) {
        setSlideIndex(1, { instant: true });
      }
    };

    const setIndex = (nextIndex, options = {}) => {
      if (!realSlidesCount) {
        return;
      }

      const targetSlideIndex = getSlideIndexFromReal(nextIndex);
      setSlideIndex(targetSlideIndex, options);
    };

    const setProgress = (progress) => {
      if (!realSlidesCount) {
        return;
      }

      const safeProgress = clamp(progress, 0, 1);
      const nextIndex = Math.round(safeProgress * (realSlidesCount - 1));
      setIndex(nextIndex);
    };

    const stopAutoplay = () => {
      if (autoplayTimer !== null) {
        window.clearTimeout(autoplayTimer);
        autoplayTimer = null;
      }
    };

    const startAutoplay = (delay = AUTOPLAY_DELAY) => {
      stopAutoplay();

      if (!loopEnabled || document.hidden || isPointerDown) {
        return;
      }

      autoplayTimer = window.setTimeout(() => {
        setSlideIndex(activeSlideIndex + 1);
        startAutoplay();
      }, delay);
    };

    const restartAutoplay = (delay = AUTOPLAY_RESTART_DELAY) => {
      startAutoplay(delay);
    };

    const updateMeasurements = () => {
      const activeRealIndex = getRealIndexFromSlide(activeSlideIndex);

      slides.forEach((card) => {
        card.style.minHeight = "";
      });

      const nextCardHeight = Math.max(
        ...slides.map((card) => card.getBoundingClientRect().height),
      );

      cardHeight = nextCardHeight;

      if (!cardHeight) {
        return;
      }

      slides.forEach((card) => {
        card.style.minHeight = `${cardHeight}px`;
      });

      slider.style.setProperty("--jd-care-card-height", `${cardHeight}px`);
      setIndex(activeRealIndex, { instant: true });
    };

    const onPointerDown = (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      if (!cardHeight) {
        return;
      }

      stopAutoplay();

      isPointerDown = true;
      pointerId = event.pointerId;
      startY = event.clientY;
      startTranslate = currentTranslate;
      slider.classList.add("is-dragging");
      slider.setPointerCapture(pointerId);
    };

    const onPointerMove = (event) => {
      if (!isPointerDown || event.pointerId !== pointerId) {
        return;
      }

      const deltaY = event.clientY - startY;
      const nextTranslate = clamp(startTranslate + deltaY, getMinTranslate(), 0);
      applyTranslate(nextTranslate);
      event.preventDefault();
    };

    const onPointerEnd = (event) => {
      if (!isPointerDown || event.pointerId !== pointerId) {
        return;
      }

      isPointerDown = false;
      slider.classList.remove("is-dragging");

      if (slider.hasPointerCapture(pointerId)) {
        slider.releasePointerCapture(pointerId);
      }

      pointerId = null;

      if (!cardHeight) {
        return;
      }

      const nextIndex = Math.round(Math.abs(currentTranslate) / cardHeight);
      setSlideIndex(nextIndex);
      restartAutoplay();
    };

    const onTransitionEnd = (event) => {
      if (event.target !== track || event.propertyName !== "transform") {
        return;
      }

      normalizeLoopPosition();
    };

    slider.addEventListener("pointerdown", onPointerDown);
    slider.addEventListener("pointermove", onPointerMove);
    slider.addEventListener("pointerup", onPointerEnd);
    slider.addEventListener("pointercancel", onPointerEnd);
    slider.addEventListener("mouseenter", stopAutoplay);
    slider.addEventListener("mouseleave", () => {
      if (!isPointerDown) {
        startAutoplay();
      }
    });
    slider.addEventListener("focusin", stopAutoplay);
    slider.addEventListener("focusout", () => {
      if (!isPointerDown) {
        startAutoplay();
      }
    });
    track.addEventListener("transitionend", onTransitionEnd);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stopAutoplay();
        return;
      }

      if (!isPointerDown) {
        startAutoplay();
      }
    });

    window.addEventListener("resize", updateMeasurements);
    window.addEventListener("load", updateMeasurements);

    slider.JDCareSliderApi = {
      setIndex,
      setProgress,
      updateMeasurements,
      next: () => setSlideIndex(activeSlideIndex + 1),
      prev: () => setSlideIndex(activeSlideIndex - 1),
      startAutoplay: () => startAutoplay(0),
      stopAutoplay,
    };

    updateMeasurements();
    startAutoplay();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCareSlider);
  } else {
    initCareSlider();
  }
})();
