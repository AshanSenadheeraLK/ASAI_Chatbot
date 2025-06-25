document.addEventListener('DOMContentLoaded', () => {
  const chatArea = document.getElementById('chat-area');
  const userInput = document.getElementById('user-input');
  const sendBtn = document.getElementById('send-btn');
  const typing = document.getElementById('typing');
  const scrollBtn = document.getElementById('scroll-bottom');
  const resetBtn = document.getElementById('reset-chat');
  const modeToggle = document.getElementById('mode-toggle');
  const voiceBtn = document.getElementById('voice-btn');
  const regenBtn = document.getElementById('regen-btn');
  const markdownBtn = document.getElementById('markdown-btn');

  const aiService = window.puter?.ai || null;

  const SYSTEM_PROMPT = `You are an anonymous AI assistant.
1. You never reveal your name or mention "Claude" or "Puter".
2. If asked who or what you are, say "an AI assistant".
3. If a user requests code, respond using fenced code blocks.
`;

  function appendMessage(text, sender = 'bot') {
    const msg = document.createElement('div');
    msg.className = `max-w-[80%] break-words rounded-lg px-4 py-2 relative ${sender === 'user' ? 'self-end bg-gradient-to-br from-teal-400 to-indigo-500 text-white' : 'self-start bg-white dark:bg-slate-700 shadow'}`;
    const html = sender === 'bot' ? marked.parse(text) : marked.parseInline(text);
    msg.innerHTML = html;
    chatArea.appendChild(msg);
    chatArea.scrollTop = chatArea.scrollHeight;
    msg.querySelectorAll('pre code').forEach(code => {
      hljs.highlightElement(code);
      const btn = document.createElement('button');
      btn.textContent = 'Copy';
      btn.className = 'absolute top-1 right-1 text-xs bg-gray-200 dark:bg-slate-600 rounded px-1 py-0.5';
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(code.textContent);
        btn.textContent = 'Copied!';
        setTimeout(() => (btn.textContent = 'Copy'), 2000);
      });
      code.parentElement.classList.add('relative');
      code.parentElement.appendChild(btn);
    });
  }

  async function fetchAiResponse(message) {
    if (!aiService) return 'AI is unavailable at the moment.';
    const finalPrompt = `${SYSTEM_PROMPT}\nUser: ${message}\nAssistant:`;
    const aiStream = await aiService.chat(finalPrompt, { model: 'claude-opus-4', stream: true });
    let full = '';
    for await (const chunk of aiStream) {
      full += chunk?.text || '';
    }
    full = full.replace(/claude/gi, 'Assistant').replace(/puter/gi, 'our platform');
    return full;
  }

  async function processAiMessage(text) {
    appendMessage(text, 'user');
    typing.classList.remove('hidden');
    try {
      const reply = await fetchAiResponse(text);
      typing.classList.add('hidden');
      appendMessage(reply, 'bot');
    } catch (e) {
      typing.classList.add('hidden');
      appendMessage('Something went wrong...', 'bot');
    }
  }

  function sendMessage() {
    const msg = userInput.value.trim();
    if (!msg) return;
    userInput.value = '';
    processAiMessage(msg);
  }

  sendBtn.addEventListener('click', sendMessage);
  userInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  scrollBtn.addEventListener('click', () => {
    chatArea.scrollTop = chatArea.scrollHeight;
  });

  resetBtn.addEventListener('click', () => {
    chatArea.innerHTML = '';
    appendMessage('Hello! How can I help you today?', 'bot');
  });

  modeToggle.addEventListener('click', () => {
    const html = document.documentElement;
    html.classList.toggle('dark');
    html.dataset.theme = html.classList.contains('dark') ? 'dark' : 'light';
  });

  voiceBtn.addEventListener('click', () => alert('Voice to text coming soon!'));
  regenBtn.addEventListener('click', () => alert('Regenerate not implemented.'));
  markdownBtn.addEventListener('click', () => alert('Markdown preview not implemented.'));

  appendMessage('Hello! How can I help you today?', 'bot');
});
