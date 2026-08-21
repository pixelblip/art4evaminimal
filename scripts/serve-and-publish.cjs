#!/usr/bin/env node
/**
 * Serves www/ and publishes pieces to pixelblip/pixelblip-gallery using
 * the Mac's `gh` login (no browser token needed).
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', 'www');
const PORT = Number(process.env.PORT || 5173);
const OWNER = 'pixelblip';
const REPO = 'pixelblip-gallery';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function ghToken() {
  try {
    return String(execFileSync('gh', ['auth', 'token'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    })).trim();
  } catch (err) {
    throw new Error('gh auth token failed — run: gh auth login');
  }
}

async function ghJson(method, apiPath, body) {
  const token = ghToken();
  const res = await fetch('https://api.github.com' + apiPath, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer ' + token,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'pixelblip-paint-publish',
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) { data = { raw: text }; }
  if (!res.ok) {
    const msg = (data && (data.message || data.raw)) || text || ('HTTP ' + res.status);
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

function b64utf8(str) {
  return Buffer.from(str, 'utf8').toString('base64');
}

function decodeContent(file) {
  return Buffer.from(String(file.content || '').replace(/\n/g, ''), 'base64').toString('utf8');
}

async function putFile(filePath, contentB64, message) {
  let sha = null;
  try {
    const existing = await ghJson('GET', `/repos/${OWNER}/${REPO}/contents/${filePath}`);
    if (existing && existing.sha) sha = existing.sha;
  } catch (err) {
    if (err.status !== 404) throw err;
  }
  const body = { message, content: contentB64, branch: 'main' };
  if (sha) body.sha = sha;
  return ghJson('PUT', `/repos/${OWNER}/${REPO}/contents/${filePath}`, body);
}

async function publishPiece(payload) {
  const id = String(payload.id || ('piece_' + Date.now())).replace(/[^\w\-]+/g, '_');
  const pngDataUrl = String(payload.png || '');
  const pngB64 = pngDataUrl.includes(',') ? pngDataUrl.split(',')[1] : pngDataUrl;
  if (!pngB64) throw new Error('Missing PNG');

  const playDoc = payload.fin || {
    v: 1,
    type: 'art4eva-paint-fin',
    name: id,
    w: 160,
    h: 256,
    t: Date.now(),
    actions: []
  };

  const imgPath = 'works/' + id + '.png';
  const finPath = 'works/' + id + '.paint.json';

  await putFile(imgPath, pngB64, 'Add ' + id + ' preview');
  await putFile(finPath, b64utf8(JSON.stringify(playDoc)), 'Add ' + id + ' play sequence');

  const man = await ghJson('GET', `/repos/${OWNER}/${REPO}/contents/manifest.json`);
  const manifest = JSON.parse(decodeContent(man));
  if (!Array.isArray(manifest.works)) manifest.works = [];
  manifest.works = manifest.works.filter(w => w.id !== id);
  manifest.works.unshift({
    id,
    title: playDoc.name || id,
    created: playDoc.t || Date.now(),
    image: imgPath,
    fin: finPath,
    trashed: false,
    trashedAt: null
  });
  manifest.updated = Date.now();
  await putFile(
    'manifest.json',
    b64utf8(JSON.stringify(manifest, null, 2) + '\n'),
    'List ' + id + ' in gallery'
  );
  return { id, url: `https://pixelblip.github.io/${REPO}/` };
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > 12 * 1024 * 1024) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const urlPath = (req.url || '/').split('?')[0];

  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === 'GET' && urlPath === '/api/publish-status') {
    try {
      ghToken();
      sendJson(res, 200, { ok: true, mode: 'gh', owner: OWNER, repo: REPO });
    } catch (err) {
      sendJson(res, 500, { ok: false, error: String(err.message || err) });
    }
    return;
  }

  if (req.method === 'POST' && urlPath === '/api/publish') {
    try {
      const raw = await readBody(req);
      const payload = JSON.parse(raw || '{}');
      const result = await publishPiece(payload);
      console.log('[publish] ok', result.id);
      sendJson(res, 200, { ok: true, ...result });
    } catch (err) {
      console.error('[publish] fail', err.message || err);
      sendJson(res, err.status || 500, { ok: false, error: String(err.message || err) });
    }
    return;
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    serveStatic(req, res);
    return;
  }

  sendJson(res, 405, { ok: false, error: 'Method not allowed' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('Paint + gallery publish on http://localhost:' + PORT);
  console.log('Phone (same Wi-Fi): http://<this-mac-ip>:' + PORT);
  console.log('PUB uses Mac `gh` login → ' + OWNER + '/' + REPO);
});
