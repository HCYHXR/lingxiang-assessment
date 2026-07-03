const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const rootDir = __dirname;
const dataFile = process.env.DATA_FILE
  ? path.resolve(process.env.DATA_FILE)
  : path.join(rootDir, "talent-submissions.json");
const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || "0.0.0.0";
const hrKey = process.env.HR_KEY || "";
const candidateVersion = "4044";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml; charset=utf-8",
};

function withCors(headers = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
    ...headers,
  };
}

function sendJson(res, status, value) {
  res.writeHead(status, withCors({ "Content-Type": "application/json; charset=utf-8" }));
  res.end(JSON.stringify(value));
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1024 * 1024 * 2) throw new Error("请求内容过大");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function readStore() {
  try {
    const raw = (await fs.readFile(dataFile, "utf8")).replace(/^\uFEFF/, "");
    const parsed = JSON.parse(raw);
    return { submissions: Array.isArray(parsed.submissions) ? parsed.submissions : [] };
  } catch (error) {
    if (error.code === "ENOENT") return { submissions: [] };
    throw error;
  }
}

async function writeStore(store) {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(store, null, 2), "utf8");
}

function cleanText(value, fallback = "") {
  return String(value ?? fallback).trim().slice(0, 240);
}

function cleanAnswers(answers) {
  const cleaned = {};
  Object.entries(answers || {}).forEach(([key, value]) => {
    if (/^\d+$/.test(key) && /^[A-E]$/.test(String(value))) cleaned[key] = String(value);
  });
  return cleaned;
}

function isAuthorized(url) {
  if (!hrKey) return true;
  return url.searchParams.get("key") === hrKey;
}

async function handleSubmission(req, res) {
  const body = await readBody(req);
  const payload = JSON.parse(body || "{}");
  const answers = cleanAnswers(payload.answers);
  const info = payload.info || {};
  const id = cleanText(payload.id) || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const submittedAt = cleanText(payload.submittedAt) || new Date().toISOString();
  const record = {
    id,
    submittedAt,
    receivedAt: new Date().toISOString(),
    info: {
      name: cleanText(info.name, "未命名候选人"),
      role: cleanText(info.role),
      years: cleanText(info.years),
      date: cleanText(info.date),
      open: cleanText(info.open, "").slice(0, 2000),
    },
    answers,
    result: payload.result || null,
    answerCount: Object.keys(answers).length,
  };

  if (!record.info.name) {
    sendJson(res, 400, { ok: false, error: "缺少候选人姓名" });
    return;
  }

  const store = await readStore();
  const existing = store.submissions.findIndex(item => item.id === id);
  if (existing >= 0) store.submissions[existing] = record;
  else store.submissions.unshift(record);
  store.submissions = store.submissions.slice(0, 500);
  await writeStore(store);
  sendJson(res, 200, { ok: true, submission: record });
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname === "/candidate" && url.searchParams.get("v") !== candidateVersion) {
    res.writeHead(302, withCors({ Location: `/candidate?v=${candidateVersion}` }));
    res.end();
    return;
  }
  if (url.pathname === "/hr" && !isAuthorized(url)) {
    res.writeHead(401, withCors({ "Content-Type": "text/html; charset=utf-8" }));
    res.end(`<!doctype html><meta charset="utf-8"><title>HR访问受限</title><body style="font-family:Microsoft YaHei,Arial,sans-serif;background:#eef6ee;color:#182230;padding:48px;"><h1>HR访问受限</h1><p>请使用带有 HR key 的后台链接访问。</p></body>`);
    return;
  }
  const aliases = {
    "/": "/talent-assessment-tool.html",
    "/hr": "/talent-assessment-tool.html",
    "/candidate": "/candidate-assessment.html",
  };
  const pathname = decodeURIComponent(aliases[url.pathname] || url.pathname);
  const requested = path.normalize(path.join(rootDir, pathname));
  if (!requested.startsWith(rootDir)) {
    res.writeHead(403, withCors({ "Content-Type": "text/plain; charset=utf-8" }));
    res.end("Forbidden");
    return;
  }

  try {
    const stat = await fs.stat(requested);
    const filePath = stat.isDirectory() ? path.join(requested, "index.html") : requested;
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, withCors({ "Content-Type": mimeTypes[ext] || "application/octet-stream" }));
    res.end(await fs.readFile(filePath));
  } catch {
    res.writeHead(404, withCors({ "Content-Type": "text/plain; charset=utf-8" }));
    res.end("Not found");
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.writeHead(204, withCors());
      res.end();
      return;
    }
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (url.pathname === "/api/health") {
      sendJson(res, 200, { ok: true });
      return;
    }
    if (url.pathname === "/api/submissions" && req.method === "GET") {
      if (!isAuthorized(url)) {
        sendJson(res, 401, { ok: false, error: "HR_KEY_REQUIRED" });
        return;
      }
      const store = await readStore();
      store.submissions.sort((a, b) => String(b.receivedAt || b.submittedAt).localeCompare(String(a.receivedAt || a.submittedAt)));
      sendJson(res, 200, store);
      return;
    }
    if (url.pathname === "/api/submissions" && req.method === "POST") {
      await handleSubmission(req, res);
      return;
    }
    await serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message || "服务器错误" });
  }
});

server.listen(port, host, () => {
  const base = `http://127.0.0.1:${port}`;
  console.log(`Talent assessment server running: ${base}/`);
  console.log(`Candidate link: ${base}/candidate`);
  console.log(`HR link: ${base}/hr${hrKey ? `?key=${hrKey}` : ""}`);
});
