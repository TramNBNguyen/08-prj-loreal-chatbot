/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Your Cloudflare Worker URL
const WORKER_URL = "https://loreal-chatbox.cindytram2604.workers.dev/";

// Conversation history
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

// System message to guide AI responses
const systemMessage = {
  role: "system",
  content:
    "You are a L'Oréal beauty assistant. Only answer questions about L'Oréal products, beauty routines, and makeup tips. Keep responses under 100 words and focus on L'Oréal product recommendations. If asked about non-L'Oréal topics, politely redirect to L'Oréal products. Be helpful, friendly, and concise.",
};

// Set initial message
chatWindow.textContent =
  "👋 Hello! I'm your L'Oréal Beauty Assistant. Ask me about L'Oréal products and beauty tips!";

/* Add message to chat window */
function addMessage(message, isUser = false) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `msg ${isUser ? "user" : "ai"}`;
  messageDiv.textContent = message;
  chatWindow.appendChild(messageDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = userInput.value.trim();
  if (!message) return;

  // Add user message to chat
  addMessage(message, true);

  // Add user message to conversation history
  conversationHistory.push({ role: "user", content: message });

  // Clear input
  userInput.value = "";

  // Show loading message
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "msg ai";
  loadingDiv.textContent = "Thinking...";
  chatWindow.appendChild(loadingDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  try {
    // Prepare messages with system instruction
    const messages = [systemMessage, ...conversationHistory];

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

      // Keep conversation history manageable (last 10 messages)
      if (conversationHistory.length > 10) {
        conversationHistory = conversationHistory.slice(-10);
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
  }
});
