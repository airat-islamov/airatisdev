new Swiper(".swiper-container", {
  // Стрелки навигации
  navigation: {
    nextEl: ".slider-button--next",
    prevEl: ".slider-button--prev",
  },
  loop: true,
  slidesPerView: 1,
  
  // breakpoints: {
  //   1024: {
  //     slidesPerView: 1, // Количество элементов в одном слайде
  //     spaceBetween: 10, // Расстояние между элементами в одном слайде
  //   },
  //   1025: {
  //     slidesPerView: 2, // Количество элементов в одном слайде
  //     spaceBetween: 20, // Расстояние между элементами в одном слайде
  //   },
  //   1381: {
  //     slidesPerView: 3, // Количество элементов в одном слайде
  //     spaceBetween: 30, // Расстояние между элементами в одном слайде
  //   },
  // },
});
