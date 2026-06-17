window.onload = () => {
  const scrollToTop = document.querySelector(".scroll-to-top--hidden");
  window.onscroll = () => {
    if (window.scrollY > 700) {
      scrollToTop.classList.remove("scroll-to-top--hidden");
    } else {
      scrollToTop.classList.add("scroll-to-top--hidden");
    }
  };

  scrollToTop.onclick = () => {
    window.scrollTo(0, 0);
  };
};
