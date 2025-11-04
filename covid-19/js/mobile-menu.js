"use strict";

/* Ниже создаем переменную типа устройства пользователя */
const isMobile = {
  Android: function () {
    return navigator.userAgent.match(/Android/i);
  },
  BlackBerry: function () {
    return navigator.userAgent.match(/BlackBerry/i);
  },
  iOS: function () {
    return navigator.userAgent.match(/iPhone|iPad|iPod/i);
  },
  Opera: function () {
    return navigator.userAgent.match(/Opera Mini/i);
  },
  Windows: function () {
    return navigator.userAgent.match(/IEMobile/i);
  },
  any: function () {
    return (
      isMobile.Android() ||
      isMobile.BlackBerry() ||
      isMobile.iOS() ||
      isMobile.Opera() ||
      isMobile.Windows()
    );
  },
};

/*  Ниже открываем/закрываем мобильное меню */

const mobileMenuButton = document.querySelector(".mobile-icon");
const mobileMenu = document.querySelector(".navbar");
const mobileMenuList = document.querySelector(".menu");

if (mobileMenuButton) {
  mobileMenuButton.addEventListener("click", function (e) {
    document.body.classList.toggle("lock");
    mobileMenu.classList.toggle("mobile-menu");
    mobileMenuList.classList.toggle("mobile-menu-list");
    mobileMenuButton.classList.toggle("active-mobile-menu-button");
  });
}

/*  Ниже добавляем/удаляем дополнительный класс .touch к классу "menu",
    если пользователь зашел через комп, чтобы показать стрелку
    для отображения выпадающего меню при клике на нее */

if (isMobile.any()) {
  document.querySelector(".menu").classList.toggle("touch");

  let menuArrows = document.querySelectorAll(".menu__arrow, .menu__sub-links");
  if (menuArrows.length > 0) {
    for (let index = 0; index < menuArrows.length; index++) {
      const menuArrow = menuArrows[index];
      menuArrow.addEventListener("click", function (e) {
        menuArrow.parentElement.classList.toggle("active-arrow"); // добавляем/удаляем стиль для появления всплывающего списка
        e.preventDefault(); // отменяем перемещение к якорю для мобилок
      });
      /*  Ниже закрываем всплывающее меню при нажатии вне ссылке и самого всплывающего меню */
      window.addEventListener("click", (e) => {
        // при клике в любом месте окна браузера
        const target = e.target; // находим элемент, на котором был клик
        if (
          !target.closest(".menu__arrow") &&
          !target.closest(".menu__sub-links") &&
          !target.closest(".menu__sub-list")
        ) {
          // если этот элемент или его родительские элементы не якорная ссылка и не кнопка стрелки
          menuArrow.parentElement.classList.remove("active-arrow"); // то закрываем окно навигации, удаляя активный класс
        }
      });
    }
  }
  /*  Ниже удаляем окно мобильного меню при клике по ссылкам */

  const menuLinks = document.querySelectorAll(".menu__link, .menu__sub-link");
  if (menuLinks.length > 0) {
    menuLinks.forEach((menuLink) => {
      menuLink.addEventListener("click", onMenuLinkClick);
    });

    function onMenuLinkClick(e) {
      const target = e.target; // находим элемент, на котором был клик
      if (
        !target.closest(".menu__arrow") &&
        !target.closest(".menu__sub-links") &&
        mobileMenuButton.classList.contains("active-mobile-menu-button")
      ) {
        document.body.classList.remove("lock");
        mobileMenu.classList.remove("mobile-menu");
        mobileMenuList.classList.remove("mobile-menu-list");
        mobileMenuButton.classList.remove("active-mobile-menu-button");
      }
      if (document.documentElement.clientWidth < 1024) {
        // если ширина экрана менее 1024 px
        e.preventDefault(); // отключаем стандартное поведение при клике на якорную ссылку

        const href = this.getAttribute("href").substring(1); // получаем значение href кроме первого символа #
        const scrollTarget = document.getElementById(href); // получаем id href
        const linkPosition = scrollTarget.getBoundingClientRect().top; // получаем позицию якорной ссылки
        const topOffSet = document.querySelector("header").offsetHeight; // отступ сверху ту высоту которая указана у класса header
        const offsetPosition = linkPosition - topOffSet; // вычитаем окончательную высоту на которую нужно отступить при клике на якорные ссылки

        window.scrollBy({
          top: offsetPosition, // при клике на якорную ссылку добавляем отступ сверху
        });
      }
    }
  }
} else {
  document.querySelector(".menu").classList.toggle("pc");

  /*  Ниже удаляем окно мобильного меню при клике по ссылкам */

  const menuLinks = document.querySelectorAll(".menu__link, .menu__sub-link");
  if (menuLinks.length > 0) {
    menuLinks.forEach((menuLink) => {
      menuLink.addEventListener("click", onMenuLinkClick);
    });

    function onMenuLinkClick(e) {
      const target = e.target; // находим элемент, на котором был клик
      if (
        !target.closest(".menu__arrow") &&
        mobileMenuButton.classList.contains("active-mobile-menu-button")
      ) {
        document.body.classList.remove("lock");
        mobileMenu.classList.remove("mobile-menu");
        mobileMenuList.classList.remove("mobile-menu-list");
        mobileMenuButton.classList.remove("active-mobile-menu-button");
      }
      if (document.documentElement.clientWidth < 1024) {
        // если ширина экрана менее 1024 px
        e.preventDefault(); // отключаем стандартное поведение при клике на якорную ссылку

        const href = this.getAttribute("href").substring(1); // получаем значение href кроме первого символа #
        const scrollTarget = document.getElementById(href); // получаем id href
        const linkPosition = scrollTarget.getBoundingClientRect().top; // получаем позицию якорной ссылки
        const topOffSet = document.querySelector("header").offsetHeight; // отступ сверху ту высоту которая указана у класса header
        const offsetPosition = linkPosition - topOffSet; // вычитаем окончательную высоту на которую нужно отступить при клике на якорные ссылки

        window.scrollBy({
          top: offsetPosition, // при клике на якорную ссылку добавляем отступ сверху
        });
      }
    }
  }
}
