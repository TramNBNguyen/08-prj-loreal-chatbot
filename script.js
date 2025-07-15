/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const latestQuestion = document.getElementById("latestQuestion");
const questionText = document.getElementById("questionText");

// Your Cloudflare Worker URL
const WORKER_URL = "https://loreal-chatbox.cindytram2604.workers.dev/";

// Conversation history with user context
let conversationHistory = [
  {
    role: "system",
    content: `You are a L'Oréal Beauty Assistant chatbot. You ONLY help with L'Oréal products, beauty routines, skincare, makeup, haircare, and fragrance recommendations. 

Your expertise includes:
- L'Oréal makeup products (foundations, lipsticks, eyeshadows, etc.)
- L'Oréal skincare lines (moisturizers, serums, cleansers, etc.)
- L'Oréal haircare products (shampoos, conditioners, styling products, etc.)
- L'Oréal fragrances
- Personalized beauty routines and recommendations
- Application tips and techniques
- Product comparisons within L'Oréal's range

IMPORTANT RULES:
1. ONLY answer questions related to L'Oréal products, beauty, skincare, makeup, haircare, and fragrances
2. If asked about non-L'Oréal products, politely redirect to L'Oréal alternatives
3. If asked about unrelated topics (weather, sports, general knowledge, etc.), politely decline and ask how you can help with L'Oréal beauty products
4. Be friendly, knowledgeable, and helpful
5. Keep responses conversational but informative
6. Always promote L'Oréal's brand values and quality
7. Remember user preferences and past questions to provide personalized recommendations

Remember: You represent L'Oréal's commitment to beauty and innovation. Stay focused on helping users discover their perfect L'Oréal products and routines.`,
  },
];

// User context for personalized interactions
let userContext = {
  name: null,
  skinType: null,
  preferences: [],
  previousQuestions: [],
  currentSession: new Date().toISOString(),
};

// System message to guide AI responses
const systemMessage = {
  role: "system",
  content: `You are a L'Oréal beauty assistant. Only answer questions about L'Oréal products, beauty routines, and makeup tips. 

Context about the user:
- Name: ${userContext.name || "Not provided"}
- Skin type: ${userContext.skinType || "Not specified"}
- Previous preferences: ${userContext.preferences.join(", ") || "None noted"}
- Session started: ${userContext.currentSession}

Use this context to provide personalized recommendations. If the user mentions their name, skin type, or preferences, remember these details for future interactions. Keep responses under 100 words and focus on L'Oréal product recommendations. If asked about non-L'Oréal topics, politely redirect to L'Oréal products. Be helpful, friendly, and concise.`,
};

// Set initial welcome message
function setInitialMessage() {
  const welcomeMessage =
    "👋 Hello! I'm your L'Oréal Beauty Assistant. Ask me about L'Oréal products and beauty tips! Feel free to tell me your name and skin type for personalized recommendations.";
  addMessage(welcomeMessage, false);
}

