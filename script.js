/* ============ CONFIG ============ */

const API_BASE = "/api";

let authToken = sessionStorage.getItem("adminToken") || "";
let isAdmin = !!authToken;

let DATA = null;

let profilePhotoDraft = "";
let profilePhotoChanged = false;


/* ============ DEFAULT DATA ============ */

const DEFAULT_DATA = {
  profile: {
    name: "Jordan Ellis",
    role: "IT Support · QA · Web Development",
    tagline:
      "I keep systems running, catch what breaks before users do, and build the tools in between.",
    bio:
      "Seven years split between help desk support, QA, and full-stack development. I like the kind of work most people never see: the ticket that gets resolved before it becomes an outage, the test case that catches the bug a week early, the internal tool that saves everyone twenty minutes a day.",
    email: "jordan@example.com",
    location: "Fort Wayne, IN",
    available: true,
    respondsIn: "~1 day",
    contactSub: "Usually respond within a day. Best reached by email.",
    photo: "",
    links: [
      {
        label: "Email",
        url: "mailto:jordan@example.com"
      },
      {
        label: "GitHub",
        url: "https://github.com"
      },
      {
        label: "LinkedIn",
        url: "https://linkedin.com"
      }
    ]
  },

  skills: [
    {
      id: 1,
      category: "support-systems",
      items: [
        "Windows & macOS administration",
        "Active Directory",
        "Ticketing (Zendesk, Jira)",
        "Network troubleshooting",
        "Remote support tools"
      ]
    },

    {
      id: 2,
      category: "qa-testing",
      items: [
        "Manual & regression testing",
        "Test case design",
        "Selenium",
        "Bug tracking & triage",
        "API testing (Postman)"
      ]
    },

    {
      id: 3,
      category: "web-development",
      items: [
        "JavaScript / TypeScript",
        "React",
        "Node.js",
        "REST APIs",
        "SQL"
      ]
    }
  ],

  projects: [
    {
      id: 1,
      code: "a3f9c1",
      status: "Live",
      title: "Internal ticket triage dashboard",
      description:
        "Built a dashboard that auto-tags and routes incoming tickets by urgency, cutting average first-response time by a third.",
      tags: ["React", "Node", "Postgres"],
      link: "#"
    },

    {
      id: 2,
      code: "7bd221",
      status: "In Progress",
      title: "Regression test suite for billing flow",
      description:
        "Selenium suite covering the checkout and billing paths, running nightly against staging to catch regressions before release.",
      tags: ["Selenium", "Python", "CI"],
      link: "#"
    },

    {
      id: 3,
      code: "e10a4f",
      status: "Archived",
      title: "Asset inventory tracker",
      description:
        "Lightweight internal tool for tracking hardware assignments across the office, replacing a shared spreadsheet.",
      tags: ["Node", "SQLite"],
      link: "#"
    },

    {
      id: 4,
      code: "9c2eab",
      status: "Live",
      title: "Status page for internal services",
      description:
        "A small uptime and incident status page so the team stops asking 'is it just me' in the group chat.",
      tags: ["React", "Cron"],
      link: "#"
    }
  ],

  experience: [
    {
      id: 1,
      role: "QA & Support Engineer",
      org: "Northgate Software",
      period: "2023 — Present",
      description:
        "Own regression testing for the core product and act as the escalation point for tickets support can't resolve."
    },

    {
      id: 2,
      role: "Help Desk Technician II",
      org: "Summit Health Systems",
      period: "2021 — 2023",
      description:
        "Handled tier-2 support for a 400-person org, and built internal tooling to speed up common ticket types."
    },

    {
      id: 3,
      role: "Help Desk Technician I",
      org: "Summit Health Systems",
      period: "2019 — 2021",
      description:
        "Frontline support for hardware, software, and account issues across clinical and administrative staff."
    }
  ]
};


/* ============ API ============ */

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const body = await res.json().catch(() => ({}));

  if (res.status === 401) {
    authToken = "";
    sessionStorage.removeItem("adminToken");
    isAdmin = false;

    if (document.body) {
      document.body.classList.remove("is-admin");
    }
  }

  if (!res.ok) {
    throw new Error(
      body.error || `Request failed (${res.status})`
    );
  }

  return body;
}


/* ============ LOAD DATA ============ */

async function loadData() {
  try {
    const result = await api("/content");

    DATA =
      result.data ||
      structuredClone(DEFAULT_DATA);

  } catch (e) {
    console.error(e);

    DATA = structuredClone(DEFAULT_DATA);

    toast(
      "Backend unavailable — showing local defaults"
    );
  }
}


/* ============ SAVE DATA ============ */

