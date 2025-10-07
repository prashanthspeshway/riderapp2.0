import { io } from 'socket.io-client';

function resolveBackendUrl() {
  const envUrl = process.env.REACT_APP_API_BASE || process.env.REACT_APP_BACKEND_URL;
  if (envUrl) return envUrl;
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    return `http://${hostname}:5000`;
  }
  return 'http://localhost:5000';
}

const socket = io(resolveBackendUrl(), {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

export default socket;