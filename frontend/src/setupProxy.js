const { createProxyMiddleware } = require('http-proxy-middleware');

// Get backend URL from environment or default to localhost
const getBackendUrl = () => {
  const envUrl = process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_BASE;
  
  // FORCE localhost:5000 - never use ngrok backend URL in proxy
  // The proxy runs on the dev server, so it can access localhost:5000 directly
  console.log('🔧 Proxy configured to use localhost:5000 (ignoring env URL if set)');
  return 'http://localhost:5000';
};

module.exports = function (app) {
  const backendUrl = getBackendUrl();
  
  console.log('🔧 ========================================');
  console.log('🔧 PROXY MIDDLEWARE LOADING');
  console.log('🔧 Backend URL:', backendUrl);
  console.log('🔧 ========================================');
  
  // Proxy REST API - MUST be before any other routes
  const apiProxy = createProxyMiddleware({
    target: backendUrl,
    changeOrigin: true,
    ws: true,
    secure: false,
    logLevel: 'info',
    // IMPORTANT: Preserve the '/api' prefix when forwarding to backend.
    // Express trims the mount path, so without this the backend sees '/otp/...'
    // instead of '/api/otp/...', which breaks route matching.
    pathRewrite: (path, req) => {
      // When mounted at '/api', Express strips the prefix.
      // Re-add it so backend receives '/api/...'
      const rewritten = `/api${path}`;
      return rewritten;
    },
    onProxyReq: (proxyReq, req, res) => {
      const forwardPath = req.originalUrl || req.url;
      console.log('➡️ PROXY: Forwarding', req.method, forwardPath, '→', backendUrl + forwardPath);
    },
    onProxyRes: (proxyRes, req, res) => {
      const forwardPath = req.originalUrl || req.url;
      console.log('⬅️ PROXY: Response', proxyRes.statusCode, 'for', forwardPath);
    },
    onError: (err, req, res) => {
      console.error('❌ PROXY ERROR:', err.message);
      console.error('❌ Request was:', req.method, req.url);
      console.error('❌ Backend URL:', backendUrl);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Proxy error: ' + err.message });
      }
    }
  });
  
  app.use('/api', apiProxy);
  console.log('✅ API proxy middleware registered at /api');

  // Proxy Socket.IO
  app.use(
    '/socket.io',
    createProxyMiddleware({
      target: backendUrl,
      changeOrigin: true,
      ws: true,
      secure: false,
      logLevel: 'info',
      // When mounted at '/socket.io', Express strips the prefix.
      // Re-add it so backend Socket.IO sees the correct path.
      pathRewrite: (path, req) => `/socket.io${path}`,
      onProxyReq: (proxyReq, req, res) => {
        console.log('➡️ Proxying Socket.IO request:', req.url, '→', backendUrl);
      },
      onError: (err, req, res) => {
        console.error('❌ Socket.IO proxy error:', err.message);
      }
    })
  );
  console.log('✅ Socket.IO proxy middleware registered at /socket.io');
};