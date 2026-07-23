const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const zlib = require("node:zlib");
const crypto = require("node:crypto");

const rootDir = __dirname;
const dataFile = process.env.DATA_FILE
  ? path.resolve(process.env.DATA_FILE)
  : path.join(rootDir, "talent-submissions.json");
const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || "0.0.0.0";
const hrKey = process.env.HR_KEY || "";
const tokenSecret = process.env.CANDIDATE_TOKEN_SECRET || hrKey || "lingxiang-local-token-secret";
const candidateVersion = "4048";

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

function cacheHeaderFor(filePath = "") {
  const ext = path.extname(filePath).toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".webp", ".svg"].includes(ext)) return "public, max-age=31536000, immutable";
  if (ext === ".json") return "public, max-age=3600";
  if ([".html", ".js", ".css"].includes(ext)) return "public, max-age=60, must-revalidate";
  return "no-store, no-cache, must-revalidate, proxy-revalidate";
}

function canGzip(req, filePath = "") {
  const ext = path.extname(filePath).toLowerCase();
  return [".html", ".css", ".js", ".json", ".svg", ".txt"].includes(ext)
    && String(req.headers["accept-encoding"] || "").includes("gzip");
}

function withCors(headers = {}, cacheControl = "no-store, no-cache, must-revalidate, proxy-revalidate") {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": cacheControl,
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
    return {
      submissions: Array.isArray(parsed.submissions) ? parsed.submissions : [],
      candidates: Array.isArray(parsed.candidates) ? parsed.candidates : [],
    };
  } catch (error) {
    if (error.code === "ENOENT") return { submissions: [], candidates: [] };
    throw error;
  }
}

async function writeStore(store) {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify({
    submissions: Array.isArray(store.submissions) ? store.submissions : [],
    candidates: Array.isArray(store.candidates) ? store.candidates : [],
  }, null, 2), "utf8");
}

function cleanText(value, fallback = "") {
  return String(value ?? fallback).trim().slice(0, 240);
}

function normalizeName(value) {
  return cleanText(value).replace(/\s+/g, "");
}

function normalizePhone(value) {
  let phone = String(value ?? "").replace(/[^\d]/g, "");
  if (phone.length === 13 && phone.startsWith("86")) phone = phone.slice(2);
  return phone;
}

function maskPhone(phone) {
  const normalized = normalizePhone(phone);
  if (!normalized) return "";
  return `${"*".repeat(Math.max(0, normalized.length - 4))}${normalized.slice(-4)}`;
}

