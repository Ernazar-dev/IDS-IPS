import { useState, useEffect, useCallback, createContext, useContext } from "react";
import axios from "axios";
import { API_URL, TOKEN_KEY, REFRESH_KEY, USER_KEY } from "../config";

export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10_000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failedQueue  = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      const refreshToken = localStorage.getItem(REFRESH_KEY);
      if (!refreshToken) {
        isRefreshing = false;
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(error);
      }
      try {
        const res = await axios.post(`${API_URL}/auth/refresh`, {}, {
          headers: { Authorization: `Bearer ${refreshToken}` },
        });
        const { access_token } = res.data;
        localStorage.setItem(TOKEN_KEY, access_token);
        api.defaults.headers.Authorization = `Bearer ${access_token}`;
        processQueue(null, access_token);
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }

    api.get("/auth/me")
      .then((res) => {
        setUser(res.data);
        localStorage.setItem(USER_KEY, JSON.stringify(res.data));
      })
      .catch((err) => {
        const status = err.response?.status;
        // Faqat token yaroqsiz yoki noto'g'ri bo'lganda logout qilish
        // 403 (blacklisted), network xato va boshqalar logout qilmasin
        if (status === 401 || status === 422) {
          localStorage.clear();
          setUser(null);
        }
        // Boshqa xatolarda localStorage dagi user saqlanib qoladi
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await axios.post(`${API_URL}/auth/login`, { username, password });
    const { access_token, refresh_token, user: userData } = res.data;
    localStorage.setItem(TOKEN_KEY,   access_token);
    localStorage.setItem(REFRESH_KEY, refresh_token);
    localStorage.setItem(USER_KEY,    JSON.stringify(userData));
    api.defaults.headers.Authorization = `Bearer ${access_token}`;
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated: !!user,
      isAdmin: user?.is_admin || false,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
