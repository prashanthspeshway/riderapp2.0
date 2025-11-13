import axios from "axios";

// Resolve API base dynamically to avoid hardcoded environments
function resolveApiBase() {
  const envBase = process.env.REACT_APP_API_BASE || process.env.REACT_APP_BACKEND_URL;

  // If accessing via localhost, always use localhost backend
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    
    if (isLocalhost) {
      console.log("📍 Using localhost API (http://localhost:5000)");
      return "http://localhost:5000";
    }

    const isNgrokHost = /ngrok\-free\.app$/.test(hostname);

    // When accessing via ngrok, ALWAYS use relative paths so the proxy handles it
    // This avoids CORS issues and ensures requests go through the dev server proxy
    if (protocol === 'https:' && isNgrokHost) {
      console.log("📍 Detected ngrok frontend, using proxy (relative paths)");
      return '';
    }

    // For local network access (192.168.x.x), use the same hostname with port 5000
    if (!envBase && /^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname)) {
      const apiUrl = `http://${hostname}:5000`;
      console.log("📍 Using local network API:", apiUrl);
      return apiUrl;
    }
  }

  if (envBase) {
    console.log("📍 Using environment API base:", envBase);
    return envBase;
  }

  console.log("📍 Using default localhost API");
  return "http://localhost:5000";
}

const API_BASE = resolveApiBase();
export { API_BASE };

const AUTH_API = axios.create({
  baseURL: `${API_BASE}/api/auth`,
  headers: { "Content-Type": "application/json" },
});
const OTP_API = axios.create({
  baseURL: `${API_BASE}/api/otp`,
  headers: { "Content-Type": "application/json" },
});
// ❌ removed "Content-Type" here, let browser decide
const RIDER_API = axios.create({
  baseURL: `${API_BASE}/api/rider`,
});
const ADMIN_API = axios.create({
  baseURL: `${API_BASE}/api/admin`,
  headers: { "Content-Type": "application/json" },
});
const RIDES_API = axios.create({
  baseURL: `${API_BASE}/api/rides`,
  headers: { "Content-Type": "application/json" },
});
const RIDERS_API = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { "Content-Type": "application/json" },
});

// helper: get token either from auth object or legacy token key
const getToken = () => {
  try {
    const authRaw = localStorage.getItem("auth");
    if (authRaw) {
      const parsed = JSON.parse(authRaw);
      if (parsed && parsed.token) {
        return parsed.token;
      }
    }
  } catch (e) {
    console.error("❌ getToken - Error parsing auth:", e);
  }
  
  // Fallback to legacy token key
  const legacyToken = localStorage.getItem("token");
  if (legacyToken) {
    return legacyToken;
  }
  
  return null;
};