/* Add message to chat window with bubble design */
function addMessage(message, isUser = false) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `msg ${isUser ? "user" : "ai"}`;

  // Create avatar
  const avatar = document.createElement("div");
  avatar.className = "msg-avatar";
  avatar.textContent = isUser ? "U" : "L";

  // Create message bubble
  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.textContent = message;

  // Append elements in correct order
  if (isUser) {
    messageDiv.appendChild(bubble);
    messageDiv.appendChild(avatar);
  } else {
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(bubble);
  }

  chatWindow.appendChild(messageDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Update latest question display */
function updateLatestQuestion(question) {
  questionText.textContent = question;
  latestQuestion.style.display = "block";
}

/* Extract user context from message */
function extractUserContext(message) {
  const lowerMessage = message.toLowerCase();

  // Extract name (simple patterns)
  const namePatterns = [
    /my name is ([a-zA-Z]+)/i,
    /i'm ([a-zA-Z]+)/i,
    /i am ([a-zA-Z]+)/i,
    /call me ([a-zA-Z]+)/i,
  ];

  namePatterns.forEach((pattern) => {
    const match = message.match(pattern);
    if (match && match[1]) {
      userContext.name = match[1];
    }
  });

  // Extract skin type
  const skinTypes = [
    "oily",
    "dry",
    "combination",
    "sensitive",
    "normal",
    "acne-prone",
  ];
  skinTypes.forEach((type) => {
    if (lowerMessage.includes(type)) {
      userContext.skinType = type;
    }
  });

  // Extract preferences
  const preferences = [
    "anti-aging",
    "hydrating",
    "brightening",
    "matte",
    "dewy",
    "long-lasting",
  ];
  preferences.forEach((pref) => {
    if (
      lowerMessage.includes(pref) &&
      !userContext.preferences.includes(pref)
    ) {
      userContext.preferences.push(pref);
    }
  });

  // Add to previous questions
  userContext.previousQuestions.push({
    question: message,
    timestamp: new Date().toISOString(),
  });

  // Keep only last 5 questions
  if (userContext.previousQuestions.length > 5) {
    userContext.previousQuestions = userContext.previousQuestions.slice(-5);
  }
}

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = userInput.value.trim();
  if (!message) return;

  // Update latest question display
  updateLatestQuestion(message);

  // Extract user context
  extractUserContext(message);

  // Add user message to chat
  addMessage(message, true);

  // Add user message to conversation history
  conversationHistory.push({ role: "user", content: message });

  // Clear input
  userInput.value = "";

  // Show loading message
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "msg ai";

  const loadingAvatar = document.createElement("div");
  loadingAvatar.className = "msg-avatar";
  loadingAvatar.textContent = "L";

  const loadingBubble = document.createElement("div");
  loadingBubble.className = "msg-bubble";
  loadingBubble.innerHTML = '<span class="loading-dots">Thinking</span>';

  loadingDiv.appendChild(loadingAvatar);
  loadingDiv.appendChild(loadingBubble);
  chatWindow.appendChild(loadingDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  try {
    // Update system message with current user context
    const updatedSystemMessage = {
      role: "system",
      content: `You are a L'Oréal beauty assistant. Only answer questions about L'Oréal products, beauty routines, and makeup tips. 

Context about the user:
- Name: ${userContext.name || "Not provided"}
- Skin type: ${userContext.skinType || "Not specified"}
- Previous preferences: ${userContext.preferences.join(", ") || "None noted"}
- Recent questions: ${
        userContext.previousQuestions.map((q) => q.question).join("; ") ||
        "None"
      }
- Session started: ${userContext.currentSession}

Use this context to provide personalized recommendations and remember past interactions. If the user mentions their name, skin type, or preferences, acknowledge and use these details. Keep responses under 100 words and focus on L'Oréal product recommendations. If asked about non-L'Oréal topics, politely redirect to L'Oréal products. Be helpful, friendly, and concise.`,
    };

    // Prepare messages with updated system instruction
    const messages = [updatedSystemMessage, ...conversationHistory];

    const requestBody = {
      messages: messages,
    };

    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    // Remove loading message
    chatWindow.removeChild(loadingDiv);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Check if the response has the expected structure
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const aiMessage = data.choices[0].message.content;
      addMessage(aiMessage);

      // Add AI response to conversation history
      conversationHistory.push({ role: "assistant", content: aiMessage });

      // Keep conversation history manageable (last 12 messages including system context)
      if (conversationHistory.length > 12) {
        conversationHistory = [
          conversationHistory[0],
          ...conversationHistory.slice(-11),
        ];
      }
    } else if (data.error) {
      throw new Error(`API Error: ${data.error.message || "Unknown error"}`);
    } else {
      throw new Error("Unexpected response format");
    }
  } catch (error) {
    // Remove loading message if it still exists
    if (loadingDiv.parentNode) {
      chatWindow.removeChild(loadingDiv);
    }

    addMessage(`Sorry, I'm having trouble connecting. Please try again.`);
    console.error("Chat error:", error);
  }
});

// Initialize the chat
setInitialMessage();
