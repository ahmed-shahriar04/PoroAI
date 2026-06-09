import { fileURLToPath } from "url";
import path from "path";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";
import { createRequire } from "module";
import OpenAI from "openai";

const require = createRequire(import.meta.url);
const pdfParseModule = require("pdf-parse");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf" || file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and image files are allowed."));
    }
  }
});

app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use(express.static("public"));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, app: "Poro Mentor", message: "Server is running" });
});

app.get("/api/models", async (req, res) => {
  try {
    if (!hasApiKey()) {
      return res.status(400).json({
        error: "OPENAI_API_KEY missing. Please add your API key in the .env file."
      });
    }

    const list = await openai.models.list();
    const models = [];

    for await (const model of list) {
      const id = model.id || "";

      if (
        id.startsWith("gpt-") &&
        !id.includes("audio") &&
        !id.includes("realtime") &&
        !id.includes("transcribe") &&
        !id.includes("tts") &&
        !id.includes("image")
      ) {
        models.push({
          id,
          label: formatModelLabel(id)
        });
      }
    }

    const sorted = models.sort((a, b) => a.id.localeCompare(b.id));

    res.json({
      models: sorted.length ? sorted : [{ id: "gpt-4.1-mini", label: "GPT-4.1 mini" }]
    });
  } catch (error) {
    console.error("Models Error:", error);
    res.status(500).json({
      error: "Could not load OpenAI models for this API key.",
      models: [{ id: "gpt-4.1-mini", label: "GPT-4.1 mini" }]
    });
  }
});

app.post("/api/agent", async (req, res) => {
  try {
    const { mode = "study", message = "", modelChoice = "fast" } = req.body;

    if (!hasApiKey()) {
      return res.status(400).json({
        error: "OPENAI_API_KEY missing. Please add your API key in the .env file."
      });
    }

    if (!message.trim()) {
      return res.status(400).json({ error: "Message is required." });
    }

    const selectedModel = resolveSelectedModel(modelChoice);

    const response = await openai.responses.create({
      model: selectedModel,
      input: [
        { role: "system", content: getSystemPrompt() },
        { role: "user", content: `${getModePrompt(mode)}\n\nStudent request:\n${message}` }
      ],
      temperature: getTemperature(modelChoice)
    });

    const answer = response.output_text || "Sorry, I could not generate an answer.";
    const actions = buildActions(mode, message);
    const resourceCards = await buildResourceCards(mode, message);

    res.json({ answer, actions, resourceCards, modelUsed: selectedModel });
  } catch (error) {
    console.error("Agent Error:", error);
    res.status(500).json({ error: getCleanError(error) });
  }
});

async function extractPdfText(buffer) {
  try {
    if (typeof pdfParseModule === "function") {
      const parsed = await pdfParseModule(buffer);
      return {
        text: parsed.text || "",
        numpages: parsed.numpages || parsed.numPages || null
      };
    }

    if (typeof pdfParseModule.default === "function") {
      const parsed = await pdfParseModule.default(buffer);
      return {
        text: parsed.text || "",
        numpages: parsed.numpages || parsed.numPages || null
      };
    }

    if (typeof pdfParseModule.pdfParse === "function") {
      const parsed = await pdfParseModule.pdfParse(buffer);
      return {
        text: parsed.text || "",
        numpages: parsed.numpages || parsed.numPages || null
      };
    }

    if (pdfParseModule.PDFParse) {
      const parser = new pdfParseModule.PDFParse({ data: buffer });
      const parsed = await parser.getText();
      if (typeof parser.destroy === "function") await parser.destroy();

      return {
        text: parsed.text || "",
        numpages: parsed.total || parsed.numpages || parsed.numPages || null
      };
    }

    throw new Error("Unsupported pdf-parse version.");
  } catch (error) {
    console.error("extractPdfText Error:", error);
    throw error;
  }
}

