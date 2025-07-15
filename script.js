/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Your Cloudflare Worker URL
const WORKER_URL = "https://loreal-chatbox.cindytram2604.workers.dev/";

// Conversation history
let conversationHistory = [];

// System message to guide AI responses
const systemMessage = {
  role: "system", 
  content: "You are a L'Oréal beauty assistant. Only answer questions about L'Oréal products, beauty routines, and makeup tips. Keep responses under 100 words and focus on L'Oréal product recommendations. If asked about non-L'Oréal topics, politely redirect to L'Oréal products. Be helpful, friendly, and concise."
};

// Set initial message
chatWindow.textContent = "👋 Hello! I'm your L'Oréal Beauty Assistant. Ask me about L'Oréal products and beauty tips!";

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