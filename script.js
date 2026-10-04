/* =====================================================================
   PARALLOX — interaction script
   Everything here is deferred (script.js is loaded with `defer`) and every
   expensive effect is gated so it only runs while it is actually visible.
   ===================================================================== */

const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ===== VIEWPORT GATING =====
   Adds .in-view to a section only while it is on screen. style.css freezes
   every ambient animation on sections without .in-view, so the nebula, god
   rays, star dust and HUD glows stop compositing once you scroll past them. */
const gatedSections = [
  ".hero",
  ".cinema-section",
  ".section",
  ".hud-section",
  ".contact-luxury",
  ".omega-wrapper"
];

if ("IntersectionObserver" in window) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("in-view", entry.isIntersecting);
      });
    },
    { threshold: 0.08, rootMargin: "120px 0px" }
  );

  gatedSections.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => sectionObserver.observe(el));
  });
} else {
  // Very old browsers: just mark everything visible so nothing looks broken.
  gatedSections.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => el.classList.add("in-view"));
  });
}


/* ===== INTRO VIDEO: LOAD ONLY WHEN IT IS ON SCREEN =====
   The <video> has preload="none" and a poster, so the browser paints the
   poster instantly and never touches the MP4 until the section is visible. */
const introVideo = document.getElementById("introVideo");

if (introVideo && !reduceMotion) {
  if ("IntersectionObserver" in window) {
    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          introVideo.play();
        } else {
          introVideo.pause();
        }
      });
    }, { threshold: 0.25 });

    videoObserver.observe(introVideo);
  } else {
    introVideo.play();
  }
}


/* ===== MOBILE NAVIGATION ===== */
const navToggle = document.getElementById("navToggle");
const mainNav = document.getElementById("mainNav");

if (navToggle && mainNav) {
  navToggle.addEventListener("click", () => {
    const open = mainNav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  // Close the drawer after choosing a destination, giving the pressed
  // section name button a pop (keyframes `navPress` in style.css).
  mainNav.addEventListener("click", (e) => {
    const link = e.target.closest ? e.target.closest("a") : (e.target.tagName === "A" ? e.target : null);
    if (!link) return;
    link.classList.add("nav-press");
    mainNav.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  });

  // Strip the press class once the keyframes finish so it can replay.
  mainNav.addEventListener("animationend", (e) => {
    const link = e.target;
    if (link && link.classList && link.classList.contains("nav-press")) {
      link.classList.remove("nav-press");
    }
  }, true);
}


/* ===== THROTTLED HERO PARALLAX ===== */
const hero = document.querySelector(".hero-img");

if (hero && canHover && !reduceMotion) {
  let heroTicking = false;
  let heroX = 0;
  let heroY = 0;

  window.addEventListener("mousemove", (e) => {
    // Skip the work entirely while the hero is off screen.
    if (!hero.closest(".hero").classList.contains("in-view")) return;

    heroX = (window.innerWidth / 2 - e.clientX) / 30;
    heroY = (window.innerHeight / 2 - e.clientY) / 30;

    if (!heroTicking) {
      heroTicking = true;
      requestAnimationFrame(() => {
        hero.style.transform = `translate(${heroX}px, ${heroY}px)`;
        heroTicking = false;
      });
    }
  }, { passive: true });
}


function showCharacter(el) {
  const name = el.querySelector("h3").innerText;
  const text = el.querySelector(".desc").innerText;
  const voice = el.dataset.voice;

  const box = document.getElementById("character-info");
  document.getElementById("char-name").innerText = name;
  document.getElementById("char-text").innerText = text;
  box.style.display = "block";

  playVoice(voice);
}

let characterAudio = null;

function playVoice(path) {
  if (!path) return;
  if (characterAudio) characterAudio.pause();
  characterAudio = new Audio(path);
  characterAudio.play();
}


/* ===== 3D CAROUSEL ===== */
const cinemaCards = document.querySelectorAll(".cinema-card");
let cinemaIndex = 3;

function updateCinemaCarousel() {
  cinemaCards.forEach((card, index) => {
    card.className = "cinema-card";
    const offset = index - cinemaIndex;

    if (offset === 0) card.classList.add("center");
    else if (offset === -1) card.classList.add("left-1");
    else if (offset === -2) card.classList.add("left-2");
    else if (offset === 1) card.classList.add("right-1");
    else if (offset === 2) card.classList.add("right-2");
    else {
      card.style.opacity = "0";
      card.style.transform = offset < 0 ? "translateX(-1000px)" : "translateX(1000px)";
    }

    if (Math.abs(offset) <= 2) {
      card.style.opacity = "";
      card.style.transform = "";
    }
  });
}

function selectCinemaCard(index) {
  cinemaIndex = index;
  updateCinemaCarousel();
}

updateCinemaCarousel();

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight" && cinemaIndex < cinemaCards.length - 1) {
    cinemaIndex++;
    updateCinemaCarousel();
  } else if (e.key === "ArrowLeft" && cinemaIndex > 0) {
    cinemaIndex--;
    updateCinemaCarousel();
  }
});


