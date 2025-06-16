document.addEventListener("DOMContentLoaded", () => {
  const APP_VERSION = "1.1.0 ~ Pre-Release";
  // ====== DOM Elements ======
  const chatArea  = document.getElementById("chat-area");
  const userInput = document.getElementById("user-input");
  const sendBtn   = document.getElementById("send-btn");
  const chatContainer = document.querySelector('.chat-container');
  const versionEl = document.querySelector(".version-number");
  const tagEl = document.querySelector(".version-tag");
  const authContainer = document.getElementById("auth-container");
  const loginBtn = document.getElementById("login-btn");
  const usernameInput = document.getElementById("auth-username");
  const emailInput = document.getElementById("auth-email");
  const passwordInput = document.getElementById("auth-password");
  const userInfo = document.getElementById("user-info");
  const userNameEl = document.getElementById("user-name");
  const userEmailEl = document.getElementById("user-email");
  const profilePicEl = document.getElementById("profile-picture");
  const logoutBtn = document.getElementById("logout-btn");
  const imageUploadInput = document.getElementById("image-upload");
  const uploadBtn = document.getElementById("upload-btn");
  const generateImageBtn = document.getElementById("generate-image-btn");
  const ttsToggle = document.getElementById("tts-toggle");
  if (versionEl) versionEl.textContent = APP_VERSION.split(" ")[0];
  if (tagEl) tagEl.textContent = APP_VERSION.split(" ").slice(1).join(" ");

  // ====== AI Service (via Puter.js) ======
  const aiService = window.puter?.ai || null;
  let ttsEnabled = false;

  function speak(text) {
    try {
      window.puter.ai.textToSpeech(text);
    } catch (e) {}
  }

  // ====== Extended System Prompt ======
  const SYSTEM_PROMPT = `
You are an anonymous AI assistant.
1. You never reveal your name or mention "Claude" or "Puter."
2. If asked who or what you are, say "an AI assistant."
3. If a user requests code, or says "please provide code," always respond with the code snippet wrapped in triple backticks (like this: \`\`\`js ... \`\`\` ).
`;

  /**
   * parseCodeBlocks()
   *  - Finds triple-backtick blocks in text
   *  - Converts them to <pre><code> with optional language classes for highlight.js
   *  - Inserts a copy button for each code block
   */
  function parseCodeBlocks(text) {
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/gm;
    return text.replace(codeBlockRegex, (_, lang, code) => {
      const language = lang || 'plaintext';
      const escaped = code.replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]));
      const btn = `<button class="copy-btn" data-code="${code.replace(/"/g,'&quot;')}">Copy</button>`;
      return `<pre><code class="language-${language}">${escaped}</code>${btn}</pre>`;
    });
  }

  // ====== Append Message ======
  function appendMessage(text, sender = "bot") {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message", sender);

    // Convert code blocks if it's from the bot
    let displayText = (sender === "bot") ? parseCodeBlocks(text) : text;

    // Timestamp
    const time = new Date().toLocaleTimeString();
    msgDiv.innerHTML = `
      ${displayText}
      <div class="timestamp">${time}</div>
    `;

    chatArea.appendChild(msgDiv);
    chatArea.scrollTop = chatArea.scrollHeight;

    // If from bot, highlight code + attach copy events
    if (sender === "bot") {
      setTimeout(() => {
        // Run highlight.js
        msgDiv.querySelectorAll('pre code').forEach((block) => {
          hljs.highlightElement(block);
        });
      }, 0);
      if (ttsEnabled) speak(text);
    }
  }

  // ====== Fetch AI Response ======
  async function fetchAiResponse(userMessage) {
    if (!aiService) {
      return "AI is unavailable at the moment.";
    }

    // If user is requesting code, add extra directive
    let extraDirective = "";
    if (/\b(code|codes|snippet)\b/i.test(userMessage)) {
      extraDirective = "\nPlease provide code in triple backticks format.\n";
    }

    // Combine system prompt + user message
    const finalPrompt = `
${SYSTEM_PROMPT}
User: ${userMessage}
${extraDirective}
Assistant:
    `;

    // Request (streaming)
    const aiStream = await aiService.chat(finalPrompt, {
      model: "gpt-3.5-turbo",
      stream: true
    });

    const pieces = [];
    for await (const chunk of aiStream) {
      pieces.push(chunk?.text || "");
    }
    let fullResponse = pieces.join("");

    // Remove direct mention of "Claude"/"Puter"
    fullResponse = fullResponse
      .replace(/claude/gi, "Assistant")
      .replace(/puter/gi, "our platform");

    return fullResponse;
  }

  // ====== Process AI Message ======
  async function processAiMessage(userText) {
    // 1) Append user message
    appendMessage(userText, "user");

    // 2) Show "Thinking..." from bot
    appendMessage("Thinking...", "bot");
    const allBotMessages = document.querySelectorAll(".bot.message");
    const thinkingBubble = allBotMessages[allBotMessages.length - 1];

    try {
      // 3) AI Response
      const aiReply = await fetchAiResponse(userText);

      // 4) Remove "Thinking..." bubble
      thinkingBubble.remove();

      // 5) Display final AI message
      appendMessage(aiReply, "bot");

    } catch (err) {
      thinkingBubble.textContent = "Something went wrong...";
    }
  }

  // ====== Sending Logic (Enter & Button) ======
  function sendMessage() {
    const msg = userInput.value.trim();
    if (!msg) return;
    userInput.value = "";
    processAiMessage(msg);
  }

  // On "Send" button click
  sendBtn.addEventListener("click", sendMessage);

  // On ENTER key
  userInput.addEventListener("keydown", (e) => {
    // If user pressed Enter (without Shift), send
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // prevent newline
      sendMessage();
    }
  });

  // Copy button handler (event delegation)
  chatArea.addEventListener('click', (e) => {
    if (e.target.classList.contains('copy-btn')) {
      const btn = e.target;
      const rawCode = btn.dataset.code;
      navigator.clipboard.writeText(rawCode)
        .then(() => {
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
        });
    }
  });

  // Login & logout
  async function handleLogin() {
    try {
      const user = await window.puter.auth.login({
        username: usernameInput.value,
        email: emailInput.value,
        password: passwordInput.value
      });
      authContainer.classList.add('hidden');
      userInfo.classList.remove('hidden');
      chatContainer.classList.remove('hidden');
      userNameEl.textContent = user.name || user.username;
      userEmailEl.textContent = user.email;
      if (user.avatarUrl) profilePicEl.src = user.avatarUrl;
      appendMessage('Hello! How can I help you today?', 'bot');
    } catch (e) {
      alert('Login failed');
    }
  }

  function handleLogout() {
    window.puter.auth.logout();
    userInfo.classList.add('hidden');
    authContainer.classList.remove('hidden');
    chatContainer.classList.add('hidden');
    chatArea.innerHTML = '';
    appendMessage('Please sign in to start chatting.', 'bot');
  }

  loginBtn.addEventListener('click', handleLogin);
  logoutBtn.addEventListener('click', handleLogout);

  // Image upload
  uploadBtn.addEventListener('click', () => imageUploadInput.click());
  imageUploadInput.addEventListener('change', async () => {
    const file = imageUploadInput.files[0];
    if (!file) return;
    appendMessage('Processing image...', 'bot');
    const bubbles = document.querySelectorAll('.bot.message');
    const wait = bubbles[bubbles.length-1];
    try {
      const text = await aiService.extractText(file);
      const objects = await aiService.detectObjects(file);
      const vision = await aiService.vision(file, { model: 'gpt-4o' });
      wait.remove();
      appendMessage(`Extracted Text: ${text}\nObjects: ${objects.join(', ')}\nVision: ${vision}`, 'bot');
    } catch (e) {
      wait.textContent = 'Image analysis failed';
    }
  });

  // Image generation via DALL·E 3
  generateImageBtn.addEventListener('click', async () => {
    const promptText = prompt('Describe the image to generate:');
    if (!promptText) return;
    appendMessage(`Generating image for: ${promptText}`, 'bot');
    try {
      const url = await aiService.generateImage(promptText, { model: 'dalle-3' });
      appendMessage(`<img src="${url}" alt="${promptText}" />`, 'bot');
    } catch (e) {
      appendMessage('Image generation failed.', 'bot');
    }
  });

  // Text to speech toggle
  ttsToggle.addEventListener('click', () => {
    ttsEnabled = !ttsEnabled;
    ttsToggle.classList.toggle('active', ttsEnabled);
  });

  // Initial state
  appendMessage("Please sign in to start chatting.", "bot");
});
