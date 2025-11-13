// src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => {
    const saved = localStorage.getItem("auth");
    return saved ? JSON.parse(saved) : { token: null, user: null, roles: [] };
  });

  // 🚀 Normalize login payload
  const login = (data) => {
    const role = data.role || data.user?.role;
    const payload = {
      token: data.token,
      user: data.user,
      roles: data.roles || (role ? [role] : []), // always array
    };
    
    console.log("🔐 AuthContext - Saving auth data:", {
      hasToken: !!payload.token,
      tokenLength: payload.token?.length,
      userId: payload.user?._id,
      role: payload.user?.role
    });
    
    setAuth(payload);
    
    // Save to both new format (auth) and legacy format (token) for compatibility
    try {
      localStorage.setItem("auth", JSON.stringify(payload));
      if (payload.token) {
        localStorage.setItem("token", payload.token); // Legacy key for backward compatibility
      }
      console.log("✅ AuthContext - Auth data saved to localStorage");
    } catch (e) {
      console.error("❌ AuthContext - Failed to save to localStorage:", e);
    }
  };

  const logout = async () => {
    // If rider is logged in, set them offline before logging out
    const currentAuth = JSON.parse(localStorage.getItem("auth") || "{}");
    const isRider = currentAuth?.user?.role === "rider" || currentAuth?.roles?.includes("rider");
    const token = currentAuth?.token;
    
    if (isRider && token) {
      try {
        // Import API_BASE dynamically to avoid circular dependencies
        const API_BASE = process.env.REACT_APP_API_BASE || process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
        
        // Set rider offline before logging out
        await fetch(`${API_BASE}/api/rider/status`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ isOnline: false })
        });
        console.log("✅ Rider set offline before logout");
      } catch (error) {
        console.warn("⚠️ Could not set rider offline on logout:", error);
        // Continue with logout even if offline call fails
      }
    }
    
    setAuth({ token: null, user: null, roles: [] });
    localStorage.removeItem("auth");
    localStorage.removeItem("token"); // ✅ clear leftover from old AdminLogin
    localStorage.removeItem("activeRideId"); // ✅ ensure trip locks are cleared
  };

  // Sync auth state from localStorage on mount and when it changes
  useEffect(() => {
    const syncAuth = () => {
      try {
        const saved = localStorage.getItem("auth");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.token) {
            console.log("🔄 AuthContext - Syncing auth from localStorage");
            setAuth(parsed);
            // Also ensure legacy token key is set
            if (parsed.token) {
              localStorage.setItem("token", parsed.token);
            }
          }
        }
      } catch (e) {
        console.error("❌ AuthContext - Error syncing auth:", e);
      }
    };
    
    syncAuth();
    
    // Listen for storage changes (e.g., from other tabs)
    window.addEventListener('storage', syncAuth);
    return () => window.removeEventListener('storage', syncAuth);
  }, []);

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
