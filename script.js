const state = {
  data: null,
  token: localStorage.getItem("portfolio_admin_token") || "",
  isAdmin: false,
  activeSection: "home",
};

let DATA = null;
let isAdmin = false;

/* =========================================================
   API HELPERS
========================================================= */

async function apiRequest(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") || "";

  let payload;

  if (contentType.includes("application/json")) {
    payload = await response.json();
  } else {
    payload = await response.text();
  }

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload?.error
        ? payload.error
        : "Request failed";

    throw new Error(message);
  }

  return payload;
}

/* =========================================================
   TOAST
========================================================= */

function toast(message, type = "success") {
  let container = document.getElementById("toast-container");

  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const item = document.createElement("div");
  item.className = `toast toast-${type}`;
  item.textContent = message;

  container.appendChild(item);

  setTimeout(() => {
    item.classList.add("show");
  }, 10);

  setTimeout(() => {
    item.classList.remove("show");

    setTimeout(() => {
      item.remove();
    }, 300);
  }, 3000);
}

/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================================================
   TEXT HELPERS
========================================================= */

function safeText(value, fallback = "") {
  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
}

function formatText(value) {
  return escapeHtml(safeText(value)).replace(/\n/g, "<br>");
}

/* =========================================================
   MODAL HELPERS
========================================================= */

function openOverlay(id) {
  const overlay = document.getElementById(id);

  if (!overlay) {
    return;
  }

  overlay.classList.add("open");
  document.body.classList.add("modal-open");
}

function closeOverlay(id) {
  const overlay = document.getElementById(id);

  if (!overlay) {
    return;
  }

  overlay.classList.remove("open");

  if (!document.querySelector(".overlay.open")) {
    document.body.classList.remove("modal-open");
  }
}

/* =========================================================
   LOAD DATA
========================================================= */

async function loadPortfolio() {
  try {
    const result = await apiRequest("/api/portfolio");

    DATA = result;
    state.data = result;

    renderAll();

    return result;
  } catch (error) {
    console.error("Failed to load portfolio:", error);

    toast("Unable to load portfolio data", "error");

    return null;
  }
}

/* =========================================================
   AUTH
========================================================= */

function updateAdminState(value) {
  isAdmin = Boolean(value);
  state.isAdmin = isAdmin;

  document.body.classList.toggle("admin-mode", isAdmin);

  document.querySelectorAll(".admin-only").forEach((element) => {
    element.style.display = isAdmin ? "" : "";
  });

  const adminLoginButton = document.getElementById("adminLoginButton");
  const adminLogoutButton = document.getElementById("adminLogoutButton");

  if (adminLoginButton) {
    adminLoginButton.style.display = isAdmin ? "none" : "";
  }

  if (adminLogoutButton) {
    adminLogoutButton.style.display = isAdmin ? "" : "none";
  }
}

async function checkAdminSession() {
  if (!state.token) {
    updateAdminState(false);
    return false;
  }

  try {
    await apiRequest("/api/admin/me");
    updateAdminState(true);
    return true;
  } catch (error) {
    state.token = "";
    localStorage.removeItem("portfolio_admin_token");
    updateAdminState(false);
    return false;
  }
}

function createLoginModal() {
  if (document.getElementById("loginOverlay")) {
    return;
  }

  const overlay = document.createElement("div");

  overlay.className = "overlay";
  overlay.id = "loginOverlay";

  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-head">
        <h3 class="modal-title">admin login</h3>

        <button
          class="modal-close"
          type="button"
          aria-label="Close"
          onclick="closeOverlay('loginOverlay')"
        >
          ✕
        </button>
      </div>

      <div class="modal-body">
        <div class="field">
          <label for="admin-password">password</label>

          <input
            id="admin-password"
            class="input"
            type="password"
            autocomplete="current-password"
            placeholder="Enter admin password"
          />
        </div>
      </div>

      <div class="modal-foot">
        <span></span>

        <button
          class="btn btn-primary"
          type="button"
          onclick="loginAdmin()"
        >
          Login
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.addEventListener("click", function (event) {
    if (event.target === overlay) {
      closeOverlay("loginOverlay");
    }
  });

  const input = overlay.querySelector("#admin-password");

  if (input) {
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        loginAdmin();
      }
    });
  }
}

