/* =====================================================================
   PARALLOX — interaction script

   Rules this file follows, in order of importance:

   1. No scroll handler ever reads layout. Scroll work is throttled into a
      single requestAnimationFrame and only writes `transform`.
   2. Nothing is measured while it is off screen. Every listener that can
      cost anything is either passive, one-shot, or gated by an
      IntersectionObserver.
   3. Quality adapts downward, never upward. A frame-time watchdog can
      drop the page to `data-fx="lite"` mid-session, but nothing will ever
      turn effects back on.
   4. No JavaScript is required for the page to be readable. The carousel,
      the FAQ, the contact cards and the navigation all work or degrade to
      something sensible without it.
   ===================================================================== */

(function () {
  'use strict';

  var root = document.documentElement;
  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  var lite    = root.getAttribute('data-fx') === 'lite';
  var reduce  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePtr = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasIO   = 'IntersectionObserver' in window;

  function fxOn() { return !lite && !reduce; }

  function cssPx(name, fallback) {
    var v = parseFloat(getComputedStyle(root).getPropertyValue(name));
    return isNaN(v) ? fallback : v;
  }


  /* =====================================================================
     FRAME WATCHDOG
     The last line of defence. If the device visibly cannot hold ~40fps
     while the page is being used, we strip it back to the lite tier and
     drop the background video. Only downgrades; two chances, then it
     stops measuring entirely.
     ===================================================================== */
  var watchdog = {
    samples: 0,
    slow: 0,
    strikes: 0,
    armed: true,
    last: 0,

    /* Deliberately closure-based rather than a `this`-using method: this is
       re-registered with requestAnimationFrame, which does not preserve the
       receiver, and a bound copy created inside the loop would allocate a new
       function every frame. */
    tick: function (now) {
      if (!watchdog.armed || lite || reduce) return;
      if (watchdog.last) {
        var d = now - watchdog.last;
        if (d > 0 && d < 500) {
          watchdog.samples++;
          if (d > 40) watchdog.slow++;
        }
      }
      watchdog.last = now;

      if (watchdog.samples >= 90) {
        if (watchdog.slow / watchdog.samples > 0.25) {
          watchdog.strikes++;
          lite = true;
          root.setAttribute('data-fx', 'lite');
          stopVideo();
          if (watchdog.strikes >= 2) watchdog.armed = false;
        }
        watchdog.samples = 0;
        watchdog.slow = 0;
      }
      if (watchdog.armed) requestAnimationFrame(watchdog.tick);
    }
  };


  /* =====================================================================
     PRECISE IN-PAGE SCROLLING
     Native anchor jumps land wherever the browser decides: `scroll-padding`,
     `scroll-margin`, smooth-scroll and content-visibility all fight each
     other and the heading ends up half-hidden under the navbar. This computes
     the exact destination instead — one navbar height plus a small gap —
     and scrolls there.
     ===================================================================== */
  (function anchorScroll() {
    function targetFor(hash) {
      if (!hash || hash === '#' || hash === '#top') return document.body;
      try { return document.querySelector(hash); } catch (e) { return null; }
    }

    /* Land on the section's own heading rather than its padding box. A
       section's top edge sits ~50px of empty padding above its <h2>, so
       scrolling the box put the reader in the gap and made every link feel
       like it stopped short. */
    function anchorPoint(section) {
      var head = section.querySelector('.section__head');
      var h = (head && head.querySelector('h1, h2')) || section.querySelector('h1, h2');
      return h || section;
    }

    document.addEventListener('click', function (e) {
      var link = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!link) return;

      var hash = link.getAttribute('href');
      var section = targetFor(hash);
      if (!section) return;

      e.preventDefault();

      var y;
      if (hash === '#top' || hash === '#') {
        y = 0;
      } else {
        var navH = cssPx('--nav-h', 64);
        var gap = cssPx('--anchor-gap', 20);
        var point = anchorPoint(section);
        y = point.getBoundingClientRect().top + window.pageYOffset - navH - gap;
      }

      var max = document.documentElement.scrollHeight - window.innerHeight;
      y = Math.max(0, Math.min(y, max));

      window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });

      if (history.replaceState) history.replaceState(null, '', hash === '#top' ? location.pathname : hash);

      /* Move focus without a second scroll so keyboard and screen-reader
         users land on the section they asked for. */
      if (hash !== '#top') {
        section.setAttribute('tabindex', '-1');
        try { section.focus({ preventScroll: true }); } catch (err) { section.focus(); }
      }
    });
  })();


  /* =====================================================================
     SCROLL PROGRESS BAR
     One passive listener, one rAF, one transform write. The scrollable
     height is cached and only re-measured on resize, so this never forces
     a layout mid-scroll.
     ===================================================================== */
  (function scrollProgress() {
    var bar = document.getElementById('navProgress');
    if (!bar) return;

    var max = 1;
    var queued = false;

    function measure() { max = Math.max(1, root.scrollHeight - window.innerHeight); }
    function paint() {
      queued = false;
      var p = window.pageYOffset / max;
      bar.style.transform = 'scaleX(' + (p > 0 ? (p < 1 ? p : 1) : 0) + ')';
    }
    function onScroll() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(paint);
    }

    measure();
    paint();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { measure(); paint(); }, { passive: true });
    window.addEventListener('orientationchange', function () {
      setTimeout(function () { measure(); paint(); }, 250);
    }, { passive: true });
  })();


  /* =====================================================================
     AMBIENT VIEWPORT GATING
     Marks a section .in-view only while it is on screen. The stylesheet
     freezes every decorative animation on sections without it, so the
     nebula, star drift, god rays and portal rings cost nothing once you
     have scrolled past them.
     ===================================================================== */
  (function viewportGating() {
    var targets = $$('.hero, .omega');
    if (!targets.length) return;

    function mark(el, on) { el.classList.toggle('in-view', on); }

    if (!hasIO) {
      targets.forEach(function (el) { mark(el, true); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        mark(entries[i].target, entries[i].isIntersecting);
      }
    }, { threshold: 0, rootMargin: '160px 0px' });

    targets.forEach(function (el) { io.observe(el); });

    /* Seed the state synchronously. IntersectionObserver delivers its first
       callback on a later frame — and not at all while the page is hidden or
       fully occluded — so without this the hero would sit unanimated until
       the next tick, or indefinitely in a background tab. One forced layout
       at boot and nothing more. */
    var vh = window.innerHeight || document.documentElement.clientHeight;
    targets.forEach(function (el) {
      var r = el.getBoundingClientRect();
      mark(el, r.bottom > -160 && r.top < vh + 160);
    });
  })();


  /* =====================================================================
     INTRO VIDEO
     The clip is 3840x2160 — roughly 1.4 MB and a heavy decode. It plays on
     phones too, as it always did; the safety valve is the quality tier,
     not the pointer type. `data-fx="lite"` (set before first paint by the
     inline head script for Save-Data, <=4 cores, <=4 GB, or reduced motion)
     is what stops it loading on a device that cannot afford it.
     ===================================================================== */
  var introVideo = document.getElementById('introVideo');
  var videoStop = function () {};

  function stopVideo() { videoStop(); }

  if (introVideo) {
    if (!fxOn() || !introVideo.getAttribute('data-src')) {
      /* The layered CSS wash behind it becomes the hero's permanent look. The
         element is removed outright, so there is no <source> to fetch, no
         decoder allocated and no decoder thread waking up on every frame. */
      introVideo.parentNode.removeChild(introVideo);
      introVideo = null;
    } else {
      var src = introVideo.getAttribute('data-src');
      var attached = false;

      function attach() {
        if (attached) return;
        attached = true;
        var s = document.createElement('source');
        s.src = src;
        s.type = 'video/mp4';
        introVideo.appendChild(s);
        introVideo.load();
      }

      function play() {
        attach();
        var p = introVideo.play();
        if (p && p.catch) p.catch(function () { /* autoplay refused — wash stays */ });
      }

      introVideo.addEventListener('playing', function () {
        introVideo.classList.add('ready');
      }, { once: true });

      var vio = null;
      if (hasIO) {
        vio = new IntersectionObserver(function (entries) {
          for (var i = 0; i < entries.length; i++) {
            if (entries[i].isIntersecting) { play(); } else { introVideo.pause(); }
          }
        }, { threshold: 0.15 });
        vio.observe(introVideo);
      } else {
        play();
      }

      document.addEventListener('visibilitychange', function () {
        if (document.hidden) introVideo.pause();
        else if (attached && introVideo.readyState > 2) introVideo.play();
      });

      videoStop = function () {
        if (vio) vio.disconnect();
        introVideo.pause();
        attached = false;
      };
    }
  }


  /* =====================================================================
     POINTER PARALLAX (hero)
     Single passive listener → single rAF → one transform write.
     ===================================================================== */
  (function heroParallax() {
    if (!fxOn() || !finePtr) return;
    var art = $('.hero__art');
    var hero = $('.hero');
    if (!art || !hero) return;

    var queued = false;
    var tx = 0, ty = 0;

    function paint() {
      queued = false;
      art.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0)';
    }

    window.addEventListener('pointermove', function (e) {
      if (!hero.classList.contains('in-view')) return;
      tx = ((window.innerWidth / 2) - e.clientX) / 26;
      ty = ((window.innerHeight / 2) - e.clientY) / 26;
      if (!queued) { queued = true; requestAnimationFrame(paint); }
    }, { passive: true });
  })();


  /* =====================================================================
     DEMO PORTAL — pointer-tracked 3D tilt (the original behaviour)
     ===================================================================== */
  (function artifactTilt() {
    if (!fxOn() || !finePtr) return;
    var artifact = document.getElementById('artifact');
    var omega = $('.omega');
    if (!artifact || !omega) return;

    var queued = false;
    var rx = 0, ry = 0;

    function paint() {
      queued = false;
      artifact.style.transform = 'rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
    }

    window.addEventListener('pointermove', function (e) {
      if (!omega.classList.contains('in-view')) return;
      ry = (e.clientX - window.innerWidth / 2) / 25;
      rx = (window.innerHeight / 2 - e.clientY) / 25;
      if (!queued) { queued = true; requestAnimationFrame(paint); }
    }, { passive: true });
  })();


  /* =====================================================================
     NAVIGATION
     ===================================================================== */
  (function navigation() {
    var toggle = document.getElementById('navToggle');
    var nav = document.getElementById('mainNav');
    if (!toggle || !nav) return;

    function setOpen(open) {
      nav.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    }

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    nav.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        setOpen(false);
        toggle.focus();
      }
    });

    /* Leaving the mobile breakpoint with the drawer open would strand it. */
    window.matchMedia('(min-width: 900px)').addEventListener('change', function (e) {
      if (e.matches) setOpen(false);
    });

    document.addEventListener('click', function (e) {
      if (!nav.classList.contains('open')) return;
      if (nav.contains(e.target) || toggle.contains(e.target)) return;
      setOpen(false);
    });
  })();


  /* =====================================================================
     SCREENSHOT CAROUSEL
     Two modes, one markup:
       · coverflow  — 3D stack, full-fx devices with a real pointer
       · filmstrip  — native scroll-snap row, everything else
     The filmstrip needs no JavaScript at all, so a weak device pays for
     nothing and still gets a usable, swipeable gallery.
     ===================================================================== */
  (function carousel() {
    var stage = document.getElementById('carouselStage');
    if (!stage) return;

    var shots = $$('.shot', stage);
    var dotsBox = document.getElementById('carouselDots');
    var prev = $('[data-carousel="prev"]');
    var next = $('[data-carousel="next"]');
    if (!shots.length || !dotsBox || !prev || !next) return;

    /* Coverflow needs a real pointer AND enough width for the side cards to
       sit outside the centre one without being clipped by the viewport.
       Below that the filmstrip is both better looking and cheaper.

       The cards ship as <figure>, because in filmstrip mode they are
       content and there is nothing to activate. Only here — where clicking
       a card moves the carousel — are they promoted to controls. */
    var coverflow = fxOn() && finePtr && window.matchMedia('(min-width: 760px)').matches;
    var index = 3;
    var n = shots.length;

    if (!coverflow) {
      /* Filmstrip: start on the same middle screenshot desktop does, so the
         two modes don't open on different content. */
      var focus = shots[Math.min(index, n - 1)];
      stage.scrollLeft = Math.max(0, focus.offsetLeft - (stage.clientWidth - focus.offsetWidth) / 2);
      return;
    }

    shots.forEach(function (shot) {
      shot.setAttribute('role', 'button');
      shot.tabIndex = 0;
      shot.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        shot.click();
      });
    });

    var dots = shots.map(function (shot, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Game moment ' + (i + 1));
      b.addEventListener('click', function () { go(i); });
      dotsBox.appendChild(b);
      return b;
    });

    function paint() {
      for (var i = 0; i < n; i++) {
        /* Straight offset, no wrapping. Wrapping made the stack show later
           moments to the left of moment 1 while the previous arrow was
           already disabled, so the number of states you could reach did not
           match the number of screenshots. */
        var off = i - index;

        var slot;
        if (off === 0) slot = '0';
        else if (Math.abs(off) <= 2) slot = String(off);
        else slot = 'hidden';

        shots[i].setAttribute('data-pos', slot);
        shots[i].setAttribute('aria-hidden', slot === 'hidden' ? 'true' : 'false');
        shots[i].tabIndex = slot === 'hidden' ? -1 : 0;

        if (i === index) dots[i].setAttribute('aria-current', 'true');
        else dots[i].removeAttribute('aria-current');
      }

      /* Label the arrows with the moment they lead to, using the same
         wording as the screenshots themselves. */
      prev.setAttribute('aria-label', 'Game moment ' + Math.max(1, index));
      next.setAttribute('aria-label', 'Game moment ' + Math.min(n, index + 2));
      prev.disabled = index === 0;
      next.disabled = index === n - 1;
    }

    function go(i) { index = Math.max(0, Math.min(n - 1, i)); paint(); }
    function step(d) { go(index + d); }

    prev.addEventListener('click', function () { step(-1); });
    next.addEventListener('click', function () { step(1); });

    shots.forEach(function (shot, i) {
      shot.addEventListener('click', function () {
        if (i !== index) step(i > index ? 1 : -1);
      });
    });

    stage.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); step(-1); }
    });

    /* Drag / swipe. Pointer Events cover mouse, touch and pen in one path. */
    var startX = 0, dragging = false;

    stage.addEventListener('pointerdown', function (e) {
      if (e.button != null && e.button !== 0) return;
      dragging = true; startX = e.clientX;
    });

    stage.addEventListener('pointerup', function (e) {
      if (!dragging) return;
      dragging = false;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 55) step(dx < 0 ? 1 : -1);
    });

    stage.addEventListener('pointercancel', function () { dragging = false; });

    go(index);
  })();


  /* =====================================================================
     CHARACTER VOICE LINES
     The card lights up red for exactly as long as its clip is playing and
     goes back to normal the moment it ends (or fails to start).
     ===================================================================== */
  (function characters() {
    var cards = $$('[data-character]');
    if (!cards.length) return;

    var audio = null;

    function clearPressed() {
      cards.forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
    }

    function stop() {
      if (audio) {
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
        try { audio.currentTime = 0; } catch (err) { /* not seekable */ }
        audio = null;
      }
      clearPressed();
    }

    function play(path) {
      if (audio) { audio.pause(); audio = null; }
      if (!path) { clearPressed(); return; }

      audio = new Audio(path);
      audio.onended = function () { audio = null; clearPressed(); };
      audio.onerror = function () { audio = null; clearPressed(); };

      var p = audio.play();
      if (p && p.catch) p.catch(function () { audio = null; clearPressed(); });
    }

    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        if (card.getAttribute('aria-pressed') === 'true') { stop(); return; }
        clearPressed();
        card.setAttribute('aria-pressed', 'true');
        play(card.getAttribute('data-voice'));
      });
    });

    /* Stop a voice line that is still playing when the tab is hidden. */
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); });
  })();


  /* =====================================================================
     FAQ
     ===================================================================== */
  (function faq() {
    var items = $$('.faq__item');
    if (!items.length) return;

    /* Collapsed panels ship with [inert] in the markup. Browsers without
       support just leave the text in the accessibility tree, which is the
       pre-existing behaviour and not a regression. */
    items.forEach(function (item) {
      var btn = $('.faq__btn', item);

      btn.addEventListener('click', function () {
        var open = item.classList.contains('open');

        items.forEach(function (other) {
          other.classList.remove('open');
          $('.faq__btn', other).setAttribute('aria-expanded', 'false');
          $('.faq__a', other).setAttribute('inert', '');
        });

        if (!open) {
          item.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
          $('.faq__a', item).removeAttribute('inert');
        }
      });
    });
  })();


  /* =====================================================================
     COPY EMAIL
     ===================================================================== */
  (function copyEmail() {
    $$('.contact').forEach(function (card) {
      var timer = 0;

      function legacy(text, cb) {
        var tmp = document.createElement('textarea');
        tmp.value = text;
        tmp.setAttribute('readonly', '');
        tmp.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
        document.body.appendChild(tmp);
        tmp.select();
        try { document.execCommand('copy'); cb(); } catch (e) { /* give up quietly */ }
        document.body.removeChild(tmp);
      }

      card.addEventListener('click', function () {
        var email = card.getAttribute('data-email');

        function done() {
          card.classList.add('copied');
          clearTimeout(timer);
          timer = setTimeout(function () { card.classList.remove('copied'); }, 2000);
        }

        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(email).then(done, function () { legacy(email, done); });
        } else {
          legacy(email, done);
        }
      });
    });
  })();


  /* =====================================================================
     MODALS
     Focus is trapped, the page behind is locked, Escape closes, and the
     trailer iframe is only given a src while it is actually on screen.
     ===================================================================== */
  (function modals() {
    var open = null;
    var lastFocus = null;

    var FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';

    function show(name) {
      var modal = document.getElementById(name);
      if (!modal || open) return;

      lastFocus = document.activeElement;
      modal.hidden = false;
      document.body.classList.add('modal-open');
      open = modal;

      if (name === 'trailerModal') {
        var f = $('#trailerVideo', modal);
        if (f) f.src = 'https://www.youtube.com/embed/yNYdhM1FAas?autoplay=1&rel=0';
      }

      var first = $(FOCUSABLE, modal);
      if (first) first.focus();
    }

    function hide() {
      if (!open) return;
      var modal = open;

      var f = $('#trailerVideo', modal);
      if (f) f.removeAttribute('src');

      modal.hidden = true;
      open = null;
      document.body.classList.remove('modal-open');

      if (lastFocus && lastFocus.focus) lastFocus.focus();
      lastFocus = null;
    }

    $$('[data-open-trailer]').forEach(function (b) {
      b.addEventListener('click', function () { show('trailerModal'); });
    });
    $$('[data-open-donate]').forEach(function (b) {
      b.addEventListener('click', function () { show('donateModal'); });
    });
    $$('[data-close-modal]').forEach(function (b) {
      b.addEventListener('click', hide);
    });
    $$('.modal').forEach(function (m) {
      m.addEventListener('click', function (e) { if (e.target === m) hide(); });
    });

    document.addEventListener('keydown', function (e) {
      if (!open) return;

      if (e.key === 'Escape') { hide(); return; }

      if (e.key !== 'Tab') return;
      var items = $$(FOCUSABLE, open).filter(function (el) { return el.offsetParent !== null; });
      if (!items.length) return;

      var first = items[0];
      var last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    window.addEventListener('pagehide', hide);
  })();


  /* =====================================================================
     STAT COUNTERS
     Text only, three elements, one shot. Skipped when motion is off.
     ===================================================================== */
  (function counters() {
    if (!fxOn()) return;
    var nodes = $$('.count');
    if (!nodes.length) return;

    function run(el) {
      var to = parseInt(el.getAttribute('data-to'), 10);
      if (isNaN(to) || to <= 1) return;
      var t0 = 0, dur = 700;
      function step(now) {
        if (!t0) t0 = now;
        var p = Math.min(1, (now - t0) / dur);
        el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    if (!hasIO) { nodes.forEach(run); return; }

    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        run(en.target);
        cio.unobserve(en.target);
      });
    }, { threshold: 0.6 });

    nodes.forEach(function (n) { cio.observe(n); });
  })();


  /* =====================================================================
     DEMO PORTAL LAUNCH
     ===================================================================== */
  (function portal() {
    var core = document.getElementById('artifact');
    if (!core) return;

    var button = $('.core', core);
    var rootEl = document.getElementById('omegaRoot');
    var status = document.getElementById('systemStatus');
    var label = document.getElementById('actionText');
    var flash = document.getElementById('horizonFlash');
    if (!button || !rootEl || !status || !label || !flash) return;

    var busy = false;

    function engage() {
      if (busy) return;
      busy = true;

      rootEl.classList.add('is-charging');
      status.textContent = 'CRITICAL FAILURE';
      label.textContent = 'ERROR';

      setTimeout(function () {
        rootEl.classList.add('is-breached');
        status.textContent = 'what have I done.';
        label.style.opacity = 0;
      }, 1500);

      setTimeout(function () {
        flash.style.transition = 'opacity .1s linear';
        flash.style.opacity = '1';
        setTimeout(function () { window.location.href = 'demo/index.html'; }, 800);
      }, 2800);
    }

    button.addEventListener('click', engage);
    button.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); engage(); }
    });
  })();


  /* =====================================================================
     BOOT
     ===================================================================== */
  if (watchdog.armed && !lite && !reduce) {
    watchdog.last = performance.now();
    requestAnimationFrame(watchdog.tick);
  }

})();