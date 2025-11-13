import { io } from 'socket.io-client';

function resolveBackendUrl() {
  const envUrl = process.env.REACT_APP_API_BASE || process.env.REACT_APP_BACKEND_URL;

  // If accessing via localhost, always use localhost backend
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    
    if (isLocalhost) {
      console.log("📍 Socket using localhost (http://localhost:5000)");
      return 'http://localhost:5000';
    }

    const isNgrokHost = /ngrok\-free\.app$/.test(hostname);

    // When accessing via ngrok, ALWAYS use relative paths so the proxy handles it
    if (protocol === 'https:' && isNgrokHost) {
      console.log("📍 Socket using ngrok proxy (relative paths)");
      return '';
    }

    // For local network access (192.168.x.x), use the same hostname with port 5000
    if (!envUrl && /^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname)) {
      const socketUrl = `http://${hostname}:5000`;
      console.log("📍 Socket using local network:", socketUrl);
      return socketUrl;
    }
  }

  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1') && !envUrl.includes('192.168')) {
    console.log("📍 Socket using environment URL:", envUrl);
    return envUrl;
  }

  console.log("📍 Socket using default localhost");
  return 'http://localhost:5000';
}

const socket = io(resolveBackendUrl(), {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  // Ensure correct path when connecting via dev proxy
  path: '/socket.io',
});

export default socket;