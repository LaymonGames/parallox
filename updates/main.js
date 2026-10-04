import { supabase } from "./supabase.js";

const gallery = document.getElementById("gallery");
const loader = document.getElementById("loader");
const parallaxBg = document.querySelector(".parallax-bg");
const lightbox = document.getElementById("lightbox");
const lbImg = document.getElementById("lb-img");
const lbDesc = document.getElementById("lb-desc");
const closeLb = document.querySelector(".close-lb");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/* Throttled parallax: the original handler wrote a style on every single
   mousemove event, which forces layout/paint dozens of times per second. */
if (parallaxBg && canHover && !reduceMotion) {
  let ticking = false;
  let px = 0;
  let py = 0;

  window.addEventListener("mousemove", (e) => {
    px = (window.innerWidth / 2 - e.clientX) / 50;
    py = (window.innerHeight / 2 - e.clientY) / 50;

    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => {
        parallaxBg.style.transform = `translate(${px}px, ${py}px) scale(1.1)`;
        ticking = false;
      });
    }
  }, { passive: true });
}

async function loadGallery() {
  try {
    const { data, error } = await supabase
      .from("images")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    gallery.innerHTML = "";

    /* The old code hid the loader after an arbitrary 800ms timeout, which
       added a blank screen even when the data was already available. */
    if (loader) {
      loader.style.opacity = "0";
      setTimeout(() => loader.remove(), 400);
    }

    if (data.length === 0) {
      gallery.innerHTML = "<p style='text-align:center; width:100%;'>No news to show right now.</p>";
      return;
    }

    data.forEach((img, index) => {
      const card = document.createElement("div");
      card.className = "card";

      if (!reduceMotion) {
        card.style.animationDelay = `${index * 0.1}s`;
      } else {
        card.style.opacity = "1";
        card.style.transform = "none";
        card.style.animation = "none";
      }

      card.innerHTML = `
        <img src="${img.url}" loading="lazy" alt="Parallox update image">
        <div class="card-overlay">
          <div class="card-desc">${img.description || " "}</div>
        </div>
      `;

      card.addEventListener("click", () => openLightbox(img.url, img.description));
      gallery.appendChild(card);
    });
  } catch (err) {
    console.error("Error loading images:", err);
    if (loader) loader.style.display = "none";
    gallery.innerHTML = "<p>There was an error loading the news.</p>";
  }
}

function openLightbox(url, desc) {
  lbImg.src = url;
  lbDesc.textContent = desc || "";
  lightbox.classList.add("active");
}

if (lightbox) {
  lightbox.addEventListener("click", (e) => {
    if (e.target !== lbImg && e.target !== lbDesc) {
      lightbox.classList.remove("active");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") lightbox.classList.remove("active");
  });
}

if (closeLb) {
  closeLb.addEventListener("click", () => lightbox.classList.remove("active"));
}

loadGallery();
