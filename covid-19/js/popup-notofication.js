function checkCookies() {
  let cookieDateCurrentcy = localStorage.getItem("cookieDateCurrentcy");
  let cookieDateInProgress = localStorage.getItem("cookieDateInProgress");

  // ID всплывающего окна про автора
  let authorNotification = document.getElementById(
    "popup-notification__author"
  );
  // ID всплывающего окна про cookie
  let inProgressNotification = document.getElementById(
    "popup-notification__cookies"
  );

  // Кнопки закрытия всплывающего окна про автора
  let authorUpBtn = authorNotification.querySelector(
    ".popup-notification__button-up-close--author-up-close"
  );
  let authorDwnBtn = authorNotification.querySelector(
    ".popup-notification__button-down-close--author"
  );

  // Кнопки закрытия всплывающего окна про cookie
  let inProgressUpBtn = inProgressNotification.querySelector(
    ".popup-notification__button-up-close--cookies"
  );
  let inProgressDwnBtn = inProgressNotification.querySelector(
    ".popup-notification__button-down-close--cookies"
  );

  // Если записи про кукисы нет или она просрочена на 1 год, то показываем всплывающее окно про автора
  if (!cookieDateCurrentcy || +cookieDateCurrentcy + 31536000000 < Date.now()) {
    authorNotification.classList.add("show-author");
  }

  // Если записи про кукисы нет или она просрочена на 1 год, то показываем всплывающее окно про cookie
  if (
    !cookieDateInProgress ||
    +cookieDateInProgress + 31536000000 < Date.now()
  ) {
    inProgressNotification.classList.add("show-cookies");
  }

  // При клике на кнопку про автора, в локальное хранилище записывается текущая дата в системе UNIX
  authorUpBtn.addEventListener("click", function () {
    localStorage.setItem("cookieDateCurrentcy", Date.now());
    authorNotification.classList.remove("show-author");
  });

  // При клике на кнопку про автора, в локальное хранилище записывается текущая дата в системе UNIX
  authorDwnBtn.addEventListener("click", function () {
    localStorage.setItem("cookieDateCurrentcy", Date.now());
    authorNotification.classList.remove("show-author");
  });

  // При клике на кнопку про cookie, в локальное хранилище записывается текущая дата в системе UNIX
  inProgressUpBtn.addEventListener("click", function () {
    localStorage.setItem("cookieDateInProgress", Date.now());
    inProgressNotification.classList.remove("show-cookies");
  });

  // При клике на кнопку про cookie, в локальное хранилище записывается текущая дата в системе UNIX
  inProgressDwnBtn.addEventListener("click", function () {
    localStorage.setItem("cookieDateInProgress", Date.now());
    inProgressNotification.classList.remove("show-cookies");
  });
}
checkCookies();
