# Token Demo - JWT Authentication with Axios

A complete authentication system implementing JWT access/refresh tokens with Express backend and Axios frontend configuration.

## Features

- **Access Tokens**: Short-lived (15 minutes) JWT tokens for API access
- **Refresh Tokens**: Long-lived (7 days) HttpOnly cookies for token renewal
- **Automatic Token Refresh**: Axios interceptors handle token renewal automatically
- **Secure Cookie Configuration**: HttpOnly, Secure, SameSite protection
- **CORS Support**: Cross-origin requests with credentials

## Setup Instructions

### Backend Setup

1. Navigate to server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm init -y
npm i express cors cookie-parser jsonwebtoken dotenv
```

3. Start the server:
```bash
node server.js
```

The server will run on `http://localhost:4000`

### Client Setup

1. Navigate to client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
npm i axios
```

3. Start the development server:
```bash
npm run dev
```

The client will run on `http://localhost:5173`

## API Endpoints

### Authentication Endpoints

- `POST /login` - Login with email/password
  - Body: `{ email: "jane@example.com", password: "pass123" }`
  - Returns: `{ accessToken, user }`
  - Sets refresh token as HttpOnly cookie

- `GET /refresh-token` - Get new access token using refresh cookie
  - Returns: `{ accessToken, user }`

- `POST /logout` - Logout and clear refresh cookie
  - Returns: `{ message: "Logged out" }`

### Protected Endpoints

- `GET /me` - Get current user info (requires Authorization header)
  - Headers: `Authorization: Bearer <accessToken>`
  - Returns: `{ me: userInfo }`

## How It Works

### Token Flow

1. **Login**: User submits credentials
   - Server validates and returns access token in JSON response
   - Server sets refresh token as HttpOnly cookie
   - Client stores access token in memory

2. **API Requests**: Client includes access token in Authorization header
   - Axios interceptor automatically adds `Bearer <token>` header
   - Server validates token and processes request

3. **Token Refresh**: When access token expires (401 response)
   - Axios interceptor automatically calls `/refresh-token`
   - Server uses HttpOnly refresh cookie to issue new access token
   - Original request is retried with new token

4. **Logout**: Client calls logout endpoint
   - Server clears refresh cookie
   - Client removes access token from memory

### Security Features

- **HttpOnly Cookies**: Refresh tokens cannot be accessed by JavaScript
- **Secure Flag**: Cookies only sent over HTTPS in production
- **SameSite**: Protection against CSRF attacks
- **Token Separation**: Access token (readable) vs Refresh token (HttpOnly)
- **Short Access Token Lifespan**: Minimizes exposure if compromised

## Demo User

For testing, use these credentials:
- **Email**: `jane@example.com`
- **Password**: `pass123`

## Environment Variables

Create a `.env` file in the server directory:

```env
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
ACCESS_TOKEN_SECRET=your-super-secret-access-token-key-change-in-production
REFRESH_TOKEN_SECRET=your-super-secret-refresh-token-key-change-in-production
ACCESS_TOKEN_EXPIRES=15m
REFRESH_TOKEN_EXPIRES=7d
```

## Production Tips

### Security Best Practices

1. **Use HTTPS Only**: Set `secure: true` in cookie configuration
   ```javascript
   res.cookie("refreshToken", token, {
     httpOnly: true,
     secure: true, // HTTPS only
     sameSite: "strict", // or "lax" for same-site
   });
   ```

2. **Rotate Secrets**: Generate strong, unique secrets and store outside source code
   ```bash
   # Generate secure secrets
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

3. **Token Expiration Strategy**:
   - **Access Token**: 5-15 minutes (balance security vs user experience)
   - **Refresh Token**: Days to weeks (based on security requirements)

4. **Add CSRF Protection**: If using non-JSON endpoints or same-site flows
   ```bash
   npm i csurf
   ```

5. **Replace In-Memory User**: Use a real database for user lookup
   ```javascript
   // Instead of DEMO_USER, use:
   const user = await User.findById(payload.id);
   ```

6. **Rate Limiting**: Implement rate limiting for auth endpoints
   ```bash
   npm i express-rate-limit
   ```

### Environment Configuration

- **Development**: HTTP with `secure: false`
- **Production**: HTTPS with `secure: true`, proper CORS origins
- **Staging**: Mirror production settings with test data

### Monitoring

- Log authentication attempts and failures
- Monitor token refresh patterns
- Set up alerts for suspicious activity
- Track token expiration patterns

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure `CLIENT_ORIGIN` matches your frontend URL
2. **Cookie Not Set**: Check `withCredentials: true` in Axios config
3. **401 on Refresh**: Verify refresh token cookie is being sent
4. **Token Decode Error**: Check JWT secrets match between sign/verify

### Debug Tips

- Check browser dev tools ’ Application ’ Cookies for refresh token
- Verify Authorization header in Network tab
- Console log token values (excluding secrets) for debugging