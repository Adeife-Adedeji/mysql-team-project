const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");
const querystring = require("querystring");
const Busboy = require("busboy");

const sessions = new Map();

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function createNodeApp({ publicDir, sessionSecret, uploadDir }) {
  const routes = [];
  let notFoundHandler = null;
  let errorHandler = null;

  const app = {
    get(routePath, ...handlers) {
      routes.push(createRoute("GET", routePath, handlers));
    },
    post(routePath, ...handlers) {
      routes.push(createRoute("POST", routePath, handlers));
    },
    setNotFound(handler) {
      notFoundHandler = handler;
    },
    setErrorHandler(handler) {
      errorHandler = handler;
    },
    listen(port, callback) {
      const server = http.createServer((req, res) => {
        handleRequest(req, enhanceResponse(res), {
          publicDir,
          routes,
          notFoundHandler,
          errorHandler,
          sessionSecret,
        });
      });
      return server.listen(port, callback);
    },
  };

  return {
    app,
    upload: createUpload({ uploadDir }),
  };
}

function createRoute(method, routePath, handlers) {
  return {
    method,
    routePath,
    handlers,
    match: compileRoute(routePath),
  };
}

function compileRoute(routePath) {
  const keys = [];
  const pattern = routePath
    .split("/")
    .map((part) => {
      if (!part) return "";
      if (part.startsWith(":")) {
        keys.push(part.slice(1));
        return "([^/]+)";
      }
      return escapeRegExp(part);
    })
    .join("/");
  const regex = new RegExp(`^${pattern}/?$`);

  return (pathname) => {
    const match = regex.exec(pathname);
    if (!match) return null;
    return keys.reduce((params, key, index) => {
      params[key] = decodeURIComponent(match[index + 1]);
      return params;
    }, {});
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function handleRequest(req, res, context) {
  try {
    const requestUrl = new URL(req.url, "http://localhost");
    req.path = requestUrl.pathname;
    req.query = parseSearchParams(requestUrl.searchParams);
    req.params = {};
    req.body = {};

    if (await serveStatic(req, res, context.publicDir)) return;

    attachSession(req, res, context.sessionSecret);

    const route = findRoute(context.routes, req.method, req.path);
    if (!route) {
      return runNotFound(context.notFoundHandler, req, res);
    }

    req.params = route.params;
    if (shouldParseBody(req)) {
      req.body = await parseRequestBody(req);
    }

    runHandlers(route.handlers, req, res, (error) => {
      if (error) {
        runError(context.errorHandler, error, req, res);
      }
    });
  } catch (error) {
    runError(context.errorHandler, error, req, res);
  }
}

function findRoute(routes, method, pathname) {
  for (const route of routes) {
    if (route.method !== method) continue;
    const params = route.match(pathname);
    if (params) {
      return { ...route, params };
    }
  }
  return null;
}

function runHandlers(handlers, req, res, done) {
  let index = 0;

  function next(error) {
    if (error) return done(error);
    if (res.writableEnded) return;

    const handler = handlers[index];
    index += 1;

    if (!handler) return done();

    try {
      const result = handler(req, res, next);
      if (result && typeof result.then === "function") {
        result.catch(next);
      }
    } catch (handlerError) {
      next(handlerError);
    }
  }

  next();
}

function runNotFound(handler, req, res) {
  if (handler) {
    return handler(req, res);
  }
  res.status(404).send("Not Found");
}

function runError(handler, error, req, res) {
  if (res.writableEnded) {
    return;
  }
  if (handler) {
    return handler(error, req, res, () => {});
  }
  console.error(error);
  res.status(500).send("Unexpected error.");
}

function enhanceResponse(res) {
  res.status = function status(code) {
    res.statusCode = code;
    return res;
  };

  res.send = function send(body) {
    if (res.writableEnded) return;
    if (body === undefined || body === null) {
      body = "";
    }
    if (Buffer.isBuffer(body)) {
      res.end(body);
      return;
    }
    if (typeof body === "object") {
      return res.json(body);
    }
    if (!res.getHeader("Content-Type")) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
    }
    res.end(String(body));
  };

  res.json = function json(body) {
    if (res.writableEnded) return;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(body));
  };

  res.redirect = function redirect(target) {
    if (res.writableEnded) return;
    res.statusCode = res.statusCode >= 300 && res.statusCode < 400 ? res.statusCode : 302;
    res.setHeader("Location", target);
    res.end(`Redirecting to ${target}`);
  };

  return res;
}

function parseSearchParams(searchParams) {
  const query = {};
  for (const [key, value] of searchParams.entries()) {
    addFormValue(query, key, value);
  }
  return query;
}

function shouldParseBody(req) {
  if (!["POST", "PUT", "PATCH"].includes(req.method)) return false;
  const contentType = req.headers["content-type"] || "";
  return !contentType.startsWith("multipart/form-data");
}

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 10 * 1024 * 1024) {
        reject(new Error("Request body is too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      const rawBody = Buffer.concat(chunks).toString("utf8");
      const contentType = req.headers["content-type"] || "";
      if (contentType.includes("application/json")) {
        resolve(rawBody ? JSON.parse(rawBody) : {});
        return;
      }
      resolve(querystring.parse(rawBody));
    });

    req.on("error", reject);
  });
}

