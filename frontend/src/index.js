import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { CacheProvider } from "@emotion/react";
import createEmotionCache from "./muiCache";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import "./index.css";  

const root = ReactDOM.createRoot(document.getElementById("root"));
const emotionCache = createEmotionCache();

root.render(
  <React.StrictMode>
    <CacheProvider value={emotionCache}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </CacheProvider>
  </React.StrictMode>
);
