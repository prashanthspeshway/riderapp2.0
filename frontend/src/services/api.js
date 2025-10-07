import axios from "axios";

const API_BASE = "http://localhost:5000"; // dev URL

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
      if (parsed && parsed.token) return parsed.token;
    }
  } catch (e) {}
  return localStorage.getItem("token") || null;
};

const attachToken = (config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

RIDER_API.interceptors.request.use(attachToken);
RIDES_API.interceptors.request.use(attachToken);
ADMIN_API.interceptors.request.use(attachToken);
RIDERS_API.interceptors.request.use(attachToken);

// Response interceptor for error handling
const handleResponseError = (error) => {
  if (error.response?.status === 401) {
    // Token expired or invalid
    localStorage.removeItem('auth');
    localStorage.removeItem('token');
    window.location.href = '/login';
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
export const getAllRiders = (status) => ADMIN_API.get(`/riders${status ? `?status=${status}` : ''}`);
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
  // Rider management
  updateRiderStatus: (riderId, data) => ADMIN_API.put(`/riders/${riderId}/status`, data),
  // Add the default axios instance for general API calls
  get: (url, config) => api.get(url, config),
  post: (url, data, config) => api.post(url, data, config),
  put: (url, data, config) => api.put(url, data, config),
  delete: (url, config) => api.delete(url, config),
};

export default apiService;
