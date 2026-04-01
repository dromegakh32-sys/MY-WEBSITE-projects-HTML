(() => {
  const authApi = window.__portfolioAuth;
  const auth = authApi?.getAuth?.();

  const gate = document.querySelector("#projects-login-gate");
  const gateButton = document.querySelector("#projects-login-button");
  if (!auth) {
    gate?.classList.add("is-visible");
    gateButton?.addEventListener("click", () => authApi?.openLogin?.());
    return;
  }

  const isOwner = authApi.isOwner(auth.email);
  const PROJECTS_KEY = "portfolio-projects";
  const COMMENTS_KEY = "portfolio-project-comments";
  const LIKES_KEY = "portfolio-project-likes";

  const projectsGrid = document.querySelector("#projects-grid");
  const projectModal = document.querySelector("#project-modal");
  const openProjectModalButton = document.querySelector("#open-project-modal");
  const closeProjectModalButton = document.querySelector("#close-project-modal");
  const projectForm = document.querySelector("#project-form");
  const projectFilesInput = document.querySelector("#project-file-picker");
  const selectedFilesNote = document.querySelector("#selected-files-note");

  const repoViewer = document.querySelector("#repo-viewer");
  const repoFiles = document.querySelector("#repo-files");
  const repoCode = document.querySelector("#repo-code");
  const repoFileName = document.querySelector("#repo-file-name");
  const repoEditMode = document.querySelector("#repo-edit-mode");
  const repoSave = document.querySelector("#repo-save");
  const repoExpand = document.querySelector("#repo-expand");
  const closeRepoViewer = document.querySelector("#close-repo-viewer");
  const repoComments = document.querySelector("#repo-comments");
  const repoCommentForm = document.querySelector("#repo-comment-form");
  const repoLike = document.querySelector("#repo-like");
  const repoLikeCount = document.querySelector("#repo-like-count");
  const repoErrors = document.querySelector("#repo-errors");
  const repoContext = document.querySelector("#repo-context");

  let pendingFiles = [];
  let activeProjectId = null;
  let activeFilePath = null;

  const loadProjects = () => JSON.parse(localStorage.getItem(PROJECTS_KEY) || "[]");
  const saveProjects = (items) => localStorage.setItem(PROJECTS_KEY, JSON.stringify(items));

  const loadComments = () => JSON.parse(localStorage.getItem(COMMENTS_KEY) || "{}");
  const saveComments = (items) => localStorage.setItem(COMMENTS_KEY, JSON.stringify(items));

  const loadLikes = () => JSON.parse(localStorage.getItem(LIKES_KEY) || "{}");
  const saveLikes = (items) => localStorage.setItem(LIKES_KEY, JSON.stringify(items));

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
      return { preview: "// Preview unavailable", lineCount: 1 };
    }
    return { preview: lines.join("\n"), lineCount: lines.length };
  };

  const buildLineNumbers = (count) =>
    Array.from({ length: count }, (_, index) => `<span>${index + 1}</span>`).join("");

  const detectLanguage = (filePath) => {
    const lower = filePath.toLowerCase();
    if (lower.endsWith(".py")) return "Python";
    if (lower.endsWith(".js")) return "JavaScript";
    if (lower.endsWith(".cpp") || lower.endsWith(".cc") || lower.endsWith(".cxx")) return "C++";
    if (lower.endsWith(".html")) return "HTML";
    if (lower.endsWith(".css")) return "CSS";
    return "Text";
  };

  const analyzeCode = (filePath, content) => {
    if (!repoErrors) return;
    const errors = [];
    const text = String(content || "");
    const lang = detectLanguage(filePath);

    const stackCheck = (openChar, closeChar) => {
      let balance = 0;
      for (const ch of text) {
        if (ch === openChar) balance += 1;
        if (ch === closeChar) balance -= 1;
      }
      if (balance !== 0) {
        errors.push(`${lang}: Unbalanced ${openChar}${closeChar} brackets.`);
      }
    };

    if (["JavaScript", "C++", "HTML", "CSS"].includes(lang)) {
      stackCheck("{", "}");
      stackCheck("(", ")");
      stackCheck("[", "]");
    }

    if (lang === "Python") {
      const hasTabs = text.split("\n").some((line) => line.startsWith("\t"));
      if (hasTabs) {
        errors.push("Python: Avoid mixing tabs. Use spaces for indentation.");
      }
      if (text.includes("print(") && !text.includes(")")) {
        errors.push("Python: Possible missing closing parenthesis.");
      }
    }

    repoErrors.innerHTML = errors.length
      ? errors.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
      : "<li>No issues detected.</li>";
  };

  const repoCardMarkup = (project) => {
    const fileTags = project.files
      .slice(0, 6)
      .map((file) => `<span>${escapeHtml(file)}</span>`)
      .join("");
    const codeData = normalizeCodePreview(project.preview || "");

    return `
      <article class="project-repo-card project-repo-card--custom" data-project-id="${project.id}">
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
            ${isOwner ? `<button class="project-remove" type="button" data-remove="${project.id}">Remove</button>` : ""}
          </div>
        </div>
        <p class="project-repo-card__description">${escapeHtml(project.description)}</p>
        <div class="project-repo-card__files">${fileTags || "<span>README.md</span>"}</div>
        <div class="project-repo-card__editor">
          <div class="project-repo-card__line-numbers">${buildLineNumbers(codeData.lineCount)}</div>
          <pre class="project-repo-card__code"><code>${escapeHtml(codeData.preview)}</code></pre>
        </div>
        <div class="project-card__actions">
          <button class="repo-open" type="button" data-open="${project.id}">Open Files</button>
          <button class="repo-comment" type="button" data-comment="${project.id}">Comments</button>
          <button class="repo-like" type="button" data-like="${project.id}">Like</button>
        </div>
      </article>
    `;
  };

  const renderProjects = () => {
    const projects = loadProjects();
    projectsGrid.innerHTML = projects.map(repoCardMarkup).join("");
  };

  const openProjectModal = () => {
    projectModal?.classList.add("is-open");
    projectModal?.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    projectForm?.querySelector('input[name="repo"]')?.focus();
  };

  const closeProjectModal = () => {
    projectModal?.classList.remove("is-open");
    projectModal?.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    projectForm?.reset();
    pendingFiles = [];
    if (selectedFilesNote) {
      selectedFilesNote.textContent = "No folder selected.";
    }
  };

  openProjectModalButton?.addEventListener("click", () => {
    if (!isOwner) {
      alert("Upload is available for the owner only.");
      return;
    }
    pendingFiles = [];
    if (projectFilesInput) {
      projectFilesInput.value = "";
      try {
        if (typeof projectFilesInput.showPicker === "function") {
          projectFilesInput.showPicker();
        } else {
          projectFilesInput.click();
        }
      } catch {
        projectFilesInput.click();
      }
    }
  });

  projectFilesInput?.addEventListener("change", () => {
    pendingFiles = projectFilesInput?.files ? Array.from(projectFilesInput.files) : [];
    if (selectedFilesNote) {
      selectedFilesNote.textContent = pendingFiles.length
        ? `Selected ${pendingFiles.length} files.`
        : "No folder selected.";
    }
    if (pendingFiles.length) {
      openProjectModal();
    }
  });

  closeProjectModalButton?.addEventListener("click", closeProjectModal);
  projectModal?.addEventListener("click", (event) => {
    if (event.target?.dataset?.closeModal === "true") {
      closeProjectModal();
    }
  });

  const readFirstTextFile = async (files) => {
    const readableFile = files.find(
      (file) => file.type.startsWith("text/") || /\.(py|js|ts|html|css|md|json|txt|sql|cpp|cxx|cc)$/i.test(file.name)
    );
    if (!readableFile) return "// Preview unavailable";
    return await readableFile.text();
  };

  const readFileContents = async (files) => {
    const contents = {};
    for (const file of files) {
      const isText = file.type.startsWith("text/") || /\.(py|js|ts|html|css|md|json|txt|sql|cpp|cxx|cc)$/i.test(file.name);
      contents[file.webkitRelativePath || file.name] = isText ? await file.text() : "// Binary file";
    }
    return contents;
  };

  projectForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!isOwner) return;

    const formData = new FormData(projectForm);
    const selectedFiles = pendingFiles.length
      ? pendingFiles
      : projectFilesInput?.files
        ? Array.from(projectFilesInput.files)
        : [];

    if (!selectedFiles.length) {
      alert("Please select a folder before saving the project.");
      return;
    }

    const preview = await readFirstTextFile(selectedFiles);
    const filesContent = await readFileContents(selectedFiles);

    const project = {
      id: crypto.randomUUID(),
      repo: String(formData.get("repo") || "new-project").trim(),
      category: String(formData.get("category") || "New Project").trim(),
      title: String(formData.get("title") || "Untitled Project").trim(),
      description: String(formData.get("description") || "").trim(),
      link: "#",
      files: selectedFiles.map((file) => file.webkitRelativePath || file.name),
      preview,
      filesContent,
    };

    const projects = loadProjects();
    projects.push(project);
    saveProjects(projects);
    renderProjects();
    closeProjectModal();
  });

  const openRepoViewer = (projectId) => {
    const projects = loadProjects();
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;

    activeProjectId = projectId;
    activeFilePath = null;

    repoFiles.innerHTML = project.files
      .map((file) => `<button type="button" data-file="${escapeHtml(file)}">${escapeHtml(file)}</button>`)
      .join("");

    repoCode.value = "";
    repoFileName.textContent = "Select a file";
    repoCode.readOnly = !isOwner;
    repoSave.style.display = isOwner ? "inline-flex" : "none";
    repoEditMode.textContent = isOwner ? "Editor" : "Viewer";
    if (repoErrors) repoErrors.innerHTML = "<li>No issues detected.</li>";

    updateComments(projectId);
    updateLikes(projectId);

    repoViewer.classList.add("is-open");
    repoViewer.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  };

  const openRepoViewerAtComments = (projectId) => {
    openRepoViewer(projectId);
    requestAnimationFrame(() => {
      repoComments?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const closeRepo = () => {
    repoViewer.classList.remove("is-open");
    repoViewer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  };

  closeRepoViewer?.addEventListener("click", closeRepo);
  repoViewer?.addEventListener("click", (event) => {
    if (event.target?.dataset?.closeRepo === "true") closeRepo();
  });

  repoExpand?.addEventListener("click", () => {
    repoViewer.classList.toggle("is-expanded");
    repoExpand.textContent = repoViewer.classList.contains("is-expanded") ? "Shrink Editor" : "Expand Editor";
  });

  repoFiles?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const filePath = target.dataset.file;
    if (!filePath || !activeProjectId) return;

    const project = loadProjects().find((item) => item.id === activeProjectId);
    if (!project) return;

    activeFilePath = filePath;
    const language = detectLanguage(filePath);
    repoFileName.textContent = filePath;
    repoEditMode.textContent = `${isOwner ? "Editor" : "Viewer"} · ${language}`;
    repoCode.value = project.filesContent[filePath] || "";
    analyzeCode(filePath, repoCode.value);
  });

  repoCode?.addEventListener("input", () => {
    if (!activeFilePath) return;
    analyzeCode(activeFilePath, repoCode.value);
  });

  repoSave?.addEventListener("click", () => {
    if (!isOwner || !activeProjectId || !activeFilePath) return;
    const projects = loadProjects();
    const project = projects.find((item) => item.id === activeProjectId);
    if (!project) return;

    project.filesContent[activeFilePath] = repoCode.value;
    project.preview = repoCode.value;
    saveProjects(projects);
    renderProjects();
  });

  const updateComments = (projectId) => {
    const comments = loadComments();
    const list = comments[projectId] || [];
    repoComments.innerHTML = list
      .map((item) => `<div class="comment-item"><strong>${escapeHtml(item.name)}</strong><p>${escapeHtml(item.text)}</p></div>`)
      .join("");
  };

  const updateLikes = (projectId) => {
    const likes = loadLikes();
    const list = likes[projectId] || [];
    repoLikeCount.textContent = String(list.length);
  };

  repoCommentForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!activeProjectId) return;

    const input = repoCommentForm.querySelector("input[name='comment']");
    const text = (input?.value || "").trim();
    if (!text) return;

    const comments = loadComments();
    comments[activeProjectId] = comments[activeProjectId] || [];
    comments[activeProjectId].push({ name: auth.name, text });
    saveComments(comments);
    if (input) input.value = "";
    updateComments(activeProjectId);

    authApi.addOwnerNotification({
      title: "New comment",
      meta: `${auth.name} (${auth.email})`,
      text,
      email: auth.email
    });
  });

  repoLike?.addEventListener("click", () => {
    if (!activeProjectId) return;
    const likes = loadLikes();
    likes[activeProjectId] = likes[activeProjectId] || [];
    const entry = `${auth.email}`;
    if (!likes[activeProjectId].includes(entry)) {
      likes[activeProjectId].push(entry);
    }
    saveLikes(likes);
    updateLikes(activeProjectId);
  });

  projectsGrid?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const openId = target.dataset.open;
    const removeId = target.dataset.remove;
    const likeId = target.dataset.like;
    const commentId = target.dataset.comment;

    if (openId) {
      openRepoViewer(openId);
    }

    if (commentId) {
      openRepoViewerAtComments(commentId);
    }

    if (removeId && isOwner) {
      const projects = loadProjects().filter((item) => item.id !== removeId);
      saveProjects(projects);
      renderProjects();
    }

    if (likeId) {
      activeProjectId = likeId;
      updateLikes(likeId);
    }
  });

  projectsGrid?.addEventListener("dblclick", (event) => {
    const target = event.target;
    const card = target.closest(".project-repo-card");
    if (!card) return;
    const projectId = card.dataset.projectId;
    if (projectId) openRepoViewer(projectId);
  });

  repoFiles?.addEventListener("contextmenu", (event) => {
    if (!isOwner) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const filePath = target.dataset.file;
    if (!filePath || !repoContext) return;
    event.preventDefault();
    repoContext.style.top = `${event.clientY}px`;
    repoContext.style.left = `${event.clientX}px`;
    repoContext.dataset.file = filePath;
    repoContext.classList.add("is-open");
    repoContext.setAttribute("aria-hidden", "false");
  });

  document.addEventListener("click", (event) => {
    if (!repoContext || !repoContext.classList.contains("is-open")) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (repoContext.contains(target)) return;
    repoContext.classList.remove("is-open");
    repoContext.setAttribute("aria-hidden", "true");
  });

  repoContext?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.action;
    const filePath = repoContext.dataset.file;
    if (!action || !filePath || !activeProjectId) return;

    const projects = loadProjects();
    const project = projects.find((item) => item.id === activeProjectId);
    if (!project) return;

    if (action === "delete") {
      project.files = project.files.filter((file) => file !== filePath);
      delete project.filesContent[filePath];
    }

    if (action === "rename") {
      const nextName = prompt("Rename file", filePath);
      if (nextName && nextName !== filePath) {
        const content = project.filesContent[filePath];
        project.files = project.files.map((file) => (file === filePath ? nextName : file));
        project.filesContent[nextName] = content;
        delete project.filesContent[filePath];
      }
    }

    saveProjects(projects);
    renderProjects();
    openRepoViewer(activeProjectId);
    repoContext.classList.remove("is-open");
    repoContext.setAttribute("aria-hidden", "true");
  });

  renderProjects();
})();
