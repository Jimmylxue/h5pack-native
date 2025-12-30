const http = require('http');
try {
  require('dotenv').config();
} catch (_) {}
const fs = require('fs');
const path = require('path');
const url = require('url');

const root = path.resolve(process.cwd(), 'public/webview/dist');
const portArg = process.env.PORT || process.env.APP_WEBVIEW_DEV_PORT;
const port = Number(
  process.argv.find(a => a.startsWith('--port='))?.split('=')[1] ||
    portArg ||
    9999,
);

const types = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.map': 'application/octet-stream',
};

// --- Live Reload Logic ---
const clients = new Set();

const injectScript = `
<script>
  (function() {
    console.log('[WebView Dev] Connecting to live reload server...');
    const es = new EventSource('/livereload');
    es.onmessage = function(e) {
      console.log('[WebView Dev] Change detected, reloading...');
      window.location.reload();
    };
    es.onerror = function() {
      console.log('[WebView Dev] Connection lost, reconnecting...');
    };
  })();
</script>
`;

// Watch for changes
let debounceTimer;
const watchDir = dir => {
  try {
    fs.watch(dir, {recursive: true}, (eventType, filename) => {
      if (!filename) return;
      // Ignore hidden files or temp files if needed
      if (filename.startsWith('.')) return;

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        console.log(
          `[WebView Dev] File changed: ${filename}, reloading clients...`,
        );
        clients.forEach(res => res.write(`data: reload\n\n`));
      }, 100);
    });
    console.log(`[WebView Dev] Watching ${dir} for changes...`);
  } catch (e) {
    console.error(`[WebView Dev] Failed to watch ${dir}:`, e.message);
  }
};

if (fs.existsSync(root)) {
  watchDir(root);
} else {
  console.warn(
    `[WebView Dev] Warning: ${root} does not exist yet. Live reload may not work until restart.`,
  );
}

const server = http.createServer((req, res) => {
  const reqUrl = url.parse(req.url).pathname || '/';

  // Handle SSE endpoint
  if (reqUrl === '/livereload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write('retry: 2000\n\n'); // Reconnect every 2s if lost
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  let filePath = path.join(root, reqUrl);

  const serveFile = (targetPath, contentType) => {
    // If HTML, read and inject script
    if (contentType === 'text/html') {
      fs.readFile(targetPath, 'utf8', (err, data) => {
        if (err) {
          res.statusCode = 500;
          res.end('Internal Server Error');
          return;
        }
        res.setHeader('Content-Type', contentType);
        // Inject before closing body tag, or append if not found
        let html = data;
        if (html.includes('</body>')) {
          html = html.replace('</body>', `${injectScript}</body>`);
        } else {
          html += injectScript;
        }
        res.end(html);
      });
    } else {
      // Stream other files
      const stream = fs.createReadStream(targetPath);
      stream.on('error', () => {
        res.statusCode = 500;
        res.end('Internal Server Error');
      });
      stream.once('open', () => {
        res.setHeader('Content-Type', contentType);
      });
      stream.pipe(res);
    }
  };

  const tryServe = targetPath => {
    const ext = path.extname(targetPath).toLowerCase();
    const contentType = types[ext] || 'application/octet-stream';
    serveFile(targetPath, contentType);
  };

  const serveFallbackIndex = () => {
    const fallback = path.join(root, 'index.html');
    fs.access(fallback, fs.constants.R_OK, accessErr => {
      if (accessErr) {
        res.statusCode = 404;
        res.end('Not Found');
      } else {
        serveFile(fallback, 'text/html');
      }
    });
  };

  if (filePath.endsWith(path.sep)) {
    filePath = path.join(filePath, 'index.html');
  }

  fs.stat(filePath, (err, stat) => {
    if (!err) {
      if (stat.isFile()) {
        tryServe(filePath);
        return;
      }
      if (stat.isDirectory()) {
        const idx = path.join(filePath, 'index.html');
        fs.access(idx, fs.constants.R_OK, accessErr => {
          if (!accessErr) {
            tryServe(idx);
          } else {
            serveFallbackIndex();
          }
        });
        return;
      }
    }
    // If request has no extension, treat as SPA route and serve index.html
    const hasExt = path.extname(reqUrl) !== '';
    if (!hasExt) {
      serveFallbackIndex();
    } else {
      res.statusCode = 404;
      res.end('Not Found');
    }
  });
});

server.listen(port, () => {
  console.log(`WebView dev server running at http://localhost:${port}/`);
  console.log(`Serving ${root}`);
  console.log(`Live reload enabled`);
});
