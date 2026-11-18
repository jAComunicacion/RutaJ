// Carrusel de "Horarios de Atencion" con transicion dissolve (crossfade).
// Independiente del slider generico .slides-1 de main.js para no afectar
// a otras paginas que comparten ese mismo archivo.
document.addEventListener('DOMContentLoaded', function () {
  var slider = document.querySelector('.slides-horarios');
  if (!slider || typeof Swiper === 'undefined') return;

  new Swiper(slider, {
    effect: 'fade',
    fadeEffect: { crossFade: true },
    speed: 900,
    slidesPerView: 1,
    loop: true,
    allowTouchMove: true,
    grabCursor: true,
    autoplay: {
      delay: 4500,
      disableOnInteraction: false
    }
  });
});
