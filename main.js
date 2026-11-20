(() => {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const WA_NUMBER = '573180990009';

  /* ---------- horario en vivo (hora de Bogotá) ---------- */
  const status = $('[data-open-status]');
  if (status) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Bogota', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false
    }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t)?.value;
    const day = get('weekday');
    const h = parseInt(get('hour'), 10) % 24;
    const m = parseInt(get('minute'), 10);
    const minutes = h * 60 + m;
    const openDay = day !== 'Sun';
    let text;
    if (openDay && minutes >= 7 * 60 && minutes < 20 * 60) {
      text = 'Abierto ahora, hasta las 8 p. m.';
      status.closest('.hours').classList.add('is-open');
    } else if (openDay && minutes < 7 * 60) {
      text = 'Cerrado, abrimos hoy a las 7 a. m.';
    } else if (day === 'Sat' || day === 'Sun') {
      text = 'Cerrado, abrimos el lunes a las 7 a. m.';
    } else {
      text = 'Cerrado, abrimos mañana a las 7 a. m.';
    }
    status.textContent = text;
  }

  /* ---------- barra superior ---------- */
  const bar = $('[data-bar]');
  const hero = $('.hero');
  if (bar && hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      bar.classList.toggle('is-shown', !e.isIntersecting);
    }, { rootMargin: '-35% 0px 0px 0px' }).observe(hero);
  }

  // enlace activo en la barra
  const navLinks = $$('.bar-links a');
  const sections = navLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  if (sections.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        navLinks.forEach((a) => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + e.target.id)));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => io.observe(s));
  }

  /* ---------- escenario: la foto fija cambia con la lectura ---------- */
  const shots = $$('.shot');
  const triggers = $$('[data-shot]');
  let current = 0;
  function showShot(n) {
    if (n === current || !shots[n]) return;
    shots[current].classList.remove('is-on');
    shots[n].classList.add('is-on');
    current = n;
  }
  if (shots.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) showShot(parseInt(e.target.dataset.shot, 10));
      });
    }, { rootMargin: '-48% 0px -48% 0px' });
    triggers.forEach((t) => io.observe(t));
    // la carta empieza con el equipo, el bloque de doctores pasa al consultorio
    document.addEventListener('visibilitychange', () => {
      shots.forEach((s) => (s.style.animationPlayState = document.hidden ? 'paused' : ''));
    });
  }

  /* ---------- entradas por sección ---------- */
  const groups = $$('[data-reveal], .letter');
  groups.forEach((g) => $$('[data-r], .mod', g).forEach((el, k) => el.style.setProperty('--k', Math.min(k, 14))));
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        obs.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });
    groups.forEach((g) => io.observe(g));
  } else {
    groups.forEach((g) => g.classList.add('is-in'));
  }

  /* ---------- antes / después ---------- */
  const CASES = {
    protesis: {
      before: 'assets/casos/protesis-antes.jpg', after: 'assets/casos/protesis-despues.jpg',
      alt: 'Después: la paciente sonríe con sus dientes superiores completos',
      text: 'Prótesis removible de alta precisión para recuperar los dientes superiores. Misma paciente, misma luz, antes y después.'
    },
    rehab: {
      before: 'assets/casos/rehab-antes.jpg', after: 'assets/casos/rehab-despues.jpg',
      alt: 'Después: el paciente con la camiseta de Colombia sonríe con los dientes frontales completos',
      text: 'Rehabilitación de los dientes frontales: vuelve la función para masticar y una sonrisa completa, sin espacios.'
    },
    sonrisa: {
      before: 'assets/casos/sonrisa-antes.jpg', after: 'assets/casos/sonrisa-despues.jpg',
      alt: 'Después: la paciente de blusa rayada sonríe con todos sus dientes',
      text: 'Recuperar los dientes perdidos cambia la forma de reír. La paciente volvió a sonreír sin taparse la boca.'
    }
  };
  // precarga de los casos
  Object.values(CASES).forEach((c) => { [c.before, c.after].forEach((src) => { const i = new Image(); i.src = src; }); });

  const ba = $('[data-ba]');
  if (ba) {
    const range = $('.ba-range', ba);
    const before = $('[data-before]', ba);
    const after = $('[data-after]', ba);
    const desc = $('[data-case-text]');
    const panel = $('#case-text');
    let touched = false;

    const setPos = (v) => {
      const p = Math.max(0, Math.min(100, v));
      ba.style.setProperty('--pos', p + '%');
      range.value = Math.round(p);
      range.setAttribute('aria-valuetext', Math.round(p) + ' % antes, ' + (100 - Math.round(p)) + ' % después');
    };
    const fromEvent = (e) => {
      const r = ba.getBoundingClientRect();
      return ((e.clientX - r.left) / r.width) * 100;
    };
    let dragging = false;
    ba.addEventListener('pointerdown', (e) => {
      touched = true; dragging = true;
      ba.classList.add('is-dragging');
      ba.setPointerCapture(e.pointerId);
      setPos(fromEvent(e));
    });
    ba.addEventListener('pointermove', (e) => { if (dragging) setPos(fromEvent(e)); });
    const end = () => { dragging = false; ba.classList.remove('is-dragging'); };
    ba.addEventListener('pointerup', end);
    ba.addEventListener('pointercancel', end);
    range.addEventListener('input', () => { touched = true; setPos(+range.value); });
    // el control es enfocable con teclado a través del input
    ba.addEventListener('click', () => range.focus({ preventScroll: true }));

    // pestañas
    const tabs = $$('.tab');
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
      });
      panel.setAttribute('aria-labelledby', tab.id);
      const c = CASES[tab.dataset.case];
      desc.classList.add('is-swapping');
      before.src = c.before; after.src = c.after; after.alt = c.alt;
      setTimeout(() => { desc.textContent = c.text; desc.classList.remove('is-swapping'); }, 200);
      if (focus) tab.focus();
      if (!reduce) sweep(); else setPos(50);
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t, false));
      t.addEventListener('keydown', (e) => {
        let n = null;
        if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === 'Home') n = tabs[0];
        if (e.key === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });

    // barrido de demostración: de antes a después y vuelta al centro
    let raf = 0;
    function sweep() {
      cancelAnimationFrame(raf);
      const keys = [[0, 50], [700, 92], [1700, 8], [2500, 50]];
      const t0 = performance.now();
      const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
      const step = (now) => {
        if (dragging) return;
        const t = now - t0;
        let k = 0;
        while (k < keys.length - 2 && t > keys[k + 1][0]) k++;
        const [ta, va] = keys[k];
        const [tb, vb] = keys[k + 1];
        const x = Math.min(1, Math.max(0, (t - ta) / (tb - ta)));
        setPos(va + (vb - va) * ease(x));
        if (t < keys[keys.length - 1][0]) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }
    if (!reduce && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(([e], obs) => {
        if (e.isIntersecting) { if (!touched) setTimeout(sweep, 500); obs.disconnect(); }
      }, { threshold: 0.55 });
      io.observe(ba);
    }
  }

  /* ---------- fila arrastrable ---------- */
  const row = $('[data-drag]');
  if (row) {
    let down = false; let startX = 0; let startLeft = 0; let moved = 0;
    row.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = 0; startX = e.clientX; startLeft = row.scrollLeft;
      row.classList.add('is-grabbing');
    });
    window.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      row.scrollLeft = startLeft - dx;
    });
    window.addEventListener('pointerup', () => { if (!down) return; down = false; row.classList.remove('is-grabbing'); });
    row.addEventListener('click', (e) => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);
    row.addEventListener('dragstart', (e) => e.preventDefault());
  }

  /* ---------- cifra 4,9 ---------- */
  const count = $('[data-count]');
  if (count && !reduce && 'IntersectionObserver' in window) {
    const target = parseFloat(count.dataset.count);
    const fmt = (v) => v.toFixed(1).replace('.', ',');
    const io = new IntersectionObserver(([e], obs) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const t0 = performance.now(); const dur = 1100;
      const tick = (now) => {
        const x = Math.min(1, (now - t0) / dur);
        const v = target * (1 - Math.pow(1 - x, 4));
        count.textContent = fmt(v);
        if (x < 1) requestAnimationFrame(tick);
      };
      count.textContent = '0,0';
      requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    io.observe(count);
  }

  /* ---------- video: solo se reproduce a la vista ---------- */
  const video = $('.treat-video video');
  if (video) {
    if (reduce) {
      video.setAttribute('controls', '');
    } else if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        if (e.isIntersecting) video.play().catch(() => video.setAttribute('controls', ''));
        else video.pause();
      }, { threshold: 0.25 }).observe(video);
    }
  }

  /* ---------- franja de fotos: se duplica para el bucle ---------- */
  const track = $('.strip-track');
  if (track && !reduce) {
    $$('img', track).forEach((img) => { const c = img.cloneNode(true); c.loading = 'lazy'; track.appendChild(c); });
  }

  /* ---------- agenda por WhatsApp ---------- */
  const form = $('[data-book]');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.elements['name'].value.trim();
      const what = form.elements['treatment'].value;
      let msg = 'Hola Opalus';
      msg += name ? ', soy ' + name + '.' : '.';
      msg += what ? ' Quiero agendar una cita para ' + what.charAt(0).toLowerCase() + what.slice(1) + '.' : ' Quiero agendar una cita.';
      msg += ' ¿Qué horarios tienen disponibles?';
      window.open('https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
    });
  }
})();
