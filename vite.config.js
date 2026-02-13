import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import https from 'https'
import http from 'http'

// ============================================================
// Video Stream Proxy Plugin — mirip PHP ?action=proxy&url=...
// Proxy CDN URLs dengan inject Origin + Referer + Range support
// ============================================================
function videoProxyPlugin() {
  return {
    name: 'video-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.startsWith('/video-proxy')) return next()

        const reqUrl = new URL(req.url, 'http://localhost')
        const videoUrl = reqUrl.searchParams.get('url')

        if (!videoUrl) {
          res.statusCode = 400
          res.end('Missing url parameter')
          return
        }

        // CORS preflight
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Range')
          res.statusCode = 204
          res.end()
          return
        }

        try {
          const target = new URL(videoUrl)
          const isSecure = target.protocol === 'https:'
          const lib = isSecure ? https : http

          const options = {
            hostname: target.hostname,
            port: isSecure ? 443 : 80,
            path: target.pathname + target.search,
            method: req.method || 'GET',
            headers: {
              'Accept': '*/*',
              'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
              'Origin': 'https://themoviebox.org',
              'Referer': 'https://themoviebox.org/',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
            }
          }

          // Forward Range header for video seeking (penting untuk skip/seek)
          if (req.headers.range) {
            options.headers['Range'] = req.headers.range
          }

          const proxyReq = lib.request(options, (proxyRes) => {
            // CORS
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
            res.setHeader('Access-Control-Allow-Headers', 'Range')

            // Forward headers penting
            const fwd = ['content-type', 'content-length', 'content-range', 'accept-ranges']
            fwd.forEach(h => {
              if (proxyRes.headers[h]) res.setHeader(h, proxyRes.headers[h])
            })

            res.statusCode = proxyRes.statusCode
            proxyRes.pipe(res)
          })

          proxyReq.on('error', (err) => {
            console.error('Video proxy error:', err.message)
            if (!res.headersSent) {
              res.statusCode = 502
              res.end('Proxy error: ' + err.message)
            }
          })

          proxyReq.end()
        } catch (err) {
          res.statusCode = 400
          res.end('Invalid URL: ' + err.message)
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), videoProxyPlugin()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      // ── 1. Play API → https://themoviebox.org ──
      // Mirip PHP ?action=api (inject referer + cookie server-side)
      '/tmb-play': {
        target: 'https://themoviebox.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tmb-play/, '/wefeed-h5api-bff'),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const url = new URL(req.url, 'http://localhost')
            const detailPath = url.searchParams.get('detailPath') || ''
            const subjectId = url.searchParams.get('subjectId') || ''
            proxyReq.setHeader('referer', `https://themoviebox.org/movies/${detailPath}?id=${subjectId}&type=/movie/detail&detailSe=&detailEp=&lang=en`)
            proxyReq.setHeader('origin', 'https://themoviebox.org')
            proxyReq.setHeader('cookie', 'mb_token=%22eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOjU3MTE1NTI3MjA4MTc1ODY0MCwiYXRwIjozLCJleHQiOiIxNzcwNTk4MzIzIiwiZXhwIjoxNzc4Mzc0MzIzLCJpYXQiOjE3NzA1OTgwMjN9.SZ0lmOj426RgrU1R1dksiP_DtY1cCoC4s4r2YwpD-0c%22; i18n_lang=en')
            proxyReq.setHeader('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36')
            proxyReq.setHeader('x-client-info', '{"timezone":"Asia/Jakarta"}')
          })
        }
      },
      // ── 2. Caption/Subtitle API → https://h5-api.aoneroom.com ──
      // Mirip PHP ?action=subtitles (inject origin + referer server-side)
      '/h5-caption': {
        target: 'https://h5-api.aoneroom.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/h5-caption/, '/wefeed-h5api-bff'),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const url = new URL(req.url, 'http://localhost')
            const detailPath = url.searchParams.get('detailPath') || ''
            const subjectId = url.searchParams.get('subjectId') || ''
            proxyReq.setHeader('origin', 'https://themoviebox.org')
            proxyReq.setHeader('referer', `https://themoviebox.org/movies/${detailPath}?id=${subjectId}&type=/movie/detail&detailSe=&detailEp=&lang=en`)
            proxyReq.setHeader('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36')
            proxyReq.setHeader('x-client-info', '{"timezone":"Asia/Jakarta"}')
          })
        }
      }
      // ── 3. Video stream proxy → /video-proxy/?url=... ──
      // Handled by videoProxyPlugin() di atas (Range + Origin + Referer)
    }
  }
})