function createUpload({ uploadDir }) {
  return {
    single(fieldName) {
      return (req, res, next) => {
        parseMultipart(req, { uploadDir, fieldName })
          .then(() => next())
          .catch(next);
      };
    },
  };
}

function parseMultipart(req, { uploadDir, fieldName }) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers["content-type"] || "";
    if (!contentType.startsWith("multipart/form-data")) {
      req.body = req.body || {};
      req.file = undefined;
      resolve();
      return;
    }

    fs.mkdirSync(uploadDir, { recursive: true });
    req.body = {};
    req.file = undefined;

    const busboy = Busboy({
      headers: req.headers,
      limits: { fileSize: 5 * 1024 * 1024 },
    });

    let pendingFiles = 0;
    let parsingFinished = false;
    let rejected = false;

    function maybeResolve() {
      if (!rejected && parsingFinished && pendingFiles === 0) {
        resolve();
      }
    }

    busboy.on("field", (name, value) => {
      addFormValue(req.body, name, value);
    });

    busboy.on("file", (name, file, info) => {
      const originalname = path.basename(info.filename || "");
      if (name !== fieldName || !originalname) {
        file.resume();
        return;
      }

      if (!String(info.mimeType || "").startsWith("image/")) {
        rejected = true;
        file.resume();
        reject(new Error("Only image files are allowed."));
        return;
      }

      const ext = path.extname(originalname).toLowerCase();
      const filename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
      const destination = path.join(uploadDir, filename);
      pendingFiles += 1;

      const stream = fs.createWriteStream(destination);
      let size = 0;

      file.on("data", (chunk) => {
        size += chunk.length;
      });
      file.on("limit", () => {
        rejected = true;
        stream.destroy();
        fs.rm(destination, { force: true }, () => {});
        reject(new Error("File is too large."));
      });
      file.on("error", reject);
      stream.on("error", reject);
      stream.on("close", () => {
        if (!rejected) {
          req.file = {
            fieldname: name,
            originalname,
            encoding: info.encoding,
            mimetype: info.mimeType,
            destination: uploadDir,
            filename,
            path: destination,
            size,
          };
        }
        pendingFiles -= 1;
        maybeResolve();
      });

      file.pipe(stream);
    });

    busboy.on("error", reject);
    busboy.on("finish", () => {
      parsingFinished = true;
      maybeResolve();
    });

    req.pipe(busboy);
  });
}

function addFormValue(target, key, value) {
  if (Object.prototype.hasOwnProperty.call(target, key)) {
    if (Array.isArray(target[key])) {
      target[key].push(value);
    } else {
      target[key] = [target[key], value];
    }
    return;
  }
  target[key] = value;
}

async function serveStatic(req, res, publicDir) {
  if (req.method !== "GET" && req.method !== "HEAD") return false;

  const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const requestedPath = pathname === "/" ? "" : pathname.slice(1);
  const filePath = path.resolve(publicDir, requestedPath);
  const rootPath = path.resolve(publicDir);

  if (!filePath.startsWith(rootPath + path.sep)) return false;

  try {
    const stats = await fs.promises.stat(filePath);
    if (!stats.isFile()) return false;

    const ext = path.extname(filePath).toLowerCase();
    res.statusCode = 200;
    res.setHeader("Content-Type", MIME_TYPES[ext] || "application/octet-stream");
    res.setHeader("Content-Length", stats.size);

    if (req.method === "HEAD") {
      res.end();
      return true;
    }

    fs.createReadStream(filePath).pipe(res);
    return true;
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return false;
    throw error;
  }
}

function attachSession(req, res, secret) {
  const cookies = parseCookies(req.headers.cookie || "");
  let sid = verifySessionId(cookies.sid, secret);
  let isNew = false;

  if (!sid || !sessions.has(sid)) {
    sid = crypto.randomBytes(24).toString("hex");
    sessions.set(sid, {});
    isNew = true;
  }

  const session = sessions.get(sid);
  Object.defineProperty(session, "destroy", {
    configurable: true,
    enumerable: false,
    value(callback) {
      sessions.delete(sid);
      res.setHeader("Set-Cookie", "sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
      if (typeof callback === "function") callback();
    },
  });

  req.session = session;

  if (isNew) {
    res.setHeader("Set-Cookie", `sid=${signSessionId(sid, secret)}; Path=/; HttpOnly; SameSite=Lax`);
  }
}

function parseCookies(header) {
  return header.split(";").reduce((cookies, part) => {
    const [name, ...valueParts] = part.trim().split("=");
    if (!name) return cookies;
    cookies[name] = decodeURIComponent(valueParts.join("="));
    return cookies;
  }, {});
}

function signSessionId(sid, secret) {
  const signature = crypto.createHmac("sha256", secret).update(sid).digest("base64url");
  return `${sid}.${signature}`;
}

function verifySessionId(value, secret) {
  if (!value) return null;
  const [sid, signature] = value.split(".");
  if (!sid || !signature) return null;
  const expected = signSessionId(sid, secret).split(".")[1];
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return null;
  return crypto.timingSafeEqual(actualBuffer, expectedBuffer) ? sid : null;
}

module.exports = { createNodeApp };