const attachToken = (config) => {
  // Skip attaching token ONLY for admin login and OTP API endpoints
  const url = config?.url || "";
  const base = config?.baseURL || "";
  const isAdminLogin = base.includes("/api/admin") && url.startsWith("/login");
  const isOtpApi = base.includes("/api/otp");
  const shouldSkip = isAdminLogin || isOtpApi;
  if (shouldSkip) return config;
  
  const token = getToken();
  const isPublicEndpoint = base.includes("/api/otp") || base.includes("/api/auth");
  
  // CRITICAL: Block protected endpoint requests if no token
  if (!token || typeof token !== 'string' || token.length < 10) {
    if (!isPublicEndpoint) {
      console.error('❌ BLOCKING request - No valid token:', base + url);
      // Mark request as cancelled by adding a flag
      config._cancelRequest = true;
      config._cancelReason = 'No authentication token available';
      // Return config but the request will be handled in error handler
    }
  } else {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

// Request interceptor with cancellation check
const requestInterceptor = (config) => {
  const result = attachToken(config);
  // If request was marked for cancellation, reject it
  if (result._cancelRequest) {
    const error = new Error(result._cancelReason || 'Request cancelled');
    error.isCancel = true;
    return Promise.reject(error);
  }
  return result;
};

RIDER_API.interceptors.request.use(requestInterceptor);
RIDES_API.interceptors.request.use(requestInterceptor);
ADMIN_API.interceptors.request.use(requestInterceptor);
RIDERS_API.interceptors.request.use(requestInterceptor);

// Track failed auth attempts to prevent infinite logout loops
let consecutiveAuthFailures = 0;
const MAX_AUTH_FAILURES = 3; // Increased to 3 to be less aggressive

// Response interceptor for error handling
const handleResponseError = (error) => {
  const status = error.response?.status;
  const url = error.config?.url || "";
  const base = error.config?.baseURL || "";
  const currentPath = (typeof window !== 'undefined' && window.location?.pathname) || "";
  const isAuthFlow = base.includes("/api/otp") || base.includes("/api/auth") || (base.includes("/api/admin") && url.startsWith("/login"));
  const isOnLoginPage = ["/login", "/rider-login", "/admin"].includes(currentPath);

  // Log error details for debugging
  console.error('❌ API Error:', {
    status,
    url: base + url,
    message: error.message,
    response: error.response?.data,
    isNetworkError: !error.response
  });

  // Handle network errors (no response) - don't treat as auth error
  if (!error.response) {
    console.error('❌ Network error - API not reachable:', error.message);
    console.error('  - API Base URL:', API_BASE);
    console.error('  - Full URL:', base + url);
    consecutiveAuthFailures = 0; // Reset on network errors
    // Don't redirect on network errors, just reject
    return Promise.reject(error);
  }

  // Handle 401 errors more carefully
  if (status === 401 && !isAuthFlow && !isOnLoginPage) {
    const currentToken = getToken();
    
    // If there's no token at all, don't treat as auth failure - just a missing token
    if (!currentToken) {
      console.warn('⚠️ 401 but no token found - likely not logged in yet');
      consecutiveAuthFailures = 0; // Reset counter
      return Promise.reject(error);
    }
    
    consecutiveAuthFailures++;
    console.error(`❌ 401 Unauthorized (attempt ${consecutiveAuthFailures}/${MAX_AUTH_FAILURES})`);
    console.error('  - Error message:', error.response?.data?.message);
    console.error('  - Current token:', currentToken ? 'Present' : 'Missing');
    console.error('  - Token preview:', currentToken ? currentToken.substring(0, 20) + '...' : 'N/A');
    
    // Check if it's a token expiration or invalid token
    const errorMessage = error.response?.data?.message || '';
    const isTokenExpired = errorMessage.includes('expired') || errorMessage.includes('Token expired');
    const isInvalidToken = errorMessage.includes('Invalid token') || errorMessage.includes('token format') || errorMessage.includes('Authorization token missing');
    const isUserNotFound = errorMessage.includes('User not found') || errorMessage.includes('Rider not found');
    
    // Only logout if we have multiple consecutive failures OR it's clearly a token issue
    // But be more lenient - require 3 failures instead of 2
    if (consecutiveAuthFailures >= 3 || (isTokenExpired && consecutiveAuthFailures >= 2) || (isInvalidToken && consecutiveAuthFailures >= 2) || isUserNotFound) {
      console.error('❌ Multiple auth failures or token issue - logging out');
      consecutiveAuthFailures = 0; // Reset counter
      
      // Clear auth data
      localStorage.removeItem('auth');
      localStorage.removeItem('token');
      
      // Only redirect if not already on login page
      if (!isOnLoginPage) {
        // Use setTimeout to prevent redirect loops
        setTimeout(() => {
          const currentPath = window.location.pathname;
          if (!currentPath.includes('login') && !currentPath.includes('admin')) {
            window.location.href = '/rider-login';
          }
        }, 100);
      }
    } else {
      console.warn(`⚠️ Auth failure ${consecutiveAuthFailures}/${MAX_AUTH_FAILURES} - not logging out yet, will retry`);
    }
  } else if (status !== 401) {
    // Reset counter on non-401 errors
    consecutiveAuthFailures = 0;
  }
  
  return Promise.reject(error);
};

RIDER_API.interceptors.response.use(response => response, handleResponseError);
RIDES_API.interceptors.response.use(response => response, handleResponseError);
ADMIN_API.interceptors.response.use(response => response, handleResponseError);

// --- AUTH & RIDER APIs ---
export const signupUser = (formData) => AUTH_API.post("/signup-user", formData);

// ✅ FIXED: sends FormData correctly
export const signupRider = (formData) =>
  RIDER_API.post("/register", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const sendOtp = (mobile, role) => OTP_API.post("/send", { mobile, role });
export const verifyOtp = (mobile, otp, role) => OTP_API.post("/verify", { mobile, otp, role });
export const checkRiderApproval = (mobile) =>
  RIDER_API.get(`/check-approval/${mobile}`);

export const getRiderStatus = () => RIDER_API.get("/status");
export const uploadRiderDocs = (riderId, docs) =>
  RIDER_API.post(`/upload-docs/${riderId}`, docs, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// --- ADMIN APIs ---
export const loginAdmin = (data) => ADMIN_API.post("/login", data);
// Fix endpoint: backend exposes /api/riders under rider.routes with admin guard
export const getAllRiders = (status) => RIDERS_API.get(`/riders${status ? `?status=${status}` : ''}`);
export const getAllUsers = () => ADMIN_API.get("/users");

export const approveRider = (id) => ADMIN_API.post(`/captain/${id}/approve`);
export const rejectRider = (id) => ADMIN_API.post(`/captain/${id}/reject`);

export const getPendingCaptains = () => ADMIN_API.get("/pending-captains");
export const getCaptains = () => ADMIN_API.get("/captains");
export const getOverview = () => ADMIN_API.get("/overview");
export const getAllRides = () => ADMIN_API.get("/rides");

// --- RIDE APIs ---
export const createRide = (data) => RIDES_API.post("/create", data);
export const acceptRide = (rideId) => RIDES_API.post(`/${rideId}/accept`);
export const rejectRide = (rideId) => RIDES_API.post(`/${rideId}/reject`);
export const startRide = (rideId) => RIDES_API.post(`/${rideId}/start`);
export const completeRide = (rideId, data) => RIDES_API.post(`/${rideId}/complete`, data);
export const cancelRide = (rideId, reason) => RIDES_API.post(`/${rideId}/cancel`, { reason });
export const updateLocation = (data) => RIDES_API.post("/location", data);
export const getRideById = (rideId) => RIDES_API.get(`/${rideId}`);
export const getPendingRides = () => RIDES_API.get("/pending");
export const getRideHistory = (params) => RIDES_API.get("/history", { params });
export const getActiveRide = () => RIDES_API.get("/active");

// --- OTP APIs ---
export const verifyOTP = (rideId, otp) => RIDES_API.post("/verify-otp", { rideId, otp });
export const resendOTP = (rideId) => RIDES_API.post("/resend-otp", { rideId });

// --- 🚨 SOS APIs ---
export const sendSOS = (role, id) =>
  axios.post(
    `${API_BASE}/api/sos`,
    { role, id },
    { headers: { Authorization: `Bearer ${getToken()}` } }
  );

export const getSOSAlerts = () =>
  axios.get(`${API_BASE}/api/admin/sos-alerts`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });

export const resolveSOS = (id) =>
  axios.put(
    `${API_BASE}/api/admin/sos/${id}/resolve`,
    {},
    { headers: { Authorization: `Bearer ${getToken()}` } }
  );

// --- Vehicle Types ---
export const getVehicleTypes = () => axios.get(`${API_BASE}/api/vehicle-types`);

// Vehicle type specific APIs
export const getVehicleTypeStats = () => RIDERS_API.get('/riders/stats/vehicle-types');
export const getRidersByVehicleType = (vehicleType, params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return RIDERS_API.get(`/riders/vehicle-type/${vehicleType}${queryString ? `?${queryString}` : ''}`);
};

// Create a default API instance with token handling
const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(attachToken);
api.interceptors.response.use(response => response, handleResponseError);

// Create the default export with all methods
const apiService = {
  signupUser,
  signupRider,
  sendOtp,
  verifyOtp,
  checkRiderApproval,
  getRiderStatus,
  uploadRiderDocs,
  loginAdmin,
  getAllRiders,
  approveRider,
  rejectRider,
  getPendingCaptains,
  getCaptains,
  getOverview,
  getAllRides,
  createRide,
  acceptRide,
  rejectRide,
  startRide,
  completeRide,
  cancelRide,
  updateLocation,
  getRideById,
  getPendingRides,
  getRideHistory,
  verifyOTP,
  resendOTP,
  sendSOS,
  getSOSAlerts,
  resolveSOS,
  getAllUsers,
  getVehicleTypes,
  getVehicleTypeStats,
  getRidersByVehicleType,
  // Rider management
  updateRiderStatus: (riderId, data) => ADMIN_API.put(`/riders/${riderId}/status`, data),
  // Add the default axios instance for general API calls
  get: (url, config) => api.get(url, config),
  post: (url, data, config) => api.post(url, data, config),
  put: (url, data, config) => api.put(url, data, config),
  delete: (url, config) => api.delete(url, config),
};

export default apiService;