async function persist(msg) {
  try {
    await api("/content", {
      method: "PUT",
      body: JSON.stringify(DATA)
    });

    if (msg) {
      toast(msg);
    }

    return true;

  } catch (e) {
    toast(
      e.message ||
      "Couldn't save — try again"
    );

    return false;
  }
}


/* ============ HELPERS ============ */

function toast(msg) {
  const t = document.getElementById("toast");

  if (!t) return;

  t.textContent = msg;

  t.classList.add("show");

  clearTimeout(window._toastTimer);

  window._toastTimer = setTimeout(() => {
    t.classList.remove("show");
  }, 2200);
}


function nextId(arr) {
  return arr.length
    ? Math.max(...arr.map(x => x.id)) + 1
    : 1;
}


function slugify(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}


function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function escapeAttr(value) {
  return escapeHtml(value);
}


/* ============ ADMIN AUTH ============ */

function openAdminModal() {
  if (isAdmin) return;

  const overlay =
    document.getElementById("loginOverlay");

  if (!overlay) return;

  overlay.classList.add("show");

  document.getElementById("loginPass").value = "";

  document.getElementById(
    "loginError"
  ).style.display = "none";

  setTimeout(() => {
    document
      .getElementById("loginPass")
      .focus();
  }, 50);
}


async function tryLogin() {
  const password =
    document.getElementById("loginPass").value;

  if (!password) return;

  try {
    const result = await api(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({
          password
        })
      }
    );

    authToken = result.token;

    sessionStorage.setItem(
      "adminToken",
      authToken
    );

    isAdmin = true;

    closeOverlay("loginOverlay");

    renderAll();

    toast("Admin mode on");

  } catch (e) {
    const el =
      document.getElementById("loginError");

    el.textContent =
      e.message === "Invalid password"
        ? "Incorrect password."
        : e.message || "Login failed.";

    el.style.display = "block";
  }
}


function signOutAdmin() {
  authToken = "";

  sessionStorage.removeItem(
    "adminToken"
  );

  isAdmin = false;

  renderAll();

  toast("Signed out of admin mode");
}


/* ============ ADMIN TOOLS ============ */

async function changeAdminPassword() {
  if (!isAdmin) return;

  const current =
    prompt("Current admin password:");

  if (current === null) return;

  const next =
    prompt(
      "New admin password (minimum 10 characters):"
    );

  if (next === null) return;

  const confirmPassword =
    prompt("Confirm new password:");

  if (next !== confirmPassword) {
    return toast(
      "Passwords do not match"
    );
  }

  if (next.length < 10) {
    return toast(
      "Password must be at least 10 characters"
    );
  }

  try {
    await api(
      "/auth/password",
      {
        method: "POST",
        body: JSON.stringify({
          currentPassword: current,
          newPassword: next
        })
      }
    );

    toast(
      "Admin password changed"
    );

  } catch (e) {
    toast(
      e.message ||
      "Could not change password"
    );
  }
}


