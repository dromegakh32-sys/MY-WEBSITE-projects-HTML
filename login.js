const OWNER_EMAIL = "dr.omegakh32@gmail.com";
const AUTH_KEY = "portfolio-auth";

const form = document.querySelector("#login-form");
const welcome = document.querySelector("#welcome-screen");

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();

  if (!name || !email) return;

  const role = email.toLowerCase() === OWNER_EMAIL.toLowerCase() ? "owner" : "viewer";
  localStorage.setItem(
    AUTH_KEY,
    JSON.stringify({ name, email, role, loggedInAt: new Date().toISOString() })
  );

  welcome?.classList.add("is-visible");
  welcome?.setAttribute("aria-hidden", "false");

  setTimeout(() => {
    window.location.href = "index.html";
  }, 3000);
});
