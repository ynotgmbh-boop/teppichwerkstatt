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
    const video = $('video', stage);
    const veil  = $('.stage__veil', stage);
    const clouds = $$('.veil__cloud', stage);
    const solid = $('.veil__solid', stage);
    const hero  = $('.hero', stage);
    const svc   = $$('[data-svc] li', stage);
    let top = 0, run = 1;

    /* Der Film wird nicht abgespielt, sondern durchgespult:
       die Bildposition folgt unmittelbar dem Scrollweg. */
    let dur = 0, want = 0, seeking = false;
    if (video) {
      video.pause();
      const ready = () => { dur = video.duration || 0; };
      if (video.readyState >= 1) ready();
      video.addEventListener('loadedmetadata', ready);
      /* Nie zwei Sprünge gleichzeitig anfordern — sonst stockt das Bild. */
      video.addEventListener('seeked', () => {
        seeking = false;
        if (Math.abs(video.currentTime - want) > 0.02) step();
      });
    }
    function step() {
      if (!video || !dur || seeking) return;
      seeking = true;
      try { video.currentTime = want; } catch (e) { seeking = false; }
    }

    /* Jede Wolkenlage zieht anders schnell auf — das gibt der Überblendung Tiefe */
    const LAYER = [
      { a: 0.34, b: 0.70, from: 1.45, to: 1.02, drift: -70 },
      { a: 0.40, b: 0.78, from: 1.75, to: 1.06, drift:  90 },
      { a: 0.47, b: 0.86, from: 2.10, to: 1.10, drift: -40 },
    ];

    return {
      measure() {
        top = stage.getBoundingClientRect().top + window.scrollY;
        run = Math.max(1, stage.offsetHeight - view.h);
      },
      draw(v) {
        const p = clamp((v.y - top) / run);

        /* Der Film läuft über die erste Hälfte des Weges genau einmal durch */
        if (dur) {
          const t = clamp(p / 0.62) * (dur - 0.05);
          if (Math.abs(t - want) > 0.03) { want = t; step(); }
        }

        /* Die Leistungen treten rasch nacheinander hervor */
        for (let i = 0; i < svc.length; i++) {
          const s = ease(span(p, 0.04 + i * 0.035, 0.15 + i * 0.035));
          svc[i].style.opacity   = String(s);
          svc[i].style.translate = `0 ${16 * (1 - s)}px`;
        }

        /* Danach zieht sich der ganze Hero zurück */
        const a = ease(span(p, 0.34, 0.54));
        hero.style.opacity   = String(1 - a);
        hero.style.transform = `translate3d(0, ${-80 * a}px, 0)`;

        /* Film drückt nach vorn und verliert an Präsenz */
        const b = ease(span(p, 0.30, 0.95));
        const fade = ease(span(p, 0.50, 0.90));
        film.style.transform = `translate3d(0,0,0) scale(${1 + 0.18 * b})`;
        film.style.opacity   = String(1 - fade * 0.75);
        film.style.filter    = `brightness(${1 - 0.5 * fade})`;

        /* Elfenbein zieht als Wolke auf */
        for (let i = 0; i < clouds.length; i++) {
          const L = LAYER[i];
          const t = ease(span(p, L.a, L.b));
          clouds[i].style.opacity = String(t);
          clouds[i].style.transform =
            `translate3d(${L.drift * (1 - t)}px,0,0) scale(${L.from + (L.to - L.from) * t})`;
        }

        /* … und deckt zum Schluss vollständig zu. Danach folgt nur noch ein
           kurzer Atemzug, bevor der Elfenbein-Abschnitt übernimmt. */
        solid.style.opacity = String(ease(span(p, 0.78, 0.97)));
        veil.style.opacity = '1';

        /* Sobald es hell wird, muss die Kopfzeile dunkel schreiben */
        stage.dataset.theme = (ease(span(p, 0.40, 0.82)) > 0.55) ? 'light' : 'dark';
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
     6b — Karte: das Echolot läuft mit dem Scrollweg durch das Land
     ==================================================================== */
  function radarJob() {
    const svg = $('.ch');
    if (!svg) return null;
    const sonar = $('.ch__sonar', svg);
    const rings = $$('.ch__sonar circle', svg);
    const waves = $$('.ch__dots .w', svg);
    if (!sonar || !rings.length) return null;

    const RMAX = parseFloat(sonar.dataset.rmax) || 650;
    const sec = $('#gebiet');
    let top = 0, h = 1;

    return {
      measure() {
        const r = (sec || svg).getBoundingClientRect();
        top = r.top + window.scrollY; h = r.height;
      },
      draw(v) {
        /* 0 beim Eintreten, 1 wenn der Abschnitt durchgelaufen ist */
        const p = clamp((v.y + view.h - top) / (h + view.h));
        /* Drei Durchläufe über die Strecke, die Ringe versetzt */
        const cycle = p * 3;

        for (let i = 0; i < rings.length; i++) {
          const t = (cycle - i * 0.33) % 1;
          if (t < 0) { rings[i].setAttribute('r', '0'); rings[i].style.opacity = '0'; continue; }
          rings[i].setAttribute('r', (t * RMAX).toFixed(0));
          /* schnell da, langsam verklingend */
          rings[i].style.opacity = String((t < 0.06 ? t / 0.06 : 1 - (t - 0.06) / 0.94) * 0.75);
        }

        /* Punkte hellen auf, wenn die vorderste Front sie erreicht */
        const front = cycle % 1;
        for (const w of waves) {
          const d = parseFloat(w.dataset.r) || 0;
          const gap = front - d;
          /* nur kurz nach dem Durchlauf hell, sonst ruhig */
          const lit = gap >= 0 && gap < 0.09 ? 1 - gap / 0.09 : 0;
          w.style.setProperty('--lit', lit.toFixed(3));
        }
      }
    };
  }

  /* ====================================================================
     7 — Enthüllen beim Eintreten
     ==================================================================== */
  function icons() {
    /* Exakte Pfadlänge je Element: nur so setzt das Nachzeichnen
       gleichmässig ein, egal wie lang die einzelne Linie ist. */
    for (const svg of $$('.ico')) {
      for (const el of svg.children) {
        const L = el.getTotalLength ? el.getTotalLength() : 120;
        el.style.setProperty('--len', L.toFixed(1));
      }
    }
  }

  function reveals() {
    const targets = $$('.rv, .rv-line, .rv-wipe, .flow__step, .craft__item, .tariff__card, .zone, .creed li');
    if (!targets.length) return;

    /* Ohne Beobachter oder bei ruhiggestellter Bewegung: alles sofort zeigen.
       Nichts darf dauerhaft unsichtbar bleiben, nur weil eine Zutat fehlt. */
    if (calm.matches || !('IntersectionObserver' in window)) {
      targets.forEach(t => t.classList.add('is-in'));
      $$('.ico').forEach(s => s.classList.add('is-in'));
      return;
    }

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    }, { rootMargin: '0px 0px -2% 0px', threshold: 0.02 });

    /* Kacheln in einer Reihe treten versetzt hervor */
    for (const row of $$('.craft, .tariff, .geo__zones, .creed')) {
      [...row.children].forEach((el, i) => el.style.setProperty('--d', `${i * 0.09}s`));
    }

    targets.forEach(t => io.observe(t));

    /* Die Zeichen im Hero laufen mit dem Scrollweg, nicht mit dem Sichtfeld */
    $$('[data-svc] .ico').forEach((s, i) => {
      setTimeout(() => s.classList.add('is-in'), 400 + i * 130);
    });
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
    /* Kein play(): die Bildposition setzt stageJob aus dem Scrollweg.
       Ein einzelner Anstoss weckt den Decoder, danach steht das Bild still. */
    vid.addEventListener('loadeddata', () => { try { vid.pause(); } catch (e) {} });
  }

  /* ====================================================================
     Start
     ==================================================================== */
  function boot() {
    icons();
    reveals();
    anchors();
    drawer();
    compare();
    pickup();
    film();

    if (calm.matches) {
      /* Ruhig, aber nicht leer: Punkte auf Grundhelligkeit, Film als Standbild */
      $$('.ch__dots .w').forEach(w => w.style.setProperty('--lit', '0'));
      return;
    }

    [stageJob, headJob, spoolJob, parallaxJob, tickerJob, spineJob, radarJob]
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
