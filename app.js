const OWNER_EMAIL = "dr.omegakh32@gmail.com";
const AUTH_KEY = "portfolio-auth";
const FOLLOWERS_KEY = "portfolio-followers";
const THREADS_KEY = "portfolio-threads";
const OWNER_NOTIFY_KEY = "portfolio-owner-notifications";
const VIEWER_NOTIFY_KEY = "portfolio-viewer-notifications";

const getAuth = () => {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY)) || null;
  } catch {
    return null;
  }
};

const saveAuth = (auth) => {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
};

const clearAuth = () => {
  localStorage.removeItem(AUTH_KEY);
};

const isOwner = (email) => String(email || "").toLowerCase() === OWNER_EMAIL.toLowerCase();

const loadOwnerNotifications = () =>
  JSON.parse(localStorage.getItem(OWNER_NOTIFY_KEY) || "[]");

const saveOwnerNotifications = (items) => {
  localStorage.setItem(OWNER_NOTIFY_KEY, JSON.stringify(items));
};

const loadViewerNotifications = () =>
  JSON.parse(localStorage.getItem(VIEWER_NOTIFY_KEY) || "{}");

const saveViewerNotifications = (items) => {
  localStorage.setItem(VIEWER_NOTIFY_KEY, JSON.stringify(items));
};

const addOwnerNotification = (payload) => {
  const items = loadOwnerNotifications();
  items.unshift({
    id: crypto.randomUUID(),
    ts: Date.now(),
    ...payload,
  });
  saveOwnerNotifications(items.slice(0, 50));
  renderNotifications();
  playNotifySound();
};

const addViewerNotification = (email, payload) => {
  const data = loadViewerNotifications();
  data[email] = data[email] || [];
  data[email].unshift({
    id: crypto.randomUUID(),
    ts: Date.now(),
    ...payload,
  });
  saveViewerNotifications(data);
  playNotifySound();
};

const initMobileNav = () => {
  const navToggle = document.querySelector(".nav-toggle");
  const siteNav = document.querySelector(".site-nav");
  const navLinks = document.querySelectorAll(".site-nav a");

  const closeMobileNav = () => {
    navToggle?.setAttribute("aria-expanded", "false");
    siteNav?.classList.remove("is-open");
  };

  navToggle?.addEventListener("click", () => {
    const expanded = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!expanded));
    siteNav?.classList.toggle("is-open", !expanded);
  });

  navLinks.forEach((link) => link.addEventListener("click", closeMobileNav));

  window.addEventListener("resize", () => {
    if (window.innerWidth > 820) {
      closeMobileNav();
    }
  });

  window.addEventListener("scroll", () => {
    document.querySelector(".site-header")?.classList.toggle("is-scrolled", window.scrollY > 16);
  });
};

const initReveal = () => {
  const revealItems = document.querySelectorAll(".reveal");
  if (!revealItems.length) return;
  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.2, rootMargin: "0px 0px -40px 0px" }
  );
  revealItems.forEach((item) => observer.observe(item));
};

const openLogin = () => {
  const panel = document.querySelector("#login-panel");
  panel?.classList.add("is-open");
  panel?.setAttribute("aria-hidden", "false");
};

const closeLogin = () => {
  const panel = document.querySelector("#login-panel");
  panel?.classList.remove("is-open");
  panel?.setAttribute("aria-hidden", "true");
};

const updateAuthUI = (auth) => {
  const loginButton = document.querySelector("#login-button");
  const logoutButton = document.querySelector("#logout-button");
  const notifyWrapper = document.querySelector(".nav-notifications");
  const chatRole = document.querySelector("#chat-role");

  if (!auth) {
    loginButton?.classList.remove("is-hidden");
    logoutButton?.classList.add("is-hidden");
    notifyWrapper?.classList.add("is-hidden");
    if (chatRole) chatRole.textContent = "Guest";
    document.body.classList.add("is-guest");
    return;
  }

  document.body.classList.remove("is-guest");
  loginButton?.classList.add("is-hidden");
  logoutButton?.classList.remove("is-hidden");
  if (notifyWrapper) {
    notifyWrapper.classList.toggle("is-hidden", !isOwner(auth.email));
  }
  if (chatRole) chatRole.textContent = isOwner(auth.email) ? "Owner" : "Viewer";
};