function openLoginModal() {
  createLoginModal();

  const input = document.getElementById("admin-password");

  if (input) {
    input.value = "";
  }

  openOverlay("loginOverlay");

  setTimeout(() => {
    if (input) {
      input.focus();
    }
  }, 50);
}

async function loginAdmin() {
  const input = document.getElementById("admin-password");

  if (!input) {
    return;
  }

  const password = input.value;

  if (!password) {
    toast("Enter your password", "error");
    return;
  }

  try {
    const result = await apiRequest("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({
        password,
      }),
    });

    if (!result.token) {
      throw new Error("Login token was not returned");
    }

    state.token = result.token;

    localStorage.setItem("portfolio_admin_token", state.token);

    updateAdminState(true);

    closeOverlay("loginOverlay");

    toast("Admin login successful");

    renderAll();
  } catch (error) {
    console.error("Admin login failed:", error);

    toast(error.message || "Login failed", "error");
  }
}

function logoutAdmin() {
  state.token = "";
  localStorage.removeItem("portfolio_admin_token");

  updateAdminState(false);

  toast("Logged out");

  renderAll();
}

/* =========================================================
   GENERIC PERSIST
========================================================= */

async function persist(successMessage = "Changes saved") {
  if (!isAdmin) {
    toast("Admin access required", "error");
    return false;
  }

  try {
    await apiRequest("/api/portfolio", {
      method: "PUT",
      body: JSON.stringify(DATA),
    });

    toast(successMessage);

    return true;
  } catch (error) {
    console.error("Failed to save portfolio:", error);

    toast(error.message || "Unable to save changes", "error");

    return false;
  }
}

/* =========================================================
   RENDER ALL
========================================================= */

function renderAll() {
  if (!DATA) {
    return;
  }

  renderProfile();
  renderAbout();
  renderSkills();
  renderProjects();
  renderExperience();
  renderEducation();
  renderCertifications();
  renderServices();
  renderContact();
  renderSocialLinks();
  renderFooter();

  setupAboutEditor();
}

/* =========================================================
   PROFILE
========================================================= */

function renderProfile() {
  const profile = DATA.profile || {};

  const nameElements = document.querySelectorAll("[data-profile-name]");

  nameElements.forEach((element) => {
    element.textContent = safeText(profile.name, "Your Name");
  });

  const roleElements = document.querySelectorAll("[data-profile-role]");

  roleElements.forEach((element) => {
    element.textContent = safeText(profile.role, "");
  });

  const locationElements = document.querySelectorAll(
    "[data-profile-location]"
  );

  locationElements.forEach((element) => {
    element.textContent = safeText(profile.location, "");
  });

  const emailElements = document.querySelectorAll("[data-profile-email]");

  emailElements.forEach((element) => {
    element.textContent = safeText(profile.email, "");
  });

  const phoneElements = document.querySelectorAll("[data-profile-phone]");

  phoneElements.forEach((element) => {
    element.textContent = safeText(profile.phone, "");
  });

  const avatarElements = document.querySelectorAll("[data-profile-avatar]");

  avatarElements.forEach((element) => {
    if (profile.avatar) {
      element.src = profile.avatar;
      element.style.display = "";
    } else {
      element.removeAttribute("src");
      element.style.display = "none";
    }
  });
}

/* =========================================================
   ABOUT
========================================================= */

function renderAbout() {
  const profile = DATA.profile || {};

  const aboutElements = document.querySelectorAll("[data-about]");

  aboutElements.forEach((element) => {
    element.innerHTML = formatText(profile.bio || "");
  });

  const aboutFileName = document.getElementById("aboutFileName");

  if (aboutFileName) {
    aboutFileName.textContent = "about.md";
  }
}

/* =========================================================
   SKILLS
========================================================= */

