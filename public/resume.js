document.addEventListener("DOMContentLoaded", () => {
  function ensureResumeControlButtons() {
    let controls = document.querySelector(".rb-controls");

    if (!controls) {
      const formCard = document.querySelector(".rb-form-card");
      controls = document.createElement("div");
      controls.className = "rb-controls";
      if (formCard) formCard.appendChild(controls);
    }

    let backBtn = document.getElementById("rbBackBtn");
    let nextBtn = document.getElementById("rbNextBtn");

    if (!backBtn) {
      backBtn = document.createElement("button");
      backBtn.id = "rbBackBtn";
      backBtn.type = "button";
      backBtn.innerHTML = `<i class="fa-solid fa-arrow-left"></i> Back`;
      controls.appendChild(backBtn);
    }

    if (!nextBtn) {
      nextBtn = document.createElement("button");
      nextBtn.id = "rbNextBtn";
      nextBtn.type = "button";
      nextBtn.innerHTML = `Next <i class="fa-solid fa-arrow-right"></i>`;
      controls.appendChild(nextBtn);
    }

    backBtn.style.display = "inline-flex";
    nextBtn.style.display = "inline-flex";
  }

  ensureResumeControlButtons();
  let currentStep = 1;
  let selectedTemplate = "sidebar";
  let photoData = "";

  const $ = (id) => document.getElementById(id);

  const templateNames = {
    sidebar: "Modern Sidebar Template",
    dark: "Dark Professional Template",
    minimal: "Clean Minimal Template",
    split: "Executive Split Template"
  };

  const suggestions = {
    1: ["Template Tips", "Choose Modern Sidebar or Dark Professional if you want photo-based CV. Choose Clean Minimal for ATS-friendly resume."],
    2: ["Personal Info Tips", "Upload a clear front-facing photo if your template supports image. Keep profile summary short and role-focused."],
    3: ["Education Tips", "Add institution, degree, year, GPA if strong, and relevant coursework or certifications."],
    4: ["Skills Tips", "Group skills by category: Programming, Web, Database, Tools, Soft Skills, Languages."],
    5: ["Work Tips", "Use action words: Built, Designed, Developed, Led, Improved. Mention technology and impact."],
    6: ["Final Tips", "Generate your resume, then send it to Poro Mentor for scoring and improvement suggestions."]
  };

  function toast(msg) {
    if (typeof showToast === "function") showToast(msg);
  }

  function val(id, fallback = "") {
    return $(id)?.value.trim() || fallback;
  }

  function esc(text) {
    if (typeof escapeHtml === "function") return escapeHtml(text);
    return String(text).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
  }

  function photoMarkup() {
    if (photoData) return `<img class="rb-photo" src="${photoData}" alt="Profile Photo">`;
    return `<div class="rb-photo-placeholder"><i class="fa-solid fa-user"></i></div>`;
  }

  function data() {
    return {
      name: val("rbName", "Your Name"),
      role: val("rbRole", "Target Role"),
      contact: val("rbContact", "email@example.com | +880..."),
      links: val("rbLinks", "Dhaka, Bangladesh | GitHub | LinkedIn"),
      summary: val("rbSummary", "Write a short professional summary about your background, skills, and career goal."),
      education: val("rbEducation", "Your education details"),
      courses: val("rbCourses", "Relevant courses or certifications"),
      skills: val("rbSkills", "Your technical skills"),
      soft: val("rbSoftSkills", "Languages and soft skills"),
      experience: val("rbExperience", "Your work experience, activities, or achievements"),
      projects: val("rbProjects", "Your projects")
    };
  }

  function buildCV() {
    const d = data();

    if (selectedTemplate === "sidebar") {
      return `
        <div class="rb-cv rb-cv-sidebar">
          <aside class="rb-cv-sidebar-left">
            ${photoMarkup()}
            <h1>${esc(d.name)}</h1>
            <div class="role">${esc(d.role)}</div>

            <div class="rb-section-title">Contact</div>
            <div class="rb-text">${esc(d.contact)}\n${esc(d.links)}</div>

            <div class="rb-section-title">Skills</div>
            <div class="rb-text">${esc(d.skills)}</div>

            <div class="rb-section-title">Languages</div>
            <div class="rb-text">${esc(d.soft)}</div>
          </aside>

          <main class="rb-cv-sidebar-right">
            <p class="rb-text">${esc(d.summary)}</p>

            <div class="rb-section-title">Work History</div>
            <p class="rb-text">${esc(d.experience)}</p>

            <div class="rb-section-title">Projects</div>
            <p class="rb-text">${esc(d.projects)}</p>

            <div class="rb-section-title">Education</div>
            <p class="rb-text">${esc(d.education)}</p>

            <div class="rb-section-title">Certifications</div>
            <p class="rb-text">${esc(d.courses)}</p>
          </main>
        </div>
      `;
    }

    if (selectedTemplate === "dark") {
      return `
        <div class="rb-cv rb-cv-dark">
          <aside class="rb-cv-dark-left">
            ${photoMarkup()}
            <h1>${esc(d.name)}</h1>
            <div class="role">${esc(d.role)}</div>

            <div class="rb-section-title">Contact</div>
            <p class="rb-text">${esc(d.contact)}\n${esc(d.links)}</p>

            <div class="rb-section-title">Skills</div>
            <p class="rb-text">${esc(d.skills)}</p>

            <div class="rb-section-title">Languages</div>
            <p class="rb-text">${esc(d.soft)}</p>
          </aside>

          <main class="rb-cv-dark-right">
            <div class="rb-section-title">Profile</div>
            <p class="rb-text">${esc(d.summary)}</p>

            <div class="rb-section-title">Work Experience</div>
            <p class="rb-text">${esc(d.experience)}</p>

            <div class="rb-section-title">Projects</div>
            <p class="rb-text">${esc(d.projects)}</p>

            <div class="rb-section-title">Education</div>
            <p class="rb-text">${esc(d.education)}</p>
          </main>
        </div>
      `;
    }

    if (selectedTemplate === "minimal") {
      return `
        <div class="rb-cv rb-cv-minimal">
          <h1>${esc(d.name)}</h1>
          <div class="contact">${esc(d.contact)} • ${esc(d.links)} • ${esc(d.role)}</div>

          <div class="rb-section-title">Profile</div>
          <p class="rb-text">${esc(d.summary)}</p>

          <div class="rb-section-title">Education</div>
          <p class="rb-text">${esc(d.education)}\n${esc(d.courses)}</p>

          <div class="rb-section-title">Professional Experience</div>
          <p class="rb-text">${esc(d.experience)}</p>

          <div class="rb-section-title">Projects & Extracurricular</div>
          <p class="rb-text">${esc(d.projects)}</p>

          <div class="rb-section-title">Skills</div>
          <p class="rb-text">${esc(d.skills)}\n${esc(d.soft)}</p>
        </div>
      `;
    }

    return `
      <div class="rb-cv rb-cv-split">
        <header class="rb-cv-split-header">
          <div>
            <h1>${esc(d.name)}</h1>
            <div class="role">${esc(d.role)}</div>
            <div>${esc(d.contact)}</div>
          </div>
          ${photoMarkup()}
        </header>

        <div class="rb-cv-split-body">
          <main>
            <div class="rb-section-title">Experience</div>
            <p class="rb-text">${esc(d.experience)}</p>

            <div class="rb-section-title">Projects</div>
            <p class="rb-text">${esc(d.projects)}</p>

            <div class="rb-section-title">Profile</div>
            <p class="rb-text">${esc(d.summary)}</p>
          </main>

          <aside>
            <div class="rb-section-title">Highlights</div>
            <p class="rb-text">${esc(d.skills)}</p>

            <div class="rb-section-title">Education</div>
            <p class="rb-text">${esc(d.education)}</p>

            <div class="rb-section-title">Courses</div>
            <p class="rb-text">${esc(d.courses)}</p>
          </aside>
        </div>
      </div>
    `;
  }

  function renderPreview(show = false) {
    $("rbPreview").innerHTML = buildCV();
    $("rbTemplateName").textContent = templateNames[selectedTemplate];
    if (show) toast("Resume/CV generated");
  }

  function updateSteps() {
    document.querySelectorAll(".rb-step").forEach((step) => {
      step.classList.toggle("active", Number(step.dataset.step) === currentStep);
    });

    document.querySelectorAll(".rb-step-tab").forEach((tab) => {
      const n = Number(tab.dataset.step);
      tab.classList.toggle("active", n === currentStep);
      tab.classList.toggle("done", n < currentStep);
    });

    $("rbProgressFill").style.width = `${(currentStep / 6) * 100}%`;
    $("rbBackBtn").disabled = currentStep === 1;
    $("rbNextBtn").innerHTML = currentStep === 6
      ? 'Generate <i class="fa-solid fa-file-circle-check"></i>'
      : 'Next <i class="fa-solid fa-arrow-right"></i>';

    $("rbSuggestionTitle").textContent = suggestions[currentStep][0];
    $("rbSuggestionText").textContent = suggestions[currentStep][1];

    renderPreview(false);
  }

  function setTemplate(template) {
    selectedTemplate = template;
    document.querySelectorAll(".rb-template").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.template === selectedTemplate);
    });
    renderPreview(false);
    toast(`${templateNames[selectedTemplate]} selected`);
  }

  function readImageFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      toast("Please choose an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      photoData = reader.result;
      $("rbPhotoPreview").innerHTML = `<img src="${photoData}" alt="Profile Photo">`;
      renderPreview(false);
      toast("Profile image added");
    };
    reader.readAsDataURL(file);
  }

  function applySuggestion() {
    if (currentStep === 1) {
      setTemplate("sidebar");
    }

    if (currentStep === 2 && !val("rbSummary")) {
      $("rbSummary").value = `Motivated ${val("rbRole", "student")} with a strong interest in practical projects, problem solving, and modern technology. Skilled in teamwork, communication, and continuous learning.`;
    }

    if (currentStep === 3 && !val("rbCourses")) {
      $("rbCourses").value = "Data Structures, Object-Oriented Programming, Database Management Systems, Web Development, Software Engineering, Artificial Intelligence";
    }

    if (currentStep === 4) {
      if (!val("rbSkills")) $("rbSkills").value = "JavaScript, Python, HTML, CSS, React, Node.js, Express.js, SQL, Git, GitHub, OpenAI API";
      if (!val("rbSoftSkills")) $("rbSoftSkills").value = "Bangla, English, Communication, Teamwork, Leadership, Time Management, Presentation";
    }

    if (currentStep === 5) {
      if (!val("rbProjects")) $("rbProjects").value = "Poro Mentor - Built an AI-powered student assistant using HTML, CSS, JavaScript, Node.js, Express, and OpenAI API.";
      if (!val("rbExperience")) $("rbExperience").value = "Hackathon Participant - Designed and developed a student-focused AI project, implemented UI/UX, and prepared demo submission.";
    }

    renderPreview(false);
    toast("Suggestion applied");
  }

  function getResumeFileName() {
    const rawName = val("rbName", "poro-mentor-resume")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    return `${rawName || "poro-mentor"}-resume`;
  }

  function getResumePrintCss() {
    return `
      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      html, body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        font-family: "Poppins", "Inter", Arial, sans-serif;
      }

      body {
        width: 210mm;
        min-height: 297mm;
        overflow: hidden;
      }

      .print-page {
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        background: #ffffff;
        display: flex;
        align-items: flex-start;
        justify-content: center;
      }

      .rb-cv {
        width: 210mm !important;
        min-width: 0 !important;
        max-width: 210mm !important;
        min-height: 297mm !important;
        box-shadow: none !important;
        margin: 0 !important;
        transform: none !important;
      }

      .rb-text {
        white-space: pre-wrap;
        line-height: 1.5;
        font-size: 11px;
      }

      .rb-section-title {
        margin: 13px 0 6px;
        font-size: 12px;
      }

      .rb-cv-sidebar-left {
        padding: 22px 16px !important;
      }

      .rb-cv-sidebar-left h1 {
        font-size: 25px !important;
        line-height: 1.08 !important;
      }

      .rb-cv-sidebar-right {
        padding: 22px 22px !important;
      }

      .rb-cv-dark-left {
        padding: 24px 18px !important;
      }

      .rb-cv-dark-right {
        padding: 26px 24px !important;
      }

      .rb-cv-dark-left h1 {
        font-size: 25px !important;
      }

      .rb-cv-minimal {
        padding: 28px 38px !important;
      }

      .rb-cv-minimal h1 {
        font-size: 38px !important;
      }

      .rb-cv-split-header {
        padding: 22px 28px !important;
      }

      .rb-cv-split-body {
        padding: 22px !important;
        gap: 20px !important;
      }

      .rb-photo,
      .rb-photo-placeholder {
        width: 88px !important;
        height: 88px !important;
      }

      @page {
        size: A4;
        margin: 0;
      }
    `;
  }

  function printResumePdf() {
    renderPreview(false);

    const preview = $("rbPreview");
    const cv = preview?.querySelector(".rb-cv");

    if (!cv) {
      toast("Generate resume first");
      return;
    }

    const fileName = getResumeFileName();
    const printWindow = window.open("", "_blank", "width=900,height=1100");

    if (!printWindow) {
      toast("Please allow popups to export PDF");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${fileName}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="resume.css">
        <style>${getResumePrintCss()}</style>
      </head>
      <body>
        <main class="print-page">
          ${cv.outerHTML}
        </main>
        <script>
          window.onload = function () {
            document.title = "${fileName}";
            setTimeout(function () {
              window.print();
            }, 400);
          };
        <\/script>
      </body>
      </html>
    `);
    printWindow.document.close();

    toast(`Export ready: ${fileName}.pdf`);
  }

  function reviewWithAI() {
    renderPreview(false);
    const text = $("rbPreview").innerText.trim();
    if (!text) {
      toast("Generate resume first");
      return;
    }
    sessionStorage.setItem("poroResumeReviewText", text);
    window.location.href = "mentor.html?mode=resumeReviewer";
  }

  function clearAll() {
    ["rbName", "rbRole", "rbContact", "rbLinks", "rbSummary", "rbEducation", "rbCourses", "rbSkills", "rbSoftSkills", "rbExperience", "rbProjects"].forEach((id) => {
      if ($(id)) $(id).value = "";
    });

    photoData = "";
    $("rbPhotoPreview").innerHTML = `<i class="fa-solid fa-camera"></i>`;
    selectedTemplate = "sidebar";
    currentStep = 1;
    document.querySelectorAll(".rb-template").forEach((btn) => btn.classList.toggle("active", btn.dataset.template === "sidebar"));
    updateSteps();
    toast("Cleared");
  }

  document.querySelectorAll(".rb-template").forEach((btn) => {
    btn.addEventListener("click", () => setTemplate(btn.dataset.template));
  });

  document.querySelectorAll(".rb-step-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      currentStep = Number(tab.dataset.step);
      updateSteps();
    });
  });

  document.getElementById("rbNextBtn")?.addEventListener("click", () => {
    if (currentStep < 6) {
      currentStep++;
      updateSteps();
    } else {
      renderPreview(true);
    }
  });

  document.getElementById("rbBackBtn")?.addEventListener("click", () => {
    if (currentStep > 1) {
      currentStep--;
      updateSteps();
    }
  });

  $("rbChoosePhotoBtn").addEventListener("click", () => $("rbPhotoInput").click());
  $("rbDropZone").addEventListener("click", (e) => {
    if (e.target.id !== "rbChoosePhotoBtn") $("rbPhotoInput").click();
  });

  $("rbPhotoInput").addEventListener("change", (e) => readImageFile(e.target.files[0]));

  ["dragenter", "dragover"].forEach((eventName) => {
    $("rbDropZone").addEventListener(eventName, (e) => {
      e.preventDefault();
      $("rbDropZone").classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    $("rbDropZone").addEventListener(eventName, (e) => {
      e.preventDefault();
      $("rbDropZone").classList.remove("dragover");
    });
  });

  $("rbDropZone").addEventListener("drop", (e) => {
    readImageFile(e.dataTransfer.files[0]);
  });

  document.querySelectorAll("input, textarea").forEach((el) => {
    el.addEventListener("input", () => renderPreview(false));
  });

  $("rbGenerateBtn").addEventListener("click", () => renderPreview(true));

  const printButtons = ["rbPrintBtn", "rbPrintTopBtn", "rbFloatPrint"];
  printButtons.forEach((id) => {
    const btn = $(id);
    if (btn) btn.addEventListener("click", printResumePdf);
  });

  const floatGenerate = $("rbFloatGenerate");
  if (floatGenerate) floatGenerate.addEventListener("click", () => renderPreview(true));

  const floatReview = $("rbFloatReview");
  if (floatReview) floatReview.addEventListener("click", reviewWithAI);
  $("rbRefreshBtn").addEventListener("click", () => renderPreview(true));
  $("rbReviewBtn").addEventListener("click", reviewWithAI);
  $("rbReviewTopBtn").addEventListener("click", reviewWithAI);
  $("rbClearBtn").addEventListener("click", clearAll);
  $("rbApplySuggestionBtn").addEventListener("click", applySuggestion);

  updateSteps();
  renderPreview(false);

  if (window.AOS) {
    AOS.init({ duration: 700, once: true, offset: 60 });
  }
});