async function exportBackup() {
  if (!isAdmin) return;

  try {
    const result =
      await api("/admin/export");

    const blob =
      new Blob(
        [
          JSON.stringify(
            result.data,
            null,
            2
          )
        ],
        {
          type: "application/json"
        }
      );

    const url =
      URL.createObjectURL(blob);

    const a =
      document.createElement("a");

    a.href = url;

    a.download =
      `portfolio-backup-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;

    a.click();

    URL.revokeObjectURL(url);

    toast("Backup exported");

  } catch (e) {
    toast("Backup failed");
  }
}


async function resetContent() {
  if (!isAdmin) return;

  const confirmed =
    confirm(
      "Reset all portfolio content to the default demo content?"
    );

  if (!confirmed) return;

  try {
    const result =
      await api(
        "/admin/reset",
        {
          method: "POST"
        }
      );

    DATA = result.data;

    renderAll();

    toast("Content reset");

  } catch (e) {
    toast("Reset failed");
  }
}


function renderAdminTools() {
  const old =
    document.getElementById(
      "adminTools"
    );

  if (old) {
    old.remove();
  }

  if (!isAdmin) return;

  const box =
    document.createElement("div");

  box.id = "adminTools";

  box.innerHTML = `
    <div style="
      position:fixed;
      top:70px;
      right:20px;
      z-index:80;
      background:var(--surface);
      border:1px solid var(--line);
      border-radius:8px;
      padding:8px;
      box-shadow:var(--shadow);
      display:flex;
      gap:6px;
      flex-wrap:wrap;
    ">
      <button
        class="btn btn-ghost btn-sm"
        onclick="changeAdminPassword()"
      >
        Change password
      </button>

      <button
        class="btn btn-ghost btn-sm"
        onclick="exportBackup()"
      >
        Backup
      </button>

      <button
        class="btn btn-danger btn-sm"
        onclick="resetContent()"
      >
        Reset
      </button>
    </div>
  `;

  document.body.appendChild(box);
}


/* ============ OVERLAY ============ */

document
  .querySelectorAll(".overlay")
  .forEach(overlay => {

    overlay.addEventListener(
      "click",
      event => {

        if (
          event.target === overlay
        ) {
          overlay.classList.remove(
            "show"
          );
        }

      }
    );

  });


function closeOverlay(id) {
  const overlay =
    document.getElementById(id);

  if (overlay) {
    overlay.classList.remove(
      "show"
    );
  }
}


/* ============ RENDER ALL ============ */

function renderAll() {
  if (!DATA) return;

  const p = DATA.profile;

  const footer =
    document.getElementById(
      "footerText"
    );

  if (footer) {
    footer.textContent =
      "~/" +
      slugify(p.name) +
      " — built and maintained by Ismail Babani";
  }

  const tagline =
    document.getElementById(
      "heroTagline"
    );

  if (tagline) {
    tagline.textContent =
      p.tagline;
  }

  const bio =
    document.getElementById(
      "bioText"
    );

  if (bio) {
    bio.textContent =
      p.bio;
  }

  const contactSub =
    document.getElementById(
      "contactSub"
    );

  if (contactSub) {
    contactSub.textContent =
      p.contactSub;
  }

  renderHeroCode();

  renderProfilePhoto();

  renderAboutGutter();

  renderSkills();

  renderProjects();

  renderExperience();

  renderContactLinks();

  document.body.classList.toggle(
    "is-admin",
    isAdmin
  );

  renderAdminTools();
}


/* ============ PROFILE PHOTO ============ */

function renderProfilePhoto() {
  const img =
    document.getElementById(
      "profilePhoto"
    );

  const placeholder =
    document.getElementById(
      "profilePhotoPlaceholder"
    );

  if (!img || !placeholder) {
    return;
  }

  const photo =
    DATA.profile.photo || "";

  if (photo) {

    img.src = photo;

    img.style.display =
      "block";

    placeholder.style.display =
      "none";

  } else {

    img.removeAttribute(
      "src"
    );

    img.style.display =
      "none";

    placeholder.style.display =
      "flex";
  }
}


function renderAdminPhotoPreview() {
  const img =
    document.getElementById(
      "adminPhotoPreviewImg"
    );

  const empty =
    document.getElementById(
      "adminPhotoPreviewEmpty"
    );

  const action =
    document.getElementById(
      "photoActionBtn"
    );

  if (!img || !empty) {
    return;
  }

  const photo =
    profilePhotoDraft || "";

  if (photo) {

    img.src = photo;

    img.style.display =
      "block";

    empty.style.display =
      "none";

    if (action) {
      action.textContent =
        "Change photo";
    }

  } else {

    img.removeAttribute(
      "src"
    );

    img.style.display =
      "none";

    empty.style.display =
      "flex";

    if (action) {
      action.textContent =
        "Add photo";
    }
  }
}


function previewSelectedPhoto() {
  const input =
    document.getElementById(
      "f-photo"
    );

  if (
    !input ||
    !input.files ||
    !input.files[0]
  ) {
    return;
  }

  const file =
    input.files[0];

  if (file.size > 750000) {

    input.value = "";

    toast(
      "Photo must be smaller than 750 KB"
    );

    renderAdminPhotoPreview();

    return;
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  if (
    !allowedTypes.includes(
      file.type
    )
  ) {

    input.value = "";

    toast(
      "Please choose a JPG, PNG, or WebP image"
    );

    return;
  }

  const reader =
    new FileReader();

  reader.onload = () => {

    profilePhotoDraft =
      reader.result;

    profilePhotoChanged =
      true;

    renderAdminPhotoPreview();

    toast(
      "Photo selected. Click Save changes to apply."
    );
  };

  reader.readAsDataURL(file);
}


function removeProfilePhoto() {
  if (!isAdmin) {
    return toast(
      "Admin login required"
    );
  }

  profilePhotoDraft = "";

  profilePhotoChanged = true;

  const input =
    document.getElementById(
      "f-photo"
    );

  if (input) {
    input.value = "";
  }

  renderAdminPhotoPreview();

  toast(
    "Photo removed. Click Save changes to apply."
  );
}


/* ============ HERO CODE ============ */

function renderHeroCode() {
  const p = DATA.profile;

  const hero =
    document.getElementById(
      "heroCode"
    );

  if (!hero) return;

  const rows = [

    `<span class="punct">{</span>`,

    `&nbsp;&nbsp;<span class="key">"name"</span><span class="punct">:</span> <span class="string">"${escapeHtml(p.name)}"</span><span class="punct">,</span>`,

    `&nbsp;&nbsp;<span class="key">"role"</span><span class="punct">:</span> <span class="string">"${escapeHtml(p.role)}"</span><span class="punct">,</span>`,

    `&nbsp;&nbsp;<span class="key">"location"</span><span class="punct">:</span> <span class="string">"${escapeHtml(p.location)}"</span><span class="punct">,</span>`,

    `&nbsp;&nbsp;<span class="key">"status"</span><span class="punct">:</span> <span class="${p.available ? "value" : "status-off"}">"${p.available ? "available" : "booked"}"</span><span class="punct">,</span> <span class="code-comment">// responds in ${escapeHtml(p.respondsIn || "~1 day")}</span>`,

    `&nbsp;&nbsp;<span class="key">"focus"</span><span class="punct">:</span> <span class="string">"IT support, QA, web development"</span>`,

    `<span class="punct">}</span>`

  ];

  hero.innerHTML =
    rows.join("<br>");
}


/* ============ ABOUT ============ */

function renderAboutGutter() {
  const gutter =
    document.getElementById(
      "aboutGutter"
    );

  if (!gutter) return;

  const lines =
    (DATA.profile.bio || "")
      .split("\n")
      .length;

  gutter.innerHTML =
    Array.from(
      {
        length:
          Math.max(
            lines,
            6
          )
      },
      (_, index) =>
        `${String(index + 1).padStart(
          2,
          "0"
        )}<br>`
    ).join("");
}


/* ============ PROFILE MODAL ============ */

function openProfileModal() {
  if (!isAdmin) {
    return toast(
      "Admin login required"
    );
  }

  const p = DATA.profile;

  document.getElementById(
    "f-name"
  ).value = p.name || "";

  document.getElementById(
    "f-role"
  ).value = p.role || "";

  document.getElementById(
    "f-tagline"
  ).value = p.tagline || "";

  document.getElementById(
    "f-bio"
  ).value = p.bio || "";

  document.getElementById(
    "f-email"
  ).value = p.email || "";

  document.getElementById(
    "f-location"
  ).value = p.location || "";

  document.getElementById(
    "f-available"
  ).checked = !!p.available;

  document.getElementById(
    "f-contactsub"
  ).value =
    p.contactSub || "";

  document.getElementById(
    "f-respond"
  ).value =
    p.respondsIn || "";

  profilePhotoDraft =
    p.photo || "";

  profilePhotoChanged =
    false;

  const photoInput =
    document.getElementById(
      "f-photo"
    );

  if (photoInput) {

    photoInput.value = "";

    photoInput.onchange =
      previewSelectedPhoto;
  }

  renderAdminPhotoPreview();

  renderLinksEditList();

  document
    .getElementById(
      "profileOverlay"
    )
    .classList.add("show");
}


function renderLinksEditList() {
  const wrap =
    document.getElementById(
      "linksEditList"
    );

  if (!wrap) return;

  wrap.innerHTML =
    (DATA.profile.links || [])
      .map(
        (link, index) => `
          <div
            class="link-edit-row"
            data-idx="${index}"
          >
            <input
              value="${escapeAttr(link.label)}"
              placeholder="Label"
              class="link-label"
            >

            <input
              value="${escapeAttr(link.url)}"
              placeholder="https://"
              class="link-url"
            >

            <button
              type="button"
              class="btn btn-danger btn-sm"
              onclick="this.closest('[data-idx]').remove()"
            >
              ✕
            </button>
          </div>
        `
      )
      .join("");
}


function addLinkRow() {
  const wrap =
    document.getElementById(
      "linksEditList"
    );

  if (!wrap) return;

  const div =
    document.createElement("div");

  div.className =
    "link-edit-row";

  div.setAttribute(
    "data-idx",
    wrap.children.length
  );

  div.innerHTML = `
    <input
      placeholder="Label"
      class="link-label"
    >

    <input
      placeholder="https://"
      class="link-url"
    >

    <button
      type="button"
      class="btn btn-danger btn-sm"
      onclick="this.closest('[data-idx]').remove()"
    >
      ✕
    </button>
  `;

  wrap.appendChild(div);
}


async function saveProfile() {
  if (!isAdmin) {
    return toast(
      "Admin login required"
    );
  }

  const p =
    DATA.profile;

  p.name =
    document
      .getElementById("f-name")
      .value
      .trim() ||
    p.name;

  p.role =
    document
      .getElementById("f-role")
      .value
      .trim();

  p.tagline =
    document
      .getElementById("f-tagline")
      .value
      .trim();

  p.bio =
    document
      .getElementById("f-bio")
      .value
      .trim();

  p.email =
    document
      .getElementById("f-email")
      .value
      .trim();

  p.location =
    document
      .getElementById("f-location")
      .value
      .trim();

  p.available =
    document
      .getElementById("f-available")
      .checked;

  p.contactSub =
    document
      .getElementById("f-contactsub")
      .value
      .trim();

  p.respondsIn =
    document
      .getElementById("f-respond")
      .value
      .trim();

  if (profilePhotoChanged) {
    p.photo =
      profilePhotoDraft;
  }

  p.links =
    Array.from(
      document.querySelectorAll(
        "#linksEditList [data-idx]"
      )
    )
      .map(row => ({
        label:
          row
            .querySelector(
              ".link-label"
            )
            .value
            .trim(),

        url:
          row
            .querySelector(
              ".link-url"
            )
            .value
            .trim()
      }))
      .filter(
        link =>
          link.label &&
          link.url
      );

  const saved =
    await persist(
      "Profile saved"
    );

  if (!saved) {
    return;
  }

  profilePhotoDraft =
    p.photo || "";

  profilePhotoChanged =
    false;

  closeOverlay(
    "profileOverlay"
  );

  renderAll();
}


/* ============ SKILLS ============ */

let editingSkillCatId = null;


function categoryIcon(category) {
  const value =
    category
      .toLowerCase()
      .replace(/\s+/g, "-");

  if (
    value.includes("qa") ||
    value.includes("test")
  ) {
    return `
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
      >
        <path d="M9 3h6"/>
        <path d="M10 3v5l-5.5 9.2A2 2 0 0 0 6.2 20h11.6a2 2 0 0 0 1.7-2.8L14 8V3"/>
        <path d="M8 15h8"/>
      </svg>
    `;
  }

  if (
    value.includes("web") ||
    value.includes("development")
  ) {
    return `
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
      >
        <path d="m8 9-4 3 4 3"/>
        <path d="m16 9 4 3-4 3"/>
        <path d="m14 5-4 14"/>
      </svg>
    `;
  }

  if (
    value.includes("support") ||
    value.includes("system")
  ) {
    return `
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
      >
        <rect x="3" y="4" width="18" height="13" rx="2"/>
        <path d="M8 21h8"/>
        <path d="M12 17v4"/>
      </svg>
    `;
  }

  return `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
    >
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 2v3"/>
      <path d="M12 19v3"/>
      <path d="m4.9 4.9 2.1 2.1"/>
      <path d="m17 17 2.1 2.1"/>
      <path d="M2 12h3"/>
      <path d="M19 12h3"/>
      <path d="m4.9 19.1 2.1-2.1"/>
      <path d="m17 7 2.1-2.1"/>
    </svg>
  `;
}


function renderSkills() {
  const grid =
    document.getElementById(
      "skillsGrid"
    );

  if (!grid) return;

  grid.innerHTML =
    DATA.skills
      .map(
        category => `
          <div class="skill-card">

            <div class="skill-head">

              <div class="skill-title-wrap">

                <div class="skill-icon">
                  ${categoryIcon(
                    category.category
                  )}
                </div>

                <h3 class="skill-title">
                  ${escapeHtml(
                    category.category
                  )}
                </h3>

              </div>

              <div class="skill-actions admin-only">

                <button
                  class="btn btn-ghost btn-sm"
                  onclick="editSkillCat(${category.id})"
                >
                  Edit
                </button>

                <button
                  class="btn btn-danger btn-sm"
                  onclick="deleteSkillCat(${category.id})"
                >
                  Delete
                </button>

              </div>

            </div>

            <div class="skill-list">

              ${category.items
                .map(
                  (item, index) => `
                    <span class="skill-tag">
                      ${escapeHtml(item)}

                      ${
                        isAdmin
                          ? `
                            <button
                              type="button"
                              onclick="removeSkillItem(${category.id},${index})"
                              style="
                                border:0;
                                background:none;
                                color:var(--rose);
                                margin-left:5px;
                                padding:0;
                              "
                            >
                              ×
                            </button>
                          `
                          : ""
                      }

                    </span>
                  `
                )
                .join("")}

            </div>

            ${
              isAdmin
                ? `
                  <button
                    class="add-btn"
                    style="margin-top:15px;"
                    onclick="openSkillItemModal(${category.id})"
                  >
                    + add skill
                  </button>
                `
                : ""
            }

          </div>
        `
      )
      .join("");
}


function openSkillCatModal(catId) {
  if (!isAdmin) {
    return toast(
      "Admin login required"
    );
  }

  editingSkillCatId =
    catId || null;

  document.getElementById(
    "skillCatModalTitle"
  ).textContent =
    catId
      ? "rename category"
      : "add category";

  document.getElementById(
    "sc-name"
  ).value =
    catId
      ? DATA.skills.find(
          category =>
            category.id === catId
        ).category
      : "";

  document
    .getElementById(
      "skillCatOverlay"
    )
    .classList.add("show");

  setTimeout(() => {
    document
      .getElementById("sc-name")
      .focus();
  }, 50);
}


function editSkillCat(id) {
  openSkillCatModal(id);
}


async function saveSkillCat() {
  if (!isAdmin) {
    return toast(
      "Admin login required"
    );
  }

  const name =
    document
      .getElementById("sc-name")
      .value
      .trim();

  if (!name) return;

  if (editingSkillCatId) {

    const category =
      DATA.skills.find(
        item =>
          item.id ===
          editingSkillCatId
      );

    if (category) {
      category.category =
        name;
    }

  } else {

    DATA.skills.push({
      id: nextId(DATA.skills),
      category: name,
      items: []
    });

  }

  closeOverlay(
    "skillCatOverlay"
  );

  renderAll();

  await persist(
    "Category saved"
  );
}


async function deleteSkillCat(id) {
  if (!isAdmin) {
    return toast(
      "Admin login required"
    );
  }

  if (
    !confirm(
      "Delete this skill category?"
    )
  ) {
    return;
  }

  DATA.skills =
    DATA.skills.filter(
      category =>
        category.id !== id
    );

  renderAll();

  await persist(
    "Category deleted"
  );
}


let editingSkillItemCatId = null;


function openSkillItemModal(catId) {
  if (!isAdmin) {
    return toast(
      "Admin login required"
    );
  }

  editingSkillItemCatId =
    catId;

  document.getElementById(
    "si-name"
  ).value = "";

  document
    .getElementById(
      "skillItemOverlay"
    )
    .classList.add("show");

  setTimeout(() => {
    document
      .getElementById("si-name")
      .focus();
  }, 50);
}


async function saveSkillItem() {
  if (!isAdmin) {
    return toast(
      "Admin login required"
    );
  }

  const value =
    document
      .getElementById("si-name")
      .value
      .trim();

  if (!value) return;

  const category =
    DATA.skills.find(
      item =>
        item.id ===
        editingSkillItemCatId
    );

  if (!category) return;

  category.items.push(
    value
  );

  closeOverlay(
    "skillItemOverlay"
  );

  renderAll();

  await persist(
    "Skill added"
  );
}


async function removeSkillItem(
  catId,
  index
) {
  if (!isAdmin) {
    return toast(
      "Admin login required"
    );
  }

  const category =
    DATA.skills.find(
      item =>
        item.id === catId
    );

  if (!category) return;

  category.items.splice(
    index,
    1
  );

  renderAll();

  await persist(
    "Skill removed"
  );
}


/* ============ PROJECTS ============ */

let editingProjectId = null;


function renderProjects() {
  const grid =
    document.getElementById(
      "projectsGrid"
    );

  if (!grid) return;

  grid.innerHTML =
    DATA.projects
      .map(project => {

        let statusClass =
          "status-live";

        if (
          project.status ===
          "In Progress"
        ) {
          statusClass =
            "status-progress";
        }

        if (
          project.status ===
          "Archived"
        ) {
          statusClass =
            "status-archived";
        }

        return `
          <div class="log-entry">

            <div class="log-hash">
              #${escapeHtml(
                project.code
              )}
            </div>

            <div>

              <h3 class="log-title">
                ${
                  project.link &&
                  project.link !== "#"
                    ? `
                      <a
                        href="${escapeAttr(
                          project.link
                        )}"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        ${escapeHtml(
                          project.title
                        )}
                      </a>
                    `
                    : escapeHtml(
                        project.title
                      )
                }
              </h3>

              <p class="log-desc">
                ${escapeHtml(
                  project.description
                )}
              </p>

              <div class="log-tags">
                ${project.tags
                  .map(
                    tag =>
                      `<span class="log-tag">
                        ${escapeHtml(
                          tag
                        )}
                      </span>`
                  )
                  .join("")}
              </div>

              ${
                isAdmin
                  ? `
                    <div
                      class="entry-actions"
                      style="margin-top:12px;"
                    >
                      <button
                        class="btn btn-ghost btn-sm"
                        onclick="openProjectModal(${project.id})"
                      >
                        Edit
                      </button>
                    </div>
                  `
                  : ""
              }

            </div>

            <div class="log-status ${statusClass}">
              ● ${escapeHtml(
                project.status
              )}
            </div>

          </div>
        `;
      })
      .join("");
}


