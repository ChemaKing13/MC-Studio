(() => {
  // TODO: número oficial de WhatsApp con código de país, solo dígitos (ej. 5215512345678).
  // Mientras esté vacío, los botones "Agendar cita" llevan a la sección de contacto.
  const WHATSAPP_NUMBER = '';
  const DEFAULT_MESSAGE = 'Hola, me gustaría agendar una cita en MC Studio & Spa.';

  if (/^\d{10,15}$/.test(WHATSAPP_NUMBER)) {
    document.querySelectorAll('[data-wa]').forEach((link) => {
      const message = link.dataset.wa || DEFAULT_MESSAGE;
      link.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
      link.target = '_blank';
      link.rel = 'noopener';
    });
  }

  // Encabezado: oculta la barra de reapertura y da fondo a la navegación al hacer scroll
  const header = document.querySelector('[data-header]');
  const sentinel = document.querySelector('[data-top-sentinel]');
  if (header && sentinel) {
    new IntersectionObserver(([entry]) => {
      header.classList.toggle('is-scrolled', !entry.isIntersecting);
    }).observe(sentinel);
  }

  // Menú móvil
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-menu]');

  const setMenu = (open) => {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('i').className = open ? 'ph-light ph-x' : 'ph-light ph-list';
    toggle.querySelector('.sr-only').textContent = open ? 'Cerrar menú' : 'Abrir menú';
    menu.hidden = !open;
    menu.classList.toggle('is-open', open);
    header.classList.toggle('is-open', open);
    document.body.classList.toggle('is-locked', open);
    if (open) menu.querySelector('a')?.focus();
  };

  toggle?.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu?.querySelectorAll('[data-menu-link]').forEach((link) => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      toggle.focus();
    }
  });
  window.matchMedia('(min-width: 901px)').addEventListener('change', (event) => {
    if (event.matches && toggle?.getAttribute('aria-expanded') === 'true') setMenu(false);
  });

  // Ventana emergente de reapertura: aparece cada vez que se abre la página
  // TODO: fecha en que termina la promoción (AAAA-MM-DD). Desde el día siguiente ya no salen ni la ventana ni la barra superior.
  const PROMO_UNTIL = '';
  const promo = document.querySelector('[data-promo]');
  const promoOpeners = document.querySelectorAll('[data-promo-open]');
  const expired = PROMO_UNTIL !== '' && Date.now() > new Date(`${PROMO_UNTIL}T23:59:59`).getTime();

  if (expired) {
    promoOpeners.forEach((el) => el.remove());
    document.documentElement.style.setProperty('--announce-h', '0px');
  } else if (promo && typeof promo.showModal === 'function') {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const card = promo.querySelector('.promo__card');
    let closeTimer = 0;

    const openPromo = () => {
      if (promo.classList.contains('is-closing')) finishClose();
      if (promo.open) return;
      if (toggle?.getAttribute('aria-expanded') === 'true') setMenu(false);
      promo.showModal();
      document.body.classList.add('is-locked');
    };

    // solo la animación de salida de la tarjeta termina el cierre
    const onCloseEnd = (event) => { if (event.target === card && event.animationName === 'promo-out') finishClose(); };

    function finishClose() {
      // limpia lo pendiente para que un cierre viejo no cierre la ventana al reabrirla
      card.removeEventListener('animationend', onCloseEnd);
      window.clearTimeout(closeTimer);
      promo.classList.remove('is-closing');
      document.body.classList.remove('is-locked');
      if (promo.open) promo.close();
    }

    const closePromo = ({ animate = true } = {}) => {
      if (!promo.open || promo.classList.contains('is-closing')) return;
      if (!animate || reduceMotion.matches) {
        finishClose();
        return;
      }
      promo.classList.add('is-closing');
      card.addEventListener('animationend', onCloseEnd);
      closeTimer = window.setTimeout(finishClose, 400); // por si la animación no llega a terminar
    };

    promo.querySelectorAll('[data-promo-close]').forEach((button) => button.addEventListener('click', () => closePromo()));
    // el enlace cierra sin animación para que el salto a contacto o a WhatsApp ocurra de inmediato
    promo.querySelector('[data-promo-cta]')?.addEventListener('click', () => closePromo({ animate: false }));
    // clic fuera de la tarjeta (en el fondo oscuro)
    promo.addEventListener('click', (event) => { if (event.target === promo) closePromo(); });
    // tecla Escape: cierra con la misma animación
    promo.addEventListener('cancel', (event) => { event.preventDefault(); closePromo(); });
    promo.addEventListener('close', () => document.body.classList.remove('is-locked'));

    // la barra superior vuelve a abrirla
    promoOpeners.forEach((el) => el.addEventListener('click', openPromo));

    window.setTimeout(() => {
      if (document.body.classList.contains('is-locked')) return; // el menú móvil está abierto
      openPromo();
    }, 1300);
  }

  // Servicios: tarjetas deslizables
  const track = document.querySelector('[data-svc-track]');
  if (track) {
    const cards = Array.from(track.querySelectorAll('[data-svc-card]'));
    const prevBtn = document.querySelector('[data-svc-prev]');
    const nextBtn = document.querySelector('[data-svc-next]');
    const bars = Array.from(document.querySelectorAll('[data-svc-progress] span'));
    const motionOK = window.matchMedia('(prefers-reduced-motion: no-preference)');
    const behavior = () => (motionOK.matches ? 'smooth' : 'auto');

    // posición de scroll en la que cada tarjeta queda alineada al inicio
    const stops = () => {
      const max = track.scrollWidth - track.clientWidth;
      return cards.map((card) => Math.min(card.offsetLeft - cards[0].offsetLeft, max));
    };
    const nearestIndex = (list, x) => list.reduce((best, value, i) => (Math.abs(value - x) < Math.abs(list[best] - x) ? i : best), 0);
    const scrollToCard = (index) => track.scrollTo({ left: stops()[index], behavior: behavior() });

    const go = (direction) => {
      const list = stops();
      const x = track.scrollLeft;
      const target = direction > 0 ? list.find((v) => v > x + 2) : list.slice().reverse().find((v) => v < x - 2);
      if (target !== undefined) track.scrollTo({ left: target, behavior: behavior() });
    };
    prevBtn?.addEventListener('click', () => go(-1));
    nextBtn?.addEventListener('click', () => go(1));

    // panel de servicios de cada tarjeta
    const setCard = (card, open, { focus = true } = {}) => {
      if (card.classList.contains('is-open') === open) return;
      const openBtn = card.querySelector('[data-card-open]');
      card.classList.toggle('is-open', open);
      openBtn.setAttribute('aria-expanded', String(open));
      if (focus) (open ? card.querySelector('[data-card-close]') : openBtn).focus({ preventScroll: true });
    };

    // qué tarjetas se ven: indicador, flechas y cierre automático al deslizar
    const ratios = new Map();
    const seen = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        ratios.set(entry.target, entry.intersectionRatio);
        if (entry.intersectionRatio < 0.2) setCard(entry.target, false, { focus: false });
      });
      cards.forEach((card, i) => bars[i]?.classList.toggle('is-on', (ratios.get(card) || 0) >= 0.6));
      if (prevBtn) prevBtn.disabled = (ratios.get(cards[0]) || 0) >= 0.98;
      if (nextBtn) nextBtn.disabled = (ratios.get(cards[cards.length - 1]) || 0) >= 0.98;
    }, { root: track, threshold: [0, 0.2, 0.6, 0.98] });
    cards.forEach((card) => seen.observe(card));

    cards.forEach((card, index) => {
      card.querySelector('[data-card-open]')?.addEventListener('click', () => {
        cards.forEach((other) => { if (other !== card) setCard(other, false, { focus: false }); });
        setCard(card, true);
        // si la tarjeta está cortada en el borde, la trae completa
        if ((ratios.get(card) || 0) < 0.98) scrollToCard(index);
      });
      card.querySelector('[data-card-close]')?.addEventListener('click', () => setCard(card, false));
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && card.classList.contains('is-open')) setCard(card, false);
      });
    });

    // arrastre con mouse en escritorio (en táctil y trackpad el desplazamiento ya es nativo)
    let drag = null;
    let dragged = false;
    const release = () => track.classList.remove('is-dragging');

    track.addEventListener('pointerdown', (event) => {
      dragged = false;
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      if (event.target.closest('.svc-card.is-open')) return; // dentro del panel se puede seleccionar texto
      drag = { x: event.clientX, left: track.scrollLeft, id: event.pointerId, moved: false };
    });
    track.addEventListener('pointermove', (event) => {
      if (!drag) return;
      const dx = event.clientX - drag.x;
      if (!drag.moved) {
        if (Math.abs(dx) < 6) return;
        drag.moved = true;
        track.setPointerCapture(drag.id);
        track.classList.add('is-dragging');
      }
      track.scrollLeft = drag.left - dx;
    });
    const endDrag = () => {
      if (!drag) return;
      const { moved, left } = drag;
      drag = null;
      if (!moved) return;
      dragged = true;
      // suelta en la tarjeta más cercana; un arrastre largo avanza al menos una
      const list = stops();
      const x = track.scrollLeft;
      const from = nearestIndex(list, left);
      let to = nearestIndex(list, x);
      if (to === from && Math.abs(x - left) > 60) to = Math.min(cards.length - 1, Math.max(0, from + Math.sign(x - left)));
      if (Math.abs(list[to] - x) < 1) { release(); return; }
      track.scrollTo({ left: list[to], behavior: behavior() });
      if ('onscrollend' in window) track.addEventListener('scrollend', release, { once: true });
      else window.setTimeout(release, 650);
    };
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);
    track.addEventListener('lostpointercapture', endDrag);
    // un arrastre no cuenta como clic sobre la tarjeta
    track.addEventListener('click', (event) => {
      if (!dragged) return;
      dragged = false;
      event.preventDefault();
      event.stopPropagation();
    }, true);
  }

  // Aparición de secciones al hacer scroll
  const revealed = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealed.forEach((el) => revealObserver.observe(el));
  } else {
    revealed.forEach((el) => el.classList.add('is-in'));
  }

  // Botón flotante: aparece al pasar el hero y se oculta en contacto
  const floatBtn = document.querySelector('[data-wa-float]');
  const hero = document.querySelector('[data-hero]');
  const contact = document.getElementById('contacto');
  if (floatBtn && hero && contact) {
    let pastHero = false;
    let inContact = false;
    const update = () => floatBtn.classList.toggle('is-visible', pastHero && !inContact);
    new IntersectionObserver(([entry]) => { pastHero = !entry.isIntersecting; update(); }).observe(hero);
    new IntersectionObserver(([entry]) => { inContact = entry.isIntersecting; update(); }, { threshold: 0.2 }).observe(contact);
  }

  const year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());
})();
