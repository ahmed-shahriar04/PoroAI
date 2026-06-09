const modeLabels = {
  general: { title: "Default Chat", hint: "Ask anything. Poro Mentor will understand the best mode automatically.", icon: "fa-solid fa-comments" },
  study: { title: "Study Helper", hint: "Ask any topic you do not understand.", icon: "fa-solid fa-book-open" },
  youtube: { title: "YouTube Learning", hint: "Find video/resource search plans for a topic.", icon: "fa-brands fa-youtube" },
  pdf: { title: "PDF / Notes Summarizer", hint: "Attach PDFs/images or paste notes for summary.", icon: "fa-solid fa-file-pdf" },
  book: { title: "Book Finder", hint: "Find books and sources for study topics.", icon: "fa-solid fa-book-bookmark" },
  resumeReviewer: { title: "Resume Reviewer", hint: "Paste your resume or open from Resume Builder.", icon: "fa-solid fa-file-circle-check" },
  career: { title: "Career Guide", hint: "Build roadmap, skills, projects, and weekly plan.", icon: "fa-solid fa-briefcase" },
  coding: { title: "Coding Helper", hint: "Ask programming concepts, bugs, and examples.", icon: "fa-solid fa-code" },
  productivity: { title: "Productivity Planner", hint: "Create study plans, focus routines, and priorities.", icon: "fa-solid fa-calendar-check" },
  campus: { title: "Campus Assistant", hint: "Ask student life, course, and academic questions.", icon: "fa-solid fa-building-columns" }
};

const modelLabels = {
  fast: "GPT-4.1 mini",
  smart: "GPT-4.1",
  creative: "GPT-4o mini"
};

let currentMode = "general";
let selectedModel = "fast";
let lastAnswer = "";
let lastUserPrompt = "";
let currentChatId = null;
let chatStarted = false;
let isTyping = false;
let pendingFiles = [];

const mentorApp = document.getElementById("mentorApp");
const sidebar = document.getElementById("mentorSidebar");
const chatMessages = document.getElementById("chatMessages");
const actionBar = document.getElementById("actionBar");
const userInput = document.getElementById("userInput");
const askBtn = document.getElementById("askBtn");
const currentModeLabel = document.getElementById("currentModeLabel");
const currentModeHint = document.getElementById("currentModeHint");
const selectedModeChip = document.getElementById("selectedModeChip");
const selectedModeIcon = document.getElementById("selectedModeIcon");
const selectedModeText = document.getElementById("selectedModeText");
const modeMenu = document.getElementById("modeMenu");
const modelPickerBtn = document.getElementById("modelPickerBtn");
const modelMenu = document.getElementById("modelMenu");
const selectedModelLabel = document.getElementById("selectedModelLabel");
const historyList = document.getElementById("historyList");
const selectedFilesPreview = document.getElementById("selectedFilesPreview");

const editOverlay = document.createElement("div");
editOverlay.id = "mentorEditOverlay";
editOverlay.className = "mentor-edit-overlay";
editOverlay.innerHTML = `
  <div class="mentor-edit-modal">
    <div class="mentor-edit-modal-head">
      <div>
        <strong>Edit message</strong>
        <span>Update your prompt and resend it.</span>
      </div>
      <button id="closeEditModal" type="button"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <textarea id="editModalTextarea"></textarea>
    <div class="mentor-edit-modal-actions">
      <button id="cancelEditModal" class="cancel" type="button">Cancel</button>
      <button id="saveEditModal" class="save" type="button">Save & Resend</button>
    </div>
  </div>
`;
document.body.appendChild(editOverlay);
let editingMessageEl = null;

const demoPromptOverlay = document.createElement("div");
demoPromptOverlay.id = "demoPromptOverlay";
demoPromptOverlay.className = "demo-prompt-overlay";
demoPromptOverlay.innerHTML = `
  <div class="demo-prompt-modal">
    <div class="demo-prompt-head">
      <div>
        <strong>Demo Prompts</strong>
        <span>Click one to test Poro Mentor quickly.</span>
      </div>
      <button id="closeDemoPromptModal" type="button"><i class="fa-solid fa-xmark"></i></button>
    </div>

    <div class="demo-prompt-grid">
      <button data-mode="study" data-prompt="Explain Newton's second law simply with examples, key points, practice questions, and flashcards.">
        <i class="fa-solid fa-book-open"></i>
        <strong>Study explanation</strong>
        <span>Physics topic + flashcards</span>
      </button>

      <button data-mode="youtube" data-prompt="I want the best video resources to learn data structures for beginners. Suggest what to watch and what to avoid.">
        <i class="fa-brands fa-youtube"></i>
        <strong>Video learning</strong>
        <span>YouTube search plan</span>
      </button>

      <button data-mode="coding" data-prompt="Explain JavaScript fetch API with example code, common mistakes, and practice tasks.">
        <i class="fa-solid fa-code"></i>
        <strong>Coding helper</strong>
        <span>Code explanation</span>
      </button>

      <button data-mode="career" data-prompt="Create a 4-week roadmap for becoming a frontend developer as a CSE student.">
        <i class="fa-solid fa-briefcase"></i>
        <strong>Career roadmap</strong>
        <span>Skills + projects plan</span>
      </button>

      <button data-mode="productivity" data-prompt="Make a realistic 7-day study plan for exams with breaks and revision time.">
        <i class="fa-solid fa-calendar-check"></i>
        <strong>Productivity plan</strong>
        <span>Exam routine</span>
      </button>

      <button data-mode="resumeReviewer" data-prompt="Review this resume and give a score out of 100, ATS tips, weaknesses, and improved bullet points.">
        <i class="fa-solid fa-file-circle-check"></i>
        <strong>Resume review</strong>
        <span>ATS feedback</span>
      </button>
    </div>
  </div>
`;
document.body.appendChild(demoPromptOverlay);

