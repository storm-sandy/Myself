
(function () {
  "use strict";

  const CONFIG = {
    json: "/Myself/themes.json",
    storageKey: "swayam_nature_theme",
    defaultTheme: "forest"
  };

  let themes = [];
  let activeTheme = CONFIG.defaultTheme;

  const $ = id => document.getElementById(id);

  function hsl(h, s, l) {
    return `hsl(${h} ${s}% ${l}%)`;
  }

  function createPalette(theme) {
    const h = Number(theme.hue) || 120;
    const dark = theme.dark === true;

    return {
      bg: dark ? hsl(h, 26, 11) : hsl(h, 42, 97),
      panel: dark ? hsl(h, 25, 16) : "#ffffff",
      text: hsl(h, 35, dark ? 92 : 20),
      muted: hsl(h, 18, dark ? 69 : 47),
      primary: hsl(h, dark ? 57 : 65, dark ? 64 : 37),
      deep: hsl(h, dark ? 42 : 65, dark ? 75 : 27),
      soft: hsl(h, 30, dark ? 23 : 91),
      line: hsl(h, 25, dark ? 29 : 87),
      head1: hsl(h, 62, dark ? 13 : 27),
      head2: hsl((h + 35) % 360, 65, dark ? 29 : 53)
    };
  }

  function applyTheme(id, save = true) {
    const theme = themes.find(t => t.id === id) ||
      themes.find(t => t.id === CONFIG.defaultTheme) ||
      themes[0];

    if (!theme) return;

    activeTheme = theme.id;

    const palette = createPalette(theme);
    const root = document.documentElement;

    Object.entries(palette).forEach(([key, value]) => {
      root.style.setProperty("--" + key, value);
    });

    root.style.setProperty(
      "--shadow",
      theme.dark ? "0 8px 28px #0005" : "0 8px 28px #14412619"
    );

    root.style.colorScheme = theme.dark ? "dark" : "light";

    const meta = document.querySelector(
      'meta[name="theme-color"]'
    );

    if (meta) meta.content = palette.head1;

    root.dataset.theme = theme.id;
    root.classList.add("theme-ready");

    document.querySelectorAll(".theme-option").forEach(button => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.theme === theme.id)
      );
    });

    if (save) {
      try {
        localStorage.setItem(CONFIG.storageKey, theme.id);
      } catch (error) {
        console.warn("Theme storage unavailable:", error);
      }
    }

    document.dispatchEvent(new CustomEvent(
      "swayam:themechange",
      { detail: { id: theme.id, palette } }
    ));

    return theme;
  }

  async function loadThemes() {
    try {
      const response = await fetch(CONFIG.json, {
        cache: "no-cache"
      });

      if (!response.ok) {
        throw new Error("Unable to load themes.json");
      }

      const data = await response.json();

      if (!Array.isArray(data.themes) || !data.themes.length) {
        throw new Error("Invalid theme configuration");
      }

      themes = data.themes.filter(t =>
        t && typeof t.id === "string" &&
        typeof t.name === "string"
      );

      if (data.defaultTheme) {
        CONFIG.defaultTheme = data.defaultTheme;
      }

      if (data.storageKey) {
        CONFIG.storageKey = data.storageKey;
      }

    } catch (error) {
      console.error("Theme loading error:", error);

      themes = [{
        id: "forest",
        name: "🌲 Forest",
        hue: 120
      }];
    }

    let saved = CONFIG.defaultTheme;

    try {
      saved = localStorage.getItem(CONFIG.storageKey) || saved;
    } catch (error) {}

    applyTheme(saved, false);
    buildGallery();

    return themes;
  }

  function buildGallery() {
    const container = $("themeOptions");
    if (!container) return;

    container.replaceChildren();

    themes.forEach(theme => {
      const palette = createPalette(theme);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "theme-option";
      button.dataset.theme = theme.id;
      button.setAttribute("aria-pressed", "false");

      const swatch = document.createElement("span");
      swatch.className = "swatch";
      swatch.style.setProperty("--s1", palette.head1);
      swatch.style.setProperty("--s2", palette.head2);

      const label = document.createElement("span");
      label.className = "theme-label";
      label.append(document.createTextNode(theme.name));

      const small = document.createElement("small");
      small.textContent = theme.dark
        ? "Dark nature palette"
        : "Nature colour palette";

      label.append(small);
      button.append(swatch, label);

      button.addEventListener("click", () => {
        applyTheme(theme.id, true);

        $("themePanel")?.classList.remove("open");
      });

      container.append(button);
    });

    updateCount();
    filterGallery();
  }

  function filterGallery() {
    const search = $("themeSearch");
    const container = $("themeOptions");

    if (!search || !container) return;

    const query = search.value.trim().toLowerCase();
    let count = 0;

    container.querySelectorAll(".theme-option").forEach(button => {
      const visible = button.textContent.toLowerCase().includes(query);
      button.hidden = !visible;
      if (visible) count++;
    });

    const countElement = $("themeCount");

    if (countElement) {
      countElement.textContent =
        count + " theme" + (count === 1 ? "" : "s") + " found";
    }
  }

  function updateCount() {
    const countElement = $("themeCount");

    if (countElement) {
      countElement.textContent = themes.length + " themes available";
    }
  }

  function initGallery() {
    $("openThemes")?.addEventListener("click", () => {
      $("calendarPop")?.classList.remove("open");
      $("quickPanel")?.classList.remove("open");
      $("themePanel")?.classList.add("open");

      if ($("themeSearch")) {
        $("themeSearch").value = "";
      }

      filterGallery();
      $("closeThemes")?.focus();
    });

    $("closeThemes")?.addEventListener("click", () => {
      $("themePanel")?.classList.remove("open");
    });

    $("themePanel")?.addEventListener("click", event => {
      if (event.target === $("themePanel")) {
        $("themePanel").classList.remove("open");
      }
    });

    $("themeSearch")?.addEventListener("input", filterGallery);
  }

  /* Child pages receive theme changes from the index page. */
  window.addEventListener("storage", event => {
    if (event.key === CONFIG.storageKey && event.newValue) {
      applyTheme(event.newValue, false);
    }
  });

  /* Public API for other applications. */
  window.SwayamTheme = {
    apply: applyTheme,

    getCurrent: () => activeTheme,

    getThemes: () => themes.slice(),

    refresh: loadThemes
  };

  document.addEventListener("DOMContentLoaded", async () => {
    await loadThemes();
    initGallery();
  });

})();
