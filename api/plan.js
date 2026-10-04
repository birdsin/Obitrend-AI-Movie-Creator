// OBITREND AI Movie Creator — movie blueprint planner
// Server-side only. The OpenAI key is never exposed to the browser.

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    logline: { type: "string" },
    genre: { type: "string" },
    visualBible: {
      type: "object",
      additionalProperties: false,
      properties: {
        world: { type: "string" },
        colorGrade: { type: "string" },
        lighting: { type: "string" },
        realism: { type: "string" },
        continuity: { type: "string" }
      },
      required: ["world", "colorGrade", "lighting", "realism", "continuity"]
    },
    characters: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          role: { type: "string" },
          appearance: { type: "string" },
          wardrobe: { type: "string" },
          personality: { type: "string" }
        },
        required: ["name", "role", "appearance", "wardrobe", "personality"]
      }
    },
    scenes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          heading: { type: "string" },
          purpose: { type: "string" },
          location: { type: "string" },
          time: { type: "string" },
          duration: { type: "string" },
          dialogue: { type: "string" },
          shots: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                camera: { type: "string" },
                lens: { type: "string" },
                framing: { type: "string" },
                angle: { type: "string" },
                movement: { type: "string" },
                focus: { type: "string" },
                lighting: { type: "string" },
                sound: { type: "string" },
                continuity: { type: "string" }
              },
              required: ["camera","lens","framing","angle","movement","focus","lighting","sound","continuity"]
            }
          }
        },
        required: ["heading","purpose","location","time","duration","dialogue","shots"]
      }
    }
  },
  required: ["title", "logline", "genre", "visualBible", "characters", "scenes"]
};

function send(res, status, obj) {
  res.status(status);
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(obj));
}

function getRequestBody(req) {
  if (req && req.body && typeof req.body === "object") return req.body;
  if (typeof req?.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

function getMovieModel() {
  const configured = String(process.env.OPENAI_MOVIE_MODEL || "").trim();
  // Older deployments used the ChatGPT product name "gpt-5.6-luna".
  if (!configured || configured === "gpt-5.6-luna") return "gpt-6-luna";
  return configured;
}

function extractContent(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map(part => {
      if (typeof part === "string") return part;
      return typeof part?.text === "string" ? part.text : "";
    }).join("");
  }
  return "";
}

async function callOpenAI({ key, model, prompt, length, genre, style, ratio, count }) {
  const system =
    "You are OBITREND's professional AI film development system. " +
    "Create original, production-ready movie blueprints across global cinema. " +
    "When a story is African, make it culturally grounded and authentic to the requested " +
    "country, city, region, language, community, traditions, architecture, clothing, " +
    "music atmosphere and social context when relevant. Support Nollywood and other " +
    "African cinema styles without copying existing films or characters. " +
    "For action stories, create coherent, filmable action with clear geography, stakes, " +
    "movement and continuity. Keep characters, wardrobe, locations and visual style " +
    "consistent from scene to scene. Never reproduce an existing copyrighted movie, " +
    "script, character or scene. Return only the requested structured movie blueprint.";

  const user =
    "Story idea: " + prompt + "\n" +
    "Genre: " + genre + "\n" +
    "Visual style: " + style + "\n" +
    "Aspect ratio: " + ratio + "\n" +
    "Target length: " + length + " minutes.\n" +
    "Create exactly " + count + " scenes and exactly 2 practical shots per scene. " +
    "Keep dialogue concise. Make every camera direction filmable and visually specific.";

  const body = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "movie_blueprint",
        strict: true,
        schema
      }
    },
    max_completion_tokens: 12000
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);

  try {
    return await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer " + key
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    return send(res, 405, { error: "Method not allowed." });
  }

  const key = String(process.env.OPENAI_API_KEY || "").trim();
  if (!key) {
    return send(res, 500, {
      error: "Movie AI is not configured yet. Please contact support."
    });
  }

  try {
    const x = getRequestBody(req);
    const prompt = typeof x.prompt === "string" ? x.prompt.trim() : "";

    const parsedLength = Number(x.length);
    const length = Number.isFinite(parsedLength)
      ? Math.min(120, Math.max(1, parsedLength))
      : 15;

    const genre = typeof x.genre === "string" && x.genre.trim()
      ? x.genre.trim().slice(0, 120)
      : "Drama";

    const style = typeof x.visualStyle === "string" && x.visualStyle.trim()
      ? x.visualStyle.trim().slice(0, 160)
      : "Cinematic realism";

    const ratio = typeof x.ratio === "string" && x.ratio.trim()
      ? x.ratio.trim().slice(0, 20)
      : "16:9";

    if (!prompt) {
      return send(res, 400, { error: "Movie idea is required." });
    }

    const count = length === 1 ? 2 : length <= 5 ? 4 : length <= 15 ? 8 : 12;
    const requestedModel = getMovieModel();

    let response = await callOpenAI({
      key, model: requestedModel, prompt, length, genre, style, ratio, count
    });

    // Recover automatically if Vercel still contains an old/invalid model name.
    if (!response.ok && requestedModel !== "gpt-6-luna" &&
        (response.status === 400 || response.status === 404)) {
      const firstError = await response.text();
      console.error("Movie model fallback:", requestedModel, firstError.slice(0, 800));

      response = await callOpenAI({
        key, model: "gpt-6-luna", prompt, length, genre, style, ratio, count
      });
    }

    const rawText = await response.text();
    let data = {};
    try { data = JSON.parse(rawText); } catch {}

    if (!response.ok) {
      console.error("OpenAI movie planner HTTP error", response.status, rawText.slice(0, 1500));

      if (response.status === 401 || response.status === 403) {
        return send(res, 502, {
          error: "Movie AI authorization failed. Please contact support."
        });
      }

      if (response.status === 429) {
        return send(res, 503, {
          error: "Movie AI is busy right now. Please try again in a moment."
        });
      }

      return send(res, 502, {
        error: "Movie planning service is temporarily unavailable. Please try again."
      });
    }

    const raw = extractContent(data);
    if (!raw) {
      console.error("Movie planner returned no structured content.");
      return send(res, 502, {
        error: "Movie planning service returned no blueprint. Please try again."
      });
    }

    let blueprint;
    try {
      blueprint = JSON.parse(raw);
    } catch (error) {
      console.error("Movie blueprint JSON parse error:", error?.message || error, raw.slice(0, 1200));
      return send(res, 502, {
        error: "Movie planning service returned an invalid blueprint. Please try again."
      });
    }

    if (!blueprint || typeof blueprint !== "object" ||
        !Array.isArray(blueprint.scenes) || !Array.isArray(blueprint.characters)) {
      console.error("Movie planner returned an incomplete blueprint.");
      return send(res, 502, {
        error: "Movie planning service returned an incomplete blueprint. Please try again."
      });
    }

    return send(res, 200, { blueprint });
  } catch (error) {
    console.error("Movie planner exception:", error?.stack || error?.message || error);

    if (error?.name === "AbortError") {
      return send(res, 504, {
        error: "Movie blueprint generation took too long. Please try again."
      });
    }

    return send(res, 502, {
      error: "Movie planning service is temporarily unavailable. Please try again."
    });
  }
};