function renderSkills() {
  const skills = Array.isArray(DATA.skills) ? DATA.skills : [];

  const containers = document.querySelectorAll("[data-skills]");

  containers.forEach((container) => {
    container.innerHTML = skills
      .map((skill) => {
        if (typeof skill === "string") {
          return `<span class="skill">${escapeHtml(skill)}</span>`;
        }

        return `
          <span class="skill">
            ${escapeHtml(skill.name || "")}
          </span>
        `;
      })
      .join("");
  });
}

/* =========================================================
   PROJECTS
========================================================= */

function renderProjects() {
  const projects = Array.isArray(DATA.projects) ? DATA.projects : [];

  const containers = document.querySelectorAll("[data-projects]");

  containers.forEach((container) => {
    container.innerHTML = projects
      .map((project, index) => {
        const title = safeText(project.title, `Project ${index + 1}`);
        const description = safeText(project.description, "");
        const technologies = Array.isArray(project.technologies)
          ? project.technologies
          : [];

        return `
          <article class="project-card">
            <div class="project-card-head">
              <h3>${escapeHtml(title)}</h3>

              ${
                project.url
                  ? `
                    <a
                      href="${escapeHtml(project.url)}"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View
                    </a>
                  `
                  : ""
              }
            </div>

            <p>${formatText(description)}</p>

            ${
              technologies.length
                ? `
                  <div class="project-tech">
                    ${technologies
                      .map(
                        (technology) =>
                          `<span>${escapeHtml(technology)}</span>`
                      )
                      .join("")}
                  </div>
                `
                : ""
            }
          </article>
        `;
      })
      .join("");
  });
}

/* =========================================================
   EXPERIENCE
========================================================= */

function renderExperience() {
  const experience = Array.isArray(DATA.experience)
    ? DATA.experience
    : [];

  const containers = document.querySelectorAll("[data-experience]");

  containers.forEach((container) => {
    container.innerHTML = experience
      .map((item) => {
        return `
          <article class="timeline-item">
            <div class="timeline-date">
              ${escapeHtml(item.date || "")}
            </div>

            <div class="timeline-content">
              <h3>${escapeHtml(item.title || "")}</h3>

              <h4>${escapeHtml(item.company || "")}</h4>

              <p>${formatText(item.description || "")}</p>
            </div>
          </article>
        `;
      })
      .join("");
  });
}

/* =========================================================
   EDUCATION
========================================================= */

function renderEducation() {
  const education = Array.isArray(DATA.education)
    ? DATA.education
    : [];

  const containers = document.querySelectorAll("[data-education]");

  containers.forEach((container) => {
    container.innerHTML = education
      .map((item) => {
        return `
          <article class="education-item">
            <h3>${escapeHtml(item.degree || item.title || "")}</h3>

            <h4>${escapeHtml(item.school || item.institution || "")}</h4>

            <p>${escapeHtml(item.date || "")}</p>

            ${
              item.description
                ? `<p>${formatText(item.description)}</p>`
                : ""
            }
          </article>
        `;
      })
      .join("");
  });
}

/* =========================================================
   CERTIFICATIONS
========================================================= */

function renderCertifications() {
  const certifications = Array.isArray(DATA.certifications)
    ? DATA.certifications
    : [];

  const containers = document.querySelectorAll(
    "[data-certifications]"
  );

  containers.forEach((container) => {
    container.innerHTML = certifications
      .map((item) => {
        return `
          <article class="certification-item">
            <h3>${escapeHtml(item.name || item.title || "")}</h3>

            ${
              item.issuer
                ? `<p>${escapeHtml(item.issuer)}</p>`
                : ""
            }

            ${
              item.date
                ? `<span>${escapeHtml(item.date)}</span>`
                : ""
            }
          </article>
        `;
      })
      .join("");
  });
}

/* =========================================================
   SERVICES
========================================================= */

function renderServices() {
  const services = Array.isArray(DATA.services)
    ? DATA.services
    : [];

  const containers = document.querySelectorAll("[data-services]");

  containers.forEach((container) => {
    container.innerHTML = services
      .map((service) => {
        return `
          <article class="service-card">
            <h3>${escapeHtml(service.title || service.name || "")}</h3>

            <p>${formatText(service.description || "")}</p>
          </article>
        `;
      })
      .join("");
  });
}