function openProjectModal(id) {
  if (!isAdmin) {
    return toast(
      "Admin login required"
    );
  }

  editingProjectId =
    id || null;

  const isEdit =
    !!id;

  document.getElementById(
    "projectModalTitle"
  ).textContent =
    isEdit
      ? "edit entry"
      : "add entry";

  document.getElementById(
    "projectDeleteBtn"
  ).style.display =
    isEdit
      ? "inline-flex"
      : "none";

  const project =
    isEdit
      ? DATA.projects.find(
          item =>
            item.id === id
        )
      : {
          code: "",
          status: "Live",
          title: "",
          description: "",
          tags: [],
          link: ""
        };

  if (!project) return;

  document.getElementById(
    "p-code"
  ).value =
    project.code || "";

  document.getElementById(
    "p-status"
  ).value =
    project.status || "Live";

  document.getElementById(
    "p-title"
  ).value =
    project.title || "";

  document.getElementById(
    "p-desc"
  ).value =
    project.description || "";

  document.getElementById(
    "p-tags"
  ).value =
    (project.tags || []).join(
      ", "
    );

  document.getElementById(
    "p-link"
  ).value =
    project.link || "";

  document
    .getElementById(
      "projectOverlay"
    )
    .classList.add("show");
}


function randomHash() {
  return Math.random()
    .toString(16)
    .slice(2, 8);
}


