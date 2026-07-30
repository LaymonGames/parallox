/* ===== THROTTLED HERO PARALLAX ===== */
const hero = document.querySelector(".hero-img");
const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

if (hero && canHover) {
	let heroTicking = false;
	let heroX = 0;
	let heroY = 0;

	window.addEventListener("mousemove", e => {
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


function closeLightbox(){
  document.getElementById("lightbox").style.display = "none";
}

function showCharacter(el){
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

function playVoice(path){
  if(characterAudio) characterAudio.pause();
  characterAudio = new Audio(path);
  characterAudio.play();
}


/* ===== 3D CAROUSEL LOGIC ===== */
const cinemaCards = document.querySelectorAll('.cinema-card');
let cinemaIndex = 3;

function updateCinemaCarousel(){
  cinemaCards.forEach((card, index) => {
    card.className = 'cinema-card';
    const offset = index - cinemaIndex;

    if (offset === 0) card.classList.add('center');
    else if (offset === -1) card.classList.add('left-1');
    else if (offset === -2) card.classList.add('left-2');
    else if (offset === 1) card.classList.add('right-1');
    else if (offset === 2) card.classList.add('right-2');
    else {
      card.style.opacity = '0';
      card.style.transform = offset < 0 ? 'translateX(-1000px)' : 'translateX(1000px)';
    }

    if (Math.abs(offset) <= 2){
      card.style.opacity = '';
      card.style.transform = '';
    }
  });
}

function selectCinemaCard(index){
  cinemaIndex = index;
  updateCinemaCarousel();
}

updateCinemaCarousel();

document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' && cinemaIndex < cinemaCards.length - 1){
    cinemaIndex++;
    updateCinemaCarousel();
  } 
  else if (e.key === 'ArrowLeft' && cinemaIndex > 0){
    cinemaIndex--;
    updateCinemaCarousel();
  }
});


/* ===== THROTTLED 3D ARTIFACT TILT ===== */
    const artifact = document.getElementById('artifact');
    const omegaRoot = document.querySelector(".omega-root");

    if (artifact && canHover) {
	let artifactTicking = false;
	let tiltX = 0;
	let tiltY = 0;

	document.addEventListener('mousemove', (e) => {
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
        if(isLaunching) return;
        if(!omegaRoot) return;
        isLaunching = true;

        const actionText = document.getElementById('action-text');
        const statusText = document.getElementById('system-status');
        const flash = document.querySelector('.event-horizon-flash');
        if(!actionText || !statusText || !flash) return;


        omegaRoot.classList.add('charging');
        actionText.innerText = "ERROR";
        actionText.style.color = "#ff0055";
        statusText.innerHTML = "CRITICAL FAILURE";
        statusText.style.color = "red";


        setTimeout(() => {
            omegaRoot.classList.add('breach');
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


let startX = 0;
let isDragging = false;
const carousel = document.querySelector('.carousel-container');

if (carousel) {
	carousel.addEventListener('mousedown', e => {
		startX = e.clientX;
		isDragging = true;
	});

	carousel.addEventListener('mouseup', e => {
		if (!isDragging) return;
		const diff = e.clientX - startX;
		handleSwipe(diff);
		isDragging = false;
	});

	carousel.addEventListener('mouseleave', () => {
		isDragging = false;
	});

	carousel.addEventListener('touchstart', e => {
		startX = e.touches[0].clientX;
	}, { passive: true });

	carousel.addEventListener('touchend', e => {
		const diff = e.changedTouches[0].clientX - startX;
		handleSwipe(diff);
	}, { passive: true });
}

function handleSwipe(diff){
  const threshold = 50;

  if (diff > threshold && cinemaIndex > 0){
    cinemaIndex--;
    updateCinemaCarousel();
  } 
  else if (diff < -threshold && cinemaIndex < cinemaCards.length - 1){
    cinemaIndex++;
    updateCinemaCarousel();
  }
}



     /* ===== HUD FAQ TOGGLE ===== */
function toggleHudFAQ(el){
  const item = el.parentElement;
  item.classList.toggle("active");
}


document.addEventListener('DOMContentLoaded', () => {
    const mailCards = document.querySelectorAll('.lux-mail');

    mailCards.forEach(card => {
        card.addEventListener('click', (e) => {
            e.preventDefault();


            const email = card.getAttribute('data-email');
            

            navigator.clipboard.writeText(email).then(() => {


                const msg = card.querySelector('.copy-msg');
                msg.classList.add('visible');
                card.classList.add('copied'); 


                setTimeout(() => {
                    msg.classList.remove('visible');
                    card.classList.remove('copied');
                }, 2000);

            }).catch(err => {
                console.error('فشل النسخ: ', err);
            });
        });
    });
});

/* ===== TRAILER MODAL ===== */
function openTrailerModal() {
    const modal = document.getElementById('trailerModal');
    const iframe = modal.querySelector('iframe');
    
    // Optional: Re-assign the src to ensure it starts from the beginning
    const currentSrc = iframe.src;
    iframe.src = currentSrc; 

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeTrailerModal() {
    const modal = document.getElementById('trailerModal');
    const iframe = modal.querySelector('iframe');
    
    // This kills the video playback by resetting the source
    const currentSrc = iframe.src;
    iframe.src = ''; 
    iframe.src = currentSrc;

    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeTrailerModal();
    }
});

function openDonateModal(){
  document.getElementById("donateModal").classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeDonateModal(){
  document.getElementById("donateModal").classList.remove("active");
  document.body.style.overflow = "";
}

function copyDonateEmail(){
  const email = "gamesbylaymon@gmail.com";
  const msg = document.getElementById("donateCopied");

  navigator.clipboard.writeText(email).then(() => {
    msg.classList.add("show");

    setTimeout(() => {
      msg.classList.remove("show");
    }, 2000);
  });
}
