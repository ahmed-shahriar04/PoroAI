function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

if (window.AOS) {
  AOS.init({
    duration: 750,
    once: true,
    offset: 80
  });
}

/* ================================
   Phase 8B: Global footer injector
   Shows footer on all pages except Mentor and Resume Builder
================================ */
function injectGlobalFooter() {
  const path = window.location.pathname.toLowerCase();
  const fileName = path.split("/").pop() || "index.html";

  const excludedPages = ["mentor.html", "resume.html"];
  if (excludedPages.includes(fileName)) return;

  // Remove old duplicate footer if any
  document.querySelectorAll(".global-site-footer, .final-site-footer").forEach((footer, index) => {
    if (index > 0) footer.remove();
  });

  let footer = document.querySelector(".global-site-footer") || document.querySelector(".final-site-footer");

  if (!footer) {
    footer = document.createElement("footer");
    footer.className = "global-site-footer";
    document.body.appendChild(footer);
  }

  footer.classList.add("global-site-footer");
  footer.innerHTML = `
    <div class="global-footer-brand">
      <img src="assets/img/poroai_nobg.png" alt="Poro Mentor">
      <div>
        <strong>Poro Mentor</strong>
        <span>Your all-in-one AI study agent.</span>
      </div>
    </div>

    <div class="global-footer-credit">
      <span>This website is developed by:</span>
      <a href="https://shahriarahmedriaz.netlify.app/" target="_blank" rel="noopener noreferrer">
        Shahriar Ahmed Riaz
      </a>
    </div>

    <div class="global-footer-powered">
      <i class="fa-brands fa-openai"></i>
      <span>Powered by OpenAI</span>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", injectGlobalFooter);
