const observer = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.18 }
);

document.querySelectorAll(".reveal").forEach(node => observer.observe(node));

const metrics = document.querySelectorAll(".metric");
const numberObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) {
        return;
      }

      const element = entry.target;
      const target = Number(element.dataset.target || 0);
      const duration = 1200;
      const startTime = performance.now();

      const tick = now => {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        element.textContent = Math.round(target * eased);

        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          element.textContent = `${target}${target === 96 ? "%" : "+"}`;
        }
      };

      requestAnimationFrame(tick);
      numberObserver.unobserve(element);
    });
  },
  { threshold: 0.5 }
);

metrics.forEach(metric => numberObserver.observe(metric));
