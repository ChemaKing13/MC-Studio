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

  // Ventana emergente de reapertura
  // TODO: fecha en que termina la promoción (AAAA-MM-DD). Después de esa fecha deja de mostrarse.
  const PROMO_UNTIL = '';
  const PROMO_KEY = 'mc-promo-reapertura-cerrada';
  const PROMO_SNOOZE_MS = 24 * 60 * 60 * 1000;
  const promo = document.querySelector('[data-promo]');

  if (promo && typeof promo.showModal === 'function') {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const expired = PROMO_UNTIL !== '' && Date.now() > new Date(`${PROMO_UNTIL}T23:59:59`).getTime();
    const forced = new URLSearchParams(window.location.search).has('promo');

    let snoozed = false;
    try {
      const closedAt = Number(localStorage.getItem(PROMO_KEY));
      snoozed = closedAt > 0 && Date.now() - closedAt < PROMO_SNOOZE_MS;
    } catch (error) { /* almacenamiento bloqueado: se muestra normalmente */ }

    const finishClose = () => {
      promo.classList.remove('is-closing');
      document.body.classList.remove('is-locked');
      if (promo.open) promo.close();
    };

    const closePromo = ({ animate = true } = {}) => {
      if (!promo.open || promo.classList.contains('is-closing')) return;
      try { localStorage.setItem(PROMO_KEY, String(Date.now())); } catch (error) { /* sin almacenamiento */ }
      if (!animate || reduceMotion.matches) {
        finishClose();
        return;
      }
      promo.classList.add('is-closing');
      promo.querySelector('.promo__card').addEventListener('animationend', finishClose, { once: true });
      window.setTimeout(finishClose, 400); // por si la animación no llega a terminar
    };

    promo.querySelectorAll('[data-promo-close]').forEach((button) => button.addEventListener('click', () => closePromo()));
    // el enlace cierra sin animación para que el salto a contacto o a WhatsApp ocurra de inmediato
    promo.querySelector('[data-promo-cta]')?.addEventListener('click', () => closePromo({ animate: false }));
    // clic fuera de la tarjeta (en el fondo oscuro)
    promo.addEventListener('click', (event) => { if (event.target === promo) closePromo(); });
    // tecla Escape: cierra con la misma animación
    promo.addEventListener('cancel', (event) => { event.preventDefault(); closePromo(); });
    promo.addEventListener('close', () => document.body.classList.remove('is-locked'));

    if (forced || (!snoozed && !expired)) {
      window.setTimeout(() => {
        if (document.body.classList.contains('is-locked')) return; // el menú móvil está abierto
        promo.showModal();
        document.body.classList.add('is-locked');
      }, 1300);
    }
  }

  // Servicios: acordeón con imagen que cambia según la categoría
  const accordion = document.querySelector('[data-accordion]');
  const visual = document.querySelector('[data-svc-visual]');
  if (accordion) {
    const triggers = Array.from(accordion.querySelectorAll('[data-svc]'));

    const showImage = (key) => {
      visual?.querySelectorAll('[data-svc-img]').forEach((img) => {
        img.classList.toggle('is-active', img.dataset.svcImg === key);
      });
    };

    const openKey = () => triggers.find((t) => t.getAttribute('aria-expanded') === 'true')?.dataset.svc;

    const setOpen = (trigger, open) => {
      const panel = document.getElementById(trigger.getAttribute('aria-controls'));
      trigger.setAttribute('aria-expanded', String(open));
      panel.hidden = !open;
      panel.classList.remove('is-entering');
      if (open) {
        void panel.offsetWidth; // reinicia la animación de entrada
        panel.classList.add('is-entering');
      }
    };

    triggers.forEach((trigger) => {
      trigger.addEventListener('click', () => {
        const willOpen = trigger.getAttribute('aria-expanded') !== 'true';
        triggers.forEach((other) => { if (other !== trigger) setOpen(other, false); });
        setOpen(trigger, willOpen);
        if (willOpen) {
          showImage(trigger.dataset.svc);
          // en móvil, alinea la categoría abierta bajo el encabezado
          if (window.matchMedia('(max-width: 900px)').matches) {
            trigger.closest('.svc').scrollIntoView({ block: 'start', behavior: 'smooth' });
          }
        }
      });

      // vista previa de la imagen al pasar el cursor (solo escritorio)
      trigger.addEventListener('pointerenter', (event) => {
        if (event.pointerType === 'mouse') showImage(trigger.dataset.svc);
      });
    });

    accordion.addEventListener('pointerleave', () => {
      const key = openKey();
      if (key) showImage(key);
    });
  }

  // Cinta de servicios: pausa manual
  const marquee = document.querySelector('[data-marquee]');
  const marqueeToggle = document.querySelector('[data-marquee-toggle]');
  marqueeToggle?.addEventListener('click', () => {
    const paused = marquee.classList.toggle('is-paused');
    marqueeToggle.setAttribute('aria-pressed', String(paused));
    marqueeToggle.querySelector('i').className = paused ? 'ph-light ph-play' : 'ph-light ph-pause';
    marqueeToggle.querySelector('.sr-only').textContent = paused ? 'Reanudar animación' : 'Pausar animación';
  });

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
