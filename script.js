document.addEventListener("DOMContentLoaded", () => {
  // ====== DOM Elements ======
  const chatArea  = document.getElementById("chat-area");
  const userInput = document.getElementById("user-input");
  const sendBtn   = document.getElementById("send-btn");

  // ====== AI Service (via Puter.js) ======
  const aiService = window.puter?.ai || null;

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
    // Regex: ```lang\n code \n```
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/gm;
    return text.replace(codeBlockRegex, (match, lang, code) => {
      // Save the raw code for copying
      const rawCode = code;

      // HTML-escape the code so it doesn't break the DOM
      const escapedCode = rawCode
        .replace(/[<>&]/g, (c) => {
          switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
          }
        });

      const language = lang ? lang : 'plaintext';

      // Insert a copy button. We'll store the unescaped code in data attribute
      const copyButton = `<button class="copy-btn" data-code="${rawCode.replace(/"/g,'&quot;')}">Copy</button>`;

      return `
<pre><code class="language-${language}">${escapedCode}</code>
${copyButton}
</pre>`;
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
          hljs.highlightBlock(block);
        });
        // Attach copy button events
        msgDiv.querySelectorAll('.copy-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const rawCode = btn.dataset.code;
            navigator.clipboard.writeText(rawCode)
              .then(() => {
                btn.textContent = "Copied!";
                setTimeout(() => { btn.textContent = "Copy"; }, 2000);
              });
          });
        });
      }, 0);
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
      model: "claude-3-5-sonnet",
      stream: true
    });

    let fullResponse = "";
    for await (const chunk of aiStream) {
      fullResponse += chunk?.text || "";
    }

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

  // Initial greeting
  appendMessage("Hello! How can I help you today?", "bot");
});
