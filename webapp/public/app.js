(() => {
  const main = document.querySelector(".container");
  const hasDashboardLink = Boolean(document.querySelector('.site-nav a[href="/dashboard"]'));
  const currentPath = window.location.pathname;

  if (main && hasDashboardLink && currentPath !== "/" && currentPath !== "/dashboard") {
    const backLink = document.createElement("a");
    backLink.href = "/dashboard";
    backLink.className = "dashboard-back-link";
    backLink.textContent = "← Back to Dashboard";
    main.prepend(backLink);
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (reduceMotion.matches) {
    document.documentElement.classList.add("reduce-motion");
    return;
  }

  const animated = document.querySelectorAll(
    ".hero-copy, .hero-visual, .overview-card, .dashboard-card, .dashboard-section, .notification-item, .auth-card, .card table, .card form"
  );

  animated.forEach((element, index) => {
    if (element.classList.contains("hero-copy") || element.classList.contains("hero-visual")) {
      element.classList.add("is-visible");
      return;
    }

    element.classList.add("reveal");
    element.style.setProperty("--delay", `${Math.min(index * 35, 180)}ms`);
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: "0px 0px -8% 0px",
  });

  document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
})();
