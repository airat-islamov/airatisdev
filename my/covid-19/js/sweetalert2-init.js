const feedbackButton = document.querySelectorAll(".feedback-button");
if (feedbackButton.length > 0) {
  feedbackButton.forEach((button) => {
    button.addEventListener("click", () => {
      Swal.fire({
        title: "Обратная связь",
        html: '<iframe width="100%" height="720px" src="https://u029379.stepform.io/KsH12Kx" frameborder="0"></iframe>',
        footer: '<a href="https://9270334411.ru">9270334411.ru</a>&nbsp;© 2022',
        showClass: {
          popup: "animate__animated animate__fadeInTopRight",
        },
        hideClass: {
          popup: "animate__animated animate__fadeOutTopRight",
        },
        showCloseButton: true,
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: "Закрыть",
      });
    });
  });
}
