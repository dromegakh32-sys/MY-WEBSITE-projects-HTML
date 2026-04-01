const body = document.body;
const themeToggle = document.querySelector(".theme-toggle");
const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");
const navLinks = document.querySelectorAll(".site-nav a");
const revealItems = document.querySelectorAll(".reveal");
const sections = document.querySelectorAll("main section[id]");
const siteHeader = document.querySelector(".site-header");
const contactForm = document.querySelector("#contact-form");
const formNote = document.querySelector("#form-note");
const projectsGrid = document.querySelector("#projects-grid");
const projectModal = document.querySelector("#project-modal");
const openProjectModalButton = document.querySelector("#open-project-modal");
const closeProjectModalButton = document.querySelector("#close-project-modal");
const projectForm = document.querySelector("#project-form");
const projectFilesInput = document.querySelector("#project-files");

const THEME_STORAGE_KEY = "portfolio-theme";
const PROJECTS_STORAGE_KEY = "portfolio-custom-projects-v2";
const CONTACT_EMAIL = "dr.omegakh32@gmail.com";
let pendingFiles = [];

const applyTheme = (theme) => {
  const isLight = theme === "light";
  body.classList.toggle("light-theme", isLight);
  body.setAttribute("data-theme", isLight ? "light" : "dark");
};

const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
applyTheme(savedTheme === "light" ? "light" : "dark");

themeToggle?.addEventListener("click", () => {
  const nextTheme = body.classList.contains("light-theme") ? "dark" : "light";
  applyTheme(nextTheme);
  localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
});

const closeMobileNav = () => {
  navToggle?.setAttribute("aria-expanded", "false");
  siteNav?.classList.remove("is-open");
};

navToggle?.addEventListener("click", () => {
  const expanded = navToggle.getAttribute("aria-expanded") === "true";
  navToggle.setAttribute("aria-expanded", String(!expanded));
  siteNav?.classList.toggle("is-open", !expanded);
});

navLinks.forEach((link) => {
  link.addEventListener("click", closeMobileNav);
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 820) {
    closeMobileNav();
  }
});

window.addEventListener("scroll", () => {
  siteHeader?.classList.toggle("is-scrolled", window.scrollY > 16);
});

const revealObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  },
  {
    threshold: 0.2,
    rootMargin: "0px 0px -40px 0px",
  }
);

revealItems.forEach((item) => revealObserver.observe(item));

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      navLinks.forEach((link) => {
        const isActive = link.getAttribute("href") === `#${entry.target.id}`;
        link.classList.toggle("active", isActive);
      });
    });
  },
  {
    threshold: 0.45,
    rootMargin: "-20% 0px -35% 0px",
  }
);

sections.forEach((section) => sectionObserver.observe(section));

