/* ==========================================
ELSATI PREMIUM SCRIPT.JS
========================================== */

/* ------------------------------------------
Reveal Animations
------------------------------------------ */

const revealElements = document.querySelectorAll(".reveal");

const revealObserver = new IntersectionObserver(
(entries) => {

entries.forEach((entry) => {

if(entry.isIntersecting){

entry.target.classList.add("is-visible");

revealObserver.unobserve(entry.target);

}

});

},
{
threshold:0.12
}
);

revealElements.forEach((el)=>{
revealObserver.observe(el);
});

/* ------------------------------------------
Counter Animation
------------------------------------------ */

const metrics = document.querySelectorAll(".metric");

const metricObserver = new IntersectionObserver(
(entries)=>{

entries.forEach((entry)=>{

if(!entry.isIntersecting) return;

const element = entry.target;

const target =
Number(
element.dataset.target || 0
);

const duration = 1800;

const startTime = performance.now();

function animate(now){

const progress =
Math.min(
(now - startTime) / duration,
1
);

const eased =
1 - Math.pow(
1 - progress,
3
);

element.textContent =
Math.floor(
target * eased
);

if(progress < 1){

requestAnimationFrame(
animate
);

}else{

element.textContent =
target.toLocaleString();

}

}

requestAnimationFrame(
animate
);

metricObserver.unobserve(
element
);

});

},
{
threshold:0.45
}
);

metrics.forEach((metric)=>{
metricObserver.observe(metric);
});

/* ------------------------------------------
Cursor Glow
------------------------------------------ */

const cursorGlow =
document.querySelector(
".cursor-glow"
);

document.addEventListener(
"mousemove",
(e)=>{

if(!cursorGlow) return;

cursorGlow.style.left =
e.clientX + "px";

cursorGlow.style.top =
e.clientY + "px";

}
);

/* ------------------------------------------
Sticky Header Behaviour
------------------------------------------ */

const topbar =
document.querySelector(
".topbar"
);

let previousScroll =
window.scrollY;

window.addEventListener(
"scroll",
()=>{

const current =
window.scrollY;

if(current > 150){

topbar.style.background =
"rgba(5,8,22,.88)";

topbar.style.backdropFilter =
"blur(22px)";

}else{

topbar.style.background =
"rgba(5,8,22,.75)";

}

if(current > previousScroll &&
current > 250){

topbar.style.transform =
"translateY(-100%)";

}else{

topbar.style.transform =
"translateY(0)";
}

previousScroll =
current;

}
);

/* ------------------------------------------
Hero Dashboard Floating Motion
------------------------------------------ */

const dashboard =
document.querySelector(
".hero-dashboard"
);

window.addEventListener(
"mousemove",
(e)=>{

if(!dashboard) return;

const x =
(window.innerWidth / 2

* e.clientX) / 35;

const y =
(window.innerHeight / 2

* e.clientY) / 35;

dashboard.style.transform =
`translateY(-6px)
rotateY(${x}deg)
rotateX(${-y}deg)`;

}
);

window.addEventListener(
"mouseleave",
()=>{

if(!dashboard) return;

dashboard.style.transform =
"translateY(0)";
}
);

/* ------------------------------------------
Hero Parallax
------------------------------------------ */

const heroGrid =
document.querySelector(
".hero-grid"
);

window.addEventListener(
"scroll",
()=>{

const scroll =
window.scrollY;

if(heroGrid){

heroGrid.style.transform =
`translateY(${scroll * .15}px)`;
}

}
);

/* ------------------------------------------
Trust Bar Auto Highlight
------------------------------------------ */

const trustItems =
document.querySelectorAll(
".trust-items span"
);

let trustIndex = 0;

if(trustItems.length){

setInterval(()=>{

trustItems.forEach((item)=>{

item.style.opacity = ".55";

item.style.transform =
"translateY(0)";
});

trustItems[trustIndex].style.opacity =
"1";

trustItems[trustIndex].style.transform =
"translateY(-3px)";

trustIndex++;

if(
trustIndex >=
trustItems.length
){
trustIndex = 0;
}

},2000);

}

/* ------------------------------------------
Intelligence Cards Hover Glow
------------------------------------------ */

const cards =
document.querySelectorAll(
".intel-card"
);

cards.forEach((card)=>{

card.addEventListener(
"mousemove",
(e)=>{

const rect =
card.getBoundingClientRect();

const x =
e.clientX - rect.left;

const y =
e.clientY - rect.top;

card.style.background =
`radial-gradient(
circle at ${x}px ${y}px,
rgba(37,99,235,.16),
rgba(255,255,255,.04)
)`;

}
);

card.addEventListener(
"mouseleave",
()=>{

card.style.background =
"rgba(255,255,255,.04)";

}
);

});

/* ------------------------------------------
Verification Pulse
------------------------------------------ */

const verifyCards =
document.querySelectorAll(
".verify-card"
);

setInterval(()=>{

verifyCards.forEach((card)=>{

card.classList.remove(
"pulse-card"
);

});

const randomCard =
verifyCards[
Math.floor(
Math.random()

* verifyCards.length
  )
  ];

if(randomCard){

randomCard.classList.add(
"pulse-card"
);

}

},2500);

/* ------------------------------------------
Floating Dashboard Feed
------------------------------------------ */

const feedItems =
document.querySelectorAll(
".feed-item"
);

let feedIndex = 0;

if(feedItems.length){

setInterval(()=>{

feedItems.forEach((item)=>{

item.style.opacity = ".45";

item.style.transform =
"translateX(0)";
});

feedItems[feedIndex].style.opacity =
"1";

feedItems[feedIndex].style.transform =
"translateX(10px)";

feedIndex++;

if(
feedIndex >=
feedItems.length
){
feedIndex = 0;
}

},1800);

}

/* ------------------------------------------
Pricing Card Hover
------------------------------------------ */

const pricingCards =
document.querySelectorAll(
".pricing-card"
);

pricingCards.forEach((card)=>{

card.addEventListener(
"mouseenter",
()=>{

card.style.transform =
"translateY(-10px)";

});

card.addEventListener(
"mouseleave",
()=>{

card.style.transform =
"translateY(0)";
});

});

/* ------------------------------------------
Scroll Progress Indicator
------------------------------------------ */

const progressBar =
document.createElement("div");

progressBar.style.position =
"fixed";

progressBar.style.top = "0";
progressBar.style.left = "0";

progressBar.style.height =
"3px";

progressBar.style.zIndex =
"99999";

progressBar.style.background =
"linear-gradient(90deg,#2563eb,#38bdf8)";

document.body.appendChild(
progressBar
);

window.addEventListener(
"scroll",
()=>{

const winScroll =
document.documentElement.scrollTop;

const height =
document.documentElement.scrollHeight -
document.documentElement.clientHeight;

const scrolled =
(winScroll / height) * 100;

progressBar.style.width =
scrolled + "%";

}
);

/* ------------------------------------------
Initial Fade In
------------------------------------------ */

window.addEventListener(
"load",
()=>{

document.body.style.opacity =
"1";

}
);
