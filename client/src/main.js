import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:4000",
  withCredentials: true, // send/receive cookies (refreshToken)
});

// Keep access token in memory
let accessToken = null;

// Attach Authorization automatically
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// On 401, try refresh once and retry request
let isRefreshing = false;
let queue = [];

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response && err.response.status === 401 && !original._retry) {
      original._retry = true;
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const { data } = await api.get("/refresh-token");
          accessToken = data.accessToken; // update memory token
          queue.forEach((cb) => cb(accessToken));
          queue = [];
          return api(original); // retry original
        } catch (e) {
          queue = [];
          throw e;
        } finally {
          isRefreshing = false;
        }
      }
      // if a refresh is in flight, wait for it
      return new Promise((resolve, reject) => {
        queue.push((newToken) => {
          original.headers.Authorization = `Bearer ${newToken}`;
          resolve(api(original));
        });
      });
    }
    throw err;
  }
);

// UI glue
const out = document.getElementById("out");
const log = (obj) => (out.textContent = JSON.stringify(obj, null, 2));

// Login → gets accessToken in JSON; refresh cookie is set HttpOnly automatically
document.getElementById("login").onclick = async () => {
  const { data } = await api.post("/login", {
    email: "jane@example.com",
    password: "pass123",
  });
  accessToken = data.accessToken; // readable in JS
  log({ message: "Logged in", user: data.user, accessToken: accessToken.slice(0, 20) + "..." });
};

// Protected call → uses Authorization header; if 401, interceptor refreshes
document.getElementById("me").onclick = async () => {
  try {
    const { data } = await api.get("/me");
    log(data);
  } catch (e) {
    log({ error: e.response?.data || e.message });
  }
};

// Logout → clears refresh cookie server-side; access token removed client-side
document.getElementById("logout").onclick = async () => {
  await api.post("/logout");
  accessToken = null;
  log({ message: "Logged out" });
};