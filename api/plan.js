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

function buildTimeoutFallback({ prompt, length, genre, style, ratio }) {
  const cleanPrompt = String(prompt || "A cinematic story").trim().slice(0, 500);
  const title = cleanPrompt.replace(/[.!?]+$/g, "").split(/\s+/).slice(0, 7).join(" ").replace(/^./, c => c.toUpperCase()) || "Untitled Movie";
  const sceneLength = Number(length) <= 0.5 ? "30 seconds" : String(length) + " minutes";
  return {
    title,
    logline: cleanPrompt,
    genre: genre || "Drama",
    visualBible: {
      world: "Realistic cinematic world based directly on the user's story idea.",
      colorGrade: "Natural cinematic color grade.",
      lighting: "Professional cinematic lighting appropriate to the location and time.",
      realism: "Photorealistic live-action film.",
      continuity: "Keep the main character, wardrobe, location and action consistent."
    },
    characters: [{
      name: "Main Character",
      role: "Lead",
      appearance: "Realistic adult appearance appropriate to the story.",
      wardrobe: "Natural wardrobe appropriate to the story and location.",
      personality: "Expressive, believable and grounded."
    }],
    scenes: [{
      heading: title,
      purpose: cleanPrompt,
      location: "A realistic location appropriate to the story.",
      time: "Daytime",
      duration: sceneLength,
      dialogue: "",
      shots: [
        {camera:"Full-frame cinema camera",lens:"35mm",framing:"Medium-wide cinematic shot",angle:"Eye-level",movement:"Smooth tracking movement",focus:"Main character and environment",lighting:"Natural professional cinematic lighting",sound:"Natural location ambience",continuity:"Establish the story world and main character."},
        {camera:"Full-frame cinema camera",lens:"50mm",framing:"Medium cinematic shot",angle:"Eye-level",movement:"Slow controlled push-in",focus:"Main character",lighting:"Natural professional cinematic lighting",sound:"Natural ambience with subtle cinematic atmosphere",continuity:"Continue directly from the previous shot and preserve character and wardrobe."}
      ]
    }]
  };
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
    "Create exactly " + count + " scenes and exactly 1 practical shot per scene. " +
    "Each shot must be designed as one continuous 30-second production segment so the final movie duration matches the selected length. " +
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
    // Keep the planner fast enough for mobile movie creation.
    max_completion_tokens: 5000
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);

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
      ? Math.min(10, Math.max(0.5, parsedLength))
      : 1;

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

    const count = Math.min(20, Math.max(1, Math.ceil(length * 2)));
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
      // The request fields are scoped inside the main try block, so rebuild them
      // from req here before creating the timeout fallback.
      const fallbackBody = getRequestBody(req);
      const fallbackPrompt = typeof fallbackBody.prompt === "string" ? fallbackBody.prompt.trim() : "";
      const fallbackLength = Number(fallbackBody.length || 15);
      const fallbackGenre = String(fallbackBody.genre || "Drama");
      const fallbackStyle = String(fallbackBody.visualStyle || "Cinematic realism");
      const fallbackRatio = String(fallbackBody.ratio || "16:9");

      console.warn("Movie planner timed out; using lightweight fallback blueprint.");
      return send(res, 200, {
        blueprint: buildTimeoutFallback({
          prompt: fallbackPrompt,
          length: fallbackLength,
          genre: fallbackGenre,
          style: fallbackStyle,
          ratio: fallbackRatio
        }),
        plannerFallback: true
      });
    }

    return send(res, 502, {
      error: "Movie planning service is temporarily unavailable. Please try again."
    });
  }
};
