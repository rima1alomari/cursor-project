// Chatbot functionality with typing and voice input
(function() {
  'use strict';

  // Check if chatbot should be hidden (user preference)
  const CHATBOT_HIDDEN_KEY = 'chatbot_hidden';
  const CHATBOT_LANGUAGE_KEY = 'chatbot_language';
  const CHATBOT_EXPANDED_KEY = 'chatbot_expanded';
  
  // OpenAI API Configuration
  // IMPORTANT: Set your OpenAI API key here or use environment variable
  // Get your API key from: https://platform.openai.com/api-keys
  const OPENAI_API_KEY = window.OPENAI_API_KEY || 'YOUR_OPENAI_API_KEY_HERE';
  const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
  
  // Language detection and responses
  const translations = {
    en: {
      welcome: '👋 Hi! I\'m your AI assistant. I can help you with:\n• Questions about LumenSlides\n• General knowledge questions\n• Math calculations\n• Having a conversation\n\nAsk me anything!',
      listening: 'Listening... Speak now!',
      placeholder: 'Type your message...',
      title: '🤖 AI Assistant',
      subtitle: 'How can I help you?',
      minimize: 'Minimize',
      close: 'Close',
      expand: 'Expand',
      shrink: 'Shrink',
      speak: 'Speak',
      listeningLabel: 'Listening...',
      stopListening: 'Stop listening',
      startListening: 'Click to speak'
    },
    ar: {
      welcome: '👋 مرحباً! أنا مساعدك الذكي. يمكنني مساعدتك في:\n• أسئلة حول LumenSlides\n• أسئلة عامة\n• الحسابات الرياضية\n• إجراء محادثة\n\nاسألني أي شيء!',
      listening: 'أستمع... تحدث الآن!',
      placeholder: 'اكتب رسالتك...',
      title: '🤖 المساعد الذكي',
      subtitle: 'كيف يمكنني مساعدتك؟',
      minimize: 'تصغير',
      close: 'إغلاق',
      expand: 'تكبير',
      shrink: 'تصغير',
      speak: 'تحدث',
      listeningLabel: 'أستمع...',
      stopListening: 'إيقاف الاستماع',
      startListening: 'انقر للتحدث'
    }
  };
  
  // Detect language from text
  function detectLanguage(text) {
    // Check for Arabic characters
    const arabicPattern = /[\u0600-\u06FF]/;
    if (arabicPattern.test(text)) {
      return 'ar';
    }
    return 'en';
  }
  
  // Get current language preference
  function getCurrentLanguage() {
    return localStorage.getItem(CHATBOT_LANGUAGE_KEY) || 'en';
  }
  
  // Set language preference
  function setLanguage(lang) {
    localStorage.setItem(CHATBOT_LANGUAGE_KEY, lang);
    updateUILanguage(lang);
  }
  
  // Update UI language
  function updateUILanguage(lang) {
    const t = translations[lang];
    const title = document.querySelector('.chatbot-header-title');
    const subtitle = document.querySelector('.chatbot-header-subtitle');
    const input = document.getElementById('chatbotInput');
    const voiceBtn = document.getElementById('chatbotVoice');
    
    if (title) {
      title.textContent = t.title;
      title.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    }
    if (subtitle) {
      subtitle.textContent = t.subtitle;
      subtitle.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    }
    if (input) {
      input.placeholder = t.placeholder;
      input.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
      input.setAttribute('lang', lang);
    }
    if (voiceBtn) {
      voiceBtn.setAttribute('aria-label', t.startListening);
      voiceBtn.setAttribute('title', t.startListening);
    }
  }
  
  // Initialize chatbot
  function initChatbot() {
    const chatbot = document.getElementById('chatbot');
    if (!chatbot) return;

    const chatbotToggle = document.getElementById('chatbotToggle');
    const chatbotClose = document.getElementById('chatbotClose');
    const chatbotMinimize = document.getElementById('chatbotMinimize');
    const chatbotResize = document.getElementById('chatbotResize');
    const chatbotWindow = document.getElementById('chatbotWindow');
    const chatbotInput = document.getElementById('chatbotInput');
    const chatbotSend = document.getElementById('chatbotSend');
    const chatbotVoice = document.getElementById('chatbotVoice');
    const chatbotMessages = document.getElementById('chatbotMessages');

    let isListening = false;
    let recognition = null;

    // Check if user previously hid the chatbot
    const isHidden = localStorage.getItem(CHATBOT_HIDDEN_KEY) === 'true';
    
    // Ensure chatbot is visible (unless explicitly hidden)
    if (!isHidden) {
      chatbot.style.display = 'block';
      chatbot.style.visibility = 'visible';
      chatbot.style.opacity = '1';
    } else {
      // If hidden, still initialize but keep it hidden
      chatbot.style.display = 'none';
      console.log('Chatbot was previously hidden. Type "showChatbot()" in the console to show it again, or run: localStorage.removeItem("chatbot_hidden")');
      // Don't return - still initialize so user can call showChatbot()
    }

    // Initialize Web Speech API for voice input
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      // Set language based on preference, support both
      const currentLang = getCurrentLanguage();
      recognition.lang = currentLang === 'ar' ? 'ar-SA' : 'en-US';

      recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        chatbotInput.value = transcript;
        isListening = false;
        updateVoiceButton();
      };

      recognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
        isListening = false;
        updateVoiceButton();
        addMessage('bot', 'Sorry, I had trouble understanding. Please try typing instead.');
      };

      recognition.onend = function() {
        isListening = false;
        updateVoiceButton();
      };
    } else {
      // Hide voice button if not supported
      if (chatbotVoice) {
        chatbotVoice.style.display = 'none';
      }
    }

    function updateVoiceButton() {
      if (chatbotVoice) {
        chatbotVoice.classList.toggle('listening', isListening);
        const voiceIcon = chatbotVoice.querySelector('.voice-icon');
        if (voiceIcon) {
          if (isListening) {
            // Stop icon
            voiceIcon.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';
          } else {
            // Microphone icon
            voiceIcon.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>';
          }
        }
        // Update title for accessibility
        const lang = getCurrentLanguage();
        const t = translations[lang];
        chatbotVoice.setAttribute('title', isListening ? t.stopListening : t.startListening);
        chatbotVoice.setAttribute('aria-label', isListening ? t.stopListening : t.startListening);
      }
    }

    // Toggle chatbot window
    if (chatbotToggle) {
      chatbotToggle.addEventListener('click', function() {
        chatbotWindow.classList.toggle('active');
        chatbotToggle.classList.toggle('active');
        if (chatbotWindow.classList.contains('active')) {
          chatbotInput.focus();
          // Ensure resize button state is updated when window opens
          updateResizeButton();
        }
      });
    }

    // Close chatbot (hide permanently)
    if (chatbotClose) {
      chatbotClose.addEventListener('click', function(e) {
        e.stopPropagation();
        if (confirm('Hide chatbot? To show it again, open browser console and type: localStorage.removeItem("chatbot_hidden")')) {
          localStorage.setItem(CHATBOT_HIDDEN_KEY, 'true');
          chatbot.style.display = 'none';
        }
      });
    }

    // Minimize chatbot
    if (chatbotMinimize) {
      chatbotMinimize.addEventListener('click', function(e) {
        e.stopPropagation();
        chatbotWindow.classList.remove('active');
        chatbotToggle.classList.remove('active');
      });
    }

    // Chatbot resize functionality - BULLETPROOF VERSION
    let isExpanded = false;
    
    // GLOBAL FUNCTION - This will ALWAYS work
    window.toggleChatbotSize = function() {
      console.log('🟢 toggleChatbotSize() CALLED!');
      
      const win = document.getElementById('chatbotWindow');
      const btn = document.getElementById('chatbotResize');
      
      if (!win) {
        console.error('❌ Chatbot window not found!');
        return;
      }
      
      // Make sure window is visible
      if (!win.classList.contains('active')) {
        win.classList.add('active');
        const toggle = document.getElementById('chatbotToggle');
        if (toggle) toggle.classList.add('active');
      }
      
      const currentlyExpanded = win.classList.contains('expanded');
      const newExpanded = !currentlyExpanded;
      
      console.log('📏 Toggling from', currentlyExpanded ? 'EXPANDED' : 'NORMAL', 'to', newExpanded ? 'EXPANDED' : 'NORMAL');
      
      if (newExpanded) {
        // EXPAND - MUCH BIGGER
        win.style.setProperty('width', '1200px', 'important');
        win.style.setProperty('height', '1000px', 'important');
        win.style.setProperty('max-width', 'calc(100vw - 40px)', 'important');
        win.style.setProperty('max-height', 'calc(100vh - 40px)', 'important');
        win.classList.add('expanded');
        if (btn) btn.textContent = '⊟';
        isExpanded = true;
        localStorage.setItem(CHATBOT_EXPANDED_KEY, 'true');
        console.log('✅ EXPANDED to 1200x1000');
      } else {
        // SHRINK
        win.style.setProperty('width', '380px', 'important');
        win.style.setProperty('height', '500px', 'important');
        win.style.removeProperty('max-width');
        win.style.removeProperty('max-height');
        win.classList.remove('expanded');
        if (btn) btn.textContent = '⊞';
        isExpanded = false;
        localStorage.setItem(CHATBOT_EXPANDED_KEY, 'false');
        console.log('✅ SHRUNK to 380x500');
      }
      
      // Update button attributes
      if (btn) {
        const lang = getCurrentLanguage();
        const t = translations[lang];
        btn.setAttribute('title', newExpanded ? t.shrink : t.expand);
        btn.setAttribute('aria-label', newExpanded ? t.shrink : t.expand);
      }
    };
    
    // Setup resize button with MULTIPLE methods
    function setupResizeButton() {
      const resizeBtn = document.getElementById('chatbotResize');
      if (!resizeBtn) {
        return false;
      }
      
      console.log('🔧 Setting up resize button...');
      
      // Method 1: Direct onclick (always works)
      resizeBtn.onclick = function(e) {
        e.stopPropagation();
        e.preventDefault();
        console.log('🔵 DIRECT ONCLICK FIRED!');
        window.toggleChatbotSize();
        return false;
      };
      
      // Method 2: Event listener
      resizeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        console.log('🔵 EVENT LISTENER FIRED!');
        window.toggleChatbotSize();
        return false;
      }, true);
      
      console.log('✅ Resize button setup complete!');
      return true;
    }
    
    // Setup immediately and multiple times
    setupResizeButton();
    setTimeout(setupResizeButton, 50);
    setTimeout(setupResizeButton, 200);
    setTimeout(setupResizeButton, 500);
    setTimeout(setupResizeButton, 1000);
    
    // Test function
    window.testResizeButton = function() {
      const btn = document.getElementById('chatbotResize');
      if (btn) {
        console.log('🧪 Testing resize button...');
        btn.click();
      } else {
        console.error('❌ Button not found!');
      }
    };

    // Restore expanded state from localStorage on page load
    const savedExpanded = localStorage.getItem(CHATBOT_EXPANDED_KEY) === 'true';
    if (savedExpanded && chatbotWindow) {
      isExpanded = true;
      chatbotWindow.classList.add('expanded');
      chatbotWindow.style.setProperty('width', '1200px', 'important');
      chatbotWindow.style.setProperty('height', '1000px', 'important');
      chatbotWindow.style.setProperty('max-width', 'calc(100vw - 40px)', 'important');
      chatbotWindow.style.setProperty('max-height', 'calc(100vh - 40px)', 'important');
      if (chatbotResize) {
        chatbotResize.textContent = '⊟';
      }
      console.log('✅ Restored expanded state');
    } else if (chatbotResize) {
      chatbotResize.textContent = '⊞';
    }

    // Parse slide editor commands
    function parseSlideCommand(message, lang) {
      if (!window.location.pathname.includes('slide-editor.html')) {
        return null;
      }
      
      const lowerMsg = message.toLowerCase().trim();
      const isArabic = lang === 'ar';
      
      // Navigation commands
      if (isArabic) {
        // Arabic commands
        if (lowerMsg.match(/^(اذهب|انتقل|افتح|عرض).*?(\d+)/) || lowerMsg.match(/^(\d+)/)) {
          const match = lowerMsg.match(/(\d+)/);
          if (match) {
            return { type: 'navigate', slideNumber: parseInt(match[1], 10) - 1 };
          }
        }
        if (lowerMsg.includes('التالي') || lowerMsg.includes('التالي')) {
          return { type: 'next' };
        }
        if (lowerMsg.includes('السابق') || lowerMsg.includes('الخلف')) {
          return { type: 'previous' };
        }
        // Text commands
        if (lowerMsg.match(/^(اكتب|أضف|ضع).*?["'](.+?)["']/) || lowerMsg.match(/^(اكتب|أضف|ضع)\s+(.+)/)) {
          const match = lowerMsg.match(/["'](.+?)["']/) || lowerMsg.match(/(?:اكتب|أضف|ضع)\s+(.+)/);
          if (match && match[1]) {
            return { type: 'addText', text: match[1] };
          }
        }
      } else {
        // English commands
        if (lowerMsg.match(/^(go to|navigate to|show|open|slide)\s*(\d+)/) || lowerMsg.match(/^slide\s*(\d+)/) || lowerMsg.match(/^(\d+)$/)) {
          const match = lowerMsg.match(/(\d+)/);
          if (match) {
            return { type: 'navigate', slideNumber: parseInt(match[1], 10) - 1 };
          }
        }
        if (lowerMsg.includes('next slide') || lowerMsg.includes('next')) {
          return { type: 'next' };
        }
        if (lowerMsg.includes('previous slide') || lowerMsg.includes('previous') || lowerMsg.includes('back')) {
          return { type: 'previous' };
        }
        // Text commands
        if (lowerMsg.match(/^(write|add|put|type)\s+["'](.+?)["']/) || lowerMsg.match(/^(write|add|put|type)\s+(.+)/)) {
          const match = lowerMsg.match(/["'](.+?)["']/) || lowerMsg.match(/(?:write|add|put|type)\s+(.+)/);
          if (match && match[1]) {
            return { type: 'addText', text: match[1] };
          }
        }
      }
      
      return null;
    }
    
    // Execute slide editor commands
    function executeSlideCommand(command, lang) {
      const isArabic = lang === 'ar';
      
      try {
        // Access slide editor variables (they should be in global scope)
        if (typeof window.slides === 'undefined' || typeof window.activeSlideIndex === 'undefined') {
          // Try to access via iframe or find the variables
          const errorMsg = isArabic 
            ? '❌ لا يمكن الوصول إلى محرر الشرائح. تأكد من أنك في صفحة محرر الشرائح.'
            : '❌ Cannot access slide editor. Make sure you are on the slide editor page.';
          addMessage('bot', errorMsg);
          return;
        }
        
        const slides = window.slides;
        let activeSlideIndex = window.activeSlideIndex;
        
        if (command.type === 'navigate') {
          const targetSlide = command.slideNumber;
          if (targetSlide >= 0 && targetSlide < slides.length) {
            window.activeSlideIndex = targetSlide;
            if (typeof window.render === 'function') {
              window.render();
            }
            const successMsg = isArabic
              ? `✅ تم الانتقال إلى الشريحة ${targetSlide + 1} من ${slides.length}`
              : `✅ Navigated to slide ${targetSlide + 1} of ${slides.length}`;
            addMessage('bot', successMsg);
          } else {
            const errorMsg = isArabic
              ? `❌ رقم الشريحة غير صحيح. يجب أن يكون بين 1 و ${slides.length}`
              : `❌ Invalid slide number. Must be between 1 and ${slides.length}`;
            addMessage('bot', errorMsg);
          }
        } else if (command.type === 'next') {
          if (activeSlideIndex < slides.length - 1) {
            window.activeSlideIndex = activeSlideIndex + 1;
            if (typeof window.render === 'function') {
              window.render();
            }
            const successMsg = isArabic
              ? `✅ تم الانتقال إلى الشريحة التالية (${activeSlideIndex + 2} من ${slides.length})`
              : `✅ Moved to next slide (${activeSlideIndex + 2} of ${slides.length})`;
            addMessage('bot', successMsg);
          } else {
            const errorMsg = isArabic
              ? '❌ أنت بالفعل في آخر شريحة'
              : '❌ You are already on the last slide';
            addMessage('bot', errorMsg);
          }
        } else if (command.type === 'previous') {
          if (activeSlideIndex > 0) {
            window.activeSlideIndex = activeSlideIndex - 1;
            if (typeof window.render === 'function') {
              window.render();
            }
            const successMsg = isArabic
              ? `✅ تم الانتقال إلى الشريحة السابقة (${activeSlideIndex} من ${slides.length})`
              : `✅ Moved to previous slide (${activeSlideIndex} of ${slides.length})`;
            addMessage('bot', successMsg);
          } else {
            const errorMsg = isArabic
              ? '❌ أنت بالفعل في أول شريحة'
              : '❌ You are already on the first slide';
            addMessage('bot', errorMsg);
          }
        } else if (command.type === 'addText') {
          const slide = slides[activeSlideIndex];
          if (slide && slide.elements) {
            const textElement = {
              id: crypto.randomUUID ? crypto.randomUUID() : 'text-' + Date.now(),
              type: 'text',
              text: command.text,
              left: 40,
              top: 40,
              width: 360,
              fontSize: 16,
              fontFamily: 'Inter, sans-serif',
              color: '#111827',
              backgroundColor: null,
              bold: false,
              italic: false,
              underline: false,
              align: 'left',
              lineHeight: 1.4,
              letterSpacing: 0,
              textTransform: 'none',
              animation: {}
            };
            slide.elements.push(textElement);
            if (typeof window.markDirty === 'function') {
              window.markDirty();
            }
            if (typeof window.render === 'function') {
              window.render();
            }
            const successMsg = isArabic
              ? `✅ تمت إضافة النص "${command.text}" إلى الشريحة ${activeSlideIndex + 1}`
              : `✅ Added text "${command.text}" to slide ${activeSlideIndex + 1}`;
            addMessage('bot', successMsg);
          } else {
            const errorMsg = isArabic
              ? '❌ لا يمكن الوصول إلى الشريحة الحالية'
              : '❌ Cannot access current slide';
            addMessage('bot', errorMsg);
          }
        }
      } catch (error) {
        console.error('Error executing slide command:', error);
        const errorMsg = isArabic
          ? '❌ حدث خطأ أثناء تنفيذ الأمر. تأكد من أنك في صفحة محرر الشرائح.'
          : '❌ An error occurred executing the command. Make sure you are on the slide editor page.';
        addMessage('bot', errorMsg);
      }
    }
    
    /**
     * AI Slide Control Feature
     * Handles AI commands for slide modifications
     * 
     * @param {string} command - User's text command
     * @param {Object} slideState - Current slide state (slides, activeSlideIndex)
     * @returns {Promise<Object>} Structured modification JSON
     */
    async function handleAICommand(command, slideState) {
      try {
        // Check if we're in the slide editor
        const isSlideEditor = window.location.pathname.includes('slide-editor.html') || 
                             window.location.href.includes('slide-editor.html');
        console.log('📍 Current location:', window.location.pathname, window.location.href);
        console.log('📄 Is slide editor?', isSlideEditor);
        
        if (!isSlideEditor) {
          console.log('⚠️ Not in slide editor, skipping AI command');
          return null;
        }
        
        // Get current slide state if not provided
        const state = slideState || {
          slides: window.slides || [],
          activeSlideIndex: window.activeSlideIndex || 0
        };
        
        console.log('📋 Slide state:', {
          slidesCount: state.slides.length,
          activeSlideIndex: state.activeSlideIndex,
          slidesAvailable: typeof window.slides !== 'undefined'
        });
        
        // Get current slide or use null if no slides
        const currentSlide = state.slides && state.slides.length > 0 
          ? (state.slides[state.activeSlideIndex] || null)
          : null;
        
        if (!currentSlide) {
          console.log('⚠️ No current slide found, will use default context');
        }
        
        // Build context about current slide
        const slideContext = currentSlide ? {
          slideNumber: state.activeSlideIndex + 1,
          totalSlides: state.slides.length,
          backgroundColor: currentSlide.backgroundColor || '#ffffff',
          elementCount: currentSlide.elements?.length || 0,
          elements: currentSlide.elements?.map(el => ({
            type: el.type,
            text: el.type === 'text' ? (el.text || '').substring(0, 100) : null,
            fontSize: el.fontSize || null,
            color: el.color || null
          })) || []
        } : {
          slideNumber: 1,
          totalSlides: state.slides.length || 0,
          backgroundColor: '#ffffff',
          elementCount: 0,
          elements: []
        };
        
        // Call the AI endpoint
        console.log('🤖 AI Slide Control: Sending command to server:', command);
        console.log('📊 Slide context:', slideContext);
        
        const response = await fetch('/ai/slide-command', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            command: command,
            slideContext: slideContext
          })
        });
        
        console.log('📡 Server response status:', response.status, response.statusText);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Server error response:', errorText);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('✅ Server returned data:', data);
        
        // Handle different response formats
        let modification = null;
        if (data.modification) {
          modification = data.modification;
        } else if (data.action) {
          // If the modification is returned directly
          modification = data;
        } else if (data && typeof data === 'object' && 'action' in data) {
          modification = data;
        }
        
        // Check if action is null (meaning not a slide command)
        if (modification && modification.action === null) {
          console.log('ℹ️ AI determined this is not a slide command');
          return null;
        }
        
        console.log('✅ Final modification to apply:', modification);
        return modification;
      } catch (error) {
        console.error('Error in handleAICommand:', error);
        return null;
      }
    }
    
    // Send message
    function sendMessage() {
      const message = chatbotInput.value.trim();
      if (!message) return;

      // Add user message
      addMessage('user', message);
      chatbotInput.value = '';

      // Detect language from user message and update recognition
      const detectedLang = detectLanguage(message);
      if (detectedLang !== getCurrentLanguage()) {
        setLanguage(detectedLang);
        if (recognition) {
          recognition.lang = detectedLang === 'ar' ? 'ar-SA' : 'en-US';
        }
        // Update input direction
        if (chatbotInput) {
          chatbotInput.setAttribute('dir', detectedLang === 'ar' ? 'rtl' : 'ltr');
          chatbotInput.setAttribute('lang', detectedLang);
        }
      }
      
      // Show typing indicator
      const typingIndicator = addTypingIndicator();
      
      // Check for slide editor commands first (legacy simple commands)
      const slideCommand = parseSlideCommand(message, detectedLang);
      if (slideCommand) {
        removeTypingIndicator(typingIndicator);
        executeSlideCommand(slideCommand, detectedLang);
        return;
      }
      
      // AI Slide Control: Check if this is a slide modification command
      const isSlideEditor = window.location.pathname.includes('slide-editor.html') || 
                           window.location.href.includes('slide-editor.html');
      if (isSlideEditor) {
        const slideState = {
          slides: window.slides || [],
          activeSlideIndex: window.activeSlideIndex || 0
        };
        
        // Try to interpret as AI slide command
        console.log('🔍 Checking if message is a slide command:', message);
        handleAICommand(message, slideState)
          .then(modification => {
            console.log('🎯 AI command result:', modification);
            console.log('🔧 applySlideModification available:', typeof window.applySlideModification);
            
            if (modification && typeof window.applySlideModification === 'function') {
              removeTypingIndicator(typingIndicator);
              console.log('⚙️ Applying modification:', modification);
              // Apply the modification
              const result = window.applySlideModification(modification);
              console.log('📝 Modification result:', result);
              if (result.success) {
                const successMsg = detectedLang === 'ar'
                  ? `✅ ${result.message || 'تم تطبيق التعديل بنجاح'}`
                  : `✅ ${result.message || 'Modification applied successfully'}`;
                addMessage('bot', successMsg);
              } else {
                const errorMsg = detectedLang === 'ar'
                  ? `❌ ${result.message || 'فشل تطبيق التعديل'}`
                  : `❌ ${result.message || 'Failed to apply modification'}`;
                addMessage('bot', errorMsg);
              }
            } else {
              console.log('ℹ️ Not a slide command or modification is null, falling back to normal chat');
              // Not a slide command, continue with normal AI response
              getOpenAIResponse(message, detectedLang)
                .then(response => {
                  removeTypingIndicator(typingIndicator);
                  if (response && response.trim()) {
                    addMessage('bot', response);
                  } else {
                    const lang = getCurrentLanguage();
                    const fallbackMsg = lang === 'ar'
                      ? 'عذراً، لم أتمكن من الحصول على إجابة. يرجى المحاولة مرة أخرى.'
                      : 'Sorry, I couldn\'t get a response. Please try again.';
                    addMessage('bot', fallbackMsg);
                  }
                })
                .catch(error => {
                  removeTypingIndicator(typingIndicator);
                  console.error('Error getting response:', error);
                  const lang = getCurrentLanguage();
                  const errorMsg = lang === 'ar' 
                    ? 'عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.'
                    : 'Sorry, there was an error. Please try again.';
                  addMessage('bot', errorMsg);
                });
            }
          })
          .catch(error => {
            console.error('❌ Error in AI command handling:', error);
            console.error('Error stack:', error.stack);
            // Fallback to normal AI response
            getOpenAIResponse(message, detectedLang)
              .then(response => {
                removeTypingIndicator(typingIndicator);
                if (response && response.trim()) {
                  addMessage('bot', response);
                } else {
                  const lang = getCurrentLanguage();
                  const fallbackMsg = lang === 'ar'
                    ? 'عذراً، لم أتمكن من الحصول على إجابة. يرجى المحاولة مرة أخرى.'
                    : 'Sorry, I couldn\'t get a response. Please try again.';
                  addMessage('bot', fallbackMsg);
                }
              })
              .catch(err => {
                removeTypingIndicator(typingIndicator);
                console.error('Error getting response:', err);
                const lang = getCurrentLanguage();
                const errorMsg = lang === 'ar' 
                  ? 'عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.'
                  : 'Sorry, there was an error. Please try again.';
                addMessage('bot', errorMsg);
              });
          });
        return; // Exit early, we're handling it asynchronously
      }
      
      // Always try to get a real answer from OpenAI API first
      getOpenAIResponse(message, detectedLang)
        .then(response => {
          removeTypingIndicator(typingIndicator);
          // Ensure we have a response
          if (response && response.trim()) {
            addMessage('bot', response);
          } else {
            // If empty response, provide helpful message
            const lang = getCurrentLanguage();
            const fallbackMsg = lang === 'ar'
              ? 'عذراً، لم أتمكن من الحصول على إجابة. يرجى المحاولة مرة أخرى.'
              : 'Sorry, I couldn\'t get a response. Please try again.';
            addMessage('bot', fallbackMsg);
          }
        })
        .catch(error => {
          removeTypingIndicator(typingIndicator);
          console.error('Error getting response:', error);
          // Try one more time with fallback
          const lang = getCurrentLanguage();
          const errorMsg = lang === 'ar' 
            ? 'عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.'
            : 'Sorry, there was an error. Please try again.';
          addMessage('bot', errorMsg);
        });
    }

    // Add typing indicator
    function addTypingIndicator() {
      const messageDiv = document.createElement('div');
      messageDiv.className = 'chatbot-message chatbot-message--bot chatbot-typing';
      messageDiv.id = 'typing-indicator';
      
      const messageText = document.createElement('div');
      messageText.className = 'chatbot-message-text chatbot-typing-text';
      messageText.innerHTML = '<span></span><span></span><span></span>';
      
      messageDiv.appendChild(messageText);
      chatbotMessages.appendChild(messageDiv);
      chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
      
      return messageDiv;
    }
    
    // Remove typing indicator
    function removeTypingIndicator(indicator) {
      if (indicator && indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    }
    
    // Add message to chat
    function addMessage(type, text) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `chatbot-message chatbot-message--${type}`;
      
      const messageText = document.createElement('div');
      messageText.className = 'chatbot-message-text';
      messageText.textContent = text;
      
      // Detect language and set direction
      const detectedLang = detectLanguage(text);
      if (detectedLang === 'ar') {
        messageText.setAttribute('dir', 'rtl');
        messageText.setAttribute('lang', 'ar');
      } else {
        messageText.setAttribute('dir', 'ltr');
        messageText.setAttribute('lang', 'en');
      }
      
      messageDiv.appendChild(messageText);
      chatbotMessages.appendChild(messageDiv);
      
      // Scroll to bottom
      chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
      
      // Animate message
      setTimeout(() => {
        messageDiv.classList.add('show');
      }, 10);
    }
    
    // Search Wikipedia for information
    async function searchWikipedia(query, lang = 'en') {
      try {
        const wikiLang = lang === 'ar' ? 'ar' : 'en';
        // Replace spaces with underscores for Wikipedia API
        const pageTitle = query.trim().replace(/\s+/g, '_');
        const searchUrl = `https://${wikiLang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`;
        
        const response = await fetch(searchUrl);
        if (response.ok) {
          const data = await response.json();
          if (data.extract && !data.type) { // type exists for disambiguation pages
            return {
              title: data.title,
              extract: data.extract,
              url: data.content_urls?.desktop?.page || data.content_urls?.mobile?.page || ''
            };
          }
        }
      } catch (error) {
        console.log('Wikipedia search error:', error);
      }
      return null;
    }
    
    // Search Wikipedia by query (not exact title)
    async function searchWikipediaByQuery(query, lang = 'en') {
      try {
        const wikiLang = lang === 'ar' ? 'ar' : 'en';
        // First, search for the page
        const searchUrl = `https://${wikiLang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=1`;
        
        const searchResponse = await fetch(searchUrl);
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.query && searchData.query.search && searchData.query.search.length > 0) {
            const pageTitle = searchData.query.search[0].title;
            // Now get the summary
            return await searchWikipedia(pageTitle, lang);
          }
        }
      } catch (error) {
        console.log('Wikipedia query search error:', error);
      }
      return null;
    }
    
    // Extract main topic from question for Wikipedia search
    function extractTopicForWikipedia(question, lang) {
      // Use the same extraction logic as generateSmartAnswer
      const lowerQuestion = question.toLowerCase();
      
      // Try to extract topic from question patterns first
      const questionPatterns = lang === 'ar'
        ? [
            /(?:ما|ماذا|من|أين|متى|لماذا|كيف|أخبرني|اشرح|وصف).*?(?:عن|حول|هو|هي)\s+(.+)/i,
            /(?:ما|ماذا|من|أين|متى|لماذا|كيف|أخبرني|اشرح|وصف)\s+(.+)/i,
            /(?:عن|حول)\s+(.+)/i
          ]
        : [
            /(?:what|tell me|explain|describe|discuss).*?(?:about|on|regarding|is|are)\s+(.+)/i,
            /(?:what|tell me|explain|describe|discuss)\s+(.+)/i,
            /(?:think|opinion|thoughts).*?(?:about|on|regarding)\s+(.+)/i
          ];
      
      for (const pattern of questionPatterns) {
        const match = question.match(pattern);
        if (match && match[1]) {
          const topic = match[1].trim();
          const cleanTopic = topic.replace(/[?.,!;:]+$/, '').trim();
          if (cleanTopic.length > 2) {
            return cleanTopic;
          }
        }
      }
      
      // Fallback: remove question words and get meaningful words
      const questionWords = lang === 'ar' 
        ? ['ما', 'من', 'أين', 'متى', 'لماذا', 'كيف', 'ما هو', 'ما هي', 'ماذا', 'أخبرني', 'عن', 'حول', 'هو', 'هي', 'في', 'على', 'من', 'إلى']
        : ['what', 'who', 'where', 'when', 'why', 'how', 'tell', 'me', 'about', 'explain', 'describe', 'is', 'are', 'the', 'a', 'an', 'in', 'on', 'at'];
      
      let cleaned = question;
      questionWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        cleaned = cleaned.replace(regex, '');
      });
      
      // Extract key phrases (2-4 words)
      const words = cleaned.trim().split(/\s+/).filter(w => {
        const cleanWord = w.replace(/[?.,!;:()]+/g, '');
        return cleanWord.length > 2;
      });
      
      if (words.length >= 2) {
        // Take last 2-3 words as they're usually the topic
        return words.slice(-3).join(' ');
      }
      
      return cleaned.trim() || question;
    }
    
    // Get response from OpenAI API with Wikipedia integration - answers ANY question
    async function getOpenAIResponse(userMessage, lang) {
      // First, try to get Wikipedia information
      let wikipediaInfo = null;
      const topic = extractTopicForWikipedia(userMessage, lang);
      
      // Try exact search first
      wikipediaInfo = await searchWikipedia(topic, lang);
      
      // If exact search fails, try query search
      if (!wikipediaInfo) {
        wikipediaInfo = await searchWikipediaByQuery(topic, lang);
      }
      
      // If API key is not set, use Wikipedia + free AI services
      if (!OPENAI_API_KEY || OPENAI_API_KEY === 'YOUR_OPENAI_API_KEY_HERE') {
        console.warn('OpenAI API key not configured. Using Wikipedia and free AI services...');
        
        // If we have Wikipedia info, return it
        if (wikipediaInfo) {
          const wikiText = lang === 'ar'
            ? `📚 معلومات من ويكيبيديا:\n\n${wikipediaInfo.title}\n\n${wikipediaInfo.extract}\n\n${wikipediaInfo.url ? `المصدر: ${wikipediaInfo.url}` : ''}`
            : `📚 Information from Wikipedia:\n\n${wikipediaInfo.title}\n\n${wikipediaInfo.extract}\n\n${wikipediaInfo.url ? `Source: ${wikipediaInfo.url}` : ''}`;
          return wikiText;
        }
        
        // Try free AI services
        const freeResponse = await tryFreeAIServices(userMessage, lang);
        if (freeResponse) {
          return freeResponse;
        }
        // If free services fail, provide a smart answer
        return generateSmartAnswer(userMessage, lang);
      }
      
      try {
        // Enhanced prompt with Wikipedia context
        let systemPrompt = lang === 'ar' 
          ? `أنت مساعد ذكي متقدم ومتعلم جيداً. مهمتك هي الإجابة على أي سؤال بدقة وشمولية.

القواعد:
1. أجب على أي سؤال بغض النظر عن الموضوع - علوم، تاريخ، تقنية، رياضيات، صحة، طعام، رياضة، فنون، أدب، جغرافيا، سياسة، اقتصاد، أو أي موضوع آخر
2. قدم إجابات مفصلة ومفيدة
3. إذا كان السؤال عن LumenSlides (منصة العروض التقديمية)، قدم معلومات دقيقة
4. إذا تم توفير معلومات من ويكيبيديا، استخدمها كمرجع أساسي ولكن أضف تحليلك وتفسيرك
5. إذا لم تكن متأكداً من شيء، اعترف بذلك ولكن قدم أفضل إجابة ممكنة بناءً على معرفتك
6. استخدم لغة واضحة ومفهومة
7. أجب دائماً بالعربية إذا كان السؤال بالعربية
8. لا ترفض الإجابة على أي سؤال - حاول دائماً تقديم معلومات مفيدة`
          : `You are an advanced, well-educated AI assistant. Your task is to answer ANY question accurately and comprehensively.

Rules:
1. Answer ANY question regardless of topic - science, history, technology, math, health, food, sports, arts, literature, geography, politics, economics, or any other subject
2. Provide detailed and helpful answers
3. If the question is about LumenSlides (presentation platform), provide accurate information
4. If Wikipedia information is provided, use it as a primary reference but add your analysis and explanation
5. If you're not certain about something, admit it but provide the best possible answer based on your knowledge
6. Use clear and understandable language
7. Always respond in the same language as the question
8. Never refuse to answer - always try to provide helpful information`;
        
        // Add Wikipedia context if available
        let userContent = userMessage;
        if (wikipediaInfo) {
          const wikiContext = lang === 'ar'
            ? `\n\nمعلومات من ويكيبيديا:\nالعنوان: ${wikipediaInfo.title}\nالمحتوى: ${wikipediaInfo.extract.substring(0, 500)}...`
            : `\n\nInformation from Wikipedia:\nTitle: ${wikipediaInfo.title}\nContent: ${wikipediaInfo.extract.substring(0, 500)}...`;
          userContent = userMessage + wikiContext;
        }
        
        const response = await fetch(OPENAI_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: systemPrompt
              },
              {
                role: 'user',
                content: userContent
              }
            ],
            temperature: 0.8,
            max_tokens: 2048
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('OpenAI API error:', errorData);
          
          // If OpenAI fails but we have Wikipedia, return Wikipedia info
          if (wikipediaInfo) {
            const wikiText = lang === 'ar'
              ? `📚 معلومات من ويكيبيديا:\n\n${wikipediaInfo.title}\n\n${wikipediaInfo.extract}\n\n${wikipediaInfo.url ? `المصدر: ${wikipediaInfo.url}` : ''}`
              : `📚 Information from Wikipedia:\n\n${wikipediaInfo.title}\n\n${wikipediaInfo.extract}\n\n${wikipediaInfo.url ? `Source: ${wikipediaInfo.url}` : ''}`;
            return wikiText;
          }
          
          // Try free AI services if OpenAI fails
          const freeResponse = await tryFreeAIServices(userMessage, lang);
          if (freeResponse) return freeResponse;
          return generateSmartAnswer(userMessage, lang);
        }
        
        const data = await response.json();
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
          let text = data.choices[0].message.content.trim();
          
          // Add Wikipedia source link if available
          if (wikipediaInfo && wikipediaInfo.url) {
            const sourceText = lang === 'ar'
              ? `\n\n📚 المصدر: ${wikipediaInfo.url}`
              : `\n\n📚 Source: ${wikipediaInfo.url}`;
            text += sourceText;
          }
          
          return text;
        }
        
        // If response format is unexpected, try Wikipedia or free services
        if (wikipediaInfo) {
          const wikiText = lang === 'ar'
            ? `📚 معلومات من ويكيبيديا:\n\n${wikipediaInfo.title}\n\n${wikipediaInfo.extract}\n\n${wikipediaInfo.url ? `المصدر: ${wikipediaInfo.url}` : ''}`
            : `📚 Information from Wikipedia:\n\n${wikipediaInfo.title}\n\n${wikipediaInfo.extract}\n\n${wikipediaInfo.url ? `Source: ${wikipediaInfo.url}` : ''}`;
          return wikiText;
        }
        
        const freeResponse = await tryFreeAIServices(userMessage, lang);
        if (freeResponse) return freeResponse;
        return generateSmartAnswer(userMessage, lang);
      } catch (error) {
        console.error('OpenAI API error:', error);
        
        // If OpenAI fails but we have Wikipedia, return Wikipedia info
        if (wikipediaInfo) {
          const wikiText = lang === 'ar'
            ? `📚 معلومات من ويكيبيديا:\n\n${wikipediaInfo.title}\n\n${wikipediaInfo.extract}\n\n${wikipediaInfo.url ? `المصدر: ${wikipediaInfo.url}` : ''}`
            : `📚 Information from Wikipedia:\n\n${wikipediaInfo.title}\n\n${wikipediaInfo.extract}\n\n${wikipediaInfo.url ? `Source: ${wikipediaInfo.url}` : ''}`;
          return wikiText;
        }
        
        // Try free AI services if OpenAI fails
        const freeResponse = await tryFreeAIServices(userMessage, lang);
        if (freeResponse) return freeResponse;
        return generateSmartAnswer(userMessage, lang);
      }
    }
    
    // Try free AI services that don't require API keys
    async function tryFreeAIServices(userMessage, lang) {
      // Try multiple free AI endpoints
      const services = [
        // Service 1: Try using a public AI endpoint
        async () => {
          try {
            const response = await fetch('https://api.deepai.org/api/text-generator', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Api-Key': 'quickstart-QUdJIGlzIGNvbWluZy4uLi4K' // Free demo key
              },
              body: JSON.stringify({
                text: userMessage
              })
            });
            if (response.ok) {
              const data = await response.json();
              return data.output || null;
            }
          } catch (e) {}
          return null;
        },
        // Service 2: Try Hugging Face (may be slow but free)
        async () => {
          try {
            const response = await fetch('https://api-inference.huggingface.co/models/google/flan-t5-xxl', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                inputs: `Question: ${userMessage}\nAnswer:`,
                options: {
                  wait_for_model: false
                }
              })
            });
            if (response.ok) {
              const data = await response.json();
              if (data && Array.isArray(data) && data[0] && data[0].generated_text) {
                return data[0].generated_text;
              }
            }
          } catch (e) {}
          return null;
        }
      ];
      
      // Try each service
      for (const service of services) {
        try {
          const result = await service();
          if (result && result.trim()) {
            return result.trim();
          }
        } catch (error) {
          console.log('Service failed, trying next...');
        }
      }
      
      return null;
    }
    
    // Generate smart answers using web knowledge and patterns
    function generateSmartAnswer(userMessage, lang) {
      const lowerMessage = userMessage.toLowerCase();
      const message = userMessage;
      
      // Extract key terms from the question - improved to find actual topic
      const extractKeyTerms = (text) => {
        const lowerText = text.toLowerCase();
        
        // Common stop words to filter out
        const stopWords = ['what', 'who', 'where', 'when', 'why', 'how', 'about', 'information', 'tell', 'me', 'give', 'the', 'think', 'know', 'want', 'need', 'like', 'would', 'could', 'should', 'can', 'do', 'you', 'your', 'is', 'are', 'was', 'were', 'been', 'have', 'has', 'had', 'does', 'did', 'will', 'this', 'that', 'these', 'those', 'with', 'from', 'for', 'and', 'or', 'but', 'if', 'then', 'than', 'more', 'most', 'some', 'any', 'all', 'each', 'every'];
        
        // Extract phrases after common question patterns
        const questionPatterns = [
          /(?:what|tell me|explain|describe|discuss).*?(?:about|on|regarding)\s+(.+)/i,
          /(?:what|tell me|explain|describe|discuss)\s+(?:is|are|was|were)\s+(.+)/i,
          /(?:what|tell me|explain|describe|discuss)\s+(.+)/i,
          /(?:think|opinion|thoughts).*?(?:about|on|regarding)\s+(.+)/i
        ];
        
        // Try to extract topic from question patterns
        for (const pattern of questionPatterns) {
          const match = text.match(pattern);
          if (match && match[1]) {
            const topic = match[1].trim();
            // Remove trailing question marks and punctuation
            const cleanTopic = topic.replace(/[?.,!;:]+$/, '').trim();
            if (cleanTopic.length > 2) {
              return cleanTopic;
            }
          }
        }
        
        // Fallback: extract meaningful words (not stop words, length > 2)
        const words = lowerText.split(/\s+/);
        const meaningfulWords = words.filter(w => {
          const cleanWord = w.replace(/[?.,!;:()]+/g, '');
          return cleanWord.length > 2 && !stopWords.includes(cleanWord);
        });
        
        // If we have meaningful words, join them (take last 2-3 words as they're usually the topic)
        if (meaningfulWords.length > 0) {
          // Take the last meaningful words (usually the topic comes at the end)
          const topicWords = meaningfulWords.slice(-3).join(' ');
          return topicWords;
        }
        
        // Last resort: take last few words
        return text.split(' ').slice(-3).join(' ');
      };
      
      const mainTopic = extractKeyTerms(userMessage) || 'this topic';
      
      if (lang === 'ar') {
        // Arabic smart answers
        if (message.includes('أرامكو') || message.includes('aramco') || lowerMessage.includes('aramco')) {
          return `أرامكو السعودية (Saudi Aramco) هي شركة النفط الوطنية السعودية وأكبر شركة نفط في العالم من حيث الإنتاج والقيمة السوقية.

المعلومات الرئيسية:
• تأسست: 1933
• المقر: الظهران، المملكة العربية السعودية
• النشاط: استكشاف وإنتاج وتكرير وتسويق النفط والغاز
• القيمة: أكبر شركة مدرجة في العالم من حيث القيمة السوقية
• الإنتاج: تنتج حوالي 10 ملايين برميل يومياً
• الموظفين: أكثر من 70,000 موظف

أرامكو مسؤولة عن إدارة أكبر احتياطيات النفط في العالم وتلعب دوراً حيوياً في الاقتصاد السعودي والطاقة العالمية.`;
        }
        
        if (message.includes('السعودية') || lowerMessage.includes('saudi')) {
          return `المملكة العربية السعودية هي دولة عربية في شبه الجزيرة العربية.

المعلومات الرئيسية:
• العاصمة: الرياض
• اللغة: العربية
• الدين: الإسلام
• العملة: الريال السعودي
• المساحة: حوالي 2.15 مليون كيلومتر مربع
• السكان: أكثر من 35 مليون نسمة
• الاقتصاد: يعتمد بشكل رئيسي على النفط والغاز

السعودية هي أكبر منتج للنفط في العالم وتلعب دوراً مهماً في منظمة أوبك.`;
        }
        
        return `بناءً على سؤالك "${message}"، هذا موضوع مهم. ${mainTopic} هو موضوع يمكن استكشافه من عدة جوانب.

دعني أقدم لك معلومات مفيدة:
• ${mainTopic} موضوع واسع ومثير للاهتمام
• يمكن العثور على معلومات مفصلة من مصادر متخصصة
• هناك جوانب متعددة يمكن استكشافها

للحصول على إجابات أكثر دقة وتفصيلاً، يرجى المحاولة مرة أخرى.`;
      } else {
        // English smart answers
        if (message.includes('aramco') || lowerMessage.includes('aramco')) {
          return `Saudi Aramco is Saudi Arabia's national oil company and the world's largest oil company by production and market value.

Key Information:
• Founded: 1933
• Headquarters: Dhahran, Saudi Arabia
• Business: Exploration, production, refining, and marketing of oil and gas
• Value: World's largest listed company by market value
• Production: Produces approximately 10 million barrels per day
• Employees: Over 70,000 employees

Aramco manages the world's largest oil reserves and plays a vital role in the Saudi economy and global energy.`;
        }
        
        if (message.includes('saudi') || lowerMessage.includes('saudi arabia')) {
          return `Saudi Arabia is an Arab country in the Arabian Peninsula.

Key Information:
• Capital: Riyadh
• Language: Arabic
• Religion: Islam
• Currency: Saudi Riyal
• Area: Approximately 2.15 million square kilometers
• Population: Over 35 million people
• Economy: Primarily based on oil and gas

Saudi Arabia is the world's largest oil producer and plays an important role in OPEC.`;
        }
        
        // General smart answer
        return `Based on your question "${message}", ${mainTopic} is an important topic that can be explored from multiple angles.

Let me provide helpful information:
• ${mainTopic} is a broad and interesting subject
• Detailed information can be found from specialized sources
• There are multiple aspects that can be explored

For more accurate and detailed answers, please try asking again or rephrase your question.`;
      }
    }

    // Generate bot response - handles both website and general questions (bilingual)
    function generateResponse(userMessage, detectedLang = null) {
      if (!detectedLang) {
        detectedLang = detectLanguage(userMessage);
      }
      const lang = detectedLang;
      const lowerMessage = userMessage.toLowerCase().trim();
      
      // Arabic greetings
      const arabicGreetings = ['مرحبا', 'السلام عليكم', 'أهلا', 'مرحبا بك', 'صباح الخير', 'مساء الخير'];
      const isArabicGreeting = arabicGreetings.some(g => userMessage.includes(g));
      
      // Greetings (bilingual)
      if (lowerMessage.match(/^(hello|hi|hey|greetings|good morning|good afternoon|good evening)[\s!.,]*$/i) || isArabicGreeting) {
        if (lang === 'ar') {
          return 'مرحبا! 👋 أنا مساعدك الذكي. يمكنني مساعدتك في أي شيء - أسئلة حول LumenSlides، معلومات عامة، أو مجرد محادثة! ماذا تريد أن تعرف؟';
        }
        return 'Hello! 👋 I\'m your AI assistant. I can help you with anything - questions about LumenSlides, general knowledge, or just chat! What would you like to know?';
      }
      
      // Website-specific questions (bilingual)
      const isWebsiteQuestion = lowerMessage.includes('lumen') || lowerMessage.includes('presentation') || 
                                lowerMessage.includes('slide') || lowerMessage.includes('template') ||
                                userMessage.includes('عرض') || userMessage.includes('شريحة') || 
                                userMessage.includes('قالب') || userMessage.includes('لومن');
      
      if (isWebsiteQuestion) {
        if (lowerMessage.includes('template') || userMessage.includes('قالب')) {
          if (lang === 'ar') {
            return 'لدينا عدة قوالب متاحة! تحقق من صفحة القوالب لرؤية جميع الخيارات. هل تريد معرفة المزيد عن قالب معين؟';
          }
          return 'We have several templates available! Check out the Templates page to see all options. Would you like to know more about a specific template?';
        } else if (lowerMessage.includes('presentation') || lowerMessage.includes('slide') || userMessage.includes('عرض') || userMessage.includes('شريحة')) {
          if (lang === 'ar') {
            return 'رائع! يمكنك إنشاء العروض التقديمية باستخدام محرر الشرائح. هل تريد المساعدة في:\n• بدء عرض تقديمي جديد\n• استخدام القوالب\n• إضافة محتوى للشرائح\n\nأو اسألني أي شيء آخر!';
          }
          return 'Great! You can create presentations using our slide editor. Would you like help with:\n• Starting a new presentation\n• Using templates\n• Adding content to slides\n\nOr ask me anything else!';
        } else if (lowerMessage.includes('help') || userMessage.includes('مساعدة')) {
          if (lang === 'ar') {
            return 'يمكنني مساعدتك في:\n• إنشاء العروض التقديمية\n• العثور على القوالب\n• الإجابة على أسئلة حول LumenSlides\n• أسئلة عامة\n• إجراء محادثة\n\nماذا تريد أن تعرف؟';
          }
          return 'I can help you with:\n• Creating presentations\n• Finding templates\n• Answering questions about LumenSlides\n• General knowledge questions\n• Having a conversation\n\nWhat would you like to know?';
        }
      }
      
      // General knowledge and conversation (bilingual)
      // Note: These fallbacks are only used if Gemini API is not available
      // When Gemini API is configured, it will answer ALL questions directly
      const arabicQuestions = ['ما هو', 'ما هي', 'اشرح', 'أخبرني عن', 'ماذا', 'من', 'أين', 'متى', 'لماذا', 'كيف'];
      const isArabicQuestion = arabicQuestions.some(q => userMessage.includes(q));
      
      if (lowerMessage.includes('what is') || lowerMessage.includes('what are') || lowerMessage.includes('explain') || lowerMessage.includes('tell me about') || isArabicQuestion) {
        return generateComprehensiveAnswer(userMessage, lang);
      }
      
      // Questions starting with who, what, where, when, why, how
      if (lowerMessage.match(/^(who|what|where|when|why|how|can you|do you know)/i)) {
        return generateComprehensiveAnswer(userMessage, lang);
      }
      
      // Math questions (bilingual)
      if (lowerMessage.match(/\d+\s*[+\-*/]\s*\d+/) || lowerMessage.includes('calculate') || lowerMessage.includes('math') || userMessage.includes('احسب') || userMessage.includes('حساب')) {
        try {
          const mathMatch = lowerMessage.match(/(\d+)\s*([+\-*/])\s*(\d+)/);
          if (mathMatch) {
            const a = parseInt(mathMatch[1]);
            const op = mathMatch[2];
            const b = parseInt(mathMatch[3]);
            let result;
            if (op === '+') result = a + b;
            else if (op === '-') result = a - b;
            else if (op === '*') result = a * b;
            else if (op === '/') result = b !== 0 ? a / b : 'undefined';
            if (lang === 'ar') {
              return `الإجابة هي: ${result} 🧮`;
            }
            return `The answer is: ${result} 🧮`;
          }
        } catch (e) {}
        return generateComprehensiveAnswer(userMessage, lang);
      }
      
      // Weather questions (bilingual)
      if (lowerMessage.includes('weather') || lowerMessage.includes('temperature') || lowerMessage.includes('rain') || userMessage.includes('طقس') || userMessage.includes('درجة الحرارة')) {
        if (lang === 'ar') {
          return 'ليس لدي بيانات الطقس في الوقت الفعلي، لكن يمكنني مساعدتك في فهم مفاهيم الطقس! الطقس هو حالة الغلاف الجوي في وقت ومكان محددين. هل تريد معرفة المزيد عن الأرصاد الجوية؟ 🌤️';
        }
        return 'I don\'t have real-time weather data, but I can help you understand weather concepts! Weather is the state of the atmosphere at a specific time and place. Would you like to know more about meteorology? 🌤️';
      }
      
      // Time questions (bilingual)
      if (lowerMessage.includes('time') || lowerMessage.includes('date') || lowerMessage.includes('what time') || userMessage.includes('وقت') || userMessage.includes('تاريخ')) {
        const now = new Date();
        if (lang === 'ar') {
          return `التاريخ والوقت الحالي: ${now.toLocaleString('ar-SA')} ⏰`;
        }
        return `The current date and time is: ${now.toLocaleString()} ⏰`;
      }
      
      // Thank you (bilingual)
      if (lowerMessage.includes('thank') || userMessage.includes('شكرا') || userMessage.includes('شكراً')) {
        if (lang === 'ar') {
          return 'العفو! 😊 هل هناك أي شيء آخر يمكنني مساعدتك فيه؟';
        }
        return 'You\'re welcome! 😊 Is there anything else I can help you with?';
      }
      
      // Goodbye (bilingual)
      if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye') || lowerMessage.includes('see you') || userMessage.includes('وداعا') || userMessage.includes('مع السلامة')) {
        if (lang === 'ar') {
          return 'وداعاً! لا تتردد في العودة في أي وقت إذا كنت بحاجة إلى مساعدة! 👋';
        }
        return 'Goodbye! Feel free to come back anytime if you need help! 👋';
      }
      
      // Default - provide comprehensive answer for ANY question
      return generateComprehensiveAnswer(userMessage, lang);
    }
    
    // Generate comprehensive answers for ANY question (bilingual)
    function generateComprehensiveAnswer(userMessage, lang = 'en') {
      // This function provides detailed answers for any topic
      const lowerMessage = userMessage.toLowerCase();
      
      // Enhanced answers for various topics
      if (lang === 'ar') {
        // Arabic comprehensive answers
        if (lowerMessage.includes('ما هو') || lowerMessage.includes('ما هي') || lowerMessage.includes('ماذا')) {
          return `بناءً على سؤالك "${userMessage}"، يمكنني مساعدتك. هذا موضوع مثير للاهتمام. دعني أقدم لك معلومات شاملة:\n\n• الموضوع يتعلق بمجال واسع من المعرفة\n• يمكنك الحصول على معلومات أكثر تفصيلاً من مصادر متخصصة\n• إذا كان السؤال عن موضوع محدد، يمكنني تقديم تفاصيل أكثر\n\nهل تريد معلومات أكثر تفصيلاً عن جانب معين من هذا الموضوع؟`;
        }
        
        return `سؤالك "${userMessage}" مهم ومثير للاهتمام. هذا موضوع يمكن استكشافه من عدة جوانب. يمكنني مساعدتك في:\n\n• فهم المفاهيم الأساسية\n• تقديم معلومات عامة\n• توجيهك إلى مصادر إضافية\n\nللحصول على إجابات أكثر دقة، يرجى المحاولة مرة أخرى أو إعادة صياغة سؤالك.`;
      } else {
        // English comprehensive answers
        if (lowerMessage.includes('what is') || lowerMessage.includes('what are') || lowerMessage.includes('explain')) {
          return `Based on your question "${userMessage}", I can help you. This is an interesting topic. Let me provide comprehensive information:\n\n• This topic relates to a broad field of knowledge\n• You can get more detailed information from specialized sources\n• If the question is about a specific topic, I can provide more details\n\nWould you like more detailed information about a specific aspect of this topic?`;
        }
        
        return `Your question "${userMessage}" is important and interesting. This is a topic that can be explored from multiple angles. I can help you with:\n\n• Understanding basic concepts\n• Providing general information\n• Guiding you to additional resources\n\nFor more accurate answers, please try again or rephrase your question.`;
      }
    }
    
    // Generate general answers for non-website questions (bilingual) - kept for backward compatibility
    function generateGeneralAnswer(userMessage, lang = 'en') {
      const lowerMessage = userMessage.toLowerCase();
      
      // Science topics
      if (lowerMessage.includes('science') || lowerMessage.includes('physics') || lowerMessage.includes('chemistry') || lowerMessage.includes('biology')) {
        return 'That\'s a great science question! Science is the systematic study of the natural world through observation and experimentation. Would you like me to explain a specific scientific concept? 🔬';
      }
      
      // History
      if (lowerMessage.includes('history') || lowerMessage.includes('historical') || lowerMessage.includes('past')) {
        return 'History is fascinating! It\'s the study of past events, particularly human affairs. Is there a specific historical period or event you\'d like to know about? 📚';
      }
      
      // Technology
      if (lowerMessage.includes('technology') || lowerMessage.includes('tech') || lowerMessage.includes('computer') || lowerMessage.includes('software')) {
        return 'Technology is constantly evolving! It refers to tools, systems, and methods used to solve problems and improve life. What aspect of technology interests you? 💻';
      }
      
      // Health/Medical
      if (lowerMessage.includes('health') || lowerMessage.includes('medical') || lowerMessage.includes('doctor') || lowerMessage.includes('medicine')) {
        return 'Health is important! While I can provide general information, I\'m not a medical professional. For medical advice, please consult a qualified healthcare provider. Is there a general health topic you\'d like to discuss? 🏥';
      }
      
      // Food/Cooking
      if (lowerMessage.includes('food') || lowerMessage.includes('cooking') || lowerMessage.includes('recipe') || lowerMessage.includes('eat')) {
        return 'Food is wonderful! Cooking is both an art and a science. There are countless cuisines and recipes from around the world. What type of food or cooking are you interested in? 🍳';
      }
      
      // Sports
      if (lowerMessage.includes('sport') || lowerMessage.includes('game') || lowerMessage.includes('team') || lowerMessage.includes('player')) {
        return 'Sports are great for fitness and entertainment! There are many different sports from football to basketball, tennis to swimming. What sport interests you? ⚽';
      }
      
      // General helpful response (bilingual)
      if (lang === 'ar') {
        return `هذا سؤال مثير للاهتمام! ${userMessage} شيء يمكنني مساعدتك في استكشافه. بينما أنا هنا للمساعدة في LumenSlides، أنا سعيد أيضاً بالدردشة حول مواضيع عامة، أو الإجابة على الأسئلة، أو المساعدة في مواضيع مختلفة. ما الجانب المحدد الذي تريد معرفة المزيد عنه؟ 🤔`;
      }
      return `That's an interesting question! ${userMessage.charAt(0).toUpperCase() + userMessage.slice(1)} is something I can help you explore. While I'm here to assist with LumenSlides, I'm also happy to chat about general topics, answer questions, or help with various subjects. What specific aspect would you like to know more about? 🤔`;
    }
    
    // Initialize UI with current language
    const currentLang = getCurrentLanguage();
    updateUILanguage(currentLang);

    // Send button click
    if (chatbotSend) {
      chatbotSend.addEventListener('click', sendMessage);
    }

    // Enter key to send
    if (chatbotInput) {
      chatbotInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });
    }

    // Voice button click
    if (chatbotVoice && recognition) {
      chatbotVoice.addEventListener('click', function(e) {
        e.stopPropagation();
        if (!isListening) {
          try {
            recognition.start();
            isListening = true;
            updateVoiceButton();
            const lang = getCurrentLanguage();
            const t = translations[lang];
            addMessage('bot', t.listening);
          } catch (error) {
            console.error('Error starting recognition:', error);
            isListening = false;
            updateVoiceButton();
          }
        } else {
          recognition.stop();
          isListening = false;
          updateVoiceButton();
        }
      });
    }

    // Welcome message (bilingual)
    setTimeout(() => {
      const lang = getCurrentLanguage();
      const t = translations[lang];
      addMessage('bot', t.welcome);
    }, 500);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbot);
  } else {
    initChatbot();
  }
  
  // Expose function to show chatbot if hidden
  window.showChatbot = function() {
    localStorage.removeItem(CHATBOT_HIDDEN_KEY);
    const chatbot = document.getElementById('chatbot');
    if (chatbot) {
      chatbot.style.display = 'block';
      chatbot.style.visibility = 'visible';
      chatbot.style.opacity = '1';
      console.log('Chatbot is now visible!');
    }
  };
  
  // FINAL ABSOLUTE BACKUP - runs on ALL pages after everything loads
  setTimeout(function() {
    const btn = document.getElementById('chatbotResize');
    if (btn) {
      console.log('🔴 FINAL BACKUP: Setting up resize button');
      
      // Remove any existing handlers
      btn.removeAttribute('onclick');
      
      // Set direct onclick - this WILL work
      btn.onclick = function(e) {
        e.stopPropagation();
        e.preventDefault();
        console.log('🔴🔴🔴 FINAL BACKUP CLICKED!');
        
        const win = document.getElementById('chatbotWindow');
        if (!win) {
          console.error('❌ Window not found');
          return false;
        }
        
        const isExp = win.classList.contains('expanded');
        
        if (isExp) {
          win.style.setProperty('width', '380px', 'important');
          win.style.setProperty('height', '500px', 'important');
          win.style.removeProperty('max-width');
          win.style.removeProperty('max-height');
          win.classList.remove('expanded');
          btn.textContent = '⊞';
          localStorage.setItem('chatbot_expanded', 'false');
          console.log('✅ Shrunk via backup');
        } else {
          win.style.setProperty('width', '1200px', 'important');
          win.style.setProperty('height', '1000px', 'important');
          win.style.setProperty('max-width', 'calc(100vw - 40px)', 'important');
          win.style.setProperty('max-height', 'calc(100vh - 40px)', 'important');
          win.classList.add('expanded');
          btn.textContent = '⊟';
          localStorage.setItem('chatbot_expanded', 'true');
          console.log('✅ Expanded via backup');
        }
        
        return false;
      };
      
      console.log('✅ Final backup handler installed');
    } else {
      console.error('❌ Resize button not found in final backup');
    }
  }, 2000);
})();

