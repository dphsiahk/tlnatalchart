// server.js
import express from "express";
import fetch from "node-fetch"; // node 18+ has fetch; if older Node use node-fetch
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(process.cwd(), "public")));

const OPENAI_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_KEY) {
  console.error("Missing OPENAI_API_KEY in environment. Create one at https://platform.openai.com/account/api-keys");
  process.exit(1);
}

// -- Text generation endpoint
app.post("/api/generate-text", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.json({ error: "No prompt provided" });

    // Example: using Chat Completions (or Responses API - consult docs for preferred endpoint)
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":"application/json",
        "Authorization": `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // update this to the model you prefer (see docs)
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600
      })
    });

    const j = await response.json();
    if (!response.ok) return res.json({ error: j.error?.message || JSON.stringify(j) });

    // Extract assistant text (adjust path if you use Responses API)
    const text = j.choices?.[0]?.message?.content ?? JSON.stringify(j);
    res.json({ text });
  } catch (err) {
    console.error(err);
    res.json({ error: err.message });
  }
});

// -- Image generation endpoint
app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt, size = "1024x1024" } = req.body;
    if (!prompt) return res.json({ error: "No prompt provided" });

    // Using Images API endpoint
    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type":"application/json",
        "Authorization": `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-image-1", // image model; update per docs if needed
        prompt,
        size // e.g. "1024x1024"
      })
    });

    const j = await r.json();
    if (!r.ok) return res.json({ error: j.error?.message || JSON.stringify(j) });

    // Many Image endpoints return base64 / or a URL — handle both:
    // If response contains base64 data:
    // j.data[0].b64_json  OR j.data[0].b64_json (varies by API)
    let imageData = null;
    if (j.data?.[0]?.b64_json) {
      imageData = "data:image/png;base64," + j.data[0].b64_json;
    } else if (j.data?.[0]?.url) {
      // If API returns a URL, fetch it, convert to data URL for the browser (optional)
      const imageUrl = j.data[0].url;
      // Simple pass-through: send the URL to the client (safer for large images)
      return res.json({ image: imageUrl });
    } else {
      imageData = JSON.stringify(j);
    }

    res.json({ image: imageData });
  } catch (err) {
    console.error(err);
    res.json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