app.post("/api/agent-files", upload.array("files", 8), async (req, res) => {
  const filePaths = [];

  try {
    if (!hasApiKey()) {
      return res.status(400).json({
        error: "OPENAI_API_KEY missing. Please add your API key in the .env file."
      });
    }

    const mode = req.body.mode || "study";
    const modelChoice = req.body.modelChoice || "fast";
    const message = String(req.body.message || "").trim() || "Please analyze and explain the attached files for study.";

    const files = req.files || [];

    if (!files.length) {
      return res.status(400).json({
        error: "No files uploaded."
      });
    }

    const content = [
      {
        type: "input_text",
        text: `${getModePrompt(mode)}

Student request:
${message}

Attached files:
${files.map((file, index) => `${index + 1}. ${file.originalname} (${file.mimetype})`).join("\n")}`
      }
    ];

    let pdfTextBundle = "";

    for (const file of files) {
      filePaths.push(file.path);

      if (file.mimetype === "application/pdf") {
        const buffer = fs.readFileSync(file.path);
        const parsed = await extractPdfText(buffer);
        const text = String(parsed.text || "").trim();

        pdfTextBundle += `

## PDF File: ${file.originalname}
Pages: ${parsed.numpages || "Unknown"}

${text.slice(0, 12000)}
`;
      }

      if (file.mimetype.startsWith("image/")) {
        const buffer = fs.readFileSync(file.path);
        const base64 = buffer.toString("base64");

        content.push({
          type: "input_image",
          image_url: `data:${file.mimetype};base64,${base64}`
        });
      }
    }

    if (pdfTextBundle.trim()) {
      content[0].text += `

Extracted PDF text:
${pdfTextBundle.slice(0, 22000)}
`;
    }

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: `
You are Poro Mentor, a student-friendly AI file assistant.

The student may upload multiple PDFs and images with a question.
Analyze all attached files together.

Use markdown:
## Short Overview
## What I Found
## Key Points
## Explanation
## Useful Study Notes
## Next Steps

For PDFs: summarize and extract important points.
For images: explain what is visible and how it relates to the student's request.
Bold important words using **bold**.
Do not use raw separator lines like --, ___, or ---.
`
        },
        {
          role: "user",
          content
        }
      ],
      temperature: getTemperature(modelChoice)
    });

    const answer = response.output_text || "Could not analyze the uploaded files.";
    const actions = buildActions(mode, message);
    const resourceCards = await buildResourceCards(mode, message);

    res.json({
      answer,
      actions,
      resourceCards,
      files: files.map((file) => ({
        name: file.originalname,
        type: file.mimetype
      }))
    });
  } catch (error) {
    console.error("Multi-file Error:", error);
    res.status(500).json({
      error: "Could not process the attached files. Try fewer files or paste the text manually."
    });
  } finally {
    for (const filePath of filePaths) {
      if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  }
});

app.post("/api/pdf", upload.single("pdf"), async (req, res) => {
  let filePath = "";

  try {
    if (!hasApiKey()) {
      return res.status(400).json({
        error: "OPENAI_API_KEY missing. Please add your API key in the .env file."
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded." });
    }

    filePath = req.file.path;

    const buffer = fs.readFileSync(filePath);
    const parsed = await extractPdfText(buffer);
    const text = (parsed.text || "").trim();

    if (!text) {
      return res.status(400).json({
        error: "Could not extract readable text from this PDF."
      });
    }

    const limitedText = text.slice(0, 18000);

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: `
You are Poro Mentor, a student-friendly PDF/notes summarizer.

Use markdown:
## Short Overview
## Key Points
## Important Definitions / Formulas
## Possible Exam Questions
## Flashcards
## Study Plan

Bold important words using **bold**.
Do not use raw separator lines like --, ___, or ---.
`
        },
        {
          role: "user",
          content: `PDF filename: ${req.file.originalname}\n\nExtracted PDF text:\n${limitedText}`
        }
      ],
      temperature: 0.35
    });

    const answer = response.output_text || "Could not summarize this PDF.";
    const actions = buildActions("pdf", req.file.originalname);
    const resourceCards = await buildResourceCards("pdf", req.file.originalname);

    res.json({
      filename: req.file.originalname,
      pages: parsed.numpages || null,
      characters: text.length,
      answer,
      actions,
      resourceCards
    });
  } catch (error) {
    console.error("PDF Error:", error);
    res.status(500).json({
      error: error.message?.includes("Only PDF")
        ? "Only PDF files are allowed."
        : "Could not process this PDF. Try another PDF or paste notes manually."
    });
  } finally {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});

