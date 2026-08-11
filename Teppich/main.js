/* =========================================================================
   TEPPICHWERKSTATT — Scroll-Engine & Interaktionen
   Eine einzige rAF-Schleife treibt alle scrollgebundenen Effekte.
   ========================================================================= */
(() => {
  'use strict';

  const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  /* Fortschritt zwischen zwei Marken, weich abgerundet */
  const span = (p, a, b) => clamp((p - a) / (b - a));
  const ease = t => t * t * (3 - 2 * t);

  /* ------------------------------------------------------------- Zustand */
  const view = { w: 0, h: 0, y: 0 };
  const jobs = [];
  let measuring = true;

  function measure() {
    view.w = window.innerWidth;
    view.h = window.innerHeight;
    jobs.forEach(j => j.measure && j.measure());
    measuring = false;
  }

  function frame() {
    view.y = window.scrollY || window.pageYOffset;
    for (const j of jobs) j.draw(view);
    requestAnimationFrame(frame);
  }

  /* ==================================================================== 
     1 — Hero-Bühne: Film blendet in die Elfenbein-Tafel über
     ==================================================================== */
  function stageJob() {
    const stage = $('.stage');
    if (!stage) return null;

    const film  = $('.stage__film', stage);
    const plate = $('.stage__plate', stage);
    const inner = $('.plate__inner', stage);
    const hero  = $('.hero', stage);
    const svc   = $$('[data-svc] li', stage);
    let top = 0, run = 1;

    return {
      measure() {
        top = stage.getBoundingClientRect().top + window.scrollY;
        run = Math.max(1, stage.offsetHeight - view.h);
      },
      draw(v) {
        const p = clamp((v.y - top) / run);

        /* Zuerst treten die Leistungen nacheinander hervor */
        for (let i = 0; i < svc.length; i++) {
          const s = ease(span(p, 0.015 + i * 0.026, 0.095 + i * 0.026));
          svc[i].style.opacity   = String(s);
          svc[i].style.translate = `0 ${14 * (1 - s)}px`;
        }

        /* Danach zieht sich der ganze Hero zurück */
        const a = ease(span(p, 0.30, 0.50));
        hero.style.opacity   = String(1 - a);
        hero.style.transform = `translate3d(0, ${-80 * a}px, 0)`;

        /* Film drückt nach vorn und verliert an Präsenz */
        const b = ease(span(p, 0.28, 0.92));
        const fade = ease(span(p, 0.42, 0.78));
        film.style.transform = `translate3d(0,0,0) scale(${1 + 0.2 * b})`;
        film.style.opacity   = String(1 - fade);
        film.style.filter    = `brightness(${1 - 0.45 * fade})`;

        /* Elfenbein steigt darunter hervor */
        const c = ease(span(p, 0.38, 0.76));
        plate.style.opacity   = String(c);
        /* Sobald die Tafel trägt, muss die Kopfzeile dunkel schreiben */
        stage.dataset.theme = c > 0.55 ? 'light' : 'dark';
        plate.style.transform = `translate3d(0,0,0) scale(${1.24 - 0.24 * ease(span(p, 0.38, 0.96))})`;

        /* Schrift auf der Tafel kommt zuletzt */
        const d = ease(span(p, 0.64, 0.92));
        inner.style.opacity   = String(d);
        inner.style.transform = `translate3d(0, ${38 * (1 - d)}px, 0)`;
      }
    };
  }

  /* ====================================================================
     2 — Kopfzeile: andockt, Farbe folgt dem Abschnitt darunter
     ==================================================================== */
  function headJob() {
    const head = $('.head');
    if (!head) return null;
    const zones = $$('[data-theme]').map(el => ({ el, t: 0, b: 0 }));
    let stuck = null, light = null;

    return {
      measure() {
        for (const z of zones) {
          const r = z.el.getBoundingClientRect();
          z.t = r.top + window.scrollY;
          z.b = z.t + r.height;
        }
      },
      draw(v) {
        const isStuck = v.y > 40;
        if (isStuck !== stuck) { head.classList.toggle('is-stuck', isStuck); stuck = isStuck; }

        const probe = v.y + head.offsetHeight * 0.62;
        let isLight = false;
        for (const z of zones) {
          if (probe >= z.t && probe < z.b) { isLight = z.el.dataset.theme === 'light'; break; }
        }
        if (isLight !== light) { head.classList.toggle('is-light', isLight); light = isLight; }
      }
    };
  }

  /* ====================================================================
     3 — Fortschritt: die Rolle dreht sich mit dem Weg durch die Seite
     ==================================================================== */
  function spoolJob() {
    const spool = $('.spool');
    if (!spool) return null;
    const mark = $('.spool__mark', spool);
    const bar  = $('.spool__bar i', spool);
    const num  = $('.spool__num', spool);
    let run = 1, last = -1;

    return {
      measure() { run = Math.max(1, document.body.scrollHeight - view.h); },
      draw(v) {
        const p = clamp(v.y / run);
        spool.classList.toggle('is-on', v.y > view.h * 0.6);
        mark.style.transform = `rotate(${p * 540}deg)`;
        bar.style.transform  = `scaleX(${p})`;
        const pct = Math.round(p * 100);
        if (pct !== last) { num.textContent = String(pct).padStart(2, '0'); last = pct; }
      }
    };
  }

  /* ====================================================================
     4 — Parallaxe für Bildflächen
     ==================================================================== */
  function parallaxJob() {
    const items = $$('[data-par]').map(el => ({
      el, k: parseFloat(el.dataset.par) || 0.12, t: 0, h: 0
    }));
    if (!items.length) return null;

    return {
      measure() {
        for (const it of items) {
          const r = it.el.getBoundingClientRect();
          it.t = r.top + window.scrollY;
          it.h = r.height;
        }
      },
      draw(v) {
        for (const it of items) {
          if (it.t + it.h < v.y - 200 || it.t > v.y + view.h + 200) continue;
          const rel = (v.y + view.h - it.t) / (view.h + it.h) - 0.5;
          it.el.style.transform = `translate3d(0, ${(-rel * it.h * it.k).toFixed(2)}px, 0)`;
        }
      }
    };
  }

  /* ====================================================================
     5 — Laufband, an den Scrollweg gekoppelt
     ==================================================================== */
  function tickerJob() {
    const row = $('.ticker__row');
    if (!row) return null;
    let w = 1;
    return {
      measure() { w = row.scrollWidth / 2 || 1; },
      draw(v) {
        const x = -((v.y * 0.28) % w);
        row.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
      }
    };
  }

  /* ====================================================================
     6 — Fortschrittslinie im Ablauf
     ==================================================================== */
  function spineJob() {
    const spine = $('.flow__spine i');
    const flow  = $('.flow');
    if (!spine || !flow) return null;
    let t = 0, h = 1;
    return {
      measure() {
        const r = flow.getBoundingClientRect();
        t = r.top + window.scrollY; h = r.height;
      },
      draw(v) {
        const p = clamp((v.y + view.h * 0.72 - t) / h);
        spine.style.transform = `scaleY(${p.toFixed(3)})`;
      }
    };
  }

  /* ====================================================================
     7 — Enthüllen beim Eintreten
     ==================================================================== */
  function reveals() {
    const targets = $$('.rv, .rv-line, .rv-wipe, .flow__step');
    if (!targets.length) return;
    if (calm.matches) { targets.forEach(t => t.classList.add('is-in')); return; }

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    targets.forEach(t => io.observe(t));
  }

  /* ====================================================================
     8 — Ankermenü: aktiver Punkt
     ==================================================================== */
  function anchors() {
    const links = $$('[data-anchor]');
    const map = new Map();
    links.forEach(l => {
      const id = l.getAttribute('href');
      if (!id || !id.startsWith('#')) return;
      const sec = document.querySelector(id);
      if (sec) (map.get(sec) || map.set(sec, []).get(sec)).push(l);
    });
    if (!map.size) return;

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const ls = map.get(e.target) || [];
        ls.forEach(l => l.classList.toggle('is-current', e.isIntersecting));
      }
    }, { rootMargin: '-45% 0px -50% 0px' });

    map.forEach((_, sec) => io.observe(sec));
  }

  /* ====================================================================
     9 — Menü für schmale Sichten
     ==================================================================== */
  function drawer() {
    const btn = $('.burger');
    const box = $('.drawer');
    if (!btn || !box) return;

    const links = $$('.drawer__link', box);
    links.forEach((l, i) => l.style.setProperty('--d', `${0.16 + i * 0.055}s`));

    const set = (open) => {
      btn.setAttribute('aria-expanded', String(open));
      box.classList.toggle('is-open', open);
      box.setAttribute('aria-hidden', String(!open));
      document.body.classList.toggle('is-locked', open);
      if (open) links[0]?.focus({ preventScroll: true });
    };

    btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
    box.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && box.classList.contains('is-open')) { set(false); btn.focus(); }
    });
    set(false);
  }

  /* ====================================================================
     10 — Vorher / Nachher
     ==================================================================== */
  function compare() {
    $$('[data-ba]').forEach(ba => {
      const range = $('.ba__range', ba);
      if (!range) return;
      const apply = () => ba.style.setProperty('--p', `${range.value}%`);
      range.addEventListener('input', apply);
      /* Ziehen und Tippen direkt auf der Fläche */
      const track = (e) => {
        if (e.buttons !== 1 && e.type === 'pointermove') return;
        const r = ba.getBoundingClientRect();
        range.value = String(clamp((e.clientX - r.left) / r.width) * 100);
        apply();
      };
      ba.addEventListener('pointerdown', (e) => {
        ba.setPointerCapture?.(e.pointerId);
        track(e);
      });
      ba.addEventListener('pointermove', track);
      ba.addEventListener('pointerup', (e) => ba.releasePointerCapture?.(e.pointerId));
      apply();
    });
  }

  /* ====================================================================
     11 — Abholformular
     Ohne eingetragenes Ziel wird die Anfrage im Mailprogramm geöffnet.
     ==================================================================== */
  function pickup() {
    const form = $('#abholung');
    if (!form) return;
    const note = $('.form__state', form);

    form.addEventListener('submit', (e) => {
      const endpoint = form.dataset.endpoint;
      if (endpoint) return;                 /* echtes Ziel eingetragen → normal senden */

      e.preventDefault();
      const d = new FormData(form);
      const line = (k, v) => (v ? `${k}: ${v}\n` : '');
      const body =
        line('Name', d.get('name')) +
        line('Telefon', d.get('tel')) +
        line('E-Mail', d.get('mail')) +
        line('Adresse', d.get('adresse')) +
        line('Leistung', d.get('leistung')) +
        line('Masse / Anzahl', d.get('masse')) +
        `\n${d.get('text') || ''}\n`;

      const to = form.dataset.mailto || 'atelier@teppichwerkstatt.ch';
      window.location.href =
        `mailto:${to}?subject=${encodeURIComponent('Abholung anfragen')}&body=${encodeURIComponent(body)}`;

      if (note) note.textContent = 'Ihre Anfrage wird im Mailprogramm geöffnet.';
    });
  }

  /* ====================================================================
     12 — Hero-Film: Poster übernimmt, wenn keine Datei da ist
     ==================================================================== */
  function film() {
    const vid = $('.stage__film video');
    if (!vid) return;
    const drop = () => { vid.style.display = 'none'; };
    vid.addEventListener('error', drop, true);
    $$('source', vid).forEach(s => s.addEventListener('error', () => {
      if (vid.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) drop();
    }));
    vid.play?.().catch(() => {});
  }

  /* ====================================================================
     Start
     ==================================================================== */
  function boot() {
    reveals();
    anchors();
    drawer();
    compare();
    pickup();
    film();

    if (calm.matches) return;               /* keine scrollgebundene Bewegung */

    [stageJob, headJob, spoolJob, parallaxJob, tickerJob, spineJob]
      .map(f => f())
      .filter(Boolean)
      .forEach(j => jobs.push(j));

    measure();
    requestAnimationFrame(frame);

    let t;
    window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(measure, 140); }, { passive: true });
    window.addEventListener('load', measure);
    document.fonts?.ready.then(measure);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