/* =========================================================
   CONTACT
========================================================= */

function renderContact() {
  const contact = DATA.contact || {};
  const profile = DATA.profile || {};

  const email = contact.email || profile.email || "";
  const phone = contact.phone || profile.phone || "";
  const location = contact.location || profile.location || "";

  document.querySelectorAll("[data-contact-email]").forEach((element) => {
    element.textContent = email;
  });

  document.querySelectorAll("[data-contact-phone]").forEach((element) => {
    element.textContent = phone;
  });

  document
    .querySelectorAll("[data-contact-location]")
    .forEach((element) => {
      element.textContent = location;
    });
}

/* =========================================================
   SOCIAL LINKS
========================================================= */

function renderSocialLinks() {
  const social = DATA.social || {};

  document.querySelectorAll("[data-social-link]").forEach((element) => {
    const network = element.dataset.socialLink;

    const url = social[network];

    if (url) {
      element.href = url;
      element.style.display = "";
    } else {
      element.style.display = "none";
    }
  });
}

/* =========================================================
   FOOTER
========================================================= */

function renderFooter() {
  const profile = DATA.profile || {};

  document.querySelectorAll("[data-footer-name]").forEach((element) => {
    element.textContent = safeText(profile.name, "");
  });

  document.querySelectorAll("[data-current-year]").forEach((element) => {
    element.textContent = new Date().getFullYear();
  });
}

/* =========================================================
   PROFILE MODAL
========================================================= */

function createProfileModal() {
  if (document.getElementById("profileOverlay")) {
    return;
  }

  const overlay = document.createElement("div");

  overlay.className = "overlay";
  overlay.id = "profileOverlay";

  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-head">
        <h3 class="modal-title">edit profile</h3>

        <button
          class="modal-close"
          type="button"
          aria-label="Close"
          onclick="closeOverlay('profileOverlay')"
        >
          ✕
        </button>
      </div>

      <div class="modal-body">

        <div class="field">
          <label for="profile-name">name</label>

          <input
            id="profile-name"
            class="input"
            type="text"
          />
        </div>

        <div class="field">
          <label for="profile-role">role</label>

          <input
            id="profile-role"
            class="input"
            type="text"
          />
        </div>

        <div class="field">
          <label for="profile-location">location</label>

          <input
            id="profile-location"
            class="input"
            type="text"
          />
        </div>

        <div class="field">
          <label for="profile-email">email</label>

          <input
            id="profile-email"
            class="input"
            type="email"
          />
        </div>

        <div class="field">
          <label for="profile-phone">phone</label>

          <input
            id="profile-phone"
            class="input"
            type="text"
          />
        </div>

        <div class="field">
          <label for="profile-avatar">avatar URL</label>

          <input
            id="profile-avatar"
            class="input"
            type="url"
          />
        </div>

      </div>

      <div class="modal-foot">
        <span></span>

        <button
          class="btn btn-primary"
          type="button"
          onclick="saveProfile()"
        >
          Save changes
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.addEventListener("click", function (event) {
    if (event.target === overlay) {
      closeOverlay("profileOverlay");
    }
  });
}

function openProfileModal() {
  if (!isAdmin) {
    toast("Admin access required", "error");
    return;
  }

  createProfileModal();

  const profile = DATA.profile || {};

  const nameInput = document.getElementById("profile-name");
  const roleInput = document.getElementById("profile-role");
  const locationInput = document.getElementById("profile-location");
  const emailInput = document.getElementById("profile-email");
  const phoneInput = document.getElementById("profile-phone");
  const avatarInput = document.getElementById("profile-avatar");

  if (nameInput) {
    nameInput.value = profile.name || "";
  }

  if (roleInput) {
    roleInput.value = profile.role || "";
  }

  if (locationInput) {
    locationInput.value = profile.location || "";
  }

  if (emailInput) {
    emailInput.value = profile.email || "";
  }

  if (phoneInput) {
    phoneInput.value = profile.phone || "";
  }

  if (avatarInput) {
    avatarInput.value = profile.avatar || "";
  }

  openOverlay("profileOverlay");

  setTimeout(() => {
    if (nameInput) {
      nameInput.focus();
    }
  }, 50);
}

