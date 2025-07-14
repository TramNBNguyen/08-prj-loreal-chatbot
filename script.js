/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const currentQuestion = document.getElementById("currentQuestion");
const questionText = document.getElementById("questionText");
const sendBtn = document.getElementById("sendBtn");

// Conversation history for context
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

Remember: You represent L'Oréal's commitment to beauty and innovation. Stay focused on helping users discover their perfect L'Oréal products and routines.`,
  },
];

// Track user name if provided
let userName = null;

/* Add message to chat window */
function addMessage(message, isUser = false) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `msg ${isUser ? "user" : "ai"}`;

  const messageContent = document.createElement("div");
  messageContent.className = "msg-content";

  const messageIcon = document.createElement("span");
  messageIcon.className = "msg-icon";
  messageIcon.textContent = isUser ? "👤" : "💄";

  const messageText = document.createElement("span");
  messageText.className = "msg-text";
  messageText.textContent = message;

  messageContent.appendChild(messageIcon);
  messageContent.appendChild(messageText);
  messageDiv.appendChild(messageContent);

  chatWindow.appendChild(messageDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Show loading message */
function showLoading() {
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "msg ai";
  loadingDiv.id = "loading-message";

  const messageContent = document.createElement("div");
  messageContent.className = "msg-content";

  const messageIcon = document.createElement("span");
  messageIcon.className = "msg-icon";
  messageIcon.textContent = "💄";

  const loadingSpinner = document.createElement("span");
  loadingSpinner.className = "loading";

  messageContent.appendChild(messageIcon);
  messageContent.appendChild(loadingSpinner);
  loadingDiv.appendChild(messageContent);

  chatWindow.appendChild(loadingDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Remove loading message */
function removeLoading() {
  const loadingMessage = document.getElementById("loading-message");
  if (loadingMessage) {
    loadingMessage.remove();
  }
}

/* Show current question */
function showCurrentQuestion(question) {
  questionText.textContent = question;
  currentQuestion.style.display = "block";
}

/* Hide current question */
function hideCurrentQuestion() {
  currentQuestion.style.display = "none";
}

/* Send message to OpenAI API via Cloudflare Worker */
async function sendToAPI(userMessage) {
  try {
    // Add user message to conversation history
    conversationHistory.push({
      role: "user",
      content: userMessage,
    });

    // Extract user name if they introduce themselves
    if (
      userMessage.toLowerCase().includes("my name is") ||
      userMessage.toLowerCase().includes("i'm ") ||
      userMessage.toLowerCase().includes("i am ")
    ) {
      const nameMatch = userMessage.match(
        /(?:my name is|i'm|i am)\s+([a-zA-Z]+)/i
      );
      if (nameMatch) {
        userName = nameMatch[1];
      }
    }

    const requestBody = {
      messages: conversationHistory,
    };

    console.log("Sending request to:", CLOUDFLARE_WORKER_URL);
    console.log("Request body:", JSON.stringify(requestBody, null, 2));

    const response = await fetch(CLOUDFLARE_WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log("Response status:", response.status);
    console.log("Response headers:", response.headers);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response:", errorText);
      throw new Error(
        `HTTP error! status: ${response.status}, body: ${errorText}`
      );
    }

    const responseText = await response.text();
    console.log("Raw response:", responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Response text:", responseText);
      throw new Error("Invalid JSON response from server");
    }

    if (data.choices && data.choices[0] && data.choices[0].message) {
      const aiResponse = data.choices[0].message.content;

      // Add AI response to conversation history
      conversationHistory.push({
        role: "assistant",
        content: aiResponse,
      });

      // Keep conversation history reasonable (last 20 messages)
      if (conversationHistory.length > 21) {
        conversationHistory = [
          conversationHistory[0], // Keep system message
          ...conversationHistory.slice(-20),
        ];
      }

      return aiResponse;
    } else if (data.error) {
      console.error("API Error:", data.error);
      throw new Error(`API Error: ${data.error.message || "Unknown error"}`);
    } else {
      console.error("Unexpected response format:", data);
      throw new Error("Invalid response format from API");
    }
  } catch (error) {
    console.error("Error calling API:", error);
    return `I apologize, but I'm having trouble connecting right now. Please try again in a moment. In the meantime, I'd love to help you discover L'Oréal's amazing beauty products - what type of product are you most interested in?`;
  }
}

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = userInput.value.trim();
  if (!message) return;

  // Show user message
  addMessage(message, true);
  showCurrentQuestion(message);

  // Clear input and disable button
  userInput.value = "";
  sendBtn.disabled = true;

  // Show loading
  showLoading();

  try {
    // Get AI response
    const aiResponse = await sendToAPI(message);

    // Remove loading and show response
    removeLoading();
    addMessage(aiResponse, false);
  } catch (error) {
    removeLoading();
    addMessage(
      "I apologize, but I'm experiencing some technical difficulties. Please try again, and I'll do my best to help you with L'Oréal products!",
      false
    );
  }

  // Re-enable button and focus input
  sendBtn.disabled = false;
  userInput.focus();
});

/* Handle Enter key in input */
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    chatForm.dispatchEvent(new Event("submit"));
  }
});

/* Auto-focus input on page load */
window.addEventListener("load", () => {
  userInput.focus();
});

/* Add some example questions for better UX */
function addExampleQuestions() {
  const examples = [
    "What's the best L'Oréal foundation for oily skin?",
    "Can you recommend a skincare routine for dry skin?",
    "What are L'Oréal's most popular lipstick shades?",
    "How do I choose the right hair color?",
    "What's new in L'Oréal makeup this season?",
  ];

  // You can add these as clickable suggestions if desired
  // For now, they're just stored for potential future use
}

/* Initialize */
document.addEventListener("DOMContentLoaded", () => {
  // Clear the initial message and set up the welcome message
  chatWindow.innerHTML = "";

  const welcomeDiv = document.createElement("div");
  welcomeDiv.className = "msg ai";

  const messageContent = document.createElement("div");
  messageContent.className = "msg-content";

  const messageIcon = document.createElement("span");
  messageIcon.className = "msg-icon";
  messageIcon.textContent = "💄";

  const messageText = document.createElement("span");
  messageText.className = "msg-text";
  messageText.textContent =
    "Hello! I'm your L'Oréal Beauty Assistant. I can help you discover makeup, skincare, haircare, and fragrance products, as well as create personalized beauty routines. What would you like to know about today?";

  messageContent.appendChild(messageIcon);
  messageContent.appendChild(messageText);
  welcomeDiv.appendChild(messageContent);

  chatWindow.appendChild(welcomeDiv);

  // Focus on input
  userInput.focus();
});
