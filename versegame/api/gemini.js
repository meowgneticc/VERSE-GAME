const https = require("https");

const API_VERSION = "v1beta";
const MODEL = "models/gemini-2.5-flash";

function callGemini(apiKey, prompt) {
  const data = JSON.stringify({
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ]
  });

  const options = {
    hostname: "generativelanguage.googleapis.com",
    port: 443,
    path: `/${API_VERSION}/${MODEL}:generateContent?key=${apiKey}`,
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(body);

          if (json.error) {
            return reject(
              new Error(
                `Gemini error ${json.error.code}: ${json.error.message}`
              )
            );
          }

          const text =
            json?.candidates?.[0]?.content?.parts
              ?.map((p) => p.text)
              .join(" ");

          if (!text) {
            return reject(new Error("Empty response from Gemini"));
          }

          resolve(text);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    let body = req.body;

    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = { text: body };
      }
    }

    const prompt = body?.text || "Привет!";

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Нет переменной окружения GEMINI_API_KEY");
    }

    const responseText = await callGemini(apiKey, prompt);

    res.status(200).json({
      ok: true,
      answer: responseText
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      ok: false,
      error: e.message || e.toString()
    });
  }
};