function updateGreeting() {
  const hour = new Date().getHours();
  let greeting = "Good Evening";
  if (hour >= 5 && hour < 12) greeting = "Good Morning";
  if (hour >= 12 && hour < 17) greeting = "Good Afternoon";
  const el = document.getElementById("timeGreeting");
  if (el) el.textContent = `${greeting}, Student`;
}

function setMode(mode) {
  currentMode = mode;
  const info = modeLabels[mode] || modeLabels.study;

  currentModeLabel.textContent = info.title;
  currentModeHint.textContent = info.hint;
  selectedModeText.textContent = info.title;
  selectedModeIcon.className = info.icon;

  document.querySelectorAll(".mode-item[data-mode]").forEach((el) => {
    el.classList.toggle("active", el.dataset.mode === mode);
  });

  closeDropdowns();
}

function setModel(model) {
  selectedModel = model;
  selectedModelLabel.textContent = modelLabels[model] || modelLabels.fast;

  document.querySelectorAll(".model-menu button").forEach((el) => {
    el.classList.toggle("active", el.dataset.model === model);
  });

  closeDropdowns();
}

function startChatMode() {
  chatStarted = true;
  mentorApp.classList.add("chat-started");
  const panel = document.getElementById("answerPanel");
  if (panel) panel.style.display = "flex";
}

function resetStartScreen() {
  currentChatId = null;
  chatStarted = false;
  lastAnswer = "";
  lastUserPrompt = "";
  pendingFiles = [];
  renderPendingFiles();

  mentorApp.classList.remove("chat-started");
  actionBar.innerHTML = "";
  actionBar.classList.remove("show");
  chatMessages.innerHTML = `
    <div class="empty-answer">
      <span class="empty-logo"><img src="assets/img/poroai_nobg.png" alt="Poro Mentor"></span>
      Your mentor response will appear here.
    </div>
  `;
  userInput.value = "";
  setMode("general");
  renderHistory();
  showToast("New chat ready");
}

function clearEmptyState() {
  const empty = chatMessages.querySelector(".empty-answer");
  if (empty) empty.remove();
}

function scrollChatToBottom() {
  setTimeout(() => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, 80);
}

function convertMarkdownTables(text) {
  const lines = text.split("\n");
  const output = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    const isTableHeader =
      line.startsWith("|") &&
      line.endsWith("|") &&
      i + 1 < lines.length &&
      /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(lines[i + 1].trim());

    if (!isTableHeader) {
      output.push(lines[i]);
      i++;
      continue;
    }

    const headers = line
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);

    i += 2;

    const rows = [];
    while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
      const cells = lines[i]
        .trim()
        .split("|")
        .map((cell) => cell.trim())
        .filter(Boolean);

      if (cells.length) rows.push(cells);
      i++;
    }

    const isFlashcard =
      headers.length >= 2 &&
      headers[0].toLowerCase().includes("question") &&
      headers[1].toLowerCase().includes("answer");

    if (isFlashcard) {
      output.push(`<div class="flashcard-grid">`);
      rows.forEach((row, index) => {
        output.push(`
<div class="flashcard-item">
  <div class="flashcard-number">${index + 1}</div>
  <div class="flashcard-question">
    <span>Question</span>
    <strong>${escapeHtml(row[0] || "")}</strong>
  </div>
  <div class="flashcard-answer">
    <span>Answer</span>
    <p>${escapeHtml(row.slice(1).join(" | ") || "")}</p>
  </div>
</div>`);
      });
      output.push(`</div>`);
    } else {
      output.push(`<div class="mentor-table-wrap"><table class="mentor-table"><thead><tr>`);
      headers.forEach((header) => output.push(`<th>${escapeHtml(header)}</th>`));
      output.push(`</tr></thead><tbody>`);

      rows.forEach((row) => {
        output.push(`<tr>`);
        headers.forEach((_, cellIndex) => {
          output.push(`<td>${escapeHtml(row[cellIndex] || "")}</td>`);
        });
        output.push(`</tr>`);
      });

      output.push(`</tbody></table></div>`);
    }
  }

  return output.join("\n");
}