async function saveProject() {
  if (!isAdmin) {
    return toast(
      "Admin login required"
    );
  }

  const project = {
    code:
      document
        .getElementById("p-code")
        .value
        .trim() ||
      randomHash(),

    status:
      document
        .getElementById("p-status")
        .value,

    title:
      document
        .getElementById("p-title")
        .value
        .trim(),

    description:
      document
        .getElementById("p-desc")
        .value
        .trim(),

    tags:
      document
        .getElementById("p-tags")
        .value
        .split(",")
        .map(tag => tag.trim())
        .filter(Boolean),

    link:
      document
        .getElementById("p-link")
        .value
        .trim() ||
      "#"
  };

  if (!project.title) {
    return toast(
      "Give the entry a title first"
    );
  }

  if (editingProjectId) {

    const index =
      DATA.projects.findIndex(
        item =>
          item.id ===
          editingProjectId
      );

    if (index !== -1) {
      DATA.projects[index] = {
        ...DATA.projects[index],
        ...project
      };
    }

  } else {

    DATA.projects.unshift({
      id: nextId(
        DATA.projects
      ),
      ...project
    });

  }

  closeOverlay(
    "projectOverlay"
  );

  renderAll();

  await persist(
    "Entry saved"
  );
}


async function deleteCurrentProject() {
  if (!isAdmin) {
    return toast(
      "Admin login required"
    );
  }

  if (
    !confirm(
      "Delete this project?"
    )
  ) {
    return;
  }

  DATA.projects =
    DATA.projects.filter(
      project =>
        project.id !==
        editingProjectId
    );

  closeOverlay(
    "projectOverlay"
  );

  renderAll();

  await persist(
    "Entry deleted"
  );
}


