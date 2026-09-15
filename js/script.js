// ============================================
// DIGI ERA PRO — Interactions
// ============================================

document.addEventListener('DOMContentLoaded', function () {

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Theme Toggle (light/dark, persisted via localStorage) ----------
     The <html> element's data-theme attribute is already set as early as possible by an
     inline script in <head> (before this file even loads) to avoid a flash of the wrong
     theme. This handler only needs to flip it on click and persist the choice. */
  var themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var root = document.documentElement;
      var isDark = root.getAttribute('data-theme') === 'dark';
      var next = isDark ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('digierapro-theme', next); } catch (e) { /* storage unavailable — theme still applies for this page view */ }
    });
  }

  /* ---------- Seamless marquee distance (exact px, no half-gap jump at loop point) ----------
     The CSS animation always runs (never paused-by-default — that risks getting stuck if
     this script errors out, leaving a half-empty static strip). Once we know the exact pixel
     distance, we restart the animation cleanly (animation:none -> reflow -> animation:'') so
     it picks up the correct --marquee-distance from frame zero instead of jumping mid-cycle.
     We also clone extra copies of the item set on demand so the rendered content always spans
     at least (viewport width + one set width) — otherwise, on wide screens, the strip runs out
     of items before the loop resets and the tail of the track shows blank space. */
  (function () {
    function restart(el) {
      el.style.animation = 'none';
      void el.offsetWidth; // force reflow so the browser actually drops the animation state
      el.style.animation = '';
    }

    function applyDistance(track, itemSelector, viewportEl) {
      if (!track) return false;

      // The true "one set" count is only ever computed ONCE (the HTML always ships with
      // exactly 2 sets back-to-back) and then cached on the element. Re-deriving it from
      // the current item count on later calls would be wrong once extra clones exist,
      // since items.length is no longer 2x the true original — that previously doubled
      // the loop distance on the second pass (fonts.ready) and reintroduced the gap.
      var originalCount = parseInt(track.getAttribute('data-marquee-original'), 10);
      if (!originalCount) {
        var initialItems = track.querySelectorAll(itemSelector);
        if (initialItems.length < 2) return false;
        originalCount = Math.floor(initialItems.length / 2);
        if (originalCount < 1) return false;
        track.setAttribute('data-marquee-original', originalCount);
      }

      var items = track.querySelectorAll(itemSelector);
      if (items.length <= originalCount) return false;
      var oneSetWidth = items[originalCount].offsetLeft - items[0].offsetLeft;
      if (oneSetWidth <= 0) return false;

      var viewportWidth = (viewportEl || track.parentElement).offsetWidth;
      var needed = viewportWidth + oneSetWidth + 80;
      var guard = 0;
      while (track.scrollWidth < needed && guard < 12) {
        var current = track.querySelectorAll(itemSelector);
        for (var i = 0; i < originalCount; i++) {
          var clone = current[i].cloneNode(true);
          clone.setAttribute('aria-hidden', 'true');
          track.appendChild(clone);
        }
        guard++;
      }

      track.style.setProperty('--marquee-distance', oneSetWidth + 'px');
      return true;
    }

    function setAllMarquees(doRestart) {
      var trustLogos = document.querySelector('.trust-strip__logos');
      if (trustLogos) {
        var trustViewport = document.querySelector('.trust-strip__marquee');
        if (applyDistance(trustLogos, 'span', trustViewport) && doRestart) restart(trustLogos);
      }
      document.querySelectorAll('.testimonials__track').forEach(function (track) {
        var viewport = track.closest('.testimonials__viewport');
        if (applyDistance(track, '.testimonial-card', viewport) && doRestart) restart(track);
      });
    }

    setAllMarquees(true);
    window.addEventListener('resize', function () { setAllMarquees(false); });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { setAllMarquees(true); });
    }
  })();

  /* ---------- Hero Slider height (exact match to real header height, no gap) ---------- */
  (function () {
    var heroSlider = document.getElementById('heroSlider');
    var topbar = document.querySelector('.topbar');
    var header = document.querySelector('.header');
    if (!heroSlider || !topbar || !header) return;

    function setHeroSliderHeight() {
      if (window.matchMedia('(max-width: 960px)').matches) {
        heroSlider.style.height = '';
        return;
      }
      var offset = topbar.offsetHeight + header.offsetHeight;
      heroSlider.style.height = 'calc(100vh - ' + offset + 'px)';
    }

    setHeroSliderHeight();
    window.addEventListener('resize', setHeroSliderHeight);
  })();

  /* ---------- Mobile Nav Toggle ---------- */
  var navToggle = document.getElementById('navToggle');
  var nav = document.getElementById('nav');
  var navOverlay = document.getElementById('navOverlay');

  function closeNav() {
    nav.classList.remove('is-open');
    navToggle.classList.remove('is-active');
    if (navOverlay) navOverlay.classList.remove('is-open');
  }

  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      var opening = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open', opening);
      navToggle.classList.toggle('is-active', opening);
      if (navOverlay) navOverlay.classList.toggle('is-open', opening);
    });

    if (navOverlay) {
      navOverlay.addEventListener('click', closeNav);
    }

    // Toggle dropdown on mobile tap
    document.querySelectorAll('.has-dropdown > a').forEach(function (link) {
      link.addEventListener('click', function (e) {
        if (window.innerWidth <= 960) {
          e.preventDefault();
          link.parentElement.classList.toggle('is-open');
        }
      });
    });

    // Close nav when a normal link is clicked (mobile)
    document.querySelectorAll('.nav__list a:not(.has-dropdown > a)').forEach(function (link) {
      link.addEventListener('click', closeNav);
    });
  }

  /* ---------- FAQ Accordion ---------- */
  var accordionItems = document.querySelectorAll('.accordion__item');
  accordionItems.forEach(function (item) {
    var trigger = item.querySelector('.accordion__trigger');
    trigger.addEventListener('click', function () {
      var wasOpen = item.classList.contains('is-open');
      accordionItems.forEach(function (i) { i.classList.remove('is-open'); });
      if (!wasOpen) item.classList.add('is-open');
    });
  });

  /* ---------- Why Choose Us — tab switcher (with gentle auto-rotate) ---------- */
  var whyUsPanel = document.getElementById('whyUsPanel');
  if (whyUsPanel) {
    var whyUsTabs = whyUsPanel.querySelectorAll('.why-us__tab');
    var whyUsItems = whyUsPanel.querySelectorAll('.why-us__panel-item');
    var whyUsTimer = null;

    function setWhyUsTab(index) {
      whyUsTabs.forEach(function (tab) { tab.classList.toggle('is-active', tab.getAttribute('data-tab') === String(index)); });
      whyUsItems.forEach(function (item) { item.classList.toggle('is-active', item.getAttribute('data-panel') === String(index)); });
    }

    function startWhyUsAutoRotate() {
      if (prefersReducedMotion) return;
      clearInterval(whyUsTimer);
      whyUsTimer = setInterval(function () {
        var current = whyUsPanel.querySelector('.why-us__tab.is-active');
        var next = (parseInt(current.getAttribute('data-tab'), 10) + 1) % whyUsTabs.length;
        setWhyUsTab(next);
      }, 4500);
    }

    whyUsTabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        setWhyUsTab(tab.getAttribute('data-tab'));
        startWhyUsAutoRotate();
      });
    });

    startWhyUsAutoRotate();
  }

  /* ---------- Animated Counters ---------- */
  var counters = document.querySelectorAll('.stat-box__num');
  var hasAnimated = false;

  function animateCounters() {
    if (hasAnimated) return;
    hasAnimated = true;
    counters.forEach(function (counter) {
      var target = parseInt(counter.getAttribute('data-count'), 10);
      var statBox = counter.closest('.stat-box');
      if (statBox) {
        statBox.classList.add('pop');
        statBox.addEventListener('animationend', function () {
          statBox.classList.remove('pop');
        }, { once: true });
      }
      var current = 0;
      var increment = Math.max(target / 60, 1);
      var timer = setInterval(function () {
        current += increment;
        if (current >= target) {
          counter.textContent = target;
          clearInterval(timer);
        } else {
          counter.textContent = Math.floor(current);
        }
      }, 25);
    });
  }

  var statsSection = document.querySelector('.love-it__visual, .love-it__stats');
  if (statsSection && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounters();
          observer.disconnect();
        }
      });
    }, { threshold: 0.3 });
    observer.observe(statsSection);
  } else if (statsSection) {
    animateCounters();
  }

  /* ---------- Stat Banner Counters (independent trigger) ---------- */
  var statBanner = document.querySelector('.stat-banner');
  if (statBanner) {
    var statBannerCounters = statBanner.querySelectorAll('.stat-banner__num');
    var statBannerAnimated = false;
    var animateStatBanner = function () {
      if (statBannerAnimated) return;
      statBannerAnimated = true;
      statBannerCounters.forEach(function (counter) {
        var target = parseInt(counter.getAttribute('data-count'), 10);
        var current = 0;
        var increment = Math.max(target / 60, 1);
        var timer = setInterval(function () {
          current += increment;
          if (current >= target) {
            counter.textContent = target;
            clearInterval(timer);
          } else {
            counter.textContent = Math.floor(current);
          }
        }, 25);
      });
    };
    if ('IntersectionObserver' in window) {
      var statBannerObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateStatBanner();
            statBannerObserver.disconnect();
          }
        });
      }, { threshold: 0.3 });
      statBannerObserver.observe(statBanner);
    } else {
      animateStatBanner();
    }
  }

  /* ---------- FAQ Skill Rings (animated fill + count-up on scroll into view) ---------- */
  var faqSkills = document.querySelector('.faq__skills');
  if (faqSkills) {
    var fillSkillRings = function () {
      faqSkills.querySelectorAll('.faq__skill-ring-fill').forEach(function (ring) {
        var pct = parseFloat(ring.getAttribute('data-percent')) || 0;
        var circumference = 2 * Math.PI * parseFloat(ring.getAttribute('r'));
        ring.style.strokeDasharray = circumference;
        ring.style.strokeDashoffset = circumference * (1 - pct / 100);
      });
      faqSkills.querySelectorAll('.faq__skill-num').forEach(function (numEl) {
        var target = parseInt(numEl.getAttribute('data-count'), 10);
        var current = 0;
        var increment = Math.max(target / 50, 1);
        var timer = setInterval(function () {
          current += increment;
          if (current >= target) {
            numEl.textContent = target;
            clearInterval(timer);
          } else {
            numEl.textContent = Math.floor(current);
          }
        }, 25);
      });
    };
    if ('IntersectionObserver' in window) {
      var faqSkillsObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            fillSkillRings();
            faqSkillsObserver.disconnect();
          }
        });
      }, { threshold: 0.3 });
      faqSkillsObserver.observe(faqSkills);
    } else {
      fillSkillRings();
    }
  }

  /* ---------- Contact Form (demo submit) ---------- */
  var contactForm = document.getElementById('contactForm');
  var formNote = document.getElementById('formNote');
  if (contactForm && formNote) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      formNote.hidden = false;
      contactForm.reset();
    });
  }

  /* ---------- Hero Slider (scroll-driven presentation, desktop only) ---------- */
  var heroSlider = document.getElementById('heroSlider');
  if (heroSlider) {
    var slidesArr = Array.prototype.slice.call(heroSlider.querySelectorAll('.hero-slide'));
    var dotsArr = Array.prototype.slice.call(heroSlider.querySelectorAll('.hero-dot'));
    var counterCurrent = heroSlider.querySelector('.hero-slider__counter-current');
    var counterBarFill = heroSlider.querySelector('.hero-slider__counter-bar i');
    var totalSlides = slidesArr.length;
    var currentSlide = 0;
    var isAnimating = false;

    function pad2(n) { return n < 10 ? '0' + n : String(n); }

    function updateHeroChrome(index) {
      dotsArr.forEach(function (d, i) { d.classList.toggle('is-active', i === index); });
      if (counterCurrent) counterCurrent.textContent = pad2(index + 1);
      if (counterBarFill) counterBarFill.style.setProperty('--w', Math.round((index + 1) / totalSlides * 100) + '%');
    }

    function animateSlideStats(slideEl) {
      var statEls = slideEl.querySelectorAll('[data-count]');
      statEls.forEach(function (el) {
        var target = parseInt(el.getAttribute('data-count'), 10);
        var current = 0;
        var increment = Math.max(target / 40, 1);
        var timer = setInterval(function () {
          current += increment;
          if (current >= target) {
            el.textContent = target;
            clearInterval(timer);
          } else {
            el.textContent = Math.floor(current);
          }
        }, 25);
      });
    }

    function goToHeroSlide(index) {
      if (isAnimating || index === currentSlide || index < 0 || index >= totalSlides) return;
      isAnimating = true;
      slidesArr[currentSlide].classList.remove('is-active');
      currentSlide = index;
      var activeSlide = slidesArr[currentSlide];
      activeSlide.classList.add('is-active');
      updateHeroChrome(currentSlide);
      if (!prefersReducedMotion) animateSlideStats(activeSlide);
      setTimeout(function () { isAnimating = false; }, 750);
    }

    dotsArr.forEach(function (dot, i) {
      dot.addEventListener('click', function () { goToHeroSlide(i); });
    });

    var heroHijackEnabled = !prefersReducedMotion && window.matchMedia('(min-width: 961px)').matches;

    if (heroHijackEnabled) {
      window.addEventListener('wheel', function (e) {
        if (window.scrollY >= 2) return; // hero no longer engaged, let normal page scroll happen
        if (e.deltaY > 0 && currentSlide < totalSlides - 1) {
          e.preventDefault();
          goToHeroSlide(currentSlide + 1);
        } else if (e.deltaY < 0 && currentSlide > 0) {
          e.preventDefault();
          goToHeroSlide(currentSlide - 1);
        }
        // last slide + scrolling down (or first slide + scrolling up): fall through, let the page scroll normally
      }, { passive: false });

      window.addEventListener('keydown', function (e) {
        if (window.scrollY >= 2) return;
        if (e.key === 'ArrowDown' && currentSlide < totalSlides - 1) { e.preventDefault(); goToHeroSlide(currentSlide + 1); }
        if (e.key === 'ArrowUp' && currentSlide > 0) { e.preventDefault(); goToHeroSlide(currentSlide - 1); }
      });
    } else {
      // Mobile or reduced-motion: slides are stacked statically via CSS (not cycled), so
      // fire every slide's counters once up front instead of waiting for a slide-change event
      slidesArr.forEach(function (slide) { animateSlideStats(slide); });
    }
  }

  /* ---------- Scroll Reveal (auto-applied site-wide, no HTML edits needed) ---------- */
  if (!prefersReducedMotion && 'IntersectionObserver' in window) {
    var revealSelectors = [
      '.service-card', '.mvp-card', '.benefit-item', '.solution-item',
      '.pricing-card', '.team-card', '.feature-row', '.stat-box', '.stat-card',
      '.testimonial-card', '.portfolio-card', '.process-step', '.location-card',
      '.contact-info-card', '.service-mini-card', '.blog-card', '.client-chip',
      '.section__head', '.features__intro', '.stat-banner__item', '.success__point',
      '.success__content'
    ].join(', ');
    var revealEls = document.querySelectorAll(revealSelectors);
    var siblingCount = new Map();

    revealEls.forEach(function (el) {
      var parent = el.parentElement;
      var idx = siblingCount.get(parent) || 0;
      siblingCount.set(parent, idx + 1);
      el.style.setProperty('--reveal-delay', (Math.min(idx, 5) * 80) + 'ms');
      el.classList.add('reveal');
    });

    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ---------- Header shadow on scroll ---------- */
  var header = document.getElementById('header');
  if (header) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 10) {
        header.style.boxShadow = '0 8px 24px rgba(41,44,49,0.10)';
      } else {
        header.style.boxShadow = '';
      }
    });
  }

  /* ---------- Back to Top (injected, no HTML edits needed on any page) ---------- */
  var backToTop = document.createElement('button');
  backToTop.className = 'back-to-top';
  backToTop.setAttribute('aria-label', 'Back to top');
  backToTop.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
  document.body.appendChild(backToTop);

  window.addEventListener('scroll', function () {
    backToTop.classList.toggle('is-visible', window.scrollY > 600);
  });
  backToTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  });

});