function formatAssistantText(text) {
  text = convertMarkdownTables(text);
  let safe = text.includes("flashcard-grid") || text.includes("mentor-table-wrap") ? text : escapeHtml(text);

  safe = safe
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");

  const lines = safe.split("\n");
  let html = "";
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^[-_]{2,}$/.test(trimmed)) continue;

    if (!trimmed) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      continue;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${trimmed.slice(2)}</li>`;
      continue;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${trimmed.replace(/^\d+\.\s/, "")}</li>`;
      continue;
    }

    if (inList) {
      html += "</ul>";
      inList = false;
    }

    if (
      trimmed.startsWith("<h2>") ||
      trimmed.startsWith("<h3>") ||
      trimmed.startsWith("<div") ||
      trimmed.startsWith("</div>") ||
      trimmed.startsWith("<table") ||
      trimmed.startsWith("</table>") ||
      trimmed.startsWith("<thead") ||
      trimmed.startsWith("</thead>") ||
      trimmed.startsWith("<tbody") ||
      trimmed.startsWith("</tbody>") ||
      trimmed.startsWith("<tr") ||
      trimmed.startsWith("</tr>") ||
      trimmed.startsWith("<th") ||
      trimmed.startsWith("<td")
    ) {
      html += trimmed;
    } else {
      html += `<p>${trimmed}</p>`;
    }
  }

  if (inList) html += "</ul>";
  return `<div class="mentor-rich">${html}</div>`;
}

function createMessageElement(role, text) {
  const message = document.createElement("div");
  message.className = `mentor-message ${role === "user" ? "user" : "ai"}`;
  message.dataset.role = role;
  message.dataset.raw = text;

  const icon = role === "user" ? "fa-user" : "fa-graduation-cap";
  const body = role === "ai" ? formatAssistantText(text) : escapeHtml(text);

  message.innerHTML = `
    <div class="mentor-avatar"><i class="fa-solid ${icon}"></i></div>
    <div>
      <div class="mentor-bubble">${body}</div>
      <div class="mentor-msg-tools">
        ${
          role === "user"
            ? `<button type="button" class="edit-user-msg"><i class="fa-solid fa-pen"></i> Edit</button>`
            : `<button type="button" class="copy-ai-msg"><i class="fa-solid fa-copy"></i> Copy</button>
               <button type="button" class="retry-ai-msg"><i class="fa-solid fa-rotate-right"></i> Retry</button>`
        }
      </div>
    </div>
  `;

  return message;
}

function addMessage(role, text) {
  clearEmptyState();
  startChatMode();

  const message = createMessageElement(role, text);
  chatMessages.appendChild(message);

  bindMessageTools(message);
  scrollChatToBottom();
  saveCurrentChat();
  return message;
}

function addLoadingMessage() {
  clearEmptyState();
  startChatMode();

  const message = document.createElement("div");
  message.className = "mentor-message ai";
  message.innerHTML = `
    <div class="mentor-avatar"><i class="fa-solid fa-graduation-cap"></i></div>
    <div class="mentor-bubble loading-dots">Thinking</div>
  `;

  chatMessages.appendChild(message);
  scrollChatToBottom();
  return message;
}

function bindMessageTools(message) {
  const editBtn = message.querySelector(".edit-user-msg");
  const retryBtn = message.querySelector(".retry-ai-msg");
  const copyBtn = message.querySelector(".copy-ai-msg");

  if (editBtn) editBtn.addEventListener("click", () => editUserMessage(message));
  if (retryBtn) retryBtn.addEventListener("click", () => retryLastAnswer());

  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      const text = message.dataset.raw || message.innerText.trim();
      await navigator.clipboard.writeText(text);
      showToast("Answer copied");
    });
  }
}

function bindAllMessageTools() {
  document.querySelectorAll(".mentor-message").forEach(bindMessageTools);
}

function editUserMessage(messageEl) {
  editingMessageEl = messageEl;
  const oldText = messageEl.dataset.raw || messageEl.innerText.trim();
  document.getElementById("editModalTextarea").value = oldText;
  editOverlay.classList.add("show");
  setTimeout(() => document.getElementById("editModalTextarea").focus(), 80);
}

function closeEditModal() {
  editOverlay.classList.remove("show");
  editingMessageEl = null;
}