app.post("/api/image", upload.single("image"), async (req, res) => {
  let filePath = "";

  try {
    if (!hasApiKey()) {
      return res.status(400).json({
        error: "OPENAI_API_KEY missing. Please add your API key in the .env file."
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: "No image file uploaded."
      });
    }

    if (!req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({
        error: "Please upload an image file."
      });
    }

    filePath = req.file.path;

    const buffer = fs.readFileSync(filePath);
    const base64 = buffer.toString("base64");
    const imageUrl = `data:${req.file.mimetype};base64,${base64}`;

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: `
You are Poro Mentor, a student-friendly AI visual assistant.
Analyze uploaded images clearly.

Use markdown:
## What I See
## Important Details
## Explanation
## Study/Task Help
## Next Steps

If it is a screenshot of notes, diagram, math, code, UI, or document, explain it simply.
Bold important words using **bold**.
Do not use raw separator lines.
`
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Analyze this uploaded image for a student. Filename: ${req.file.originalname}`
            },
            {
              type: "input_image",
              image_url: imageUrl
            }
          ]
        }
      ],
      temperature: 0.35
    });

    const answer = response.output_text || "Could not analyze this image.";
    const actions = buildActions("study", req.file.originalname);
    const resourceCards = await buildResourceCards("study", req.file.originalname);

    res.json({
      filename: req.file.originalname,
      answer,
      actions,
      resourceCards
    });
  } catch (error) {
    console.error("Image Error:", error);
    res.status(500).json({
      error: "Could not process this image. Try another image or describe it manually."
    });
  } finally {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});

function formatModelLabel(id) {
  return id
    .replace(/^gpt-/, "GPT-")
    .replace(/-/g, " ")
    .replace(/\bmini\b/i, "mini")
    .replace(/\bpreview\b/i, "preview");
}

function resolveSelectedModel(modelChoice) {
  const candidate = String(modelChoice || "").trim();

  if (candidate.startsWith("gpt-")) {
    return candidate;
  }

  return "gpt-4.1-mini";
}

function hasApiKey() {
  return Boolean(
    process.env.OPENAI_API_KEY &&
    process.env.OPENAI_API_KEY !== "put_your_openai_api_key_here" &&
    process.env.OPENAI_API_KEY.startsWith("sk-")
  );
}

function getSystemPrompt() {
  return `
You are Poro Mentor, a friendly all-in-one AI study mentor and general AI assistant.

Known project details:
- Project name: Poro Mentor
- Purpose: an AI-powered student study workspace for study help, PDF/image understanding, resume building, career guidance, coding help, productivity planning, campus assistance, and learning resources.
- Developer: Shahriar Ahmed Riaz
- Developer portfolio: https://shahriarahmedriaz.netlify.app/
- Developer university: United International University
- Developer department/major: Software Development
- Powered by: OpenAI

Formatting:
- Use ## for main headings.
- Use ### for sub headings.
- Bold important words using **bold**.
- Use bullet points.
- Include "## Key Points" when useful.
- Include "## Best Resources" when useful.
- Do not use raw separator lines like "---", "--", "___", or "__".
- Keep answers practical and student-friendly.

Important:
- Do not claim you opened websites directly.
- Mention that resource cards/buttons can open resources.
`;
}

function getModePrompt(mode) {
  const prompts = {
    general: `
Mode: Default Chat.
You are in normal assistant mode.

The user can ask anything:
- General conversation
- Poro Mentor website details
- Developer details
- Portfolio link
- Model information
- Study help
- Coding help
- Resume/career/productivity/campus questions

When the user asks about Poro Mentor:
- Explain that it is an AI-powered student workspace.
- Mention it supports chat, PDFs/images, resume builder, coding help, career guide, productivity planner, and learning resource links.

When the user asks who built it:
- Say it was developed by Shahriar Ahmed Riaz.
- Portfolio: https://shahriarahmedriaz.netlify.app/
- University: United International University
- Department/Major: Software Development

When the user asks about the model:
- Say the selected GPT model is chosen from the top model dropdown and powered through the OpenAI API.
`,
    study: `
Mode: Study Helper.
Include:
## Simple Explanation
## Key Points
## Example
## Common Confusion
## Practice Questions
## Best Resources
`,
    youtube: `
Mode: YouTube Learning Finder.
Include:
## What to Watch
## Best Search Queries
## Suggested Learning Order
## What to Avoid
`,
    pdf: `
Mode: PDF / Notes Summarizer.
Include:
## Short Summary
## Key Points
## Definitions / Formulas
## Exam Questions
## Flashcards
`,
    book: `
Mode: Book Finder.
Suggest books, open resources, search keywords, and chapters/topics.
`,
    resumeReviewer: `
Mode: Resume Reviewer.
Include:
## Score out of 100
## Strong Points
## Weak Points
## ATS Improvement Tips
## Better Bullet Points
## Improved Summary
## Final Checklist
`,
    career: `
Mode: Career Guide.
Include:
## Roadmap
## Skills
## Projects
## Resources
## 4-week Plan
## Mistakes to Avoid
`,
    coding: `
Mode: Coding Helper.
Include:
## Concept
## Example Code
## Common Mistakes
## Practice Tasks
## Best Documentation
`,
    productivity: `
Mode: Productivity Planner.
Include:
## Priority List
## Daily Routine
## Focus Tips
## Weekly Plan
`,
    campus: `
Mode: Campus Assistant.
Help with student life, course planning, academic tasks, clubs, events, and campus productivity.
`
  };

  return prompts[mode] || prompts.general || prompts.study;
}

function getTemperature(modelChoice) {
  if (modelChoice === "creative") return 0.8;
  if (modelChoice === "smart") return 0.35;
  return 0.45;
}

function buildActions(mode, message) {
  const q = encodeURIComponent(String(message || "").trim());
  const actions = [];

  if (mode === "study" || mode === "youtube") {
    actions.push(
      {
        label: "YouTube Lessons",
        icon: "fa-brands fa-youtube",
        url: `https://www.youtube.com/results?search_query=${q}+explained+for+beginners`
      },
      {
        label: "Khan Academy",
        icon: "fa-solid fa-graduation-cap",
        url: `https://www.khanacademy.org/search?page_search_query=${q}`
      }
    );
  }

  if (mode === "book" || mode === "pdf" || mode === "study") {
    actions.push(
      {
        label: "Open Library",
        icon: "fa-solid fa-book-open",
        url: `https://openlibrary.org/search?q=${q}`
      },
      {
        label: "Google Scholar",
        icon: "fa-solid fa-scroll",
        url: `https://scholar.google.com/scholar?q=${q}`
      }
    );
  }

  if (mode === "coding") {
    actions.push(
      {
        label: "MDN Docs",
        icon: "fa-solid fa-code",
        url: `https://developer.mozilla.org/en-US/search?q=${q}`
      },
      {
        label: "GitHub",
        icon: "fa-brands fa-github",
        url: `https://github.com/search?q=${q}&type=repositories`
      },
      {
        label: "Stack Overflow",
        icon: "fa-brands fa-stack-overflow",
        url: `https://stackoverflow.com/search?q=${q}`
      }
    );
  }

  if (mode === "career" || mode === "resumeReviewer") {
    actions.push(
      {
        label: "LinkedIn Learning",
        icon: "fa-brands fa-linkedin",
        url: `https://www.linkedin.com/learning/search?keywords=${q}`
      },
      {
        label: "Coursera",
        icon: "fa-solid fa-certificate",
        url: `https://www.coursera.org/search?query=${q}`
      }
    );
  }

  actions.push({
    label: "Google Search",
    icon: "fa-brands fa-google",
    url: `https://www.google.com/search?q=${q}+best+resources`
  });

  return actions.slice(0, 6);
}