/* ===== THROTTLED 3D ARTIFACT TILT ===== */
const artifact = document.getElementById("artifact");
const omegaRoot = document.querySelector(".omega-root");
const omegaWrapper = document.querySelector(".omega-wrapper");

if (artifact && canHover && !reduceMotion) {
  let artifactTicking = false;
  let tiltX = 0;
  let tiltY = 0;

  document.addEventListener("mousemove", (e) => {
    if (omegaWrapper && !omegaWrapper.classList.contains("in-view")) return;

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    tiltY = (e.clientX - centerX) / 25;
    tiltX = (centerY - e.clientY) / 25;

    if (!artifactTicking) {
      artifactTicking = true;
      requestAnimationFrame(() => {
        artifact.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
        artifactTicking = false;
      });
    }
  }, { passive: true });
}

let isLaunching = false;

function engateSingularity() {
  if (isLaunching) return;
  if (!omegaRoot) return;
  isLaunching = true;

  const actionText = document.getElementById("action-text");
  const statusText = document.getElementById("system-status");
  const flash = document.querySelector(".event-horizon-flash");
  if (!actionText || !statusText || !flash) return;

  omegaRoot.classList.add("charging");
  actionText.innerText = "ERROR";
  actionText.style.color = "#ff0055";
  statusText.innerHTML = "CRITICAL FAILURE";
  statusText.style.color = "red";

  setTimeout(() => {
    omegaRoot.classList.add("breach");
    statusText.innerText = "what have I done.";
    actionText.style.opacity = 0;
  }, 1500);

  setTimeout(() => {
    flash.style.opacity = 1;

    setTimeout(() => {
      window.location.href = "demo/index.html";
    }, 800);
  }, 2800);
}


/* ===== CAROUSEL SWIPE / DRAG ===== */
let startX = 0;
let isDragging = false;
const carousel = document.querySelector(".carousel-container");

if (carousel) {
  carousel.addEventListener("mousedown", (e) => {
    startX = e.clientX;
    isDragging = true;
  });

  carousel.addEventListener("mouseup", (e) => {
    if (!isDragging) return;
    handleSwipe(e.clientX - startX);
    isDragging = false;
  });

  carousel.addEventListener("mouseleave", () => {
    isDragging = false;
  });

  carousel.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
  }, { passive: true });

  carousel.addEventListener("touchend", (e) => {
    handleSwipe(e.changedTouches[0].clientX - startX);
  }, { passive: true });
}

function handleSwipe(diff) {
  const threshold = 50;

  if (diff > threshold && cinemaIndex > 0) {
    cinemaIndex--;
    updateCinemaCarousel();
  } else if (diff < -threshold && cinemaIndex < cinemaCards.length - 1) {
    cinemaIndex++;
    updateCinemaCarousel();
  }
}


/* ===== HUD FAQ TOGGLE ===== */
function toggleHudFAQ(el) {
  const item = el.parentElement;
  item.classList.toggle("active");
}


/* ===== COPY-EMAIL BUTTONS ===== */
document.querySelectorAll(".lux-mail").forEach((card) => {
  card.addEventListener("click", (e) => {
    e.preventDefault();

    const email = card.getAttribute("data-email");

    if (!navigator.clipboard) {
      // Fallback for browsers without the async clipboard API.
      const tmp = document.createElement("textarea");
      tmp.value = email;
      tmp.style.position = "fixed";
      tmp.style.opacity = "0";
      document.body.appendChild(tmp);
      tmp.select();
      try { document.execCommand("copy"); } catch (err) { /* ignore */ }
      document.body.removeChild(tmp);
    } else {
      navigator.clipboard.writeText(email).catch((err) => {
        console.error("copy failed:", err);
      });
    }

    const msg = card.querySelector(".copy-msg");
    if (!msg) return;
    msg.classList.add("visible");
    card.classList.add("copied");

    setTimeout(() => {
      msg.classList.remove("visible");
      card.classList.remove("copied");
    }, 2000);
  });
});


/* ===== TRAILER MODAL =====
   The iframe ships with no src, so YouTube is never downloaded until someone
   actually opens the trailer. */
const TRAILER_URL = "https://www.youtube.com/embed/yNYdhM1FAas?autoplay=1&rel=0";

function openTrailerModal() {
  const modal = document.getElementById("trailerModal");
  if (!modal) return;

  const iframe = modal.querySelector("iframe");
  if (iframe) iframe.src = TRAILER_URL;

  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeTrailerModal() {
  const modal = document.getElementById("trailerModal");
  if (!modal) return;

  const iframe = modal.querySelector("iframe");
  if (iframe) iframe.src = "";

  modal.classList.remove("active");
  document.body.style.overflow = "";
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeTrailerModal();
    closeDonateModal();
  }
});


/* ===== DONATE MODAL ===== */
function openDonateModal() {
  document.getElementById("donateModal").classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeDonateModal() {
  document.getElementById("donateModal").classList.remove("active");
  document.body.style.overflow = "";
}
