document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector("[data-js-header]");

  if (header) {
    const toggle = header.querySelector("[data-js-header-toggle]");
    const menu = header.querySelector("[data-js-header-menu]");
    const links = header.querySelectorAll("[data-js-header-link]");
    const desktopBreakpoint = 1259;

    if (toggle && menu) {
      const closeMenu = () => {
        header.classList.remove("is-open");
        document.body.classList.remove("JD-menu-open");
      };

      const openMenu = () => {
        header.classList.add("is-open");
        document.body.classList.add("JD-menu-open");
      };

      toggle.addEventListener("click", () => {
        if (header.classList.contains("is-open")) {
          closeMenu();
          return;
        }

        openMenu();
      });

      links.forEach((link) => {
        link.addEventListener("click", closeMenu);
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          closeMenu();
        }
      });

      document.addEventListener("click", (event) => {
        if (!header.classList.contains("is-open")) {
          return;
        }

        if (header.contains(event.target)) {
          return;
        }

        closeMenu();
      });

      window.addEventListener("resize", () => {
        if (window.innerWidth > desktopBreakpoint) {
          closeMenu();
        }
      });
    }
  }

  const section = document.querySelector("[data-js-hero]");

  if (section) {
    const button = section.querySelector("[data-js-hero-cta]");
    const cardsWrap = section.querySelector("[data-js-hero-cards]");
    const cards = section.querySelectorAll("[data-js-hero-card]");

    if (cards.length > 0) {
      cards[0].classList.add("is-active");
    }

    cards.forEach((card) => {
      card.addEventListener("click", () => {
        cards.forEach((item) => item.classList.remove("is-active"));
        card.classList.add("is-active");
      });
    });

    if (button && cardsWrap) {
      button.addEventListener("click", () => {
        cardsWrap.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }

  const bioSection = document.querySelector("[data-js-bio]");

  if (bioSection) {
    const tabs = Array.from(bioSection.querySelectorAll("[data-js-bio-tab]"));
    const title = bioSection.querySelector("[data-js-bio-title]");
    const lead = bioSection.querySelector("[data-js-bio-lead]");
    const benefits = bioSection.querySelector("[data-js-bio-benefits]");
    const cta = bioSection.querySelector("[data-js-bio-cta]");
    const panel = bioSection.querySelector(".JD-bio__panel");
    const sourceDesktop = bioSection.querySelector("[data-js-bio-source-desktop]");
    const media = bioSection.querySelector("[data-js-bio-media]");
    const image = bioSection.querySelector("[data-js-bio-image]");
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const bioTransitionMs = 240;
    const bioTransitionHalfMs = bioTransitionMs / 2;
    let bioAnimationOutTimer = null;
    let bioAnimationInTimer = null;

    const ctaThemeClasses = [
      "JD-bio__cta--wet",
      "JD-bio__cta--dry",
      "JD-bio__cta--vet",
    ];

    const variants = {
      wet: {
        title: "holistic line - влажный корм",
        lead: "<strong>Не менее 71% мяса, без сои, ГМО и усилителей вкуса.</strong> Только мясо, овощи, ягоды и натуральные добавки. Противовоспалительная, антиоксидантная и микробиотическая защита в самой основе корма",
        ctaClass: "JD-bio__cta--wet",
        ctaHref: "https://www.dogeat.ru/catalog/just-dog/holistic/",
        benefits: [
          {
            icon1x: "img/bio/obesity-1x.webp",
            icon2x: "img/bio/obesity-2x.webp",
            width: 35,
            height: 39,
            label: "Предотвращает ожирение",
          },
          {
            icon1x: "img/bio/liver-1x.webp",
            icon2x: "img/bio/liver-2x.webp",
            width: 37,
            height: 37,
            label: "Поддержание работы печени",
          },
          {
            icon1x: "img/bio/urinary-1x.webp",
            icon2x: "img/bio/urinary-2x.webp",
            width: 41,
            height: 36,
            label: "Предупреждение мочекаменной болезни",
          },
          {
            icon1x: "img/bio/fitness-1x.webp",
            icon2x: "img/bio/fitness-2x.webp",
            width: 37,
            height: 37,
            label: "Укрепление физической формы",
          },
          {
            icon1x: "img/bio/cognition-1x.webp",
            icon2x: "img/bio/cognition-2x.webp",
            width: 40,
            height: 40,
            label: "Улучшение когнитивных функций",
          },
          {
            icon1x: "img/bio/joints-1x.webp",
            icon2x: "img/bio/joints-2x.webp",
            width: 40,
            height: 40,
            label: "Защита суставов",
          },
          {
            icon1x: "img/bio/regeneration-1x.webp",
            icon2x: "img/bio/regeneration-2x.webp",
            width: 37,
            height: 40,
            label: "Регенерация тканей",
          },
          {
            icon1x: "img/bio/coat-1x.webp",
            icon2x: "img/bio/coat-2x.webp",
            width: 36,
            height: 36,
            label: "Сияющая шерсть",
          },
          {
            icon1x: "img/bio/immunity-1x.webp",
            icon2x: "img/bio/immunity-2x.webp",
            width: 42,
            height: 37,
            label: "Крепкий иммунитет",
          },
          {
            icon1x: "img/bio/skin-1x.webp",
            icon2x: "img/bio/skin-2x.webp",
            width: 38,
            height: 34,
            label: "Здоровая кожа",
          },
        ],
        image: {
          desktop1x: "img/bio/products-1x.avif",
          desktop2x: "img/bio/products-2x.avif",
          width: 586,
          height: 651,
          alt: "Собака и продукция Just Dog Holistic Line",
        },
      },
      dry: {
        title: "dry line - сухие корма",
        lead: "<strong>В основе каждого рациона — отборное мясо, злаки, овощи, фрукты и ягоды.</strong> Линейка дополнена функциональными добавками для здоровья суставов, пищеварения и иммунитета.",
        ctaClass: "JD-bio__cta--dry",
        ctaHref: "https://www.dogeat.ru/catalog/just-dog/low-grain/",
        benefits: [
          {
            icon1x: "img/bio/dry/longevity-1x.webp",
            icon2x: "img/bio/dry/longevity-2x.webp",
            width: 40,
            height: 41,
            label: "Долголетие на новом уровне",
          },
          {
            icon1x: "img/bio/dry/research-1x.webp",
            icon2x: "img/bio/dry/research-2x.webp",
            width: 31,
            height: 40,
            label: "5+ лет научных исследований",
          },
          {
            icon1x: "img/bio/dry/composition-1x.webp",
            icon2x: "img/bio/dry/composition-2x.webp",
            width: 40,
            height: 40,
            label: "Уникальный состав",
          },
          {
            icon1x: "img/bio/dry/digestion-1x.webp",
            icon2x: "img/bio/dry/digestion-2x.webp",
            width: 31,
            height: 40,
            label: "Забота о пищеварении",
          },
          {
            icon1x: "img/bio/dry/joints-1x.webp",
            icon2x: "img/bio/dry/joints-2x.webp",
            width: 40,
            height: 44,
            label: "Мощная защита суставов",
          },
          {
            icon1x: "img/bio/dry/regeneration-1x.webp",
            icon2x: "img/bio/dry/regeneration-2x.webp",
            width: 40,
            height: 40,
            label: "Регенерация тканей",
          },
          {
            icon1x: "img/bio/dry/immunity-1x.webp",
            icon2x: "img/bio/dry/immunity-2x.webp",
            width: 40,
            height: 36,
            label: "Крепкий иммунитет",
          },
          {
            icon1x: "img/bio/dry/coat-1x.webp",
            icon2x: "img/bio/dry/coat-2x.webp",
            width: 40,
            height: 40,
            label: "Сияющая шерсть",
          },
          {
            icon1x: "img/bio/dry/skin-1x.webp",
            icon2x: "img/bio/dry/skin-2x.webp",
            width: 40,
            height: 36,
            label: "Здоровая кожа",
          },
        ],
        image: {
          desktop1x: "img/bio/dry/products-1x.avif",
          desktop2x: "img/bio/dry/products-2x.avif",
          width: 586,
          height: 631,
          alt: "Собака и продукция Just Dog Dry Line",
        },
      },
      vet: {
        title: "vet line - ветеринарные корма",
        lead: "<strong>Для питомцев с особыми потребностями: поддержка пищеварения, печени и иммунитета.</strong> Натуральный состав, высокое содержание мяса и работающие функциональные добавки.",
        ctaClass: "JD-bio__cta--vet",
        ctaHref: "https://www.dogeat.ru/catalog/just-dog/vet/",
        benefits: [
          {
            icon1x: "img/bio/vet/liver-support-1x.webp",
            icon2x: "img/bio/vet/liver-support-2x.webp",
            width: 40,
            height: 40,
            label: "Поддержка печени",
          },
          {
            icon1x: "img/bio/vet/energy-1x.webp",
            icon2x: "img/bio/vet/energy-2x.webp",
            width: 40,
            height: 40,
            label: "Энергия и тонус",
          },
          {
            icon1x: "img/bio/vet/immunity-1x.webp",
            icon2x: "img/bio/vet/immunity-2x.webp",
            width: 40,
            height: 40,
            label: "Укрепление иммунитета",
          },
          {
            icon1x: "img/bio/vet/microflora-1x.webp",
            icon2x: "img/bio/vet/microflora-2x.webp",
            width: 33,
            height: 40,
            label: "Баланс микрофлоры",
          },
          {
            icon1x: "img/bio/vet/protein-digest-1x.webp",
            icon2x: "img/bio/vet/protein-digest-2x.webp",
            width: 40,
            height: 40,
            label: "Легкое усвоение белков",
          },
          {
            icon1x: "img/bio/vet/amino-complex-1x.webp",
            icon2x: "img/bio/vet/amino-complex-2x.webp",
            width: 38,
            height: 40,
            label: "Комплекс аминокислот",
          },
          {
            icon1x: "img/bio/vet/comfort-digestion-1x.webp",
            icon2x: "img/bio/vet/comfort-digestion-2x.webp",
            width: 31,
            height: 40,
            label: "Комфортное пищеварение",
          },
          {
            icon1x: "img/bio/vet/immune-support-1x.webp",
            icon2x: "img/bio/vet/immune-support-2x.webp",
            width: 36,
            height: 40,
            label: "Поддержка иммунитета",
          },
          {
            icon1x: "img/bio/vet/skin-coat-1x.webp",
            icon2x: "img/bio/vet/skin-coat-2x.webp",
            width: 40,
            height: 40,
            label: "Здоровье кожи и шерсти",
          },
          {
            icon1x: "img/bio/vet/recovery-power-1x.webp",
            icon2x: "img/bio/vet/recovery-power-2x.webp",
            width: 40,
            height: 40,
            label: "Восстановление и сила",
          },
        ],
        image: {
          desktop1x: "img/bio/vet/products-1x.avif",
          desktop2x: "img/bio/vet/products-2x.avif",
          width: 586,
          height: 716,
          alt: "Собака и продукция Just Dog Vet Line",
        },
      },
    };

    const renderBenefits = (items) => {
      if (!benefits) {
        return;
      }

      benefits.innerHTML = items
        .map(
          (item) => `
            <li class="JD-bio__benefit">
              <img
                src="${item.icon1x}"
                srcset="${item.icon1x} 1x, ${item.icon2x} 2x"
                alt=""
                width="${item.width}"
                height="${item.height}"
                class="JD-bio__benefit-icon"
                loading="lazy"
              />
              <span>${item.label}</span>
            </li>
          `,
        )
        .join("");
    };

    const applyVariant = (key) => {
      const variant = variants[key];

      if (!variant) {
        return;
      }

      tabs.forEach((tab) => {
        const isCurrent = tab.dataset.bioKey === key;
        tab.classList.toggle("is-active", isCurrent);
      });

      if (title) {
        title.textContent = variant.title;
      }

      if (lead) {
        lead.innerHTML = variant.lead;
      }

      renderBenefits(variant.benefits);

      if (cta) {
        cta.classList.remove(...ctaThemeClasses);
        cta.classList.add(variant.ctaClass);
        cta.setAttribute("href", variant.ctaHref);
      }

      if (sourceDesktop) {
        sourceDesktop.setAttribute(
          "srcset",
          `${variant.image.desktop1x} 1x, ${variant.image.desktop2x} 2x`,
        );
      }

      if (media) {
        const mobileHeight = Math.round((variant.image.height * 430) / 651);
        media.style.setProperty(
          "--jd-bio-media-height-desktop",
          `${variant.image.height}px`,
        );
        media.style.setProperty(
          "--jd-bio-media-height-mobile",
          `${mobileHeight}px`,
        );
      }

      if (image) {
        image.setAttribute("src", variant.image.desktop1x);
        image.setAttribute("alt", variant.image.alt);
        image.setAttribute("width", String(variant.image.width));
        image.setAttribute("height", String(variant.image.height));
      }
    };

    const setVariant = (key, { animate = true } = {}) => {
      const variant = variants[key];

      if (!variant) {
        return;
      }

      const activeTab = tabs.find((tab) => tab.classList.contains("is-active"));
      const isSameKey = activeTab?.dataset.bioKey === key;

      if (isSameKey) {
        return;
      }

      if (!animate || prefersReducedMotion || !panel) {
        applyVariant(key);
        return;
      }

      if (panel.classList.contains("is-bio-animating")) {
        return;
      }

      panel.classList.add("is-bio-animating", "is-bio-animating-out");

      window.clearTimeout(bioAnimationOutTimer);
      window.clearTimeout(bioAnimationInTimer);

      bioAnimationOutTimer = window.setTimeout(() => {
        applyVariant(key);
        panel.classList.remove("is-bio-animating-out");
        panel.classList.add("is-bio-animating-in");

        bioAnimationInTimer = window.setTimeout(() => {
          panel.classList.remove("is-bio-animating", "is-bio-animating-in");
        }, bioTransitionHalfMs);
      }, bioTransitionHalfMs);
    };

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        setVariant(tab.dataset.bioKey);
      });
    });

    const initialTab = tabs.find((tab) => tab.classList.contains("is-active"));
    applyVariant(initialTab?.dataset.bioKey || "wet");
  }

});
