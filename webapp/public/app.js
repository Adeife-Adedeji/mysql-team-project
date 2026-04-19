(() => {
  const main = document.querySelector(".container");
  const hasDashboardLink = Boolean(document.querySelector('.site-nav a[href="/dashboard"]'));
  const currentPath = window.location.pathname;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (main && hasDashboardLink && currentPath !== "/" && currentPath !== "/dashboard" && !document.querySelector(".portal-banner") && !main.querySelector(".supervisor-shell")) {
    const existingBackLink = document.querySelector(".dashboard-back-link");
    if (!existingBackLink) {
      const backLink = document.createElement("a");
      backLink.href = "/dashboard";
      backLink.className = "dashboard-back-link";
      backLink.textContent = "Return to Overview";
      main.prepend(backLink);
    }
  }

  const initTabs = () => {
    const tabBars = document.querySelectorAll(".tab-bar[data-tab-group]");

    tabBars.forEach((tabBar) => {
      const group = tabBar.getAttribute("data-tab-group");
      const buttons = Array.from(tabBar.querySelectorAll("[data-tab-target]"));
      const panels = Array.from(document.querySelectorAll(`.tab-panel[data-tab-group="${group}"]`));

      if (!buttons.length || !panels.length) {
        return;
      }

      tabBar.setAttribute("role", "tablist");
      const storageKey = `tabs:${window.location.pathname}:${group}`;
      const params = new URLSearchParams(window.location.search);
      const requestedTab = params.get("view");
      const defaultTab = buttons[0].getAttribute("data-tab-target");
      const initialTab = buttons.some((button) => button.getAttribute("data-tab-target") === requestedTab)
        ? requestedTab
        : window.localStorage.getItem(storageKey) || defaultTab;

      const setActiveTab = (tabId, updateUrl = true, animate = true) => {
        buttons.forEach((button) => {
          const isActive = button.getAttribute("data-tab-target") === tabId;
          const controlsId = `${group}-${button.getAttribute("data-tab-target")}`;
          button.classList.toggle("is-active", isActive);
          button.setAttribute("aria-selected", isActive ? "true" : "false");
          button.setAttribute("tabindex", isActive ? "0" : "-1");
          button.setAttribute("aria-controls", controlsId);
        });

        panels.forEach((panel) => {
          const panelId = `${group}-${panel.getAttribute("data-tab-panel")}`;
          const isActive = panel.getAttribute("data-tab-panel") === tabId;
          panel.id = panelId;
          panel.hidden = !isActive;
          panel.setAttribute("role", "tabpanel");
          panel.setAttribute("tabindex", "0");

          if (!isActive) {
            panel.classList.remove("is-visible");
            return;
          }

          if (!animate || reduceMotion.matches) {
            panel.classList.add("is-visible");
            return;
          }

          panel.classList.remove("is-visible");
          void panel.offsetWidth;
          requestAnimationFrame(() => panel.classList.add("is-visible"));
        });

        window.localStorage.setItem(storageKey, tabId);

        if (updateUrl) {
          const nextUrl = new URL(window.location.href);
          nextUrl.searchParams.set("view", tabId);
          window.history.replaceState({}, "", nextUrl);
        }
      };

      buttons.forEach((button, index) => {
        button.setAttribute("role", "tab");
        button.id = `${group}-tab-${index}`;
        button.addEventListener("click", () => setActiveTab(button.getAttribute("data-tab-target")));
        button.addEventListener("keydown", (event) => {
          const currentIndex = buttons.indexOf(button);
          if (event.key === "ArrowRight") {
            event.preventDefault();
            buttons[(currentIndex + 1) % buttons.length].focus();
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            buttons[(currentIndex - 1 + buttons.length) % buttons.length].focus();
          } else if (event.key === "Home") {
            event.preventDefault();
            buttons[0].focus();
          } else if (event.key === "End") {
            event.preventDefault();
            buttons[buttons.length - 1].focus();
          }
        });
      });

      panels.forEach((panel) => {
        panel.querySelectorAll('form[method="get"], form:not([method])').forEach((form) => {
          form.addEventListener("submit", () => {
            let hiddenInput = form.querySelector('input[name="view"]');
            if (!hiddenInput) {
              hiddenInput = document.createElement("input");
              hiddenInput.type = "hidden";
              hiddenInput.name = "view";
              form.append(hiddenInput);
            }

            const activeButton = tabBar.querySelector(".tab-button.is-active");
            hiddenInput.value = activeButton?.getAttribute("data-tab-target") || defaultTab;
          });
        });
      });

      setActiveTab(initialTab, false, false);
    });
  };

  const initCarousel = () => {
    const carousels = document.querySelectorAll("[data-carousel]");

    carousels.forEach((carousel) => {
      const slides = Array.from(carousel.querySelectorAll("[data-carousel-slide]"));
      const track = carousel.querySelector(".carousel__track");
      const status = carousel.querySelector("[data-carousel-status]");
      const prev = carousel.querySelector("[data-carousel-prev]");
      const next = carousel.querySelector("[data-carousel-next]");
      let activeIndex = slides.findIndex((slide) => slide.classList.contains("is-active"));

      if (!slides.length) {
        return;
      }

      if (activeIndex < 0) {
        activeIndex = 0;
      }

      const setActiveSlide = (nextIndex) => {
        activeIndex = (nextIndex + slides.length) % slides.length;

        slides.forEach((slide, index) => {
          const isActive = index === activeIndex;
          slide.classList.toggle("is-active", isActive);
          slide.setAttribute("aria-hidden", isActive ? "false" : "true");
        });

        if (track) {
          track.style.transform = `translateX(-${activeIndex * 100}%)`;
        }

        if (status) {
          status.textContent = `${activeIndex + 1} of ${slides.length}`;
        }
      };

      prev?.addEventListener("click", () => setActiveSlide(activeIndex - 1));
      next?.addEventListener("click", () => setActiveSlide(activeIndex + 1));
      setActiveSlide(activeIndex);
    });
  };

  const initHeroVideoToggle = () => {
    const toggle = document.querySelector("[data-hero-video-toggle]");
    const video = document.querySelector(".video-hero video");

    if (!toggle || !video) {
      return;
    }

    const syncState = () => {
      const paused = video.paused;
      toggle.setAttribute("aria-pressed", paused ? "true" : "false");
      toggle.setAttribute("aria-label", paused ? "Play background video" : "Pause background video");
      toggle.classList.toggle("is-paused", paused);
    };

    if (reduceMotion.matches) {
      video.pause();
    }

    toggle.addEventListener("click", () => {
      if (video.paused) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
      syncState();
    });

    syncState();
  };

  const initSupervisorNavigation = () => {
    let isLoading = false;

    const updateActiveSupervisorLink = (url = window.location.href) => {
      const activeUrl = new URL(url, window.location.href);
      document.querySelectorAll(".supervisor-sidebar__nav a").forEach((link) => {
        const linkUrl = new URL(link.href, window.location.href);
        const isActive = linkUrl.pathname === activeUrl.pathname;
        link.classList.toggle("is-active", isActive);
        if (isActive) {
          link.setAttribute("aria-current", "page");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    };

    const enhanceNewContent = (root) => {
      initTabs();
      initCarousel();
      initHeroVideoToggle();
      initRecordCards(root);
    };

    const loadSupervisorPage = async (url, pushState = true) => {
      if (isLoading) {
        return;
      }

      const currentMain = document.querySelector("#main-content");
      if (!currentMain?.querySelector(".supervisor-shell")) {
        window.location.href = url.toString();
        return;
      }

      isLoading = true;
      currentMain.setAttribute("aria-busy", "true");
      document.documentElement.classList.add("is-supervisor-loading");

      try {
        const response = await fetch(url.toString(), {
          credentials: "same-origin",
          headers: { "X-Requested-With": "fetch" },
        });

        if (!response.ok) {
          window.location.href = url.toString();
          return;
        }

        const html = await response.text();
        const nextDocument = new DOMParser().parseFromString(html, "text/html");
        const nextMain = nextDocument.querySelector("#main-content");

        if (!nextMain?.querySelector(".supervisor-shell")) {
          window.location.href = url.toString();
          return;
        }

        document.title = nextDocument.title || document.title;
        document.body.className = nextDocument.body.className;
        if (pushState) {
          window.history.pushState({ supervisorPage: true }, "", url.toString());
        }

        currentMain.replaceWith(nextMain);
        enhanceNewContent(nextMain);
        updateActiveSupervisorLink(url.toString());

        const nextHeading = nextMain.querySelector(".supervisor-main h1, .supervisor-main h2, .supervisor-main [tabindex]");
        if (nextHeading) {
          if (!nextHeading.hasAttribute("tabindex")) {
            nextHeading.setAttribute("tabindex", "-1");
          }
          nextHeading.focus({ preventScroll: true });
        }

        window.scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" });
      } catch (_) {
        window.location.href = url.toString();
      } finally {
        const latestMain = document.querySelector("#main-content");
        latestMain?.removeAttribute("aria-busy");
        document.documentElement.classList.remove("is-supervisor-loading");
        isLoading = false;
      }
    };

    document.addEventListener("click", (event) => {
      const link = event.target.closest(".supervisor-sidebar__nav a");
      if (!link) {
        return;
      }

      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) {
        return;
      }

      event.preventDefault();
      loadSupervisorPage(url);
    });

    window.addEventListener("popstate", () => {
      if (document.querySelector("#main-content .supervisor-shell")) {
        loadSupervisorPage(new URL(window.location.href), false);
      }
    });

    updateActiveSupervisorLink();
  };

  const initOverviewNavigation = () => {
    document.addEventListener("click", (event) => {
      const link = event.target.closest('.site-nav a[href="/dashboard"], .supervisor-sidebar__nav a[href="/dashboard"]');
      if (!link || window.location.pathname !== "/dashboard") {
        return;
      }

      event.preventDefault();
      window.history.replaceState({}, "", "/dashboard");
      window.scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" });
    });
  };

  const initFlashDismiss = () => {
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-dismiss-flash], [data-dismiss-alert]");
      if (!button) {
        return;
      }

      button.closest(".flash, .alert-panel")?.remove();
    });

    document.querySelectorAll("[data-auto-dismiss]").forEach((panel) => {
      const delay = Number.parseInt(panel.dataset.autoDismiss, 10);
      if (!Number.isFinite(delay) || delay <= 0) {
        return;
      }

      window.setTimeout(() => {
        panel.remove();
      }, delay);
    });
  };

  const initBackToTop = () => {
    const button = document.querySelector("[data-back-to-top]");

    if (!button) {
      return;
    }

    const sync = () => {
      button.classList.toggle("is-visible", window.scrollY > 520);
    };

    button.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" });
    });
    window.addEventListener("scroll", sync, { passive: true });
    sync();
  };

  const initDateRangeValidation = () => {
    document.addEventListener("submit", (event) => {
      const form = event.target.closest("[data-date-range-form]");
      if (!form) {
        return;
      }

      const dates = Array.from(form.querySelectorAll('input[type="date"]'));
      if (dates.length < 2) {
        return;
      }

      const [start, end] = dates;
      if (start.value && end.value && start.value > end.value) {
        event.preventDefault();
        end.setCustomValidity("End date must be on or after the start date.");
        end.reportValidity();
      } else {
        end.setCustomValidity("");
      }
    });

    document.addEventListener("input", (event) => {
      if (event.target.matches('[data-date-range-form] input[type="date"]')) {
        event.target.setCustomValidity("");
      }
    });
  };

  const initTicketPricing = () => {
    const membershipSelect = document.querySelector("[data-ticket-membership-select]");
    const ticketSelect = document.querySelector("[data-ticket-type-select]");
    if (!membershipSelect || !ticketSelect) {
      return;
    }

    const refreshPrices = () => {
      const selectedMembership = membershipSelect.selectedOptions[0];
      const hasDiscount = normalizeText(selectedMembership?.dataset.status) === "active";

      Array.from(ticketSelect.options).forEach((option) => {
        const name = option.dataset.name;
        const price = Number.parseFloat(option.dataset.price);
        if (!name || !Number.isFinite(price)) {
          return;
        }

        const displayPrice = hasDiscount ? price * 0.8 : price;
        option.textContent = hasDiscount
          ? `${name} ($${displayPrice.toFixed(2)} member)`
          : `${name} ($${price.toFixed(2)})`;
      });
    };

    membershipSelect.addEventListener("change", refreshPrices);
    refreshPrices();
  };

  const initTypewriter = () => {
    const targets = document.querySelectorAll("[data-typewriter]");
    targets.forEach((target) => {
      const text = target.getAttribute("data-typewriter") || "";
      if (!text || reduceMotion.matches) {
        target.textContent = text;
        return;
      }

      target.textContent = "";
      target.classList.add("typewriter-text");
      let index = 0;
      const write = () => {
        target.textContent = text.slice(0, index);
        index += 1;
        if (index <= text.length) {
          window.setTimeout(write, 200);
        } else {
          target.classList.add("typewriter-text--done");
        }
      };
      write();
    });
  };

  const initAjaxPagination = () => {
    document.addEventListener("click", async (event) => {
      const link = event.target.closest("a[data-ajax-page]");
      if (!link) {
        return;
      }

      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname) {
        return;
      }

      const pagination = link.closest("[data-ajax-pagination]");
      const sectionId = pagination?.getAttribute("data-section-id") || url.hash.slice(1);
      const anchor = sectionId ? document.getElementById(sectionId) : null;
      const currentSection = anchor?.closest("section");

      if (!sectionId || !currentSection) {
        return;
      }

      event.preventDefault();
      currentSection.setAttribute("aria-busy", "true");
      currentSection.classList.add("is-loading-section");

      try {
        const response = await fetch(url.toString(), {
          credentials: "same-origin",
          headers: { "X-Requested-With": "fetch" },
        });

        if (!response.ok) {
          window.location.href = link.href;
          return;
        }

        const html = await response.text();
        const nextDocument = new DOMParser().parseFromString(html, "text/html");
        const nextAnchor = nextDocument.getElementById(sectionId);
        const nextSection = nextAnchor?.closest("section");

        if (!nextSection) {
          window.location.href = link.href;
          return;
        }

        currentSection.replaceWith(nextSection);
        initRecordCards(nextSection);
        window.history.pushState({}, "", url.toString());

        const heading = nextSection.querySelector("h1, h2, [tabindex]");
        if (heading) {
          if (!heading.hasAttribute("tabindex")) {
            heading.setAttribute("tabindex", "-1");
          }
          heading.focus({ preventScroll: true });
        }

        nextSection.scrollIntoView({ block: "start", behavior: reduceMotion.matches ? "auto" : "smooth" });
      } catch (_) {
        window.location.href = link.href;
      } finally {
        currentSection.removeAttribute("aria-busy");
        currentSection.classList.remove("is-loading-section");
      }
    });
  };

  const normalizeText = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  const recordAssets = {
    "spring collection 2026": "/images/spring-collection.jpg",
    "summer showcase 2026": "/images/summer-showcase-outside.jpg",
    "spring exhibition opening gala": "/images/spring-exhibition-opening-gala.jpg",
    "art history: renaissance": "/images/art-history-renaissance.jpg",
    "members-only: summer showcase": "/images/summer-showcase.jpg",
    "family art workshop": "/images/family-art-workshop.jpg",
    "curator special: van gogh": "/images/van-gogh-museum.jpg",
    "evening jazz & art": "/images/evening-jazz.jpg",
    "summer solstice celebration": "/images/summer-solstice-celebration.jpg",
    "conservation workshop": "/images/conservation-workshop.jpg",
    "spring exhibition highlights": "/images/education.jpg",
    "family discovery tour": "/images/family-art-workshop.jpg",
    "van gogh & friends": "/images/van-gogh-museum.jpg",
    "summer showcase preview": "/images/summer-showcase-outside.jpg",
    "spanish art highlights": "/images/art-history-renaissance.jpg",
    "behind the scenes conservation": "/images/conservation-workshop.jpg",
    "sunday morning classics": "/images/conservation.jpg",
    allegory: "/images/allegory.jpg",
    "the rose garden": "/images/the-rose-garden.jpg",
    "the farnese hours": "/images/the-farnese-hours.jpg",
    "st peter martyr: reburial": "/images/st-peter-martyr.jpg",
    "female head type 7": "/images/female-type-7.jpg",
    deposition: "/images/deposition-empoli.jpg",
    "leonore discovers dagger": "/images/leonore-discovers-dagger.jpg",
    "la roubine du roi": "/images/la-roubine-du-roi.jpg",
    "the birth of the last muse": "/images/the-birth-of-the-last-muse.jpg",
    "billiard players": "/images/billiard-players.jpg",
    "portrait of sir john langham": "/images/portrait-of-john-langham.jpg",
    "portrait of john langham": "/images/portrait-of-john-langham.jpg",
    "jean-auguste-dominique ingres": "/images/Jean-Auguste-Dominique-Ingres.jpg",
    "jean-auguste-dominique-ingres": "/images/Jean-Auguste-Dominique-Ingres.jpg",
    "albrecht durer": "/images/albrecht-durer.jpg",
    "albrecht dürer": "/images/albrecht-durer.jpg",
    "carl frederik aagaard": "/images/carl-frederik-aagaard.jpg",
    "friedrich kerseboom": "/images/frederick-kerseboom.jpg",
    "frederick kerseboom": "/images/frederick-kerseboom.jpg",
    "giovanni di balduccio": "/images/giovanni-di-balduccio.jpg",
    "giulio clovio": "/images/giulio-clovio.jpg",
    "hans von aachen": "/images/hans-von-aachen.jpg",
    "henry fuseli": "/images/henry-fuseli.jpg",
    "jacopo da empoli": "/images/jacopo-da-empoli.jpg",
    "nicolas lancret": "/images/nicolas-lancret.jpg",
    "paul egell": "/images/paul-egell.jpg",
    "museum tote bag": "/images/tote.jpg",
    "van gogh umbrella": "/images/van-gogh-umbrella.jpg",
    "art history coloring book": "/images/art-history-coloring-book.jpg",
    "museum magnet set": "/images/magnet.jpg",
    "replica ancient coin": "/images/replica-ancient-coin.jpg",
    "kids art kit": "/images/kids-art-kit.jpg",
    "museum logo scarf": "/images/scarf.jpg",
    "van gogh shirt": "/images/shirt.jpg",
    "van gogh print": "/images/van-gogh.jpg",
    espresso: "/images/espresso.jpg",
    cappuccino: "/images/cappuccino.jpg",
    "blueberry muffin": "/images/blueberry-muffin.jpg",
    "quiche lorraine": "/images/quiche.jpg",
    "greek salad": "/images/salad.jpg",
    "bottled water": "/images/water.jpg",
    "chocolate croissant": "/images/croissant.jpg",
    "matcha latte": "/images/matcha.jpg",
    "cake pop": "/images/cake-pop.jpg",
    sandwich: "/images/sandwich.jpg",
  };

  const fallbackPools = {
    artwork: [
      "/images/nicolas-lancret.jpg",
      "/images/frederick-kerseboom.jpg",
      "/images/claude-monet.jpg",
      "/images/van-gogh-museum.jpg",
      "/images/exhibit.jpg",
    ],
    exhibition: [
      "/images/exhibition-design.jpg",
      "/images/spring-collection.jpg",
      "/images/summer-showcase-outside.jpg",
      "/images/art-history-renaissance.jpg",
      "/images/exhibit.jpg",
    ],
    giftshop: [
      "/images/gift-shop.jpg",
      "/images/tote.jpg",
      "/images/catalogue.jpg",
      "/images/scarf.jpg",
      "/images/magnet.jpg",
    ],
    cafe: [
      "/images/cafe.jpg",
      "/images/cappuccino.jpg",
      "/images/croissant.jpg",
      "/images/salad.jpg",
      "/images/sandwich.jpg",
    ],
    visit: [
      "/images/visitor-services.jpg",
      "/images/admission.jpg",
      "/images/museum2.jpg",
      "/images/museum3.jpg",
      "/images/museum5.jpg",
    ],
  };

  const chooseFallbackAsset = (seed, poolName) => {
    const pool = fallbackPools[poolName] || fallbackPools.visit;
    const text = normalizeText(seed) || poolName;
    let hash = 0;

    for (let index = 0; index < text.length; index += 1) {
      hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
    }

    return pool[hash % pool.length];
  };

  const defaultAssetForSection = (sectionTitle, seed = "") => {
    const title = normalizeText(sectionTitle);
    const path = window.location.pathname;

    if (title.includes("condition") || title.includes("conservation") || path.includes("condition")) {
      return "/images/conservation.jpg";
    }
    if (title.includes("artwork") || path.includes("artwork") || title.includes("artist")) {
      return chooseFallbackAsset(seed || sectionTitle, "artwork");
    }
    if (title.includes("exhibition") || path.includes("exhibition")) {
      return chooseFallbackAsset(seed || sectionTitle, "exhibition");
    }
    if (title.includes("tour") || path.includes("tour")) {
      return "/images/education.jpg";
    }
    if (title.includes("report") || title.includes("marketing") || path.includes("report")) {
      return "/images/marketing.jpg";
    }
    if (title.includes("gift") || path.includes("item") || path.includes("sale")) {
      return chooseFallbackAsset(seed || sectionTitle, "giftshop");
    }
    if (title.includes("cafe") || title.includes("café") || path.includes("food")) {
      return chooseFallbackAsset(seed || sectionTitle, "cafe");
    }
    if (title.includes("current members") || title.includes("employee") || title.includes("staff directory") || title.includes("users")) {
      return "/images/user.jpg";
    }
    return chooseFallbackAsset(seed || sectionTitle, "visit");
  };

  const findRecordImage = (sectionTitle, cells) => {
    const values = cells.map((cell) => normalizeText(cell.textContent));
    if (values.includes("deposition") && values.includes("sculpture")) {
      return "/images/deposition-egell.jpg";
    }
    const matchedValue = values.find((value) => recordAssets[value]);
    return recordAssets[matchedValue] || defaultAssetForSection(sectionTitle, values.join("|"));
  };

  const initRecordCards = (root = document) => {
    const tables = Array.from(root.querySelectorAll("section table"));

    tables.forEach((table) => {
      if (table.dataset.cardEnhanced === "true") {
        return;
      }

      const headers = Array.from(table.querySelectorAll("thead th")).map((header) => header.textContent.trim());
      let actionIndex = headers.findIndex((header) => ["action", "actions"].includes(normalizeText(header)));
      const imageIndex = headers.findIndex((header) => normalizeText(header) === "image");
      if (actionIndex < 0) {
        const firstRowCells = Array.from(table.querySelectorAll("tbody tr:first-child td"));
        actionIndex = firstRowCells.findIndex((cell, index) => {
          const header = normalizeText(headers[index]);
          return !header && Boolean(cell.querySelector("form, button, a.button, .link-button"));
        });
      }

      if (actionIndex < 0 && imageIndex < 0) {
        return;
      }

      const bodyRows = Array.from(table.querySelectorAll("tbody tr")).filter((row) => row.querySelectorAll("td").length > 1);
      if (!bodyRows.length) {
        return;
      }

      const section = table.closest("section");
      const sectionTitle = section?.querySelector("h1, h2")?.textContent.trim() || "Records";
      const grid = document.createElement("div");
      grid.className = "record-card-grid";
      grid.setAttribute("aria-label", `${sectionTitle} records`);

      bodyRows.forEach((row) => {
        const cells = Array.from(row.querySelectorAll("td"));
        const dataEntries = cells
          .map((cell, index) => ({ cell, index }))
          .filter(({ cell, index }) => {
            const header = normalizeText(headers[index]);
            return index !== actionIndex
              && index !== imageIndex
              && header !== "id"
              && !header.endsWith(" id")
              && header !== "stock"
              && header !== "status"
              && header !== "";
          });
        const dataCells = dataEntries.map(({ cell }) => cell);
        const preferredTitle = dataEntries.find(({ index }) => {
          const header = normalizeText(headers[index]);
          return ["item", "item name", "name", "food item", "café item", "cafe item", "product"].includes(header);
        });
        const titleCell = preferredTitle?.cell || dataCells.find((cell) => cell.textContent.trim()) || dataCells[0];
        const title = titleCell?.textContent.trim() || "Record";
        const imageCell = imageIndex >= 0 ? cells[imageIndex] : null;
        const imagePath = imageCell?.querySelector("img")?.getAttribute("src") || findRecordImage(sectionTitle, dataCells);
        const stockIndex = headers.findIndex((header) => normalizeText(header) === "stock");
        const statusIndex = headers.findIndex((header) => normalizeText(header) === "status");
        const stockValue = stockIndex >= 0 ? cells[stockIndex]?.textContent.trim() : "";
        const statusValue = statusIndex >= 0 ? cells[statusIndex]?.textContent.trim() : "";
        const stockText = statusValue || (stockValue ? `${stockValue} in stock` : "");
        const stockNumber = Number.parseInt(stockValue, 10);
        const stockTone = statusValue.toLowerCase().includes("out") || stockNumber === 0
          ? "danger"
          : statusValue.toLowerCase().includes("low") || (Number.isInteger(stockNumber) && stockNumber <= 5)
            ? "warning"
            : stockText
              ? "success"
              : "";
        const card = document.createElement("article");
        card.className = "record-card";
        card.tabIndex = 0;

        const details = dataEntries.map(({ cell, index }) => {
          const label = headers[index] || `Field ${index + 1}`;
          const value = cell.textContent.trim() || "Not specified";
          return `
            <div class="record-card__detail">
              <span>${escapeHtml(label)}</span>
              <strong>${escapeHtml(value)}</strong>
            </div>
          `;
        }).join("");

        card.innerHTML = `
          <div class="record-card__media">
            <img src="${imagePath}" alt="">
            ${actionIndex >= 0 ? '<span class="record-card__cue">Edit or delete</span>' : ""}
          </div>
          <div class="record-card__body">
            <div>
              <p class="eyebrow">${escapeHtml(sectionTitle)}</p>
              <h3>${escapeHtml(title)}</h3>
              ${stockText ? `<span class="status-badge status-badge--${stockTone}">${escapeHtml(stockText)}</span>` : ""}
            </div>
            <div class="record-card__details">${details}</div>
          </div>
        `;

        if (actionIndex >= 0) {
          const actionCell = cells[actionIndex];
          const actionWrap = document.createElement("div");
          actionWrap.className = "record-card__actions";
          actionWrap.append(...Array.from(actionCell.children).map((child) => child.cloneNode(true)));
          card.append(actionWrap);
        }

        grid.append(card);
      });

      table.before(grid);
      table.dataset.cardEnhanced = "true";
      table.classList.add("record-table-fallback");
    });
  };

  initTabs();
  initCarousel();
  initHeroVideoToggle();
  initSupervisorNavigation();
  initOverviewNavigation();
  initFlashDismiss();
  initDateRangeValidation();
  initTicketPricing();
  initTypewriter();
  initBackToTop();
  initAjaxPagination();
  initRecordCards();

  if (reduceMotion.matches) {
    document.documentElement.classList.add("reduce-motion");
    return;
  }

  const animated = document.querySelectorAll(
    ".media-hero, .feature-card, .dashboard-card, .dashboard-section, .notification-item, .auth-card, .card, .portal-banner, .product-card, .collection-card"
  );

  animated.forEach((element, index) => {
    element.classList.add("reveal");
    element.style.setProperty("--delay", `${Math.min(index * 35, 220)}ms`);
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