/* ============ EXPERIENCE ============ */

let editingExpId = null;


function renderExperience() {
  const timeline =
    document.getElementById(
      "timeline"
    );

  if (!timeline) return;

  timeline.innerHTML =
    DATA.experience
      .map(
        experience => `
          <div class="exp-entry">

            <div class="exp-period">
              ${escapeHtml(
                experience.period
              )}
            </div>

            <div>

              <h3 class="exp-role">
                ${escapeHtml(
                  experience.role
                )}
              </h3>

              <p class="exp-org">
                ${escapeHtml(
                  experience.org
                )}
              </p>

              <p class="exp-desc">
                ${escapeHtml(
                  experience.description
                )}
              </p>

            </div>

            ${
              isAdmin
                ? `
                  <div class="exp-actions">
                    <button
                      class="btn btn-ghost btn-sm"
                      onclick="openExperienceModal(${experience.id})"
                    >
                      Edit
                    </button>
                  </div>
                `
                : ""
            }

          </div>
        `
      )
      .join("");
}


function openExperienceModal(id) {
  if (!isAdmin) {
    return toast(
      "Admin login required"
    );
  }

  editingExpId =
    id || null;

  const isEdit =
    !!id;

  document.getElementById(
    "expModalTitle"
  ).textContent =
    isEdit
      ? "edit role"
      : "add role";

  document.getElementById(
    "expDeleteBtn"
  ).style.display =
    isEdit
      ? "inline-flex"
      : "none";

  const experience =
    isEdit
      ? DATA.experience.find(
          item =>
            item.id === id
        )
      : {
          role: "",
          org: "",
          period: "",
          description: ""
        };

  if (!experience) return;

  document.getElementById(
    "e-role"
  ).value =
    experience.role || "";

  document.getElementById(
    "e-org"
  ).value =
    experience.org || "";

  document.getElementById(
    "e-period"
  ).value =
    experience.period || "";

  document.getElementById(
    "e-desc"
  ).value =
    experience.description || "";

  document
    .getElementById(
      "experienceOverlay"
    )
    .classList.add("show");
}


