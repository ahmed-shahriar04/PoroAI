(() => {
  const IMAGE_KEYWORDS = [
    "generate image",
    "create image",
    "make image",
    "draw ",
    "illustrate",
    "illustration",
    "make a poster",
    "create a poster",
    "design a poster",
    "make poster",
    "make thumbnail",
    "create thumbnail",
    "design thumbnail",
    "make banner",
    "create banner",
    "design banner",
    "make logo",
    "create logo",
    "design logo",
    "make cover",
    "create cover",
    "make flyer",
    "create flyer",
    "make infographic",
    "create infographic"
  ];

  let forceImageGeneration = false;

  function lower(text) {
    return String(text || "").toLowerCase().trim();
  }

  function shouldAutoGenerateImage(text) {
    const msg = lower(text);
    return IMAGE_KEYWORDS.some((keyword) => msg.includes(keyword));
  }

  function getUserInput() {
    return document.getElementById("userInput")
      || document.querySelector(".prompt-console textarea")
      || document.querySelector("textarea");
  }

  function getSendButton() {
    return document.getElementById("askBtn")
      || document.getElementById("sendBtn")
      || document.querySelector('[data-send-btn]')
      || document.querySelector(".send-btn");
  }

  function getAttachButton() {
    return document.getElementById("attachBtn")
      || Array.from(document.querySelectorAll("button")).find((btn) =>
        btn.innerText.toLowerCase().includes("attach")
      );
  }

  function showToastSafe(message) {
    if (typeof window.showToast === "function") {
      window.showToast(message);
    } else {
      console.log(message);
    }
  }

  function injectCreateImageButton() {
    if (document.getElementById("createImageBtn")) return;

    const attachBtn = getAttachButton();
    if (!attachBtn || !attachBtn.parentElement) return;

    const createBtn = document.createElement("button");
    createBtn.id = "createImageBtn";
    createBtn.type = "button";
    createBtn.className = "create-image-btn";
    createBtn.innerHTML = `<i class="fa-solid fa-image"></i><span>Create Image</span>`;

    createBtn.addEventListener("click", () => {
      const input = getUserInput();
      const prompt = String(input?.value || "").trim();

      if (!prompt) {
        showToastSafe("Type the image prompt first");
        input?.focus();
        return;
      }

      forceImageGeneration = true;

      const sendBtn = getSendButton();
      if (sendBtn) {
        sendBtn.click();
      } else {
        generateImageDirect(prompt);
      }
    });

    attachBtn.insertAdjacentElement("beforebegin", createBtn);
  }

  async function generateImageDirect(prompt) {
    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt,
          size: "1024x1024"
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Image generation failed");
      }

      appendSystemImageResult(data.imageUrl, prompt);
      showToastSafe("Image generated");
    } catch (error) {
      console.error(error);
      showToastSafe(error.message || "Image generation failed");
    }
  }

  function appendSystemImageResult(imageUrl, prompt) {
    const chatContainer =
      document.getElementById("chatMessages")
      || document.querySelector(".chat-messages")
      || document.querySelector(".mentor-messages")
      || document.querySelector(".messages");

    if (!chatContainer) return;

    const wrapper = document.createElement("div");
    wrapper.className = "mentor-message ai image-result-message";
    wrapper.innerHTML = `
      <div class="mentor-avatar"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
      <div class="image-result-card">
        <div class="image-result-head">
          <span><i class="fa-solid fa-wand-magic-sparkles"></i> Generated Image</span>
        </div>
        <img src="${imageUrl}" alt="Generated image">
        <div class="image-result-body">
          <p>${escapeHtmlSafe(prompt)}</p>
          <div class="image-result-actions">
            <a href="${imageUrl}" target="_blank" rel="noopener noreferrer">Open</a>
            <a href="${imageUrl}" download>Download</a>
          </div>
        </div>
      </div>
    `;
    chatContainer.appendChild(wrapper);
    wrapper.scrollIntoView({ behavior: "smooth", block: "end" });
  }

  function escapeHtmlSafe(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function convertImageTokens() {
    const messages = document.querySelectorAll(".mentor-message, .message, .assistant-message");
    messages.forEach((message) => {
      if (message.dataset.imageEnhanced === "true") return;

      const text = message.innerText || "";
      const match = text.match(/\[IMAGE:(\/generated\/[^\]\s]+)\]/);

      if (!match) return;

      const imageUrl = match[1];
      const cleaned = text.replace(match[0], "").trim();

      message.dataset.imageEnhanced = "true";
      message.classList.add("image-result-message");
      message.innerHTML = `
        <div class="mentor-avatar"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
        <div class="image-result-card">
          <div class="image-result-head">
            <span><i class="fa-solid fa-wand-magic-sparkles"></i> Generated Image</span>
          </div>
          <img src="${imageUrl}" alt="Generated image">
          <div class="image-result-body">
            <p>${escapeHtmlSafe(cleaned)}</p>
            <div class="image-result-actions">
              <a href="${imageUrl}" target="_blank" rel="noopener noreferrer">Open</a>
              <a href="${imageUrl}" download>Download</a>
            </div>
          </div>
        </div>
      `;
    });
  }

  function observeMessages() {
    const target =
      document.getElementById("chatMessages")
      || document.querySelector(".chat-messages")
      || document.querySelector(".mentor-messages")
      || document.body;

    const observer = new MutationObserver(() => {
      injectCreateImageButton();
      convertImageTokens();
    });

    observer.observe(target, { childList: true, subtree: true });
  }

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    try {
      const url = typeof input === "string" ? input : (input?.url || "");
      const isAgentCall = url.includes("/api/agent");

      if (isAgentCall && init?.body) {
        const body = JSON.parse(init.body);
        const message = String(body?.message || "").trim();

        if (message && (forceImageGeneration || shouldAutoGenerateImage(message))) {
          forceImageGeneration = false;

          const response = await originalFetch("/api/generate-image", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              prompt: message,
              size: "1024x1024"
            })
          });

          const data = await response.json();

          const transformed = {
            answer: data?.answer || "I generated an image for you.",
            imageUrl: data?.imageUrl || "",
            isImage: true,
            actions: [],
            resourceCards: [],
            modelUsed: "gpt-image-1"
          };

          return new Response(JSON.stringify(transformed), {
            status: response.status,
            headers: {
              "Content-Type": "application/json"
            }
          });
        }
      }
    } catch (error) {
      console.warn("Image auto-detect fetch patch error:", error);
      forceImageGeneration = false;
    }

    return originalFetch(input, init);
  };

  function boot() {
    injectCreateImageButton();
    convertImageTokens();
    observeMessages();
    setInterval(injectCreateImageButton, 1200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
