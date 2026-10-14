export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Use POST"
    });
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "GROQ_API_KEY is not configured in Vercel"
    });
  }

  try {
    const body = req.body || {};
    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    if (!message || message.length > 4000) {
      return res.status(400).json({
        error: "Enter a message up to 4000 characters."
      });
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          messages: [
            {
              role: "system",
              content:
                "You are Kickback AI, a helpful, friendly assistant. Be accurate, clear, and honest about uncertainty."
            },
            {
              role: "user",
              content: message
            }
          ],
          max_completion_tokens: 700
        }),
        signal: AbortSignal.timeout(45000)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "Groq API error:",
        response.status,
        data?.error?.message || "Unknown error"
      );

      return res.status(
        response.status === 429 ? 429 : 502
      ).json({
        error:
          response.status === 429
            ? "AI capacity or rate limit reached. Please try again later."
            : "The AI service is temporarily unavailable."
      });
    }

    const answer =
      data?.choices?.[0]?.message?.content;

    if (typeof answer !== "string") {
      return res.status(502).json({
        error: "The AI returned an empty response."
      });
    }

    return res.status(200).json({
      answer,
      model: data.model
    });
  } catch (error) {
    console.error("Chat request failed:", error.message);

    return res.status(504).json({
      error: "Request timed out or the AI service is unavailable."
    });
  }
        }