const initLoginPanel = () => {
  const loginButton = document.querySelector("#login-button");
  const panel = document.querySelector("#login-panel");
  const form = document.querySelector("#login-form");

  loginButton?.addEventListener("click", () => {
    if (!panel) return;
    panel.classList.toggle("is-open");
    panel.setAttribute("aria-hidden", panel.classList.contains("is-open") ? "false" : "true");
  });

  document.addEventListener("click", (event) => {
    if (!panel || !panel.classList.contains("is-open")) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (panel.contains(target) || loginButton?.contains(target)) return;
    closeLogin();
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    if (!name || !email) return;
    saveAuth({ name, email });
    updateAuthUI({ name, email });
    closeLogin();
    initFollow(getAuth());
    initChat(getAuth());
    renderNotifications();
  });
};

const initLogout = () => {
  const button = document.querySelector("#logout-button");
  button?.addEventListener("click", () => {
    clearAuth();
    updateAuthUI(null);
    window.location.reload();
  });
};

const initFollow = (auth) => {
  const button = document.querySelector("#follow-button");
  const countEl = document.querySelector("#follow-count");
  if (!button || !countEl) return;

  const followers = new Set(JSON.parse(localStorage.getItem(FOLLOWERS_KEY) || "[]"));
  const email = auth?.email || "guest";

  const update = () => {
    countEl.textContent = String(followers.size);
    button.classList.toggle("is-following", followers.has(email));
  };

  update();

  button.onclick = () => {
    if (!auth) {
      openLogin();
      return;
    }
    if (followers.has(email)) {
      followers.delete(email);
    } else {
      followers.add(email);
    }
    localStorage.setItem(FOLLOWERS_KEY, JSON.stringify(Array.from(followers)));
    update();
  };
};

const loadThreads = () => JSON.parse(localStorage.getItem(THREADS_KEY) || "{}");
const saveThreads = (items) => localStorage.setItem(THREADS_KEY, JSON.stringify(items));

const renderNotifications = () => {
  const auth = getAuth();
  const notifyPanel = document.querySelector("#notify-panel");
  const notifyList = document.querySelector("#notify-list");
  const notifyCount = document.querySelector("#notify-count");
  const empty = notifyPanel?.querySelector(".notify-empty");

  if (!notifyPanel || !notifyList || !notifyCount) return;

  if (!auth || !isOwner(auth.email)) {
    notifyCount.textContent = "0";
    notifyList.innerHTML = "";
    if (empty) empty.style.display = "block";
    return;
  }

  const items = loadOwnerNotifications();
  notifyCount.textContent = String(items.length);
  notifyList.innerHTML = items
    .map(
      (item) => `
      <div class="notify-item">
        <strong>${item.title || "New activity"}</strong>
        <small>${item.meta || ""}</small>
        <span>${item.text || ""}</span>
        <div class="notify-actions">
          <input type="text" placeholder="Reply..." data-reply-input="${item.id}" />
          <button type="button" data-reply="${item.id}" data-email="${item.email || ""}">Reply</button>
          <button type="button" data-delete="${item.id}">Delete</button>
        </div>
      </div>
    `
    )
    .join("");
  if (empty) empty.style.display = items.length ? "none" : "block";
};

const playNotifySound = () => {
  const audio = document.querySelector("#notify-sound");
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(() => {});
};

const initNotifications = () => {
  const button = document.querySelector("#notify-button");
  const panel = document.querySelector("#notify-panel");
  const list = document.querySelector("#notify-list");

  button?.addEventListener("click", () => {
    if (!panel) return;
    panel.classList.toggle("is-open");
    panel.setAttribute("aria-hidden", panel.classList.contains("is-open") ? "false" : "true");
  });

  document.addEventListener("click", (event) => {
    if (!panel || !panel.classList.contains("is-open")) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (panel.contains(target) || button?.contains(target)) return;
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
  });

  list?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const deleteId = target.dataset.delete;
    const replyId = target.dataset.reply;
    const replyEmail = target.dataset.email;
    const auth = getAuth();

    if (deleteId) {
      const items = loadOwnerNotifications().filter((item) => item.id !== deleteId);
      saveOwnerNotifications(items);
      renderNotifications();
      return;
    }

    if (replyId && replyEmail && auth && isOwner(auth.email)) {
      const input = list.querySelector(`input[data-reply-input="${replyId}"]`);
      const text = (input?.value || "").trim();
      if (!text) return;

      const threads = loadThreads();
      const thread = threads[replyEmail] || {
        email: replyEmail,
        name: replyEmail,
        messages: []
      };
      thread.messages.push({
        from: "owner",
        name: auth.name,
        email: auth.email,
        text
      });
      threads[replyEmail] = thread;
      saveThreads(threads);
      addViewerNotification(replyEmail, { text });
      if (input) input.value = "";
    }
  });
};