function phoneHash(phone) {
  return crypto.createHash("sha256").update(normalizePhone(phone)).digest("hex");
}

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function signToken(payload) {
  const body = base64url(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", tokenSecret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function verifyToken(token) {
  const [body, signature] = String(token || "").split(".");
  if (!body || !signature) return null;
  const expected = crypto.createHmac("sha256", tokenSecret).update(body).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
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

function publicCandidate(candidate) {
  return {
    id: candidate.id,
    name: candidate.name,
    role: candidate.role || "",
    note: candidate.note || "",
    status: candidate.status || "invited",
    phoneMasked: maskPhone(candidate.phone),
    createdAt: candidate.createdAt || "",
    updatedAt: candidate.updatedAt || "",
    startedAt: candidate.startedAt || "",
    submittedAt: candidate.submittedAt || "",
    submissionId: candidate.submissionId || "",
  };
}

function findCandidateByIdentity(store, name, phone) {
  const cleanName = normalizeName(name);
  const hash = phoneHash(phone);
  return store.candidates.find(candidate => normalizeName(candidate.name) === cleanName && candidate.phoneHash === hash);
}

async function handleCandidateAuth(req, res) {
  const payload = JSON.parse(await readBody(req) || "{}");
  const name = cleanText(payload.name);
  const phone = normalizePhone(payload.phone);
  if (!name || phone.length < 6) {
    sendJson(res, 400, { ok: false, error: "请填写姓名和正确手机号" });
    return;
  }

  const store = await readStore();
  const candidate = findCandidateByIdentity(store, name, phone);
  if (!candidate) {
    sendJson(res, 403, { ok: false, code: "MATCH_FAILED", error: "信息未匹配，请联系招聘负责人确认" });
    return;
  }
  if (candidate.status === "submitted") {
    sendJson(res, 409, { ok: false, code: "ALREADY_SUBMITTED", error: "你已完成本次测评，不能重复作答" });
    return;
  }

  const now = new Date().toISOString();
  candidate.status = "started";
  candidate.startedAt = candidate.startedAt || now;
  candidate.updatedAt = now;
  await writeStore(store);

  const token = signToken({ id: candidate.id, phoneHash: candidate.phoneHash, issuedAt: now });
  sendJson(res, 200, { ok: true, token, candidate: publicCandidate(candidate) });
}

async function handleCandidateList(req, res) {
  const store = await readStore();
  const submissionsById = new Map(store.submissions.map(item => [item.id, item]));
  const candidates = store.candidates
    .map(candidate => {
      const submission = submissionsById.get(candidate.submissionId);
      return {
        ...publicCandidate(candidate),
        answerCount: submission ? submission.answerCount : 0,
      };
    })
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  sendJson(res, 200, { ok: true, candidates });
}

async function handleCandidateUpsert(req, res) {
  const payload = JSON.parse(await readBody(req) || "{}");
  const rows = Array.isArray(payload.candidates) ? payload.candidates : [payload];
  const store = await readStore();
  const now = new Date().toISOString();
  const saved = [];
  const skipped = [];

  rows.forEach((row, index) => {
    const name = cleanText(row.name);
    const phone = normalizePhone(row.phone);
    if (!name || phone.length < 6) {
      skipped.push({ index, reason: "缺少姓名或手机号" });
      return;
    }
    const hash = phoneHash(phone);
    let candidate = store.candidates.find(item => normalizeName(item.name) === normalizeName(name) && item.phoneHash === hash);
    if (!candidate) {
      candidate = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: now,
        status: "invited",
        startedAt: "",
        submittedAt: "",
        submissionId: "",
      };
      store.candidates.unshift(candidate);
    }
    candidate.name = name;
    candidate.phone = phone;
    candidate.phoneHash = hash;
    candidate.role = cleanText(row.role);
    candidate.note = cleanText(row.note, "").slice(0, 500);
    candidate.updatedAt = now;
    saved.push(publicCandidate(candidate));
  });

  store.candidates = store.candidates.slice(0, 1000);
  await writeStore(store);
  sendJson(res, 200, { ok: true, candidates: saved, skipped });
}

async function handleCandidateReset(req, res, id) {
  const store = await readStore();
  const candidate = store.candidates.find(item => item.id === id);
  if (!candidate) {
    sendJson(res, 404, { ok: false, error: "候选人不存在" });
    return;
  }
  candidate.status = "invited";
  candidate.startedAt = "";
  candidate.submittedAt = "";
  candidate.submissionId = "";
  candidate.updatedAt = new Date().toISOString();
  await writeStore(store);
  sendJson(res, 200, { ok: true, candidate: publicCandidate(candidate) });
}

async function handleSubmission(req, res) {
  const payload = JSON.parse(await readBody(req) || "{}");
  const tokenPayload = verifyToken(payload.candidateToken);
  if (!tokenPayload) {
    sendJson(res, 401, { ok: false, code: "CANDIDATE_AUTH_REQUIRED", error: "请先完成身份校验" });
    return;
  }

  const store = await readStore();
  const candidate = store.candidates.find(item => item.id === tokenPayload.id && item.phoneHash === tokenPayload.phoneHash);
  if (!candidate) {
    sendJson(res, 403, { ok: false, code: "MATCH_FAILED", error: "信息未匹配，请联系招聘负责人确认" });
    return;
  }
  if (candidate.status === "submitted") {
    sendJson(res, 409, { ok: false, code: "ALREADY_SUBMITTED", error: "你已完成本次测评，不能重复作答" });
    return;
  }

  const answers = cleanAnswers(payload.answers);
  const info = payload.info || {};
  const id = cleanText(payload.id) || `${candidate.id}-${Date.now()}`;
  const submittedAt = cleanText(payload.submittedAt) || new Date().toISOString();
  const record = {
    id,
    candidateId: candidate.id,
    submittedAt,
    receivedAt: new Date().toISOString(),
    info: {
      name: candidate.name,
      phoneMasked: maskPhone(candidate.phone),
      role: cleanText(info.role || candidate.role),
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

  const existing = store.submissions.findIndex(item => item.id === id);
  if (existing >= 0) store.submissions[existing] = record;
  else store.submissions.unshift(record);
  store.submissions = store.submissions.slice(0, 500);

  candidate.status = "submitted";
  candidate.submittedAt = record.submittedAt;
  candidate.submissionId = record.id;
  candidate.updatedAt = new Date().toISOString();
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
  const relativePath = pathname.replace(/^[/\\]+/, "");
  const requested = path.resolve(rootDir, relativePath);
  const rootPrefix = rootDir.endsWith(path.sep) ? rootDir : `${rootDir}${path.sep}`;
  if (requested !== rootDir && !requested.startsWith(rootPrefix)) {
    res.writeHead(403, withCors({ "Content-Type": "text/plain; charset=utf-8" }));
    res.end("Forbidden");
    return;
  }

  try {
    const stat = await fs.stat(requested);
    const filePath = stat.isDirectory() ? path.join(requested, "index.html") : requested;
    const ext = path.extname(filePath).toLowerCase();
    let body = await fs.readFile(filePath);
    const headers = { "Content-Type": mimeTypes[ext] || "application/octet-stream" };
    if (body.length > 1024 && canGzip(req, filePath)) {
      try {
        body = await zlib.promises.gzip(body);
        headers["Content-Encoding"] = "gzip";
        headers["Vary"] = "Accept-Encoding";
      } catch (error) {
        console.error(`gzip failed for ${filePath}:`, error);
      }
    }
    res.writeHead(200, withCors(headers, cacheHeaderFor(filePath)));
    res.end(body);
  } catch (error) {
    console.error(`static file not found: ${requested}`, error);
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
    if (url.pathname === "/api/candidate-auth" && req.method === "POST") {
      await handleCandidateAuth(req, res);
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
    if (url.pathname === "/api/candidates" && req.method === "GET") {
      if (!isAuthorized(url)) {
        sendJson(res, 401, { ok: false, error: "HR_KEY_REQUIRED" });
        return;
      }
      await handleCandidateList(req, res);
      return;
    }
    if (url.pathname === "/api/candidates" && req.method === "POST") {
      if (!isAuthorized(url)) {
        sendJson(res, 401, { ok: false, error: "HR_KEY_REQUIRED" });
        return;
      }
      await handleCandidateUpsert(req, res);
      return;
    }
    const resetMatch = url.pathname.match(/^\/api\/candidates\/([^/]+)\/reset$/);
    if (resetMatch && req.method === "POST") {
      if (!isAuthorized(url)) {
        sendJson(res, 401, { ok: false, error: "HR_KEY_REQUIRED" });
        return;
      }
      await handleCandidateReset(req, res, decodeURIComponent(resetMatch[1]));
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
