const modeLabels = {
  study: {
    title: "Study Helper",
    hint: "Ask any topic you do not understand."
  },
  youtube: {
    title: "YouTube Learning",
    hint: "Ask for the best video/resource search for a topic."
  },
  pdf: {
    title: "PDF / Notes Summarizer",
    hint: "Paste notes now. PDF upload will be added in Phase 6."
  },
  book: {
    title: "Book Finder",
    hint: "Ask for books or sources on any topic."
  },
  resumeReviewer: {
    title: "Resume Reviewer",
    hint: "Paste your resume and get a score with improvements."
  },
  career: {
    title: "Career Guide",
    hint: "Ask for a roadmap, skills, projects, or weekly plan."
  },
  coding: {
    title: "Coding Helper",
    hint: "Ask programming concepts, bugs, examples, or practice tasks."
  },
  productivity: {
    title: "Productivity Planner",
    hint: "Ask for study plans, focus routines, and task priority."
  }
};

let currentMode = "study";
let lastAnswer = "";

const chatMessages = document.getElementById("chatMessages");
const actionBar = document.getElementById("actionBar");
const userInput = document.getElementById("userInput");
const agentForm = document.getElementById("agentForm");
const askBtn = document.getElementById("askBtn");
const currentModeLabel = document.getElementById("currentModeLabel");
const currentModeHint = document.getElementById("currentModeHint");

function scrollToAgent() {
  document.getElementById("agent").scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeout(() => userInput.focus(), 500);
}

function setMode(mode) {
  currentMode = mode;
  const info = modeLabels[mode] || modeLabels.study;

  currentModeLabel.textContent = info.title;
  currentModeHint.textContent = info.hint;

  document.querySelectorAll("[data-mode]").forEach((el) => {
    el.classList.toggle("active", el.dataset.mode === mode);
  });

  showToast(`${info.title} mode selected`);
  scrollToAgent();
}

function addMessage(role, text) {
  const message = document.createElement("div");
  message.className = `message ${role === "user" ? "user-message" : "ai-message"}`;

  const icon = role === "user" ? "fa-user" : "fa-graduation-cap";
  const name = role === "user" ? "You" : "Poro AI";

  message.innerHTML = `
    <div class="avatar">
      <i class="fa-solid ${icon}"></i>
    </div>
    <div class="message-content">
      <strong>${name}</strong>
      <p>${escapeHtml(text)}</p>
    </div>
  `;

  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return message;
}

function addLoadingMessage() {
  const message = document.createElement("div");
  message.className = "message ai-message";
  message.innerHTML = `
    <div class="avatar">
      <i class="fa-solid fa-graduation-cap"></i>
    </div>
    <div class="message-content">
      <strong>Poro AI</strong>
      <p class="loading-dots">Thinking</p>
    </div>
  `;
  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return message;
}

function renderActions(actions = []) {
  actionBar.innerHTML = "";

  if (!actions.length) {
    actionBar.classList.remove("show");
    return;
  }

  actions.forEach((action) => {
    const link = document.createElement("a");
    link.href = action.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.innerHTML = `<i class="${action.icon || "fa-solid fa-arrow-up-right-from-square"}"></i> ${escapeHtml(action.label)}`;
    actionBar.appendChild(link);
  });

  actionBar.classList.add("show");
}

async function askAgent(messageText) {
  const message = messageText || userInput.value.trim();

  if (!message) {
    showToast("Write a question first");
    return;
  }

  userInput.value = "";
  addMessage("user", message);
  const loading = addLoadingMessage();
  askBtn.disabled = true;
  askBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Asking`;

  try {
    const response = await fetch("/api/agent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        mode: currentMode,
        message
      })
    });

    const data = await response.json();

    loading.remove();

    if (!response.ok) {
      addMessage("ai", data.error || "Something went wrong.");
      showToast("Check your API key or server");
      return;
    }

    lastAnswer = data.answer || "";
    addMessage("ai", lastAnswer);
    renderActions(data.actions || []);
  } catch (error) {
    loading.remove();
    addMessage("ai", "Server connection failed. Make sure npm run dev is running.");
  } finally {
    askBtn.disabled = false;
    askBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Ask`;
  }
}

function generateResumePreview() {
  const name = document.getElementById("resumeName").value.trim() || "Your Name";
  const contact = document.getElementById("resumeContact").value.trim() || "email@example.com | phone";
  const education = document.getElementById("resumeEducation").value.trim() || "Your education details";
  const skills = document.getElementById("resumeSkills").value.trim() || "Your skills";
  const projects = document.getElementById("resumeProjects").value.trim() || "Your projects";

  const preview = document.getElementById("resumePreview");

  preview.innerHTML = `
    <div class="generated-resume">
      <h2>${escapeHtml(name)}</h2>
      <p class="contact">${escapeHtml(contact)}</p>

      <h4>Education</h4>
      <p>${escapeHtml(education)}</p>

      <h4>Skills</h4>
      <p>${escapeHtml(skills)}</p>

      <h4>Projects</h4>
      <p>${escapeHtml(projects)}</p>
    </div>
  `;

  showToast("Resume preview generated");
}

function sendResumeToAgent() {
  const previewText = document.getElementById("resumePreview").innerText.trim();

  if (!previewText || previewText.includes("Your generated resume")) {
    showToast("Generate resume first");
    return;
  }

  setMode("resumeReviewer");
  askAgent(`Review this resume. Give a score out of 100, weaknesses, improvements, and improved bullet points:\n\n${previewText}`);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});

document.querySelectorAll(".prompt-suggestions button").forEach((button) => {
  button.addEventListener("click", () => {
    userInput.value = button.dataset.prompt;
    userInput.focus();
  });
});

agentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  askAgent();
});

document.getElementById("clearBtn").addEventListener("click", () => {
  chatMessages.innerHTML = "";
  actionBar.innerHTML = "";
  actionBar.classList.remove("show");
  addMessage("ai", "Chat cleared. What do you want to learn next?");
});

document.getElementById("speakBtn").addEventListener("click", () => {
  if (!lastAnswer) {
    showToast("No answer to read yet");
    return;
  }

  if (!("speechSynthesis" in window)) {
    showToast("Speech output is not supported in this browser");
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(lastAnswer);
  utterance.rate = 0.95;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
});

document.getElementById("voiceBtn").addEventListener("click", () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    showToast("Voice input is not supported in this browser");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  showToast("Listening...");
  recognition.start();

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    userInput.value = transcript;
    showToast("Voice captured");
  };

  recognition.onerror = () => {
    showToast("Voice input failed");
  };
});

if (window.AOS) {
  AOS.init({
    duration: 750,
    once: true,
    offset: 80
  });
}