async function saveProfile() {
  if (!isAdmin) {
    toast("Admin access required", "error");
    return;
  }

  if (!DATA.profile) {
    DATA.profile = {};
  }

  const nameInput = document.getElementById("profile-name");
  const roleInput = document.getElementById("profile-role");
  const locationInput = document.getElementById("profile-location");
  const emailInput = document.getElementById("profile-email");
  const phoneInput = document.getElementById("profile-phone");
  const avatarInput = document.getElementById("profile-avatar");

  DATA.profile.name = nameInput ? nameInput.value.trim() : "";
  DATA.profile.role = roleInput ? roleInput.value.trim() : "";
  DATA.profile.location = locationInput
    ? locationInput.value.trim()
    : "";
  DATA.profile.email = emailInput ? emailInput.value.trim() : "";
  DATA.profile.phone = phoneInput ? phoneInput.value.trim() : "";
  DATA.profile.avatar = avatarInput
    ? avatarInput.value.trim()
    : "";

  const saved = await persist("Profile saved");

  if (!saved) {
    return;
  }

  closeOverlay("profileOverlay");

  renderAll();
}

/* =========================================================
   ABOUT EDITOR
========================================================= */

function createAboutEditor() {
  if (document.getElementById("aboutOverlay")) {
    return;
  }

  const overlay = document.createElement("div");

  overlay.className = "overlay";
  overlay.id = "aboutOverlay";

  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-head">
        <h3 class="modal-title">edit about.md</h3>

        <button
          class="modal-close"
          type="button"
          aria-label="Close"
          onclick="closeOverlay('aboutOverlay')"
        >
          ✕
        </button>
      </div>

      <div class="modal-body">
        <div class="field">
          <label for="about-editor">about</label>

          <textarea
            id="about-editor"
            class="input"
            style="min-height: 280px; resize: vertical;"
            placeholder="Write your About text..."
          ></textarea>
        </div>

        <p class="helptext">
          This content is displayed in the About section of your portfolio.
        </p>
      </div>

      <div class="modal-foot">
        <span></span>

        <button
          class="btn btn-primary"
          type="button"
          onclick="saveAbout()"
        >
          Save changes
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.addEventListener("click", function (event) {
    if (event.target === overlay) {
      closeOverlay("aboutOverlay");
    }
  });
}

function setupAboutEditor() {
  const aboutSection = document.getElementById("about");

  if (!aboutSection) {
    return;
  }

  createAboutEditor();

  const editButton = aboutSection.querySelector(
    ".file-label .admin-only"
  );

  if (!editButton) {
    return;
  }

  editButton.removeAttribute("onclick");

  editButton.onclick = function () {
    openAboutModal();
  };
}

function openAboutModal() {
  if (!isAdmin) {
    toast("Admin access required", "error");
    return;
  }

  /*
   * IMPORTANT:
   * Always create the About editor before trying to
   * find the textarea. This prevents the About button
   * from failing when setupAboutEditor() has not run yet.
   */
  createAboutEditor();

  const textarea = document.getElementById("about-editor");

  if (!textarea) {
    toast("About editor is not available", "error");
    return;
  }

  /*
   * Use the existing profile.bio value as the About content.
   */
  textarea.value =
    DATA &&
    DATA.profile &&
    typeof DATA.profile.bio === "string"
      ? DATA.profile.bio
      : "";

  openOverlay("aboutOverlay");

  setTimeout(function () {
    textarea.focus();

    try {
      textarea.setSelectionRange(
        textarea.value.length,
        textarea.value.length
      );
    } catch (error) {
      // Ignore selection errors.
    }
  }, 50);
}

async function saveAbout() {
  if (!isAdmin) {
    toast("Admin access required", "error");
    return;
  }

  const textarea = document.getElementById("about-editor");

  if (!textarea) {
    toast("About editor is not available", "error");
    return;
  }

  const bio = textarea.value.trim();

  if (!DATA.profile) {
    DATA.profile = {};
  }

  DATA.profile.bio = bio;

  const saved = await persist("About saved");

  if (!saved) {
    return;
  }

  closeOverlay("aboutOverlay");

  renderAll();
}

