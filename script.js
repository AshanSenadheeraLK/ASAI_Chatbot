document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const chatArea = document.getElementById('chat-area');
  const userInput = document.getElementById('user-input');
  const sendBtn = document.getElementById('send-btn');
  const typing = document.getElementById('typing');
  const resetBtn = document.getElementById('reset-chat');
  const themeToggle = document.getElementById('theme-toggle');
  const voiceBtn = document.getElementById('voice-btn');
  const fileBtn = document.getElementById('file-btn');
  const fileUpload = document.getElementById('file-upload');
  const fileInput = document.getElementById('file-input');
  const dragArea = document.querySelector('.drag-area');
  const filePreviewArea = document.getElementById('file-preview-area');
  const cancelUpload = document.getElementById('cancel-upload');
  const commandSuggestions = document.getElementById('command-suggestions');
  const sidebar = document.getElementById('sidebar');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const closeSidebarBtn = document.getElementById('close-sidebar');
  const chatHistory = document.getElementById('chat-history');
  const searchBtn = document.getElementById('search-btn');
  const searchOverlay = document.getElementById('search-overlay');
  const closeSearchBtn = document.getElementById('close-search');
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  const exportChatBtn = document.getElementById('export-chat');
  const exportModal = document.getElementById('export-modal');
  const closeExportModalBtn = document.getElementById('close-export-modal');
  const downloadExportBtn = document.getElementById('download-export');
  const exportFilename = document.getElementById('export-filename');
  const exportFormatBtns = document.querySelectorAll('.export-format-btn');
  const responseLengthSlider = document.getElementById('response-length');
  const responseLengthValue = document.getElementById('response-length-value');
  const personalityBtns = document.querySelectorAll('.personality-btn');

  // AI Service from puter.com
  const aiService = window.puter?.ai || null;
  
  // Fallback AI response (mock service when puter.ai is unavailable)
  const fallbackAiResponses = {
    greeting: [
      "Hello! I'm AS AI Assistant. How can I help you today?",
      "Hi there! I'm AS AI Assistant. What can I do for you?",
      "Good day! I'm AS AI Assistant. I'm here to assist you!"
    ],
    unavailable: [
      "I'm having trouble connecting to the AI service. Please make sure you're logged in to use this chatbot.",
      "It seems the AI service is currently unavailable. You may need to log in or try again later.",
      "The AI service connection failed. This may be due to authentication or server issues."
    ],
    generic: [
      "That's an interesting question. Let me think about that...",
      "I understand your query. If I were fully connected, I would provide a more detailed response.",
      "Thanks for your message. In demo mode, I can only provide limited responses.",
      "I'd love to help with that. To get a proper response, please ensure you're logged in to the AI service.",
      "That's a great point. With full AI service access, I could engage more deeply on this topic."
    ]
  };
  
  // Get random response from fallback options
  function getFallbackResponse(type = 'generic') {
    const responses = fallbackAiResponses[type] || fallbackAiResponses.generic;
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Mock stream for fallback responses
  async function* mockResponseStream(response) {
    const words = response.split(' ');
    let currentResponse = '';
    
    for (const word of words) {
      currentResponse += word + ' ';
      yield { text: word + ' ' };
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 150));
    }
  }

  // Configuration variables
  const MAX_CONVERSATION_LENGTH = 99999999999999999999999999; // Max number of messages to keep in context
  let currentMessageIndex = 0;
  let exportFormat = 'txt';
  let responseLength = 'default';
  let aiPersonality = 'professional';
  let messageHistory = [];
  let lastUserMessage = '';
  let isDarkMode = false;

  // System prompts for different personalities
  const PERSONALITY_PROMPTS = {
    professional: `You are an AI assistant with a professional demeanor.
1. Maintain a formal tone with clear, concise responses.
2. Prioritize accuracy and clarity in your answers.
3. If asked who or what you are, say "I am AS AI Assistant".
4. Use proper formatting and structure in responses.`,
    
    friendly: `You are an AI assistant with a friendly, conversational demeanor.
1. Use a warm, casual tone while remaining helpful.
2. Feel free to use appropriate emojis occasionally 😊.
3. If asked who or what you are, say "I am AS AI Assistant".
4. Make complex topics accessible with simple explanations.`,
    
    concise: `You are an AI assistant focused on brevity.
1. Provide short, direct answers with minimal explanation.
2. Use bullet points when listing multiple items.
3. If asked who or what you are, say "I am AS AI Assistant".
4. Optimize for quick, efficient responses.`
  };

  // Response length adjustments
  const RESPONSE_LENGTHS = {
    1: 'brief',
    2: 'default',
    3: 'detailed'
  };

  function isIdentityQuestion(text) {
    const lower = text.toLowerCase();
    return ['who are you', "what is your name", "what's your name"].some(q => lower.includes(q));
  }

  // Initialize from localStorage if available
  function initializeFromLocalStorage() {
    const savedMessages = localStorage.getItem('chatMessages');
    const savedTheme = localStorage.getItem('theme');
    const savedPersonality = localStorage.getItem('aiPersonality');
    const savedResponseLength = localStorage.getItem('responseLength');
    
    if (savedMessages) {
      try {
        messageHistory = JSON.parse(savedMessages);
        messageHistory.forEach(msg => appendMessageToUI(msg.text, msg.sender, msg.timestamp));
        updateChatHistory();
      } catch (e) {
        console.error('Error parsing saved messages:', e);
        messageHistory = [];
      }
    } else {
      // Add initial welcome message
      const welcomeMessage = 'Hello! I\'m your AI assistant. How can I help you today?';
      appendMessageToUI(welcomeMessage, 'bot', new Date().toISOString());
      messageHistory.push({
        sender: 'bot',
        text: welcomeMessage,
        timestamp: new Date().toISOString()
      });
      saveToLocalStorage();
    }
    
    // Set theme
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.dataset.theme = 'dark';
      isDarkMode = true;
    }
    
    // Set personality
    if (savedPersonality) {
      aiPersonality = savedPersonality;
      updatePersonalityUI();
    }
    
    // Set response length
    if (savedResponseLength) {
      responseLength = savedResponseLength;
      const sliderValue = Object.keys(RESPONSE_LENGTHS).find(
        key => RESPONSE_LENGTHS[key] === responseLength
      );
      responseLengthSlider.value = sliderValue || 2;
      responseLengthValue.textContent = capitalize(responseLength);
    }
  }

  function saveToLocalStorage() {
    try {
      localStorage.setItem('chatMessages', JSON.stringify(messageHistory));
      localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
      localStorage.setItem('aiPersonality', aiPersonality);
      localStorage.setItem('responseLength', responseLength);
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  }

  // Update chat history sidebar
  function updateChatHistory() {
    chatHistory.innerHTML = '';
    
    if (messageHistory.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'text-center text-gray-500 dark:text-gray-400 py-4';
      emptyState.textContent = 'No conversations yet';
      chatHistory.appendChild(emptyState);
      return;
    }
    
    // Create conversation groups
    const conversations = [];
    let currentConversation = [];
    
    messageHistory.forEach(msg => {
      if (msg.sender === 'user' && currentConversation.length > 0) {
        conversations.push([...currentConversation]);
        currentConversation = [msg];
      } else {
        currentConversation.push(msg);
      }
    });
    
    if (currentConversation.length > 0) {
      conversations.push(currentConversation);
    }
    
    // Add last 5 conversations to the sidebar
    conversations.slice(-5).forEach(convo => {
      const userMsg = convo.find(msg => msg.sender === 'user');
      if (userMsg) {
        const date = new Date(userMsg.timestamp);
        const item = document.createElement('button');
        item.className = 'w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-sm truncate transition duration-200';
        
        // Format date for display
        const formattedDate = new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        }).format(date);
        
        item.innerHTML = `
          <div class="truncate">${truncateText(userMsg.text, 30)}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400">${formattedDate}</div>
        `;
        
        chatHistory.appendChild(item);
      }
    });
  }

  // Helper functions
  function truncateText(text, maxLength) {
    return text.length > maxLength
      ? text.substring(0, maxLength) + '...'
      : text;
  }
  
  function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  // Create a skeleton loader for AI response
  function createSkeletonLoader() {
    const skeletonContainer = document.createElement('div');
    skeletonContainer.className = 'max-w-[80%] self-start rounded-lg p-4 bot-message';
    
    const lines = [
      'w-full h-4 mb-2',
      'w-5/6 h-4 mb-2',
      'w-2/3 h-4'
    ];
    
    lines.forEach(classes => {
      const line = document.createElement('div');
      line.className = `skeleton rounded ${classes}`;
      skeletonContainer.appendChild(line);
    });
    
    return skeletonContainer;
  }

  // Append message to UI
  function appendMessageToUI(text, sender = 'bot', timestamp = new Date().toISOString(), withAnimation = true) {
    // Create message container
    const messageContainer = document.createElement('div');
    messageContainer.className = `message-container flex ${sender === 'user' ? 'justify-end' : 'justify-start'} relative`;
    
    // Create message bubble
    const msg = document.createElement('div');
    msg.className = `max-w-[80%] break-words rounded-lg px-4 py-2 relative ${sender === 'user' ? 'user-message' : 'bot-message'}`;
    
    if (withAnimation) {
      msg.classList.add('message-enter');
    }
    
    // Add timestamp
    const timestampEl = document.createElement('div');
    timestampEl.className = 'timestamp';
    timestampEl.textContent = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    msg.appendChild(timestampEl);
    
    // Add message actions for bot messages
    if (sender === 'bot') {
      const actions = document.createElement('div');
      actions.className = 'message-actions gap-1';
      
      // Copy button
      const copyBtn = document.createElement('button');
      copyBtn.className = 'p-1 rounded-full bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600';
      copyBtn.innerHTML = '<i class="fas fa-copy text-xs"></i>';
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(text);
        showToast('Copied to clipboard');
      });
      
      // Regenerate button
      const regenBtn = document.createElement('button');
      regenBtn.className = 'p-1 rounded-full bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600';
      regenBtn.innerHTML = '<i class="fas fa-redo-alt text-xs"></i>';
      regenBtn.addEventListener('click', () => {
        if (lastUserMessage) {
          // Remove last AI response
          chatArea.removeChild(messageContainer);
          // Remove from message history
          messageHistory.pop();
          saveToLocalStorage();
          // Regenerate
          processAiMessage(lastUserMessage, true);
        }
      });
      
      actions.appendChild(copyBtn);
      actions.appendChild(regenBtn);
      msg.appendChild(actions);
    }
    
    // Add reaction buttons for bot messages
    if (sender === 'bot') {
      const reactionsContainer = document.createElement('div');
      reactionsContainer.className = 'mt-2 flex gap-1';
      
      const reactions = [
        { emoji: '👍', label: 'Helpful' },
        { emoji: '❤️', label: 'Love it' }
      ];
      
      reactions.forEach(reaction => {
      const btn = document.createElement('button');
        btn.className = 'reaction-btn';
        btn.innerHTML = `${reaction.emoji} <span>${reaction.label}</span>`;
        btn.addEventListener('click', function() {
          // Toggle active state
          this.classList.toggle('bg-indigo-100');
          this.classList.toggle('dark:bg-indigo-900/30');
          
          // Show feedback saved toast
          showToast('Feedback saved');
          
          // Hide other reaction buttons
          Array.from(reactionsContainer.children).forEach(child => {
            if (child !== this) {
              child.classList.add('hidden');
            }
          });
        });
        reactionsContainer.appendChild(btn);
      });
      
      msg.appendChild(reactionsContainer);
    }
    
    // Process the message content
    if (sender === 'bot') {
      // Format markdown for bot messages
      msg.innerHTML = marked.parse(text) + msg.innerHTML;
      
      // Process code blocks
      msg.querySelectorAll('pre code').forEach(codeBlock => {
        hljs.highlightElement(codeBlock);
        
        // Add copy button to code blocks
        const pre = codeBlock.parentElement;
        pre.classList.add('relative');
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'absolute top-2 right-2 p-1 text-xs bg-gray-700 dark:bg-slate-600 text-white rounded';
        copyBtn.innerHTML = '<i class="fas fa-copy mr-1"></i>Copy';
        
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(codeBlock.textContent);
          copyBtn.innerHTML = '<i class="fas fa-check mr-1"></i>Copied!';
          setTimeout(() => {
            copyBtn.innerHTML = '<i class="fas fa-copy mr-1"></i>Copy';
          }, 2000);
        });
        
        pre.appendChild(copyBtn);
      });
      
      // Process image tags
      const imgTags = msg.querySelectorAll('img');
      imgTags.forEach(img => {
        img.classList.add('rounded-lg', 'max-w-full', 'my-2');
        img.addEventListener('click', () => {
          // Create lightbox
          const lightbox = document.createElement('div');
          lightbox.className = 'fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4';
          
          const lightboxImg = document.createElement('img');
          lightboxImg.src = img.src;
          lightboxImg.className = 'max-w-full max-h-full rounded-lg';
          
          lightbox.appendChild(lightboxImg);
          lightbox.addEventListener('click', () => {
            document.body.removeChild(lightbox);
          });
          
          document.body.appendChild(lightbox);
        });
      });
    } else {
      // For user messages, just use inline markdown
      msg.innerHTML = marked.parseInline(text);
    }
    
    messageContainer.appendChild(msg);
    chatArea.appendChild(messageContainer);
    scrollToBottom();
  }

  // Show a toast notification
  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full text-sm shadow-lg z-50 opacity-0 transition-opacity duration-300';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Fade in
    setTimeout(() => toast.classList.add('opacity-100'), 10);
    
    // Fade out and remove
    setTimeout(() => {
      toast.classList.remove('opacity-100');
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 2000);
  }

  // Scroll to bottom of chat
  function scrollToBottom() {
    chatArea.scrollTop = chatArea.scrollHeight;
  }

  // Generate AI response
  async function fetchAiResponse(message, isRegeneration = false) {
    // Create a skeleton loader that we'll reference later
    const skeletonLoader = createSkeletonLoader();
    chatArea.appendChild(skeletonLoader);
    
    try {
      // Construct conversation context
      let contextMessages = messageHistory.slice(-MAX_CONVERSATION_LENGTH);
      
      // Add response length instruction
      let lengthInstruction = '';
      if (responseLength === 'brief') {
        lengthInstruction = 'Keep your response brief and to the point.';
      } else if (responseLength === 'detailed') {
        lengthInstruction = 'Provide a detailed and thorough response.';
      }
      
      // Select the appropriate system prompt based on personality
      const systemPrompt = PERSONALITY_PROMPTS[aiPersonality] + (lengthInstruction ? `\n5. ${lengthInstruction}` : '');
      
      // Convert conversation history to string format
      let conversationHistory = '';
      contextMessages.forEach(msg => {
        const role = msg.sender === 'user' ? 'User' : 'Assistant';
        conversationHistory += `${role}: ${msg.text}\n`;
      });
      
      // Append current user message if not already in history
      if (!isRegeneration) {
        conversationHistory += `User: ${message}\n`;
      }
      
      // Final prompt
      const finalPrompt = `${systemPrompt}\n\n${conversationHistory}Assistant:`;
      
      // Use aiService if available, otherwise use fallback
      let aiStream;
      let usesFallback = false;
      
      if (aiService) {
        try {
          // Try to use the real AI service
          aiStream = await aiService.chat(finalPrompt, { model: 'microsoft/Phi-4-multimodal-instruct', stream: true });
        } catch (error) {
          console.warn('AI service unavailable, using fallback:', error);
          // If there's an error with the AI service, use the fallback
          usesFallback = true;
          
          // Determine appropriate fallback response
          let fallbackResponse;
          if (messageHistory.length <= 1) {
            fallbackResponse = getFallbackResponse('greeting');
          } else if (error.message && error.message.includes('401')) {
            fallbackResponse = getFallbackResponse('unavailable');
          } else {
            fallbackResponse = getFallbackResponse();
          }
          
          aiStream = mockResponseStream(fallbackResponse);
          showToast('Using demo mode (AI service unavailable)');
        }
      } else {
        // No AI service available, use fallback
        usesFallback = true;
        let fallbackResponse;
        
        if (messageHistory.length <= 1) {
          fallbackResponse = getFallbackResponse('greeting');
        } else {
          fallbackResponse = getFallbackResponse();
        }
        
        aiStream = mockResponseStream(fallbackResponse);
        console.warn('AI service not found, using fallback responses');
      }
      
      let fullResponse = '';
      const startTime = Date.now();
      let streamingMsg = null;
      
      for await (const chunk of aiStream) {
        const chunkText = chunk?.text || '';
        fullResponse += chunkText;
        
        // Update the skeleton with actual content after a short delay
        const elapsed = Date.now() - startTime;
        if (elapsed > 300) {
          try {
            // Only remove the skeleton if it's still in the DOM
            if (skeletonLoader.parentNode === chatArea) {
              chatArea.removeChild(skeletonLoader);
            }
            
            if (!streamingMsg) {
              streamingMsg = document.createElement('div');
              streamingMsg.className = 'max-w-[80%] self-start rounded-lg p-4 bot-message bot-message-streaming';
              chatArea.appendChild(streamingMsg);
            }
            
            // Update the streaming message with current full response
            if (streamingMsg) {
              streamingMsg.innerHTML = marked.parse(fullResponse);
              
              // Highlight code blocks in the streaming message
              streamingMsg.querySelectorAll('pre code').forEach(block => {
                hljs.highlightElement(block);
              });
              
              scrollToBottom();
            }
          } catch (err) {
            console.error('Error updating streaming message:', err);
          }
        }
      }
      
      // Remove streaming message if still present
      try {
        if (streamingMsg && streamingMsg.parentNode === chatArea) {
          chatArea.removeChild(streamingMsg);
        } else if (skeletonLoader.parentNode === chatArea) {
          // Remove skeleton if it's still there
          chatArea.removeChild(skeletonLoader);
        }
      } catch (err) {
        console.error('Error cleaning up message elements:', err);
        // Just continue, we'll return the response anyway
      }
      
      if (usesFallback && !messageHistory.length) {
        // Add a hint about demo mode for first-time users
        fullResponse += "\n\n*Note: This chatbot is currently running in demo mode with limited functionality. For full AI capabilities, please ensure you're logged in.*";
      }
      
      return fullResponse;
    } catch (error) {
      console.error('Error fetching AI response:', error);
      
      // Remove skeleton if it's still in the DOM
      try {
        if (skeletonLoader.parentNode === chatArea) {
          chatArea.removeChild(skeletonLoader);
        }
      } catch (err) {
        console.error('Error removing skeleton loader:', err);
      }
      
      // Check for authentication errors
      if (error.message && (
          error.message.includes('401') || 
          error.message.includes('auth') || 
          error.message.includes('login'))) {
        return 'I\'m having trouble connecting to the AI service. Please make sure you\'re logged in to Puter.com to use this chatbot.';
      }
      
      return 'Sorry, I encountered an error. Please try again.';
    }
  }

  // Process user message and get AI response
  async function processAiMessage(text, isRegeneration = false) {
    if (!isRegeneration) {
      // Save the user message first
      appendMessageToUI(text, 'user');
      messageHistory.push({
        sender: 'user',
        text: text,
        timestamp: new Date().toISOString()
      });
      saveToLocalStorage();
      updateChatHistory();
      lastUserMessage = text;

      if (isIdentityQuestion(text)) {
        const idReply = 'I am AS AI Assistant.';
        appendMessageToUI(idReply, 'bot');
        messageHistory.push({
          sender: 'bot',
          text: idReply,
          timestamp: new Date().toISOString()
        });
        saveToLocalStorage();
        return;
      }
    }
    
    typing.classList.remove('hidden');
    
    try {
      const reply = await fetchAiResponse(text, isRegeneration);
      typing.classList.add('hidden');
      
      // Add the AI response to message history
      appendMessageToUI(reply, 'bot');
      messageHistory.push({
        sender: 'bot',
        text: reply,
        timestamp: new Date().toISOString()
      });
      saveToLocalStorage();
    } catch (e) {
      console.error('Error in processAiMessage:', e);
      typing.classList.add('hidden');
      
      const errorMessage = 'Something went wrong. Please try again or refresh the page.';
      appendMessageToUI(errorMessage, 'bot');
      messageHistory.push({
        sender: 'bot',
        text: errorMessage,
        timestamp: new Date().toISOString()
      });
      saveToLocalStorage();
    }
  }

  // Process special commands
  function processCommands(text) {
    if (text.startsWith('@image ')) {
      const prompt = text.substring(7);
      appendMessageToUI(`Generating image: "${prompt}"...`, 'bot');

      if (aiService && typeof aiService.txt2img === 'function') {
        aiService.txt2img(prompt, { testMode: true })
          .then(url => {
            const imageMarkdown = `![${prompt}](${url})`;
            appendMessageToUI(imageMarkdown, 'bot');

            messageHistory.push({
              sender: 'bot',
              text: imageMarkdown,
              timestamp: new Date().toISOString()
            });
            saveToLocalStorage();
          })
          .catch(() => {
            const placeholderImage = `https://placehold.co/600x400/4f46e5/ffffff?text=${encodeURIComponent(prompt)}`;
            const imageMarkdown = `![${prompt}](${placeholderImage})`;
            appendMessageToUI(imageMarkdown, 'bot');

            messageHistory.push({
              sender: 'bot',
              text: imageMarkdown,
              timestamp: new Date().toISOString()
            });
            saveToLocalStorage();
          });
      } else {
        setTimeout(() => {
          const placeholderImage = `https://placehold.co/600x400/4f46e5/ffffff?text=${encodeURIComponent(prompt)}`;
          const imageMarkdown = `![${prompt}](${placeholderImage})`;
          appendMessageToUI(imageMarkdown, 'bot');

          messageHistory.push({
            sender: 'bot',
            text: imageMarkdown,
            timestamp: new Date().toISOString()
          });
          saveToLocalStorage();
        }, 1500);
      }

      return true;
    }
    
    if (text.startsWith('@search ')) {
      const query = text.substring(8);
      appendMessageToUI(`Searching for: "${query}"...`, 'bot');
      
      // Simulate web search (in a real app, call a search API)
      setTimeout(() => {
        const searchResult = `Here are the results for "${query}":\n\n` +
          `1. [Example Search Result 1](https://example.com)\n` +
          `2. [Example Search Result 2](https://example.com)\n` +
          `3. [Example Search Result 3](https://example.com)\n\n` +
          `Would you like me to summarize any of these results?`;
        
        appendMessageToUI(searchResult, 'bot');
        
        messageHistory.push({
          sender: 'bot',
          text: searchResult,
          timestamp: new Date().toISOString()
        });
        saveToLocalStorage();
      }, 1500);
      
      return true;
    }
    
    if (text.startsWith('@file')) {
      // Show file upload UI
      fileUpload.classList.remove('hidden');
      return true;
    }
    
    return false;
  }

  // Update personality selection UI
  function updatePersonalityUI() {
    personalityBtns.forEach(btn => {
      const personality = btn.getAttribute('data-personality');
      if (personality === aiPersonality) {
        btn.classList.add('bg-indigo-100', 'dark:bg-indigo-900/30', 'text-indigo-800', 'dark:text-indigo-200', 'border-indigo-500');
        btn.classList.remove('bg-gray-100', 'dark:bg-slate-700', 'text-gray-800', 'dark:text-gray-200', 'border-transparent');
      } else {
        btn.classList.remove('bg-indigo-100', 'dark:bg-indigo-900/30', 'text-indigo-800', 'dark:text-indigo-200', 'border-indigo-500');
        btn.classList.add('bg-gray-100', 'dark:bg-slate-700', 'text-gray-800', 'dark:text-gray-200', 'border-transparent');
      }
    });
  }

  // Handle file uploads
  function handleFileUpload(file) {
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      showToast('File too large. Maximum size is 10MB.');
      return;
    }
    
    // Create file preview
    filePreviewArea.innerHTML = '';
    filePreviewArea.classList.remove('hidden');
    
    const filePreview = document.createElement('div');
    filePreview.className = 'file-preview flex items-center justify-between';
    
    let fileIcon = 'fa-file';
    if (file.type.includes('pdf')) fileIcon = 'fa-file-pdf';
    else if (file.type.includes('word') || file.name.endsWith('.docx')) fileIcon = 'fa-file-word';
    else if (file.type.includes('text')) fileIcon = 'fa-file-alt';
    
    filePreview.innerHTML = `
      <div class="flex items-center gap-2">
        <i class="fas ${fileIcon} text-indigo-500"></i>
        <div>
          <div class="font-medium truncate max-w-[200px]">${file.name}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400">${(file.size / 1024).toFixed(1)}KB</div>
        </div>
      </div>
      <button class="remove-file p-1 text-gray-500 hover:text-red-500">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    filePreview.querySelector('.remove-file').addEventListener('click', () => {
      filePreviewArea.innerHTML = '';
      filePreviewArea.classList.add('hidden');
      fileInput.value = '';
    });
    
    filePreviewArea.appendChild(filePreview);
    
    // Read file content for txt files
    if (file.type.includes('text')) {
      const reader = new FileReader();
      reader.onload = function(e) {
        // Store the content for sending
        filePreview.dataset.content = e.target.result;
      };
      reader.readAsText(file);
    }
  }

  // Handle send message
  function sendMessage() {
    const msg = userInput.value.trim();
    if (!msg && filePreviewArea.children.length === 0) return;
    
    // Reset input area
    userInput.value = '';
    userInput.style.height = '';
    
    // Check if there's a file upload
    if (filePreviewArea.children.length > 0) {
      const filePreview = filePreviewArea.querySelector('.file-preview');
      const fileName = filePreview.querySelector('.font-medium').textContent;
      
      let fileMessage = `I've uploaded a file: ${fileName}`;
      if (msg) {
        fileMessage += `\n\nWith the following message: ${msg}`;
      }
      
      if (filePreview.dataset.content) {
        // For text files, include the content
        fileMessage += `\n\nHere's the content:\n\`\`\`\n${filePreview.dataset.content}\n\`\`\``;
      } else {
        fileMessage += '\n\n(This is a non-text file, so I can\'t show its contents directly)';
      }
      
      // Hide the file upload UI
      fileUpload.classList.add('hidden');
      filePreviewArea.innerHTML = '';
      filePreviewArea.classList.add('hidden');
      
      // Process the message with file
      processAiMessage(fileMessage);
      return;
    }
    
    // Check for special commands
    if (processCommands(msg)) {
      return;
    }
    
    // Regular message
    processAiMessage(msg);
  }

  // Auto-resize textarea after setting value (for commands)
  function resizeUserInput() {
    // Trigger autoResize after setting the value
    setTimeout(() => {
      autoResizeTextarea();
    }, 0);
  }

  // Handle command suggestions
  function handleCommandSuggestions() {
    const text = userInput.value;
    if (text.includes('@') && text.split('@')[1].length === 0) {
      commandSuggestions.classList.remove('hidden');
    } else {
      commandSuggestions.classList.add('hidden');
    }
  }

  // Auto-resize textarea
  function autoResizeTextarea() {
    userInput.style.height = 'auto';
    userInput.style.height = (userInput.scrollHeight) + 'px';
  }

  // Export chat
  function exportChat(format) {
    let content = '';
    const filename = exportFilename.value || 'chat-export';
    
    messageHistory.forEach(msg => {
      const role = msg.sender === 'user' ? 'You' : 'AI';
      const time = new Date(msg.timestamp).toLocaleString();
      content += `${role} (${time}):\n${msg.text}\n\n`;
    });
    
    if (format === 'txt') {
      // Create text file
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.txt`;
      a.click();
      
      URL.revokeObjectURL(url);
    } else if (format === 'pdf') {
      // In a real app, you'd use a library like jsPDF
      showToast('PDF export would be implemented in a real app');
    }
    
    // Close the modal
    exportModal.classList.add('hidden');
  }

  // Search conversations
  function searchConversations(query) {
    if (!query) {
      searchResults.innerHTML = '<div class="p-4 text-center text-gray-500">Type to search</div>';
      return;
    }
    
    const results = messageHistory.filter(msg => 
      msg.text.toLowerCase().includes(query.toLowerCase())
    );
    
    if (results.length === 0) {
      searchResults.innerHTML = '<div class="p-4 text-center text-gray-500">No results found</div>';
      return;
    }
    
    searchResults.innerHTML = '';
    results.forEach(msg => {
      const resultItem = document.createElement('div');
      resultItem.className = 'p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded cursor-pointer';
      
      const date = new Date(msg.timestamp).toLocaleString();
      const preview = truncateText(msg.text, 60);
      const sender = msg.sender === 'user' ? 'You' : 'AI';
      
      resultItem.innerHTML = `
        <div class="text-xs text-gray-500 dark:text-gray-400">${date} - ${sender}</div>
        <div>${preview}</div>
      `;
      
      resultItem.addEventListener('click', () => {
        // Scroll to message (in a real app, you'd add message IDs to find exact messages)
        searchOverlay.classList.add('hidden');
        // For demo, just scroll to bottom for now
        scrollToBottom();
      });
      
      searchResults.appendChild(resultItem);
    });
  }

  // Event Listeners
  sendBtn.addEventListener('click', sendMessage);
  
  userInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  userInput.addEventListener('input', () => {
    autoResizeTextarea();
    handleCommandSuggestions();
  });

  resetBtn.addEventListener('click', () => {
    chatArea.innerHTML = '';
    messageHistory = [];
    const welcomeMessage = 'Hello! I\'m your AI assistant. How can I help you today?';
    appendMessageToUI(welcomeMessage, 'bot');
    messageHistory.push({
      sender: 'bot',
      text: welcomeMessage,
      timestamp: new Date().toISOString()
    });
    saveToLocalStorage();
    updateChatHistory();
  });
  
  themeToggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    document.documentElement.dataset.theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    isDarkMode = document.documentElement.classList.contains('dark');
    saveToLocalStorage();
  });
  
  voiceBtn.addEventListener('click', () => {
    // In a real app, implement speech recognition
    showToast('Voice input would be implemented here');
  });
  
  fileBtn.addEventListener('click', () => {
    fileUpload.classList.toggle('hidden');
  });
  
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleFileUpload(fileInput.files[0]);
    }
  });
  
  cancelUpload.addEventListener('click', () => {
    fileUpload.classList.add('hidden');
    filePreviewArea.innerHTML = '';
    filePreviewArea.classList.add('hidden');
    fileInput.value = '';
  });
  
  // Drag and drop for files
  dragArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dragArea.classList.add('active');
  });
  
  dragArea.addEventListener('dragleave', () => {
    dragArea.classList.remove('active');
  });
  
  dragArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dragArea.classList.remove('active');
    
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  });
  
  // Command suggestion clicks
  document.querySelectorAll('.command-item').forEach(item => {
    item.addEventListener('click', () => {
      const command = item.getAttribute('data-command');
      userInput.value = command + ' ';
      userInput.focus();
      resizeUserInput();
      commandSuggestions.classList.add('hidden');
    });
  });
  
  // Mobile menu
  mobileMenuBtn.addEventListener('click', () => {
    sidebar.classList.remove('-translate-x-full');
  });
  
  closeSidebarBtn.addEventListener('click', () => {
    sidebar.classList.add('-translate-x-full');
  });
  
  // Search functionality
  searchBtn.addEventListener('click', () => {
    searchOverlay.classList.remove('hidden');
    searchInput.focus();
  });
  
  closeSearchBtn.addEventListener('click', () => {
    searchOverlay.classList.add('hidden');
  });
  
  searchInput.addEventListener('input', () => {
    searchConversations(searchInput.value);
  });
  
  // Export functionality
  exportChatBtn.addEventListener('click', () => {
    exportModal.classList.remove('hidden');
  });
  
  closeExportModalBtn.addEventListener('click', () => {
    exportModal.classList.add('hidden');
  });
  
  exportFormatBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      exportFormat = btn.getAttribute('data-format');
      
      // Update UI
      exportFormatBtns.forEach(b => {
        if (b === btn) {
          b.classList.add('bg-indigo-50', 'dark:bg-indigo-900/30', 'border-indigo-200', 'dark:border-indigo-800');
        } else {
          b.classList.remove('bg-indigo-50', 'dark:bg-indigo-900/30', 'border-indigo-200', 'dark:border-indigo-800');
        }
      });
    });
  });
  
  downloadExportBtn.addEventListener('click', () => {
    exportChat(exportFormat);
  });
  
  // Response length slider
  responseLengthSlider.addEventListener('input', () => {
    responseLength = RESPONSE_LENGTHS[responseLengthSlider.value];
    responseLengthValue.textContent = capitalize(responseLength);
    saveToLocalStorage();
  });
  
  // Personality buttons
  personalityBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      aiPersonality = btn.getAttribute('data-personality');
      updatePersonalityUI();
      saveToLocalStorage();
    });
  });
  
  // Click outside to close modals
  document.addEventListener('click', (e) => {
    if (e.target === exportModal) {
      exportModal.classList.add('hidden');
    }
    
    if (e.target === searchOverlay) {
      searchOverlay.classList.add('hidden');
    }
  });
  
  // Initialize the app
  function init() {
    // Initialize from localStorage
    initializeFromLocalStorage();
    
    // Set textarea to auto-resize on initial load
    autoResizeTextarea();
    
    // Add event listener for ESC key to close modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchOverlay.classList.add('hidden');
        exportModal.classList.add('hidden');
        commandSuggestions.classList.add('hidden');
      }
    });
  }
  
  // Initialize the app
  init();
});