async function saveExperience() {
  if (!isAdmin) {
    return toast(
      "Admin login required"
    );
  }

  const experience = {
    role:
      document
        .getElementById("e-role")
        .value
        .trim(),

    org:
      document
        .getElementById("e-org")
        .value
        .trim(),

    period:
      document
        .getElementById("e-period")
        .value
        .trim(),

    description:
      document
        .getElementById("e-desc")
        .value
        .trim()
  };

  if (!experience.role) {
    return toast(
      "Give the role a title first"
    );
  }

  if (editingExpId) {

    const index =
      DATA.experience.findIndex(
        item =>
          item.id ===
          editingExpId
      );

    if (index !== -1) {
      DATA.experience[index] = {
        ...DATA.experience[index],
        ...experience
      };
    }

  } else {

    DATA.experience.unshift({
      id: nextId(
        DATA.experience
      ),
      ...experience
    });

  }

  closeOverlay(
    "experienceOverlay"
  );

  renderAll();

  await persist(
    "Experience saved"
  );
}


async function deleteCurrentExperience() {
  if (!isAdmin) {
    return toast(
      "Admin login required"
    );
  }

  if (
    !confirm(
      "Delete this experience entry?"
    )
  ) {
    return;
  }

  DATA.experience =
    DATA.experience.filter(
      experience =>
        experience.id !==
        editingExpId
    );

  closeOverlay(
    "experienceOverlay"
  );

  renderAll();

  await persist(
    "Entry deleted"
  );
}