/* =========================================================
   GENERIC ADMIN EDIT HELPERS
========================================================= */

function requireAdmin() {
  if (!isAdmin) {
    toast("Admin access required", "error");
    return false;
  }

  return true;
}

/* =========================================================
   NAVIGATION
========================================================= */

function setActiveSection(section) {
  state.activeSection = section;

  document.querySelectorAll("[data-section]").forEach((element) => {
    element.classList.toggle(
      "active",
      element.dataset.section === section
    );
  });

  const target = document.getElementById(section);

  if (target) {
    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}

/* =========================================================
   MOBILE MENU
========================================================= */

function setupMobileMenu() {
  const toggle = document.querySelector("[data-menu-toggle]");
  const menu = document.querySelector("[data-mobile-menu]");

  if (!toggle || !menu) {
    return;
  }

  toggle.addEventListener("click", function () {
    menu.classList.toggle("open");
    toggle.classList.toggle("active");
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", function () {
      menu.classList.remove("open");
      toggle.classList.remove("active");
    });
  });
}

/* =========================================================
   SCROLL OBSERVER
========================================================= */

function setupScrollObserver() {
  const sections = document.querySelectorAll("section[id]");

  if (!sections.length) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          state.activeSection = entry.target.id;

          document
            .querySelectorAll("nav a")
            .forEach((link) => {
              const href = link.getAttribute("href");

              link.classList.toggle(
                "active",
                href === `#${entry.target.id}`
              );
            });
        }
      });
    },
    {
      threshold: 0.25,
    }
  );

  sections.forEach((section) => {
    observer.observe(section);
  });
}

/* =========================================================
   ADMIN UI
========================================================= */

function setupAdminUI() {
  const loginButtons = document.querySelectorAll(
    "[data-admin-login]"
  );

  loginButtons.forEach((button) => {
    button.addEventListener("click", function (event) {
      event.preventDefault();
      openLoginModal();
    });
  });

  const logoutButtons = document.querySelectorAll(
    "[data-admin-logout]"
  );

  logoutButtons.forEach((button) => {
    button.addEventListener("click", function (event) {
      event.preventDefault();
      logoutAdmin();
    });
  });
}

/* =========================================================
   GLOBAL CLICK HANDLING
========================================================= */

function setupGlobalEvents() {
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      document
        .querySelectorAll(".overlay.open")
        .forEach((overlay) => {
          overlay.classList.remove("open");
        });

      if (!document.querySelector(".overlay.open")) {
        document.body.classList.remove("modal-open");
      }
    }
  });

  document.addEventListener("click", function (event) {
    const target = event.target.closest("[data-close-overlay]");

    if (!target) {
      return;
    }

    const overlayId = target.dataset.closeOverlay;

    if (overlayId) {
      closeOverlay(overlayId);
    }
  });
}

/* =========================================================
   INITIALIZATION
========================================================= */

async function initializePortfolio() {
  setupMobileMenu();
  setupScrollObserver();
  setupAdminUI();
  setupGlobalEvents();

  createProfileModal();
  createAboutEditor();

  await checkAdminSession();

  await loadPortfolio();

  /*
   * Make sure the About editor is wired after the
   * portfolio content has been loaded into the page.
   */
  setupAboutEditor();
}

/* =========================================================
   DOM READY
========================================================= */

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    function () {
      initializePortfolio();
    },
    { once: true }
  );
} else {
  initializePortfolio();
}

/* =========================================================
   WINDOW HELPERS
========================================================= */

window.openProfileModal = openProfileModal;
window.saveProfile = saveProfile;

window.createAboutEditor = createAboutEditor;
window.setupAboutEditor = setupAboutEditor;
window.openAboutModal = openAboutModal;
window.saveAbout = saveAbout;

window.openLoginModal = openLoginModal;
window.loginAdmin = loginAdmin;
window.logoutAdmin = logoutAdmin;

window.openOverlay = openOverlay;
window.closeOverlay = closeOverlay;

window.toast = toast;
