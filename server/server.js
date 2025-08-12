import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cookieParser());

// CORS for credentialed requests
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true, // allow cookies
  })
);

// --- In‑memory demo user ---
const DEMO_USER = { id: 1, name: "Jane", email: "jane@example.com", password: "pass123" };

// Helpers
function signAccessToken(payload) {
  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES || "15m",
  });
}
function signRefreshToken(payload) {
  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES || "7d",
  });
}

function setRefreshCookie(res, token) {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: true, // set to true in production (HTTPS); for local HTTPS via vite use true
    sameSite: "none", // "none" for cross-site (5173 → 4000)
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

// --- Auth routes ---
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (email !== DEMO_USER.email || password !== DEMO_USER.password) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const userPayload = { id: DEMO_USER.id, email: DEMO_USER.email, name: DEMO_USER.name };
  const accessToken = signAccessToken(userPayload);
  const refreshToken = signRefreshToken({ id: DEMO_USER.id });
  setRefreshCookie(res, refreshToken);
  // Return accessToken in JSON (readable by frontend) while refresh is HttpOnly cookie
  return res.json({ accessToken, user: userPayload });
});

app.post("/logout", (req, res) => {
  res.clearCookie("refreshToken", { path: "/" });
  res.json({ message: "Logged out" });
});

// Refresh endpoint returns a new access token if refresh cookie valid
app.get("/refresh-token", (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ message: "No refresh token" });
  try {
    const payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    // Look up user if needed; here we trust the id
    const userPayload = { id: DEMO_USER.id, email: DEMO_USER.email, name: DEMO_USER.name };
    const accessToken = signAccessToken(userPayload);
    return res.json({ accessToken, user: userPayload });
  } catch (e) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
});

// Middleware to protect routes with access token
function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Missing access token" });
  try {
    const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ message: "Access token expired or invalid" });
  }
}

app.get("/me", requireAuth, (req, res) => {
  res.json({ me: req.user });
});

app.listen(process.env.PORT, () => {
  console.log(`Auth server running on http://localhost:${process.env.PORT}`);
});