/* ============ CONTACT ============ */

function renderContactLinks() {
  const container =
    document.getElementById(
      "contactLinks"
    );

  if (!container) return;

  const links =
    DATA.profile.links || [];

  container.innerHTML =
    links
      .map(
        link => `
          <a
            class="contact-link"
            href="${escapeAttr(
              link.url
            )}"
            ${
              link.url.startsWith(
                "http"
              )
                ? 'target="_blank" rel="noopener noreferrer"'
                : ""
            }
          >
            ${escapeHtml(
              link.label
            )}
          </a>
        `
      )
      .join("");
}


/* ============ ADMIN KEY ============ */

/*
  Admin is intentionally hidden from
  the public navigation.

  Press:
  Ctrl + Alt + A

  to open the admin login.
*/

document.addEventListener(
  "keydown",
  event => {

    if (
      event.ctrlKey &&
      event.altKey &&
      event.key.toLowerCase() === "a"
    ) {
      event.preventDefault();

      if (isAdmin) {
        toast(
          "Already in admin mode"
        );
      } else {
        openAdminModal();
      }
    }

  }
);


/* ============ INIT ============ */
/* ============ ABOUT EDITOR ============ */

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


function openAboutModal() {
  if (!isAdmin) {
    return toast(
      "Admin login required"
    );
  }

  createAboutEditor();

  const textarea =
    document.getElementById(
      "about-editor"
    );

  if (!textarea) {
    return toast(
      "About editor is not available"
    );
  }

  textarea.value =
    DATA &&
    DATA.profile &&
    typeof DATA.profile.bio === "string"
      ? DATA.profile.bio
      : "";

  document
    .getElementById("aboutOverlay")
    .classList.add("show");

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
    return toast(
      "Admin login required"
    );
  }

  const textarea =
    document.getElementById(
      "about-editor"
    );

  if (!textarea) {
    return toast(
      "About editor is not available"
    );
  }

  const bio =
    textarea.value.trim();

  if (!DATA.profile) {
    DATA.profile = {};
  }

  DATA.profile.bio = bio;

  const saved =
    await persist(
      "About saved"
    );

  if (!saved) {
    return;
  }

  closeOverlay(
    "aboutOverlay"
  );

  renderAll();
}

(async function init() {

  await loadData();

  renderAll();

  // Direct admin URL: /admin
  if (window.location.pathname.replace(/\/$/, "") === "/admin") {
    if (isAdmin) {
      toast("Already in admin mode");
    } else {
      openAdminModal();
    }
  }

})();