const initChat = (auth) => {
  const widget = document.querySelector("#chat-widget");
  if (!widget) return;

  const messagesEl = document.querySelector("#chat-messages");
  const form = document.querySelector("#chat-form");
  const threadsSelect = document.querySelector("#chat-thread-select");
  const threadsWrap = document.querySelector("#chat-threads");
  const alerts = document.querySelector("#chat-alerts");

  const renderAlerts = () => {
    if (!alerts) return;
    alerts.innerHTML = "";
    if (!auth) return;
    if (isOwner(auth.email)) return;
    const viewerData = loadViewerNotifications();
    const notes = viewerData[auth.email] || [];
    notes.slice(0, 2).forEach((note) => {
      const item = document.createElement("div");
      item.className = "chat-alert";
      item.textContent = `New reply: ${note.text}`;
      alerts.appendChild(item);
    });
  };

  const renderThreadMessages = (thread) => {
    messagesEl.innerHTML = thread.messages
      .map(
        (msg) =>
          `<div class="chat-bubble ${msg.from}"><strong>${msg.name}</strong><small>${msg.email}</small><span>${msg.text}</span></div>`
      )
      .join("");
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  const renderOwnerThreads = () => {
    const threads = loadThreads();
    const entries = Object.values(threads);
    if (!threadsSelect || !threadsWrap) return;
    if (!isOwner(auth?.email)) {
      threadsWrap.style.display = "none";
      return;
    }
    threadsWrap.style.display = "grid";
    threadsSelect.innerHTML = entries
      .map((thread) => `<option value="${thread.email}">${thread.name} (${thread.email})</option>`)
      .join("");
    if (!entries.length) {
      messagesEl.innerHTML = "<p class=\"chat-empty\">No messages yet.</p>";
      return;
    }
    const currentEmail = threadsSelect.value || entries[0].email;
    threadsSelect.value = currentEmail;
    renderThreadMessages(threads[currentEmail]);
  };

  const renderViewerThread = () => {
    const threads = loadThreads();
    const thread = threads[auth.email] || { email: auth.email, name: auth.name, messages: [] };
    renderThreadMessages(thread);
  };

  const updateThreadSelect = () => {
    if (isOwner(auth.email)) {
      renderOwnerThreads();
    } else {
      renderViewerThread();
    }
  };

  updateThreadSelect();
  renderAlerts();

  threadsSelect?.addEventListener("change", () => {
    const threads = loadThreads();
    const thread = threads[threadsSelect.value];
    if (thread) renderThreadMessages(thread);
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!auth) {
      openLogin();
      return;
    }
    const input = form.querySelector("input[name='message']");
    const text = (input?.value || "").trim();
    if (!text) return;

    const threads = loadThreads();
    const targetEmail = isOwner(auth.email) ? threadsSelect?.value : auth.email;
    if (!targetEmail) return;

    const thread = threads[targetEmail] || {
      email: targetEmail,
      name: isOwner(auth.email) ? "Viewer" : auth.name,
      messages: []
    };

    const message = {
      from: isOwner(auth.email) ? "owner" : "viewer",
      name: auth.name,
      email: auth.email,
      text
    };

    thread.messages.push(message);
    threads[targetEmail] = thread;
    saveThreads(threads);

    if (!isOwner(auth.email)) {
      addOwnerNotification({
        title: "New message",
        meta: `${auth.name} (${auth.email})`,
        text,
        email: auth.email
      });
    } else {
      addViewerNotification(targetEmail, { text });
    }

    if (input) input.value = "";
    updateThreadSelect();
    renderAlerts();
  });
};

document.body.setAttribute("data-theme", "dark");

const auth = getAuth();
initMobileNav();
initReveal();
initLoginPanel();
initLogout();
initNotifications();
updateAuthUI(auth);
initFollow(auth);
initChat(auth);
renderNotifications();

window.__portfolioAuth = {
  getAuth,
  saveAuth,
  isOwner,
  openLogin,
  addOwnerNotification
};