function saveEditedMessage() {
  if (!editingMessageEl) return;

  const newText = document.getElementById("editModalTextarea").value.trim();
  if (!newText) return;

  const allMessages = Array.from(chatMessages.querySelectorAll(".mentor-message"));
  const idx = allMessages.indexOf(editingMessageEl);

  allMessages.slice(idx).forEach((el) => el.remove());
  document.querySelectorAll(".mentor-resource-row").forEach((row) => row.remove());

  actionBar.innerHTML = "";
  actionBar.classList.remove("show");

  closeEditModal();
  askAgent(newText);
}

document.getElementById("closeEditModal").addEventListener("click", closeEditModal);
document.getElementById("cancelEditModal").addEventListener("click", closeEditModal);
document.getElementById("saveEditModal").addEventListener("click", saveEditedMessage);
editOverlay.addEventListener("click", (event) => {
  if (event.target === editOverlay) closeEditModal();
});

function retryLastAnswer() {
  if (!lastUserPrompt) return showToast("No previous prompt to retry");

  const messages = Array.from(chatMessages.querySelectorAll(".mentor-message"));
  const lastAi = [...messages].reverse().find((m) => m.dataset.role === "ai");
  if (lastAi) lastAi.remove();

  document.querySelectorAll(".mentor-resource-row").forEach((row) => row.remove());
  actionBar.innerHTML = "";
  actionBar.classList.remove("show");

  askAgent(lastUserPrompt, { skipUserBubble: true });
}

async function typeAssistantMessage(fullText) {
  isTyping = true;

  const message = createMessageElement("ai", "");
  const bubble = message.querySelector(".mentor-bubble");
  chatMessages.appendChild(message);

  let current = "";
  const chunkSize = 7;

  for (let i = 0; i < fullText.length; i += chunkSize) {
    current += fullText.slice(i, i + chunkSize);
    bubble.innerHTML = formatAssistantText(current) + `<span class="typing-cursor"></span>`;
    scrollChatToBottom();
    await new Promise((resolve) => setTimeout(resolve, 12));
  }

  bubble.innerHTML = formatAssistantText(fullText);
  message.dataset.raw = fullText;
  bindMessageTools(message);
  isTyping = false;
  saveCurrentChat();
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

function renderResourceCards(cards = []) {
  document.querySelectorAll(".mentor-resource-row").forEach((row) => row.remove());
  if (!cards || !cards.length) return;

  const row = document.createElement("div");
  row.className = "mentor-resource-row";

  const title = document.createElement("div");
  title.className = "mentor-resource-title";
  title.innerHTML = `<i class="fa-solid fa-sparkles"></i><span>Recommended Results</span>`;

  const track = document.createElement("div");
  track.className = "mentor-resource-track";

  cards.forEach((card) => {
    const iconClass =
      card.type === "video" ? "fa-brands fa-youtube" :
      card.type === "book" ? "fa-solid fa-book-open" :
      card.type === "document" ? "fa-solid fa-file-lines" :
      card.type === "website" ? "fa-solid fa-globe" :
      card.type === "docs" ? "fa-solid fa-code" :
      card.type === "course" ? "fa-solid fa-certificate" :
      "fa-solid fa-link";

    const a = document.createElement("a");
    a.className = "mentor-resource-card";
    a.href = card.url || "#";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.innerHTML = `
      <div class="mentor-resource-thumb icon ${card.type || "generic"}"><i class="${iconClass}"></i></div>
      <div class="mentor-resource-body">
        <strong>${escapeHtml(card.title || "Resource")}</strong>
        <small>${escapeHtml(card.subtitle || "")}</small>
        <p>${escapeHtml(card.description || "")}</p>
        <span class="mentor-resource-open">Open <i class="fa-solid fa-arrow-up-right-from-square"></i></span>
      </div>
    `;
    track.appendChild(a);
  });

  row.appendChild(title);
  row.appendChild(track);
  chatMessages.appendChild(row);
  scrollChatToBottom();
}

function addPendingFiles(files) {
  const allowed = Array.from(files || []).filter((file) => {
    return file.type === "application/pdf" || file.type.startsWith("image/");
  });

  if (!allowed.length) {
    showToast("Please attach PDF or image files");
    return;
  }

  for (const file of allowed) {
    const key = `${file.name}-${file.size}-${file.lastModified}`;
    const exists = pendingFiles.some((item) => `${item.name}-${item.size}-${item.lastModified}` === key);
    if (!exists) pendingFiles.push(file);
  }

  const hasPdf = pendingFiles.some((file) => file.type === "application/pdf");
  if (hasPdf) setMode("pdf");

  renderPendingFiles();
  showToast(`${allowed.length} file added. Write your instruction then send.`);
  userInput.focus();
}

function renderPendingFiles() {
  if (!selectedFilesPreview) return;

  if (!pendingFiles.length) {
    selectedFilesPreview.innerHTML = "";
    selectedFilesPreview.classList.remove("show");
    return;
  }

  selectedFilesPreview.innerHTML = pendingFiles.map((file, index) => {
    const isPdf = file.type === "application/pdf";
    const icon = isPdf ? "fa-solid fa-file-pdf" : "fa-solid fa-image";
    const size = file.size > 1024 * 1024
      ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
      : `${Math.max(1, Math.round(file.size / 1024))} KB`;

    return `
      <span class="selected-file-chip">
        <i class="${icon}"></i>
        <span>${escapeHtml(file.name)}</span>
        <small>${size}</small>
        <button type="button" data-remove-file="${index}">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </span>
    `;
  }).join("");

  selectedFilesPreview.classList.add("show");

  selectedFilesPreview.querySelectorAll("[data-remove-file]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pendingFiles.splice(Number(btn.dataset.removeFile), 1);
      renderPendingFiles();
    });
  });
}

