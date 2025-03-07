document.addEventListener("DOMContentLoaded", () => {
    // ====== DOM ELEMENTS ======
    const chatBody   = document.getElementById("chat-body");
    const userInput  = document.getElementById("user-input");
    const sendBtn    = document.getElementById("send-btn");
    const canvas     = document.getElementById("visualization-canvas");
  
    // ====== STEALTH AI SERVICE (global library) ======
    const aiService = window.puter?.ai || null;
  
    // ====== 3D SCENE SETUP ======
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.position.z = 5;
  
    // Create a particle system for the background
    const particleCount = 5000;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 10;
    }
    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x7b3fe4,
      size: 0.02,
      transparent: true,
      opacity: 0.4
    });
    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);
  
    // ====== SYSTEM PROMPT: instruct the AI never to mention “Claude” or “Puter” ======
    const SYSTEM_PROMPT = `
  You are an anonymous AI assistant.
  - You never reveal your name or mention the word "Claude" or "Puter."
  - If asked who or what you are, simply state you're "an AI assistant."
    `;
  
    // ====== FETCH AI RESPONSE (combined prompt + user message) ======
    async function fetchAiResponse(userMessage) {
      // Combine system prompt with the user’s message
      const finalPrompt = `${SYSTEM_PROMPT}\nUser: ${userMessage}\nAssistant:`;
  
      if (!aiService) {
        return "AI is unavailable at the moment.";
      }
  
      // Request the AI with streaming
      const aiStream = await aiService.chat(finalPrompt, {
        model: "claude-3-5-sonnet", // Or whichever model name you prefer
        stream: true
      });
  
      let fullResponse = "";
      for await (const chunk of aiStream) {
        fullResponse += chunk?.text || "";
      }
      return fullResponse;
    }
  
    // ====== APPEND A MESSAGE TO THE CHAT BODY ======
    function appendMessage(content, sender, metadata = {}) {
      const msgDiv = document.createElement("div");
      msgDiv.className = "message-container";
  
      msgDiv.innerHTML = `
        <div class="${sender}-message">
          ${content}
          <button class="copy-button" title="Copy">
            <i class="fas fa-copy"></i>
          </button>
        </div>
        <div class="message-timestamp">
          ${new Date().toLocaleTimeString()}
        </div>
      `;
  
      // Optionally store analytics in data attributes
      if (Object.keys(metadata).length > 0) {
        msgDiv.dataset.analytics = JSON.stringify(metadata);
      }
  
      chatBody.appendChild(msgDiv);
      chatBody.scrollTop = chatBody.scrollHeight;
  
      // Simple fade-in animation with GSAP
      gsap.from(msgDiv, {
        opacity: 0,
        y: 20,
        duration: 0.5,
        ease: "power2.out"
      });
  
      // Copy-to-clipboard
      const copyBtn = msgDiv.querySelector(".copy-button");
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(content);
      });
    }
  
    // ====== PROCESS THE RESPONSE FROM THE AI ======
    async function processAIResponse(userMsg) {
      // Placeholder message
      appendMessage("Thinking...", "bot");
      const startTime = performance.now();
  
      try {
        // Get raw AI response
        const rawResponse = await fetchAiResponse(userMsg);
  
        // Post-process: remove any direct mention of “Claude” or “Puter”
        const safeResponse = rawResponse
          .replace(/claude/gi, "Assistant")
          .replace(/puter/gi, "our platform");
  
        const endTime = performance.now();
  
        // Replace the "Thinking..." bubble with the final text
        const lastBotBubble = chatBody.lastChild.querySelector(".bot-message");
        lastBotBubble.innerHTML = safeResponse + `
          <button class="copy-button" title="Copy">
            <i class="fas fa-copy"></i>
          </button>
        `;
  
        // Re-bind copy for the final response
        const copyBtn = lastBotBubble.querySelector(".copy-button");
        copyBtn.addEventListener("click", () => {
          navigator.clipboard.writeText(safeResponse);
        });
  
        // Optional: update analytics (if you have a function for it)
        updateAnalytics({
          sentiment: "N/A",    // Example, or real analysis
          confidence: "N/A",  // Example
          responseTime: endTime - startTime,
          keywords: []
        });
  
      } catch (err) {
        chatBody.lastChild.querySelector(".bot-message").textContent =
          "Something went wrong.";
      }
    }
  
    // ====== UPDATE ANALYTICS PANEL ======
    function updateAnalytics(data) {
      const panel = document.getElementById("analytics-panel");
      panel.innerHTML = `
        <h3>Conversation Analytics</h3>
        <p>Sentiment: ${data.sentiment}</p>
        <p>Confidence: ${data.confidence}</p>
        <p>Response Time: ${data.responseTime.toFixed(2)} ms</p>
        <p>Keywords: ${data.keywords.join(", ")}</p>
      `;
    }
  
    // ====== SEND BUTTON / ENTER KEY ======
    sendBtn.addEventListener("click", () => {
      const msg = userInput.value.trim();
      if (!msg) return;
      appendMessage(msg, "user");
      userInput.value = "";
      processAIResponse(msg);
    });
  
    userInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        sendBtn.click();
      }
    });
  
    // ====== CLEAR CHAT ======
    document.getElementById("clear-chat").addEventListener("click", () => {
      chatBody.innerHTML = "";
    });
  
    // ====== THEME TOGGLE ======
    document.getElementById("toggle-theme").addEventListener("click", () => {
      document.body.classList.toggle("dark-theme");
    });
  
    // ====== TOGGLE 3D BACKGROUND ======
    document.getElementById("toggle-visuals").addEventListener("click", () => {
      if (canvas.style.display === "none") {
        canvas.style.display = "block";
      } else {
        canvas.style.display = "none";
      }
    });
  
    // ====== OPTIONAL VOICE INPUT ======
    document.getElementById("voice-input").addEventListener("click", () => {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Voice recognition not supported in this browser.");
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.start();
      recognition.onresult = (event) => {
        userInput.value = event.results[0][0].transcript;
        sendBtn.click();
      };
    });
  
    // ====== OPTIONAL FLOATING TOOL BUTTONS ======
    document.getElementById("visualize-btn").addEventListener("click", () => {
      gsap.to(particleMaterial, { opacity: 1, duration: 1 });
    });
    document.getElementById("collaborate-btn").addEventListener("click", () => {
      alert("Collaboration feature not implemented yet.");
    });
    document.getElementById("settings-btn").addEventListener("click", () => {
      alert("Settings feature not implemented yet.");
    });
  
    // ====== ANIMATION LOOP FOR THE 3D BACKGROUND ======
    function animate() {
      requestAnimationFrame(animate);
      particleSystem.rotation.y += 0.001;
      renderer.render(scene, camera);
    }
    animate();
  
    // ====== INITIAL BOT WELCOME MESSAGE ======
    appendMessage("Hello! Ask me anything.", "bot");
  });
  
  window.addEventListener("DOMContentLoaded", init);
  window.addEventListener("resize", init);
  
  // ====== END OF SCRIPT ======