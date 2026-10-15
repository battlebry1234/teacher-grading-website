import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

const MAX_BODY = 200_000;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8"
};

function send(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer"
  });

  res.end(JSON.stringify(data));
}

async function readBody(req) {
  let body = "";

  for await (const chunk of req) {
    body += chunk.toString();

    if (body.length > MAX_BODY) {
      const error = new Error("The pasted test is too large.");
      error.status = 413;
      throw error;
    }
  }

  try {
    return JSON.parse(body);
  } catch {
    const error = new Error("Invalid request data.");
    error.status = 400;
    throw error;
  }
}

function clean(value, limit = 3000) {
  return typeof value === "string"
    ? value.trim().slice(0, limit)
    : "";
}

async function gradeTest(payload) {
  const submission = clean(payload.submission, 80000);

  const totalPoints = Math.max(
    1,
    Math.min(10000, Number(payload.totalPoints) || 100)
  );

  const strictness = ["balanced", "lenient", "strict"]
    .includes(payload.strictness)
      ? payload.strictness
      : "balanced";

  if (submission.length < 10) {
    const error = new Error(
      "Paste the test questions and the student's answers first."
    );

    error.status = 400;
    throw error;
  }

  if (!API_KEY) {
    const error = new Error(
      "AI is not configured. Set OPENAI_API_KEY on the server first."
    );

    error.status = 503;
    throw error;
  }

  const strictnessInstructions = {
    balanced: `
Use a balanced standard. Award partial credit when the student
demonstrates some correct understanding or reasoning.
Accept equivalent correct answers.`,

    lenient: `
Be generous with partial credit when there is meaningful correct
reasoning. Accept equivalent wording and reasonable interpretations.
Do not award full credit for an answer that is clearly incorrect.`,

    strict: `
Apply the stated requirements carefully. Require the key facts,
steps, or details expected by the question. Use partial credit only
when the rubric or demonstrated reasoning justifies it. Do not
penalize harmless spelling or formatting differences.`
  };

  const instructions = `
You are GradePilot AI, an educational grading assistant.

Your task is to analyze a pasted test or homework submission and
prepare a transparent, question-by-question grading report.

The input may contain:
- Test questions
- A student's written or selected answers
- An answer key mixed into the text
- Teacher notes or point values
- Multiple-choice questions
- Short-answer questions
- Essay questions
- Math problems and work shown

FIRST: Identify the questions and determine which responses are
the student's answers. Preserve question numbers where possible.
Do not mistake the printed question, answer choices, or a blank
space for the student's response.

If the pasted text includes both questions and answers, grade the
student's answers against the questions and any answer key present.
If an answer key is not clearly identified, use appropriate subject
knowledge cautiously. Do not claim that an uncertain answer is
definitely correct.

If the text contains questions but no identifiable student answers,
do not invent answers or award points for answers that are not
present. Explain this limitation in the feedback.

GRADING STYLE:
${strictnessInstructions[strictness]}

SCORING:
- The requested overall total is ${totalPoints} points.
- Assign each identified question a positive possible-points value.
- Assign earned points between zero and possible points.
- The sum of possible points should equal ${totalPoints} when practical.
- Otherwise, use a consistent point scheme; the website will calculate
  the overall percentage and scale it to ${totalPoints} points.
- Do not count the same question twice.
- Treat a blank or missing student answer as unanswered.
- Keep feedback constructive, specific, and educational.
- Do not infer the student's identity or personal characteristics.

Return ONLY valid JSON. Do not use Markdown code fences.

Use exactly this structure:
{
  "overallFeedback": "Summary of the student's performance",
  "strengths": "Topics or skills demonstrated well",
  "improvements": "Topics or skills needing further practice",
  "questions": [
    {
      "question": "Question number and short question text",
      "studentAnswer": "The answer identified in the submission",
      "earned": 2,
      "possible": 3,
      "feedback": "Why this score was awarded",
      "correctAnswer": "Suggested correct answer or correction"
    }
  ]
}

All scores must be JSON numbers. The questions property must be
an array. Use an empty array if no questions can be identified.
Do not include commentary outside the JSON object.
`;

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 120000);

  let response;

  try {
    response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: MODEL,
          instructions,
          input: submission,
          max_output_tokens: 8000,
          store: false
        }),
        signal: controller.signal
      }
    );
  } catch (error) {
    const failure = new Error(
      error.name === "AbortError"
        ? "Grading timed out. Try a shorter submission."
        : "Could not connect to the AI service."
    );

    failure.status = 502;
    throw failure;
  } finally {
    clearTimeout(timeout);
  }

  const apiResult = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error(
      "AI API error:",
      apiResult.error?.message || response.status
    );

    const error = new Error(
      response.status === 401
        ? "The API key was rejected. Check your configuration."
        : response.status === 429
          ? "AI usage limit reached. Check your API quota."
          : "The AI service could not grade this submission."
    );

    error.status = response.status === 429 ? 429 : 502;
    throw error;
  }

  const output = apiResult.output_text;

  if (!output) {
    const error = new Error("The AI returned an empty response.");
    error.status = 502;
    throw error;
  }

  let result;

  try {
    const cleaned = output.trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");

    result = JSON.parse(cleaned);
  } catch {
    const error = new Error(
      "The AI report could not be parsed. Please try again."
    );

    error.status = 502;
    throw error;
  }

  if (!Array.isArray(result.questions)) {
    const error = new Error(
      "The AI did not return a valid question breakdown."
    );

    error.status = 502;
    throw error;
  }

  result.questions = result.questions
    .slice(0, 150)
    .map((question, index) => {
      const possible = Math.max(
        0.01,
        Math.min(100000, Number(question.possible) || 1)
      );

      const earned = Math.max(
        0,
        Math.min(possible, Number(question.earned) || 0)
      );

      return {
        question: clean(question.question, 1500)
          || `Question ${index + 1}`,

        studentAnswer: clean(question.studentAnswer, 5000),

        earned: Math.round(earned * 100) / 100,

        possible: Math.round(possible * 100) / 100,

        feedback: clean(question.feedback, 3000),

        correctAnswer: clean(question.correctAnswer, 3000)
      };
    });

  result.overallFeedback = clean(result.overallFeedback, 5000);
  result.strengths = clean(result.strengths, 3000);
  result.improvements = clean(result.improvements, 3000);

  return result;
}

