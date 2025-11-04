const mobileMenuButton = document.querySelector(".menu-button");
mobileMenuButton.addEventListener("click", function () {
  document
    .querySelector(".mobile-navigation")
    .classList.toggle("mobile-navigation--visible");
});