async function sendFilesWithPrompt(message) {
  if (isTyping) return;

  const prompt = message || "Please analyze and explain these attached files.";
  const fileLabel = pendingFiles.map((file) => file.name).join(", ");
  const filesToSend = [...pendingFiles];

  pendingFiles = [];
  renderPendingFiles();

  addMessage("user", `${prompt}\n\nAttached: ${fileLabel}`);
  lastUserPrompt = prompt;

  const loading = addLoadingMessage();
  askBtn.disabled = true;
  askBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;

  try {
    const formData = new FormData();
    formData.append("message", prompt);
    formData.append("mode", currentMode);
    formData.append("modelChoice", selectedModel);
    filesToSend.forEach((file) => formData.append("files", file));

    const response = await fetch("/api/agent-files", {
      method: "POST",
      body: formData
    });

    const data = await response.json();
    loading.remove();

    if (!response.ok) {
      addMessage("ai", data.error || "Could not process attached files.");
      return;
    }

    lastAnswer = data.answer || "";
    await typeAssistantMessage(lastAnswer);
    renderResourceCards(data.resourceCards || []);
    renderActions(data.actions || []);
    saveCurrentChat();
  } catch {
    loading.remove();
    addMessage("ai", "File upload failed. Make sure server is running and API key is set.");
  } finally {
    askBtn.disabled = false;
    askBtn.innerHTML = `<i class="fa-solid fa-arrow-up"></i>`;
  }
}

async function askAgent(messageText, options = {}) {
  if (isTyping) return;

  const message = messageText || userInput.value.trim();

  if (pendingFiles.length && !options.skipUserBubble) {
    userInput.value = "";
    await sendFilesWithPrompt(message);
    return;
  }

  if (!message) return showToast("Write a question first");

  userInput.value = "";
  lastUserPrompt = message;

  if (!options.skipUserBubble) addMessage("user", message);

  const loading = addLoadingMessage();
  askBtn.disabled = true;
  askBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;

  try {
    const response = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: currentMode, modelChoice: selectedModel, message })
    });

    const data = await response.json();
    loading.remove();

    if (!response.ok) {
      addMessage("ai", data.error || "Something went wrong.");
      return;
    }

    lastAnswer = data.answer || "";
    await typeAssistantMessage(lastAnswer);
    renderResourceCards(data.resourceCards || []);
    renderActions(data.actions || []);
    saveCurrentChat();
  } catch {
    loading.remove();
    addMessage("ai", "Server connection failed. Make sure npm run dev is running.");
  } finally {
    askBtn.disabled = false;
    askBtn.innerHTML = `<i class="fa-solid fa-arrow-up"></i>`;
  }
}