async function buildResourceCards(mode, message) {
  const query = String(message || "").trim();
  const q = encodeURIComponent(query);
  const cards = [];

  if (mode === "study" || mode === "youtube") {
    cards.push(
      {
        type: "video",
        title: "Suggested Video Lessons",
        subtitle: "YouTube search",
        description: "This is your suggested video search for beginner-friendly lessons.",
        image: "",
        url: `https://www.youtube.com/results?search_query=${q}+explained+for+beginners`
      },
      {
        type: "video",
        title: "Crash Course Style Videos",
        subtitle: "YouTube search",
        description: "This is your suggested video search for visual explanations.",
        image: "",
        url: `https://www.youtube.com/results?search_query=Crash+Course+${q}`
      },
      {
        type: "website",
        title: "Suggested Learning Website",
        subtitle: "Khan Academy search",
        description: "This is your suggested structured learning website.",
        image: "",
        url: `https://www.khanacademy.org/search?page_search_query=${q}`
      }
    );
  }

  if (mode === "book" || mode === "pdf" || mode === "study") {
    cards.push(
      {
        type: "book",
        title: "Suggested Books",
        subtitle: "Open Library",
        description: "This is your suggested book search from Open Library.",
        image: "",
        url: `https://openlibrary.org/search?q=${q}`
      },
      {
        type: "document",
        title: "Suggested Academic Documents",
        subtitle: "Google Scholar",
        description: "This is your suggested document and paper search.",
        image: "",
        url: `https://scholar.google.com/scholar?q=${q}`
      },
      {
        type: "book",
        title: "Google Books Preview",
        subtitle: "Google Books",
        description: "This is your suggested book preview search.",
        image: "",
        url: `https://books.google.com/books?q=${q}`
      }
    );
  }

  if (mode === "coding") {
    cards.push(
      {
        type: "docs",
        title: "Suggested Documentation",
        subtitle: "MDN Web Docs",
        description: "This is your suggested official documentation search.",
        image: "",
        url: `https://developer.mozilla.org/en-US/search?q=${q}`
      },
      {
        type: "docs",
        title: "Suggested Code Examples",
        subtitle: "GitHub",
        description: "This is your suggested code repository search.",
        image: "",
        url: `https://github.com/search?q=${q}&type=repositories`
      },
      {
        type: "docs",
        title: "Suggested Developer Q&A",
        subtitle: "Stack Overflow",
        description: "This is your suggested debugging and Q&A search.",
        image: "",
        url: `https://stackoverflow.com/search?q=${q}`
      }
    );
  }

  if (mode === "career" || mode === "resumeReviewer") {
    cards.push(
      {
        type: "course",
        title: "Suggested Career Lessons",
        subtitle: "LinkedIn Learning",
        description: "This is your suggested career learning search.",
        image: "",
        url: `https://www.linkedin.com/learning/search?keywords=${q}`
      },
      {
        type: "course",
        title: "Suggested Courses",
        subtitle: "Coursera",
        description: "This is your suggested online course search.",
        image: "",
        url: `https://www.coursera.org/search?query=${q}`
      },
      {
        type: "website",
        title: "Suggested Career Website",
        subtitle: "Google Search",
        description: "This is your suggested website search for career guidance.",
        image: "",
        url: `https://www.google.com/search?q=${q}+career+guide`
      }
    );
  }

  if (!cards.length) {
    cards.push({
      type: "website",
      title: "Suggested Website",
      subtitle: "Google Search",
      description: "This is your suggested website search.",
      image: "",
      url: `https://www.google.com/search?q=${q}`
    });
  }

  const unique = [];
  const seen = new Set();

  for (const card of cards) {
    const key = `${card.title}|${card.url}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(card);
    }
  }

  return unique.slice(0, 6);
}

function getCleanError(error) {
  const message = error?.message || "";

  if (message.includes("401") || message.toLowerCase().includes("api key")) {
    return "OpenAI API key problem. Please check your .env file and restart the server.";
  }

  if (message.includes("429")) {
    return "OpenAI rate limit or credit issue. Please check your OpenAI credits/billing.";
  }

  return "Something went wrong while talking to Poro Mentor. Check terminal logs.";
}

function buildImagePrompt(userPrompt = "") {
  const cleanPrompt = String(userPrompt || "").trim();

  return `
Create a polished, high-quality image based on the user's request.

User request:
${cleanPrompt}

Requirements:
- Produce a clean, visually appealing, professional result
- Follow the user's request closely
- If the user asks for poster/banner/thumbnail/logo/illustration/study diagram, generate accordingly
- If no style is specified, choose a modern, clean, student-friendly visual style
- Avoid adding unnecessary text unless the prompt asks for text
- Make the final image presentation-ready
  `.trim();
}

app.post("/api/generate-image", async (req, res) => {
  try {
    if (!hasApiKey()) {
      return res.status(400).json({
        error: "OPENAI_API_KEY missing. Please add your API key in the .env file."
      });
    }

    const prompt = String(req.body?.prompt || "").trim();
    const size = String(req.body?.size || "1024x1024").trim();

    if (!prompt) {
      return res.status(400).json({
        error: "Image prompt is required."
      });
    }

    const finalPrompt = buildImagePrompt(prompt);

    const imageResponse = await openai.images.generate({
      model: "gpt-image-1",
      prompt: finalPrompt,
      size,
      quality: "high"
    });

    const imageBase64 = imageResponse?.data?.[0]?.b64_json;

    if (!imageBase64) {
      return res.status(500).json({
        error: "Image generation failed. No image data returned."
      });
    }

    const fileName = `poro-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
    const outputPath = path.join(__dirname, "public", "generated", fileName);

    fs.writeFileSync(outputPath, Buffer.from(imageBase64, "base64"));

    const publicUrl = `/generated/${fileName}`;

    res.json({
      ok: true,
      prompt,
      imageUrl: publicUrl,
      answer: `I created an image for your request.\n\n[IMAGE:${publicUrl}]\n\nPrompt: ${prompt}`
    });
  } catch (error) {
    console.error("Generate Image Error:", error);
    res.status(500).json({
      error: error?.message || "Image generation failed."
    });
  }
});

app.listen(PORT, () => {
  console.log(`Poro Mentor running at http://localhost:${PORT}`);
});
