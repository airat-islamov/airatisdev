(() => {
  'use strict';

  const copyElement = document.getElementById('page-copy');
  if (!copyElement) return;
  const copy = JSON.parse(copyElement.textContent);
  const menuButton = document.querySelector('.menu-toggle');
  const menu = document.getElementById('mobile-navigation');
  const closeMenu = () => {
    menu.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', copy.a11y.openMenu);
  };
  menuButton.addEventListener('click', () => {
    const expanded = menuButton.getAttribute('aria-expanded') !== 'true';
    menu.hidden = !expanded;
    menuButton.setAttribute('aria-expanded', String(expanded));
    menuButton.setAttribute('aria-label', expanded ? copy.a11y.closeMenu : copy.a11y.openMenu);
  });
  menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) {
      closeMenu();
      menuButton.focus();
    }
  });
  window.matchMedia('(min-width: 640px)').addEventListener('change', closeMenu);

  const dialog = document.getElementById('privacy-dialog');
  document.querySelectorAll('[data-privacy-open]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      dialog.showModal();
      document.body.classList.add('dialog-open');
    });
  });
  document.querySelectorAll('[data-privacy-close]').forEach((button) => {
    button.addEventListener('click', () => dialog.close());
  });
  dialog.addEventListener('close', () => document.body.classList.remove('dialog-open'));
  dialog.addEventListener('click', (event) => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) {
      dialog.close();
    }
  });

  const carousel = document.querySelector('[data-brand-carousel]');
  if (carousel) {
    const viewport = carousel.querySelector('.brands-viewport');
    const track = carousel.querySelector('.brands-track');
    const previous = carousel.querySelector('[data-brand-prev]');
    const next = carousel.querySelector('[data-brand-next]');
    const originals = [...track.children];
    const slideCount = originals.length;

    if (slideCount > 1) {
      const before = document.createDocumentFragment();
      const after = document.createDocumentFragment();
      originals.forEach((slide) => {
        const leadingClone = slide.cloneNode(true);
        const trailingClone = slide.cloneNode(true);
        leadingClone.setAttribute('aria-hidden', 'true');
        trailingClone.setAttribute('aria-hidden', 'true');
        before.append(leadingClone);
        after.append(trailingClone);
      });
      track.prepend(before);
      track.append(after);

      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      let index = slideCount;
      let distance = 0;
      let moving = false;
      let paused = false;
      let timer = 0;

      const position = (animate = true) => {
        track.classList.toggle('is-jumping', !animate);
        track.style.transform = `translate3d(${-index * distance}px, 0, 0)`;
        if (!animate) requestAnimationFrame(() => track.classList.remove('is-jumping'));
      };
      const normalize = () => {
        if (index < slideCount) index += slideCount;
        if (index >= slideCount * 2) index -= slideCount;
        position(false);
      };
      const stop = () => {
        if (timer) window.clearInterval(timer);
        timer = 0;
      };
      const start = () => {
        stop();
        if (!paused && !document.hidden && !reducedMotion.matches) timer = window.setInterval(() => move(1, false), 3600);
      };
      const move = (direction, userInitiated = true) => {
        if (moving || distance === 0) return;
        moving = true;
        index += direction;
        if (reducedMotion.matches) {
          normalize();
          moving = false;
        } else {
          position(true);
        }
        if (userInitiated) start();
      };
      const measure = () => {
        const slides = [...track.children];
        if (slides.length < 2) return;
        distance = slides[1].getBoundingClientRect().left - slides[0].getBoundingClientRect().left;
        position(false);
      };

      track.addEventListener('transitionend', (event) => {
        if (event.propertyName !== 'transform') return;
        normalize();
        moving = false;
      });
      previous.addEventListener('click', () => move(-1));
      next.addEventListener('click', () => move(1));
      carousel.addEventListener('mouseenter', () => { paused = true; stop(); });
      carousel.addEventListener('mouseleave', () => { paused = false; start(); });
      carousel.addEventListener('focusin', () => { paused = true; stop(); });
      carousel.addEventListener('focusout', (event) => {
        if (carousel.contains(event.relatedTarget)) return;
        paused = false;
        start();
      });
      document.addEventListener('visibilitychange', start);
      reducedMotion.addEventListener('change', start);
      new ResizeObserver(measure).observe(viewport);
      requestAnimationFrame(() => {
        measure();
        start();
      });
    }
  }

  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  const submit = form.querySelector('button[type="submit"]');
  const submitLabel = submit.querySelector('[data-submit-label]');
  const fields = ['name', 'phone', 'email', 'business', 'message', 'consent'];
  const phone = form.querySelector('[data-js-contact-phone]');
  const email = form.querySelector('[data-js-contact-email]');
  let startedAt = Date.now();
  let busy = false;
  let saved = false;
  let fingerprint = '';
  let requestId = '';
  submit.disabled = false;
  const uuid = () => crypto.randomUUID ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (char) => (Number(char) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(char) / 4).toString(16));
  const phoneControl = phone instanceof HTMLInputElement && typeof window.intlTelInput === 'function'
    ? window.intlTelInput(phone, {
      autoPlaceholder: 'aggressive',
      countryNameLocale: copy.locale === 'be' ? 'be' : 'ru',
      customPlaceholder: (placeholder, country) => country?.iso2 === 'ru' ? '(000) 000-00-00' : placeholder.replace(/\d/g, '0'),
      formatAsYouType: true,
      i18n: copy.locale === 'be' ? {
        selectedCountryAriaLabel: 'Абрана краіна ${countryName}, код +${dialCode}',
        noCountrySelected: 'Краіна не абрана',
        countryListAriaLabel: 'Спіс краін',
        searchPlaceholder: 'Пошук краіны',
        clearSearchAriaLabel: 'Ачысціць пошук',
        searchEmptyState: 'Краіны не знойдзены',
      } : {
        selectedCountryAriaLabel: 'Выбрана страна ${countryName}, код +${dialCode}',
        noCountrySelected: 'Страна не выбрана',
        countryListAriaLabel: 'Список стран',
        searchPlaceholder: 'Поиск страны',
        clearSearchAriaLabel: 'Очистить поиск',
        searchEmptyState: 'Страны не найдены',
      },
      initialCountry: 'by',
      nationalMode: true,
      separateDialCode: true,
      strictMode: true,
    })
    : null;

  const clearError = (name) => {
    form.elements.namedItem(name).removeAttribute('aria-invalid');
    const element = document.getElementById(`error-${name}`);
    element.hidden = true;
    element.textContent = '';
  };
  const fieldError = (name, text) => {
    const field = form.elements.namedItem(name);
    field.setAttribute('aria-invalid', 'true');
    const element = document.getElementById(`error-${name}`);
    element.textContent = text;
    element.hidden = false;
  };
  const formatRussianPhone = () => {
    if (!(phone instanceof HTMLInputElement) || phoneControl?.getSelectedCountryData()?.iso2 !== 'ru') return;
    const originalValue = phone.value;
    const selectionStart = phone.selectionStart ?? originalValue.length;
    let digitsBeforeCursor = originalValue.slice(0, selectionStart).replace(/\D/g, '').length;
    let digits = originalValue.replace(/\D/g, '');
    if (digits.length > 10 && /^[78]/.test(digits)) {
      digits = digits.slice(1);
      digitsBeforeCursor = Math.max(0, digitsBeforeCursor - 1);
    }
    digits = digits.slice(0, 10);
    const parts = [];
    if (digits.length > 0) parts.push(`(${digits.slice(0, 3)}`);
    if (digits.length >= 3) parts[0] += ')';
    if (digits.length > 3) parts.push(` ${digits.slice(3, 6)}`);
    if (digits.length > 6) parts.push(`-${digits.slice(6, 8)}`);
    if (digits.length > 8) parts.push(`-${digits.slice(8, 10)}`);
    const formattedValue = parts.join('');
    if (formattedValue === originalValue) return;
    phone.value = formattedValue;
    const targetDigitCount = Math.min(digitsBeforeCursor, digits.length);
    let seenDigits = 0;
    let nextCursor = formattedValue.length;
    for (let index = 0; index < formattedValue.length; index += 1) {
      if (/\d/.test(formattedValue[index])) {
        seenDigits += 1;
        if (seenDigits === targetDigitCount) {
          nextCursor = index + 1;
          break;
        }
      }
    }
    phone.setSelectionRange(nextCursor, nextCursor);
  };
  const validatePhone = (showError = false) => {
    if (!(phone instanceof HTMLInputElement)) return true;
    phone.setCustomValidity('');
    const value = phone.value.trim();
    if (!value) return true;
    const normalizedPhone = phoneControl?.getNumber() || value.replace(/[\s().-]/g, '');
    const digitCount = (normalizedPhone.match(/\d/g) || []).length;
    const valid = phoneControl
      ? phoneControl.isValidNumber() && digitCount >= 5
      : /^\+[1-9]\d{9,14}$/.test(normalizedPhone);
    if (!valid) {
      phone.setCustomValidity(copy.form.errors.invalid_phone);
      if (showError) fieldError('phone', copy.form.errors.invalid_phone);
    }
    return valid;
  };
  const normalizeEmail = (value) => {
    const sanitizedValue = value.replace(/[^A-Za-z0-9.!#$%&'*+/=?^_`{|}~@-]/g, '');
    const [localPart = '', ...domainParts] = sanitizedValue.split('@');
    return domainParts.length ? `${localPart}@${domainParts.join('')}` : localPart;
  };
  const normalizeEmailInput = () => {
    if (!(email instanceof HTMLInputElement)) return;
    const originalValue = email.value;
    const selectionStart = email.selectionStart ?? originalValue.length;
    const normalizedValue = normalizeEmail(originalValue);
    if (normalizedValue === originalValue) return;
    const normalizedBeforeCursor = normalizeEmail(originalValue.slice(0, selectionStart));
    email.value = normalizedValue;
    email.setSelectionRange(normalizedBeforeCursor.length, normalizedBeforeCursor.length);
  };
  const emailValidationMessage = () => {
    if (!(email instanceof HTMLInputElement) || email.value === '') return '';
    const value = email.value;
    const atIndex = value.indexOf('@');
    const localPart = atIndex >= 0 ? value.slice(0, atIndex) : value;
    const domain = atIndex >= 0 ? value.slice(atIndex + 1) : '';
    const emailPattern = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i;
    if (atIndex < 0) return copy.form.validation.emailAt;
    if (localPart === '') return copy.form.validation.emailLocal;
    if (domain === '') return copy.form.validation.emailDomain;
    if (!domain.includes('.')) return copy.form.validation.emailDot;
    if (localPart.length > 64 || localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..') || domain.length > 253 || domain.includes('..') || !emailPattern.test(value)) {
      return copy.form.errors.invalid_email;
    }
    return '';
  };
  const validateEmail = (showError = false) => {
    if (!(email instanceof HTMLInputElement)) return true;
    const message = emailValidationMessage();
    email.setCustomValidity(message);
    if (showError && message) fieldError('email', message);
    return !message;
  };
  const announce = (message, state) => {
    status.hidden = false;
    status.dataset.state = state;
    status.textContent = message;
  };
  const getData = () => ({
    name: form.elements.namedItem('name').value.trim(),
    phone: phoneControl?.getNumber() || form.elements.namedItem('phone').value.trim(),
    email: form.elements.namedItem('email').value.trim(),
    business: form.elements.namedItem('business').value,
    message: form.elements.namedItem('message').value.trim(),
    consent: form.elements.namedItem('consent').checked,
    website: form.elements.namedItem('website').value,
    locale: copy.locale,
  });

  fields.forEach((name) => form.elements.namedItem(name).addEventListener('input', () => {
    clearError(name);
    if (name === 'phone' || name === 'email') {
      clearError('phone');
      clearError('email');
    }
    if (name === 'phone') {
      formatRussianPhone();
      validatePhone();
    }
    if (name === 'email') {
      normalizeEmailInput();
      validateEmail(true);
    }
    if (saved) {
      saved = false;
      requestId = '';
      fingerprint = '';
      startedAt = Date.now();
      status.hidden = true;
      submit.disabled = false;
    }
  }));
  phone?.addEventListener('countrychange', () => {
    clearError('phone');
    formatRussianPhone();
    validatePhone();
  });
  phone?.addEventListener('blur', () => validatePhone(true));
  email?.addEventListener('blur', () => validateEmail(true));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy || saved) return;
    fields.forEach(clearError);
    status.hidden = true;
    formatRussianPhone();
    normalizeEmailInput();
    const data = getData();
    const errors = copy.form.errors;
    let firstInvalid = null;
    const invalid = (name, message) => {
      fieldError(name, message);
      if (!firstInvalid) firstInvalid = form.elements.namedItem(name);
    };
    const nameLength = [...data.name].length;
    if (nameLength < 2 || nameLength > 120) invalid('name', errors.invalid_name);
    if (!data.phone && !data.email) invalid('phone', errors.contact_required);
    if (data.phone && !validatePhone()) invalid('phone', errors.invalid_phone);
    if (data.email) {
      const emailMessage = emailValidationMessage();
      if (emailMessage) invalid('email', emailMessage);
    }
    if (!data.consent) invalid('consent', errors.consent_required);
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    if (document.body.dataset.staticDemo === 'true') {
      saved = true;
      form.reset();
      phoneControl?.setCountry('by');
      phoneControl?.setNumber('');
      phone?.setCustomValidity('');
      email?.setCustomValidity('');
      announce(
        copy.locale === 'be'
          ? 'Дэманстрацыйны рэжым: даныя не адпраўляліся і не захоўваліся.'
          : 'Демонстрационный режим: данные не отправлялись и не сохранялись.',
        'success',
      );
      status.focus({ preventScroll: true });
      submit.disabled = true;
      return;
    }

    const nextFingerprint = JSON.stringify(data);
    if (fingerprint !== nextFingerprint || !requestId) {
      requestId = uuid();
      fingerprint = nextFingerprint;
    }
    busy = true;
    submit.disabled = true;
    fields.forEach((name) => { form.elements.namedItem(name).disabled = true; });
    form.setAttribute('aria-busy', 'true');
    submitLabel.textContent = copy.form.submitting;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ ...data, requestId, formStartedAt: startedAt }),
        credentials: 'same-origin',
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true || result.saved !== true) {
        const message = errors[result.code] || copy.form.messages.error;
        const field = { invalid_name: 'name', invalid_phone: 'phone', invalid_email: 'email', contact_required: 'phone', consent_required: 'consent', invalid_message: 'message', invalid_business: 'business' }[result.code];
        if (field) {
          fieldError(field, message);
          form.elements.namedItem(field).focus();
        }
        announce(message, 'error');
        return;
      }
      saved = true;
      form.reset();
      phoneControl?.setCountry('by');
      phoneControl?.setNumber('');
      phone?.setCustomValidity('');
      email?.setCustomValidity('');
      announce(copy.form.messages.successLive, 'success');
      status.focus({ preventScroll: true });
    } catch (error) {
      announce(error instanceof SyntaxError ? copy.form.messages.error : copy.form.messages.offline, 'error');
    } finally {
      clearTimeout(timeout);
      busy = false;
      fields.forEach((name) => { form.elements.namedItem(name).disabled = false; });
      submit.disabled = saved;
      form.removeAttribute('aria-busy');
      submitLabel.textContent = copy.form.submit;
    }
  });
})();