function exportCurrentChat() {
  const text = chatMessages.innerText.trim();

  if (!chatStarted || !text || text.includes("Your mentor response will appear here")) {
    showToast("No chat to export");
    return;
  }

  const title = Array.from(chatMessages.querySelectorAll(".mentor-message.user"))[0]?.dataset.raw || "poro-mentor-chat";
  const fileName = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "poro-mentor-chat"}.txt`;

  const blob = new Blob([`Poro Mentor Chat Export\nGenerated: ${new Date().toLocaleString()}\n\n${text}`], {
    type: "text/plain;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);

  showToast("Chat exported");
}

function getChats() {
  try {
    return JSON.parse(localStorage.getItem("poroMentorChats") || "[]");
  } catch {
    return [];
  }
}

function setChats(chats) {
  localStorage.setItem("poroMentorChats", JSON.stringify(chats.slice(0, 25)));
}

function saveCurrentChat() {
  if (!chatStarted) return;
  const text = chatMessages.innerText.trim();
  if (!text || text.includes("Your mentor response will appear here")) return;

  const chats = getChats();
  const firstUserMessage = Array.from(chatMessages.querySelectorAll(".mentor-message.user"))[0]?.dataset.raw || "New chat";
  const title = firstUserMessage.slice(0, 42);

  if (!currentChatId) currentChatId = `chat_${Date.now()}`;

  const chat = {
    id: currentChatId,
    title,
    mode: currentMode,
    model: selectedModel,
    html: chatMessages.innerHTML,
    actionsHtml: actionBar.innerHTML,
    actionsVisible: actionBar.classList.contains("show"),
    updatedAt: Date.now()
  };

  const next = [chat, ...chats.filter((item) => item.id !== currentChatId)];
  setChats(next);
  renderHistory();
}

function deleteSingleChat(chatId) {
  const chats = getChats();
  const chat = chats.find((item) => item.id === chatId);
  const title = chat?.title || "this chat";

  const ok = window.confirm(`Delete chat history?\n\n"${title}"\n\nThis cannot be undone.`);
  if (!ok) return;

  const next = chats.filter((item) => item.id !== chatId);
  setChats(next);

  if (currentChatId === chatId) resetStartScreen();
  renderHistory();
  showToast("Chat deleted");
}

function renderHistory() {
  const chats = getChats();

  if (!chats.length) {
    historyList.innerHTML = `<p class="empty-history">No chats yet</p>`;
    return;
  }

  historyList.innerHTML = chats.map((chat) => `
    <div class="history-row ${chat.id === currentChatId ? "active" : ""}">
      <button class="history-item ${chat.id === currentChatId ? "active" : ""}" data-chat-id="${chat.id}" type="button" title="${escapeHtml(chat.title)}">
        <i class="fa-regular fa-message"></i>
        <span>${escapeHtml(chat.title)}</span>
      </button>
      <button class="history-delete" data-delete-chat-id="${chat.id}" type="button" title="Delete chat">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>
  `).join("");

  document.querySelectorAll(".history-item").forEach((button) => {
    button.addEventListener("click", () => loadChat(button.dataset.chatId));
  });

  document.querySelectorAll(".history-delete").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      deleteSingleChat(button.dataset.deleteChatId);
    });
  });
}

function loadChat(chatId) {
  const chat = getChats().find((item) => item.id === chatId);
  if (!chat) return;

  currentChatId = chat.id;
  chatStarted = true;
  mentorApp.classList.add("chat-started");
  chatMessages.innerHTML = chat.html;
  actionBar.innerHTML = chat.actionsHtml || "";
  actionBar.classList.toggle("show", Boolean(chat.actionsVisible));
  setMode(chat.mode || "study");
  setModel(chat.model || "fast");
  bindAllMessageTools();
  renderHistory();
  showToast("Chat loaded");
}

function closeDropdowns() {
  modeMenu.classList.remove("open");
  modelMenu.classList.remove("open");
  selectedModeChip.classList.remove("open");
  modelPickerBtn.classList.remove("open");
}

function toggleDropdown(menu, trigger) {
  const isOpen = menu.classList.contains("open");
  closeDropdowns();
  if (!isOpen) {
    menu.classList.add("open");
    trigger.classList.add("open");
  }
}

document.getElementById("sidebarToggle").addEventListener("click", () => mentorApp.classList.toggle("sidebar-collapsed"));
document.getElementById("mobileSidebarBtn").addEventListener("click", () => sidebar.classList.toggle("mobile-open"));
document.getElementById("newChatBtn").addEventListener("click", resetStartScreen);
document.getElementById("clearHistoryBtn").addEventListener("click", () => {
  localStorage.removeItem("poroMentorChats");
  renderHistory();
  showToast("History cleared");
});

document.querySelectorAll(".mode-item[data-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    setMode(button.dataset.mode);
    userInput.focus();
  });
});

selectedModeChip.addEventListener("click", () => toggleDropdown(modeMenu, selectedModeChip));
modelPickerBtn.addEventListener("click", () => toggleDropdown(modelMenu, modelPickerBtn));

document.querySelectorAll(".mode-menu button").forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});

document.querySelectorAll(".model-menu button").forEach((button) => {
  button.addEventListener("click", () => setModel(button.dataset.model));
});

document.addEventListener("click", (event) => {
  const clickedInsideDropdown =
    event.target.closest(".dropdown-menu") ||
    event.target.closest("#selectedModeChip") ||
    event.target.closest("#modelPickerBtn");

  if (!clickedInsideDropdown) closeDropdowns();
});

document.querySelectorAll(".starter-card").forEach((button) => {
  button.addEventListener("click", () => {
    setMode(button.dataset.mode || "study");
    userInput.value = button.dataset.prompt || "";
    userInput.focus();
  });
});

askBtn.addEventListener("click", () => askAgent());

userInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    askAgent();
  }
});

document.getElementById("exportChatBtn")?.addEventListener("click", exportCurrentChat);
document.getElementById("clearBtn").addEventListener("click", resetStartScreen);
document.getElementById("demoPromptsBtn")?.addEventListener("click", () => {
  demoPromptOverlay.classList.add("show");
});

document.getElementById("closeDemoPromptModal")?.addEventListener("click", () => {
  demoPromptOverlay.classList.remove("show");
});

demoPromptOverlay.addEventListener("click", (event) => {
  if (event.target === demoPromptOverlay) {
    demoPromptOverlay.classList.remove("show");
  }
});

demoPromptOverlay.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    setMode(button.dataset.mode || "study");
    userInput.value = button.dataset.prompt || "";
    demoPromptOverlay.classList.remove("show");
    userInput.focus();
    showToast("Demo prompt loaded");
  });
});

document.getElementById("topSearchBtn")?.addEventListener("click", () => {
  userInput.focus();
  showToast("Type your search in the mentor box");
});

document.getElementById("speakBtn").addEventListener("click", () => {
  if (!lastAnswer) return showToast("No answer to read yet");
  if (!("speechSynthesis" in window)) return showToast("Speech output is not supported");
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(lastAnswer);
  utterance.rate = 0.95;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
});

document.getElementById("voiceBtn").addEventListener("click", () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return showToast("Voice input is not supported in this browser");

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  showToast("Listening...");
  recognition.start();

  recognition.onresult = (event) => {
    userInput.value = event.results[0][0].transcript;
    showToast("Voice captured");
  };

  recognition.onerror = () => showToast("Voice input failed");
});

document.getElementById("attachBtn").addEventListener("click", () => {
  const input = document.getElementById("pdfFileInput");
  if (input) input.click();
});

const fileInput = document.getElementById("pdfFileInput");
if (fileInput) {
  fileInput.addEventListener("change", (event) => {
    addPendingFiles(event.target.files);
    event.target.value = "";
  });
}

document.addEventListener("dragover", (event) => {
  event.preventDefault();
  if ([...event.dataTransfer.types].includes("Files")) {
    mentorApp.classList.add("pdf-dragging");
  }
});

document.addEventListener("dragleave", (event) => {
  if (event.clientX <= 0 || event.clientY <= 0 || event.clientX >= window.innerWidth || event.clientY >= window.innerHeight) {
    mentorApp.classList.remove("pdf-dragging");
  }
});

document.addEventListener("drop", (event) => {
  event.preventDefault();
  mentorApp.classList.remove("pdf-dragging");
  addPendingFiles(event.dataTransfer.files);
});

const params = new URLSearchParams(window.location.search);
const queryMode = params.get("mode");
if (queryMode && modeLabels[queryMode]) setMode(queryMode);

const resumeReviewText = sessionStorage.getItem("poroResumeReviewText");
if (resumeReviewText) {
  sessionStorage.removeItem("poroResumeReviewText");
  setMode("resumeReviewer");
  setTimeout(() => {
    askAgent(`Review this resume. Give a score out of 100, weaknesses, improvements, and improved bullet points:\n\n${resumeReviewText}`);
  }, 500);
}

updateGreeting();
renderHistory();

if (window.AOS) {
  AOS.init({ duration: 700, once: true, offset: 60 });
}




function openDemoPromptsModal() {
  const overlay = document.getElementById("demoPromptOverlay");
  if (overlay) overlay.classList.add("show");
}

document.getElementById("demoPromptsBtn")?.addEventListener("click", openDemoPromptsModal);

document.getElementById("closeDemoPromptModal")?.addEventListener("click", () => {
  document.getElementById("demoPromptOverlay")?.classList.remove("show");
});

document.getElementById("demoPromptOverlay")?.addEventListener("click", (event) => {
  if (event.target.id === "demoPromptOverlay") {
    event.target.classList.remove("show");
  }
});

document.querySelectorAll("#demoPromptOverlay [data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    setMode(button.dataset.mode || "study");
    userInput.value = button.dataset.prompt || "";
    document.getElementById("demoPromptOverlay")?.classList.remove("show");
    userInput.focus();
    showToast("Demo prompt loaded");
  });
});

/* === Phase 7C: Runtime Demo Prompts Injection === */
function injectDemoPromptsRuntime() {
  if (document.getElementById("demoPromptsBtn")) return;

  const topbarActions =
    document.querySelector(".topbar-actions") ||
    document.querySelector(".top-actions") ||
    document.querySelector(".mentor-top-actions") ||
    document.querySelector(".mentor-topbar > div:last-child") ||
    document.querySelector(".mentor-topbar");

  if (!topbarActions) return;

  const demoBtn = document.createElement("button");
  demoBtn.id = "demoPromptsBtn";
  demoBtn.className = "top-action demo-prompts-btn";
  demoBtn.type = "button";
  demoBtn.innerHTML = `<i class="fa-solid fa-lightbulb"></i> Demo Prompts`;

  const searchBtn = document.getElementById("topSearchBtn");
  if (searchBtn && searchBtn.parentElement === topbarActions) {
    topbarActions.insertBefore(demoBtn, searchBtn);
  } else {
    topbarActions.prepend(demoBtn);
  }

  demoBtn.addEventListener("click", openDemoPromptsModalRuntime);
}

function ensureDemoPromptsModalRuntime() {
  if (document.getElementById("demoPromptOverlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "demoPromptOverlay";
  overlay.className = "demo-prompt-overlay";
  overlay.innerHTML = `
    <div class="demo-prompt-modal">
      <div class="demo-prompt-head">
        <div>
          <strong>Demo Prompts</strong>
          <span>Click one to test Poro Mentor quickly.</span>
        </div>
        <button id="closeDemoPromptModal" type="button">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="demo-prompt-grid">
        <button data-mode="study" data-prompt="Explain Newton's second law simply with examples, key points, practice questions, and flashcards.">
          <i class="fa-solid fa-book-open"></i>
          <strong>Study explanation</strong>
          <span>Physics topic + flashcards</span>
        </button>

        <button data-mode="pdf" data-prompt="Summarize these notes or attached files and create key points, exam questions, and flashcards.">
          <i class="fa-solid fa-file-pdf"></i>
          <strong>PDF / notes summary</strong>
          <span>Upload files + summarize</span>
        </button>

        <button data-mode="youtube" data-prompt="I want the best video resources to learn data structures for beginners. Suggest what to watch and what to avoid.">
          <i class="fa-brands fa-youtube"></i>
          <strong>Video learning</strong>
          <span>YouTube/resource plan</span>
        </button>

        <button data-mode="coding" data-prompt="Explain JavaScript fetch API with example code, common mistakes, and practice tasks.">
          <i class="fa-solid fa-code"></i>
          <strong>Coding helper</strong>
          <span>Code explanation</span>
        </button>

        <button data-mode="career" data-prompt="Create a 4-week roadmap for becoming a frontend developer as a CSE student.">
          <i class="fa-solid fa-briefcase"></i>
          <strong>Career roadmap</strong>
          <span>Skills + projects</span>
        </button>

        <button data-mode="productivity" data-prompt="Make a realistic 7-day study plan for exams with breaks and revision time.">
          <i class="fa-solid fa-calendar-check"></i>
          <strong>Productivity plan</strong>
          <span>Exam routine</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("closeDemoPromptModal").addEventListener("click", () => {
    overlay.classList.remove("show");
  });

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) overlay.classList.remove("show");
  });

  overlay.querySelectorAll("[data-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      setMode(button.dataset.mode || "study");
      userInput.value = button.dataset.prompt || "";
      overlay.classList.remove("show");
      userInput.focus();
      showToast("Demo prompt loaded");
    });
  });
}

