const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const ticker = document.querySelector('.ticker');
const tickerTrack = ticker?.querySelector('.ticker-track');
const tickerTemplate = tickerTrack?.querySelector('.ticker-group');

if (ticker && tickerTrack && tickerTemplate) {
  const tickerSource = tickerTemplate.cloneNode(true);
  let tickerResizeFrame = 0;

  const fillTicker = () => {
    tickerTrack.replaceChildren(tickerSource.cloneNode(true));

    if (reducedMotion.matches) {
      tickerTrack.style.removeProperty('--ticker-distance');
      tickerTrack.style.removeProperty('--ticker-duration');
      return;
    }

    const groupWidth = tickerTrack.firstElementChild.getBoundingClientRect().width;
    const trackGap = parseFloat(getComputedStyle(tickerTrack).gap) || 0;
    const cycleWidth = groupWidth + trackGap;
    if (!Number.isFinite(cycleWidth) || cycleWidth <= 0) return;
    const groupCount = Math.max(2, Math.ceil(ticker.clientWidth / cycleWidth) + 1);
    const copies = document.createDocumentFragment();

    for (let index = 1; index < groupCount; index += 1) {
      const clone = tickerSource.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      copies.append(clone);
    }
    tickerTrack.append(copies);

    tickerTrack.style.setProperty('--ticker-distance', `-${cycleWidth}px`);
    tickerTrack.style.setProperty('--ticker-duration', `${Math.max(12, cycleWidth / 40)}s`);
  };

  const scheduleTickerResize = () => {
    cancelAnimationFrame(tickerResizeFrame);
    tickerResizeFrame = requestAnimationFrame(fillTicker);
  };

  fillTicker();
  window.addEventListener('resize', scheduleTickerResize, { passive: true });
  reducedMotion.addEventListener?.('change', fillTicker);
}

const packageSelect = document.getElementById('event-package');
const requestSection = document.getElementById('request');
const packages = {
  express: { name: 'Экспресс', duration: 'до 2 часов', price: 100000 },
  half: { name: 'Полдня', duration: 'до 4 часов', price: 150000 },
  full: { name: 'Полный день', duration: 'до 8 часов', price: 200000 }
};

document.querySelectorAll('[data-select-package]').forEach(button => {
  button.addEventListener('click', () => {
    packageSelect.value = button.dataset.selectPackage;
    invalidateEstimate();
    requestSection.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    window.setTimeout(() => document.getElementById('client-name').focus({ preventScroll: true }), reducedMotion.matches ? 0 : 450);
  });
});

const dateInput = document.getElementById('event-date');
const now = new Date();
const localToday = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
dateInput.min = localToday;

const form = document.getElementById('estimate-form');
const error = document.getElementById('form-error');
const result = document.getElementById('estimate-result');
const resultPrice = document.getElementById('estimate-price');
const requestText = document.getElementById('request-text');
const copyButton = document.getElementById('copy-request');
const copyFeedback = document.getElementById('copy-feedback');

const invalidateEstimate = () => {
  result.hidden = true;
  copyFeedback.textContent = '';
  error.hidden = true;
};

form.addEventListener('input', invalidateEstimate);

form.addEventListener('submit', event => {
  event.preventDefault();
  error.hidden = true;
  copyFeedback.textContent = '';

  const name = document.getElementById('client-name').value.trim();
  const contact = document.getElementById('client-contact').value.trim();
  const date = dateInput.value;
  const selected = packages[packageSelect.value];
  const comment = document.getElementById('event-comment').value.trim();

  if (!name || !contact || !date) {
    error.textContent = 'Заполните имя, контакт для связи и дату события.';
    error.hidden = false;
    (!name ? document.getElementById('client-name') : !contact ? document.getElementById('client-contact') : dateInput).focus();
    result.hidden = true;
    return;
  }
  if (date < localToday) {
    error.textContent = 'Укажите сегодняшнюю или будущую дату.';
    error.hidden = false;
    dateInput.focus();
    result.hidden = true;
    return;
  }

  const readableDate = new Date(`${date}T12:00:00`).toLocaleDateString('ru-RU');
  const price = new Intl.NumberFormat('ru-RU').format(selected.price);
  resultPrice.textContent = `${price} ₽`;
  requestText.value = [
    'Здравствуйте! Хочу узнать об аренде робота Agibot X2.',
    `Тариф: ${selected.name} (${selected.duration}), ориентировочная стоимость ${price} ₽.`,
    `Дата события: ${readableDate}.`,
    `Заказчик: ${name}.`,
    `Для связи: ${contact}.`,
    comment ? `Детали события: ${comment}` : ''
  ].filter(Boolean).join('\n');
  result.hidden = false;
  result.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'nearest' });
});

copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(requestText.value);
  } catch {
    requestText.focus();
    requestText.select();
    const copied = document.execCommand('copy');
    if (!copied) {
      copyFeedback.textContent = 'Автоматическое копирование недоступно. Выделите заявку и скопируйте текст вручную.';
      return;
    }
  }
  copyFeedback.textContent = 'Заявка скопирована. Её можно отправить удобным для вас способом.';
});
