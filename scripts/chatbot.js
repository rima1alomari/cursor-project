// Chatbot functionality with typing and voice input
(function() {
  'use strict';

  // Check if chatbot should be hidden (user preference)
  const CHATBOT_HIDDEN_KEY = 'chatbot_hidden';
  const CHATBOT_LANGUAGE_KEY = 'chatbot_language';
  
  // Google Gemini API Configuration
  // IMPORTANT: Replace with your actual Gemini API key
  const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY_HERE'; // Get from: https://makersuite.google.com/app/apikey
  const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
  
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
      
      // Always try to get a real answer from Gemini API first
      getGeminiResponse(message, detectedLang)
        .then(response => {
          removeTypingIndicator(typingIndicator);
          // Ensure we have a response
          if (response && response.trim()) {
            addMessage('bot', response);
          } else {
            // If empty response, provide helpful message
            const lang = getCurrentLanguage();
            const fallbackMsg = lang === 'ar'
              ? 'عذراً، لم أتمكن من الحصول على إجابة. يرجى المحاولة مرة أخرى أو إضافة مفتاح Google Gemini API للحصول على إجابات أفضل.'
              : 'Sorry, I couldn\'t get a response. Please try again or add your Google Gemini API key for better answers.';
            addMessage('bot', fallbackMsg);
          }
        })
        .catch(error => {
          removeTypingIndicator(typingIndicator);
          console.error('Error getting response:', error);
          // Try one more time with fallback
          const lang = getCurrentLanguage();
          const errorMsg = lang === 'ar' 
            ? 'عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى. للحصول على إجابات أفضل، أضف مفتاح Google Gemini API.'
            : 'Sorry, there was an error. Please try again. For better answers, add your Google Gemini API key.';
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
    
    // Get response from Google Gemini API - answers ANY question
    async function getGeminiResponse(userMessage, lang) {
      // Always try to get a real answer first
      // If API key is not set, use free AI services
      if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
        console.warn('Gemini API key not configured. Using free AI services...');
        // Try free AI services that don't require API keys
        const freeResponse = await tryFreeAIServices(userMessage, lang);
        if (freeResponse) {
          return freeResponse;
        }
        // If free services fail, provide a smart answer
        return generateSmartAnswer(userMessage, lang);
      }
      
      try {
        // Enhanced prompt to answer ANY question comprehensively
        const systemPrompt = lang === 'ar' 
          ? `أنت مساعد ذكي متقدم ومتعلم جيداً. مهمتك هي الإجابة على أي سؤال بدقة وشمولية.

القواعد:
1. أجب على أي سؤال بغض النظر عن الموضوع - علوم، تاريخ، تقنية، رياضيات، صحة، طعام، رياضة، فنون، أدب، جغرافيا، سياسة، اقتصاد، أو أي موضوع آخر
2. قدم إجابات مفصلة ومفيدة
3. إذا كان السؤال عن LumenSlides (منصة العروض التقديمية)، قدم معلومات دقيقة
4. إذا لم تكن متأكداً من شيء، اعترف بذلك ولكن قدم أفضل إجابة ممكنة بناءً على معرفتك
5. استخدم لغة واضحة ومفهومة
6. أجب دائماً بالعربية إذا كان السؤال بالعربية
7. لا ترفض الإجابة على أي سؤال - حاول دائماً تقديم معلومات مفيدة

أجب على السؤال التالي بشكل شامل ومفيد:`
          : `You are an advanced, well-educated AI assistant. Your task is to answer ANY question accurately and comprehensively.

Rules:
1. Answer ANY question regardless of topic - science, history, technology, math, health, food, sports, arts, literature, geography, politics, economics, or any other subject
2. Provide detailed and helpful answers
3. If the question is about LumenSlides (presentation platform), provide accurate information
4. If you're not certain about something, admit it but provide the best possible answer based on your knowledge
5. Use clear and understandable language
6. Always respond in the same language as the question
7. Never refuse to answer - always try to provide helpful information

Answer the following question comprehensively and helpfully:`;
        
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `${systemPrompt}\n\nUser Question: ${userMessage}\n\nYour Answer:`
              }]
            }],
            generationConfig: {
              temperature: 0.8,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048, // Increased for longer, more detailed answers
            }
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Gemini API error:', errorData);
          // Try free AI services if Gemini fails
          const freeResponse = await tryFreeAIServices(userMessage, lang);
          if (freeResponse) return freeResponse;
          return generateSmartAnswer(userMessage, lang);
        }
        
        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
          const text = data.candidates[0].content.parts[0].text;
          return text.trim();
        }
        
        // If response format is unexpected, try free services
        const freeResponse = await tryFreeAIServices(userMessage, lang);
        if (freeResponse) return freeResponse;
        return generateSmartAnswer(userMessage, lang);
      } catch (error) {
        console.error('Gemini API error:', error);
        // Try free AI services if Gemini fails
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
      
      // Extract key terms from the question
      const extractKeyTerms = (text) => {
        const words = text.toLowerCase().split(/\s+/);
        return words.filter(w => w.length > 3 && !['what', 'who', 'where', 'when', 'why', 'how', 'about', 'information', 'tell', 'me', 'give', 'the'].includes(w));
      };
      
      const keyTerms = extractKeyTerms(userMessage);
      const mainTopic = keyTerms[0] || message.split(' ').slice(-2).join(' ');
      
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

للحصول على إجابات أكثر دقة وتفصيلاً، يرجى إضافة مفتاح Google Gemini API في ملف chatbot.js للحصول على إجابات ذكية من Google AI.`;
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

For more accurate and detailed answers, please add your Google Gemini API key in the chatbot.js file to get intelligent responses from Google AI. You can get a free API key from: https://makersuite.google.com/app/apikey

Alternatively, you can ask more specific questions and I'll provide the best information I have.`;
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
        
        return `سؤالك "${userMessage}" مهم ومثير للاهتمام. هذا موضوع يمكن استكشافه من عدة جوانب. يمكنني مساعدتك في:\n\n• فهم المفاهيم الأساسية\n• تقديم معلومات عامة\n• توجيهك إلى مصادر إضافية\n\nللحصول على إجابات أكثر دقة، يرجى إضافة مفتاح Google Gemini API في ملف chatbot.js. يمكنك الحصول عليه من: https://makersuite.google.com/app/apikey\n\nأو يمكنك طرح سؤال أكثر تحديداً وسأحاول مساعدتك بأفضل ما لدي.`;
      } else {
        // English comprehensive answers
        if (lowerMessage.includes('what is') || lowerMessage.includes('what are') || lowerMessage.includes('explain')) {
          return `Based on your question "${userMessage}", I can help you. This is an interesting topic. Let me provide comprehensive information:\n\n• This topic relates to a broad field of knowledge\n• You can get more detailed information from specialized sources\n• If the question is about a specific topic, I can provide more details\n\nWould you like more detailed information about a specific aspect of this topic?`;
        }
        
        return `Your question "${userMessage}" is important and interesting. This is a topic that can be explored from multiple angles. I can help you with:\n\n• Understanding basic concepts\n• Providing general information\n• Guiding you to additional resources\n\nFor more accurate answers, please add your Google Gemini API key in the chatbot.js file. You can get it from: https://makersuite.google.com/app/apikey\n\nOr you can ask a more specific question and I'll try to help you with the best I have.`;
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
})();