const server = http.createServer(async (req, res) => {
  try {
    const pathname = new URL(
      req.url,
      "http://localhost"
    ).pathname;

    if (req.method === "POST" && pathname === "/api/grade") {
      const payload = await readBody(req);
      const result = await gradeTest(payload);

      return send(res, 200, result);
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      return send(res, 405, {
        error: "Method not allowed."
      });
    }

    const requested = pathname === "/"
      ? "index.html"
      : pathname.slice(1);

    const filePath = resolve(ROOT, requested);

    if (
      filePath !== ROOT &&
      !filePath.startsWith(ROOT + sep)
    ) {
      return send(res, 403, {
        error: "Forbidden."
      });
    }

    let content;

    try {
      content = await readFile(filePath);
    } catch {
      return send(res, 404, {
        error: "File not found."
      });
    }

    res.writeHead(200, {
      "Content-Type":
        contentTypes[extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    });

    return req.method === "HEAD"
      ? res.end()
      : res.end(content);

  } catch (error) {
    console.error("Request error:", error.message);

    return send(res, error.status || 500, {
      error: error.message || "Unexpected server error."
    });
  }
});

server.listen(PORT, () => {
  console.log(`GradePilot AI is running at http://localhost:${PORT}`);

  if (!API_KEY) {
    console.warn(
      "Set OPENAI_API_KEY before using AI grading."
    );
  }
});
