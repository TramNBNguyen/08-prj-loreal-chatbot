export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Check if API key exists
      const apiKey = env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error("OpenAI API key not configured");
      }

      const apiUrl = "https://api.openai.com/v1/chat/completions";

      // Parse request body
      let userInput;
      try {
        userInput = await request.json();
      } catch (e) {
        throw new Error("Invalid JSON in request body");
      }

      // Validate required fields
      if (!userInput.messages || !Array.isArray(userInput.messages)) {
        throw new Error("Messages array is required");
      }

      const requestBody = {
        model: "gpt-4o",
        messages: userInput.messages,
        max_tokens: 300, // Changed from max_completion_tokens to max_tokens
        temperature: 0.7,
      };

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("OpenAI API Error:", data);
        throw new Error(
          `OpenAI API Error: ${data.error?.message || "Unknown error"}`
        );
      }

      return new Response(JSON.stringify(data), { headers: corsHeaders });
    } catch (error) {
      console.error("Worker Error:", error);

      // Return error response
      const errorResponse = {
        error: {
          message: error.message || "Internal server error",
          type: "worker_error",
        },
      };

      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: corsHeaders,
      });
    }
  },
};