const readStoredProjects = () => {
  try {
    return JSON.parse(localStorage.getItem(PROJECTS_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
};

const saveStoredProjects = (projects) => {
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
};

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const normalizeCodePreview = (content) => {
  const lines = String(content || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .slice(0, 8);

  if (!lines.length || (lines.length === 1 && !lines[0])) {
    return {
      preview: "// Preview unavailable for this file type",
      lineCount: 1,
    };
  }

  return {
    preview: lines.join("\n"),
    lineCount: lines.length,
  };
};

const buildLineNumbers = (count) =>
  Array.from({ length: count }, (_, index) => `<span>${index + 1}</span>`).join("");

const repoCardMarkup = (project, index) => {
  const fileTags = (project.files || []).slice(0, 6).map((file) => `<span>${escapeHtml(file)}</span>`).join("");
  const codeData = normalizeCodePreview(project.preview || "");

  return `
    <article class="project-repo-card project-repo-card--custom is-visible">
      <div class="project-repo-card__topbar">
        <span class="project-repo-card__dot"></span>
        <span class="project-repo-card__dot"></span>
        <span class="project-repo-card__dot"></span>
        <p class="project-repo-card__path">portfolio/${escapeHtml(project.repo)}</p>
      </div>
      <div class="project-repo-card__header">
        <div>
          <p class="project-tag">${escapeHtml(project.category)}</p>
          <h3>${escapeHtml(project.title)}</h3>
        </div>
        <div class="project-repo-card__header-actions">
          <a href="${escapeHtml(project.link)}" target="_blank" rel="noreferrer">Open Repo</a>
          <button class="project-remove" type="button" data-project-index="${index}">Remove</button>
        </div>
      </div>
      <p class="project-repo-card__description">${escapeHtml(project.description)}</p>
      <div class="project-repo-card__files">${fileTags || "<span>README.md</span>"}</div>
      <div class="project-repo-card__editor">
        <div class="project-repo-card__line-numbers">${buildLineNumbers(codeData.lineCount)}</div>
        <pre class="project-repo-card__code"><code>${escapeHtml(codeData.preview)}</code></pre>
      </div>
    </article>
  `;
};

const renderStoredProjects = () => {
  const existingCustomProjects = projectsGrid?.querySelectorAll(".project-repo-card--custom");
  existingCustomProjects?.forEach((card) => card.remove());

  const storedProjects = readStoredProjects();
  storedProjects.forEach((project, index) => {
    projectsGrid?.insertAdjacentHTML("beforeend", repoCardMarkup(project, index));
  });
};

const openProjectModal = () => {
  projectModal?.classList.add("is-open");
  projectModal?.setAttribute("aria-hidden", "false");
  body.classList.add("modal-open");
  projectForm?.querySelector('input[name="repo"]')?.focus();
};

const closeProjectModal = () => {
  projectModal?.classList.remove("is-open");
  projectModal?.setAttribute("aria-hidden", "true");
  body.classList.remove("modal-open");
  projectForm?.reset();
  pendingFiles = [];
};

openProjectModalButton?.addEventListener("click", () => {
  pendingFiles = [];
  projectFilesInput?.click();
});

projectFilesInput?.addEventListener("change", () => {
  pendingFiles = projectFilesInput?.files ? Array.from(projectFilesInput.files) : [];
  openProjectModal();
});

closeProjectModalButton?.addEventListener("click", closeProjectModal);
projectModal?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (target.dataset.closeModal === "true") {
    closeProjectModal();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && projectModal?.classList.contains("is-open")) {
    closeProjectModal();
  }
});

const readFirstTextFile = async (files) => {
  const readableFile = Array.from(files).find((file) => file.type.startsWith("text/") || /\.(py|js|ts|html|css|md|json|txt|sql)$/i.test(file.name));

  if (!readableFile) {
    return "// Preview unavailable for binary files";
  }

  return await readableFile.text();
};

projectForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(projectForm);
  const selectedFiles = pendingFiles.length ? pendingFiles : projectFilesInput?.files ? Array.from(projectFilesInput.files) : [];
  const previewContent = await readFirstTextFile(selectedFiles);

  const project = {
    repo: String(formData.get("repo") || "new-project").trim(),
    category: String(formData.get("category") || "New Project").trim(),
    title: String(formData.get("title") || "Untitled Project").trim(),
    description: String(formData.get("description") || "").trim(),
    link: String(formData.get("link") || "#").trim(),
    files: selectedFiles.map((file) => file.name),
    preview: previewContent,
  };

  const storedProjects = readStoredProjects();
  storedProjects.push(project);
  saveStoredProjects(storedProjects);
  renderStoredProjects();
  closeProjectModal();
});

projectsGrid?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement) || !target.matches(".project-remove")) {
    return;
  }

  const projectIndex = Number(target.dataset.projectIndex);
  const storedProjects = readStoredProjects().filter((_, index) => index !== projectIndex);
  saveStoredProjects(storedProjects);
  renderStoredProjects();
});

contactForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(contactForm);
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const subject = String(formData.get("subject") || "").trim();
  const message = String(formData.get("message") || "").trim();

  const emailSubject = encodeURIComponent(subject || `Portfolio message from ${name}`);
  const emailBody = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`);

  if (formNote) {
    formNote.textContent = "Opening your email app with the message filled in.";
  }

  window.location.href = `mailto:${CONTACT_EMAIL}?subject=${emailSubject}&body=${emailBody}`;
});

renderStoredProjects();