function openDemoPromptsModalRuntime() {
  ensureDemoPromptsModalRuntime();
  document.getElementById("demoPromptOverlay")?.classList.add("show");
}



/* === Phase 8: Load real OpenAI GPT models from API key === */
async function loadOpenAIModels() {
  try {
    const response = await fetch("/api/models");
    const data = await response.json();

    const models = data.models || [];
    if (!models.length) return;

    const menu = document.getElementById("modelMenu");
    if (!menu) return;

    menu.innerHTML = models.map((model, index) => `
      <button class="${index === 0 ? "active" : ""}" data-model="${model.id}" type="button">
        <i class="fa-brands fa-openai"></i>
        <span>${escapeHtml(model.label || model.id)}</span>
      </button>
    `).join("");

    selectedModel = models[0].id;
    selectedModelLabel.textContent = models[0].label || models[0].id;

    menu.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        selectedModel = button.dataset.model;
        selectedModelLabel.textContent = button.innerText.trim();

        menu.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
        button.classList.add("active");
        closeDropdowns();
        showToast(`Model selected: ${selectedModel}`);
      });
    });
  } catch (error) {
    console.warn("Could not load real models:", error);
  }
}

loadOpenAIModels();

/* === Phase 8E: Ensure Default Chat mode exists === */
function ensureDefaultChatModeButton() {
  const modeNav =
    document.querySelector(".mode-nav") ||
    document.querySelector(".agent-modes") ||
    document.querySelector(".mentor-sidebar");

  if (!modeNav || document.querySelector('[data-mode="general"]')) return;

  const btn = document.createElement("button");
  btn.className = "mode-item active";
  btn.dataset.mode = "general";
  btn.type = "button";
  btn.innerHTML = `
    <i class="fa-solid fa-comments"></i>
    <span>Default Chat</span>
  `;

  const studyBtn = document.querySelector('[data-mode="study"]');
  if (studyBtn && studyBtn.parentElement) {
    studyBtn.classList.remove("active");
    studyBtn.parentElement.insertBefore(btn, studyBtn);
  } else {
    modeNav.appendChild(btn);
  }

  btn.addEventListener("click", () => {
    setMode("general");
    userInput.focus();
  });
}

setTimeout(() => {
  ensureDefaultChatModeButton();
  setMode(currentMode || "general");
}, 250);
