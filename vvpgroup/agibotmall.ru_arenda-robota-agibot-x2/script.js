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

// Placeholder form: prevent navigation until submission is connected.
document.getElementById('request-form').addEventListener('submit', event => {
  event.preventDefault();
});
