---
name: sharetribe-sso-implementation
description: |
  Guides implementation of OAuth2/OpenID Connect SSO providers for Sharetribe marketplaces.
  Use this skill when adding new SSO providers (Apple, GitHub, Twitter, etc.),
  fixing SSO authentication issues, or understanding SSO integration patterns.
  Covers Passport.js strategies, JWT token handling, and Sharetribe IdP integration.
---

# Sharetribe SSO Implementation Skill

This skill instructs Claude to implement OAuth2/OIDC Single Sign-On providers
following the established patterns in this Sharetribe marketplace codebase.

---

## 1. Purpose

Claude must treat SSO implementation as:

- **Pattern-based** - follow existing Microsoft/LinkedIn/Google implementations
- **Security-conscious** - handle tokens, secrets, and user data securely
- **Sharetribe-integrated** - work with Sharetribe's IdP authentication system
- **Environment-aware** - support both development and production configurations

---

## 2. Architecture Overview

Claude must understand the SSO architecture:

### Components
- **Passport.js Strategy** - handles OAuth flow with the provider
- **Verify Callback** - extracts user data from provider response
- **loginWithIdp** - delegates final authentication to Sharetribe SDK
- **idToken utility** - creates RS256-signed JWTs when needed

### File Structure
```
server/api/auth/
├── {provider}.js          # Provider-specific OAuth implementation
├── loginWithIdp.js        # Shared Sharetribe SDK integration
└── createUserWithIdp.js   # New user creation handler

server/api-util/
└── idToken.js             # JWT creation and OIDC endpoints
```

### Authentication Flow
1. User clicks SSO button → `authenticate{Provider}` initiates OAuth
2. Provider authenticates user → redirects to callback URL
3. `authenticate{Provider}Callback` receives tokens → extracts user data
4. `loginWithIdp` calls Sharetribe SDK → handles login or new user creation
5. User redirected to appropriate page based on result

---

## 3. Environment Variables Pattern

Claude must configure environment variables following this pattern:

### Required for All Providers
```
{PROVIDER}_CLIENT_ID        # OAuth client ID from provider
{PROVIDER}_CLIENT_SECRET    # OAuth client secret from provider
```

### For Providers Requiring Custom JWT (like Microsoft)
```
{PROVIDER}_PROXY_CLIENT_ID  # Sharetribe Console IdP client ID
{PROVIDER}_PROXY_IDP_ID     # Sharetribe Console IdP identifier
RSA_PRIVATE_KEY             # For signing custom JWTs
RSA_PUBLIC_KEY              # For JWKS endpoint
KEY_ID                      # Key identifier for JWT header
```

### Standard Environment Variables (already present)
```
REACT_APP_MARKETPLACE_ROOT_URL
REACT_APP_DEV_API_SERVER_PORT
NODE_ENV
```

---

## 4. Implementation Template

Claude must follow this structure when implementing new SSO providers:

### 4.1 Imports and Configuration

```javascript
const passport = require('passport');
const {Provider}Strategy = require('passport-{provider}');
const loginWithIdp = require('./loginWithIdp');
const jwt = require('jsonwebtoken'); // If decoding tokens

const radix = 10;
const PORT = parseInt(process.env.REACT_APP_DEV_API_SERVER_PORT, radix);
const rootUrl = process.env.REACT_APP_MARKETPLACE_ROOT_URL;
const clientID = process.env.{PROVIDER}_CLIENT_ID;
const clientSecret = process.env.{PROVIDER}_CLIENT_SECRET;
```

### 4.2 Callback URL Determination

```javascript
let callbackURL = null;
const useDevApiServer = process.env.NODE_ENV === 'development' && !!PORT;

if (useDevApiServer) {
  callbackURL = 'http://localhost:4000/api/auth/{provider}/callback';
} else {
  callbackURL = `${rootUrl}/api/auth/{provider}/callback`;
}

// Fallback for common development URL issue
if (callbackURL === 'http://localhost:3000/api/auth/{provider}/callback') {
  callbackURL = 'http://localhost:4000/api/auth/{provider}/callback';
}
```

### 4.3 Strategy Options

```javascript
const strategyOptions = {
  clientID,
  clientSecret,
  callbackURL,
  scope: ['openid', 'profile', 'email'], // Provider-specific
  passReqToCallback: true,
};
```

### 4.4 Verify Callback

```javascript
const verifyCallback = (req, accessToken, refreshToken, params, profile, done) => {
  // Parse state parameter (contains redirect info)
  const state = req.query.state;
  const queryParams = JSON.parse(state);
  const { from, defaultReturn, defaultConfirm, userType } = queryParams;

  // Extract user data (provider-specific)
  const { email, given_name, family_name, email_verified } = profile._json;
  // OR decode from id_token: jwt.decode(params.id_token)

  const userData = {
    email,
    firstName: given_name,
    lastName: family_name,
    emailVerified: email_verified,
    idpToken: params.id_token, // OR create custom JWT
    refreshToken,
    from,
    defaultReturn,
    defaultConfirm,
    userType,
  };

  done(null, userData);
};
```

### 4.5 Strategy Registration

```javascript
if (clientID) {
  passport.use(new {Provider}Strategy(strategyOptions, verifyCallback));
}
```

### 4.6 Exported Functions

```javascript
exports.authenticate{Provider} = (req, res, next) => {
  const { from, defaultReturn, defaultConfirm, userType } = req.query || {};
  const params = {
    ...(from ? { from } : {}),
    ...(defaultReturn ? { defaultReturn } : {}),
    ...(defaultConfirm ? { defaultConfirm } : {}),
    ...(userType ? { userType } : {}),
  };

  const paramsAsString = JSON.stringify(params);

  passport.authenticate('{provider}', {
    scope: ['openid', 'profile', 'email'],
    state: paramsAsString,
  })(req, res, next);
};

exports.authenticate{Provider}Callback = (req, res, next) => {
  const sessionFn = (err, user) => loginWithIdp(err, user, req, res, clientID, '{provider}');
  passport.authenticate('{provider}', sessionFn)(req, res, next);
};
```

---

## 5. Token Handling Rules

Claude must apply these rules for token handling:

### Direct Token Usage (LinkedIn, Google)
- When provider is registered as trusted IdP in Sharetribe Console
- Use provider's `id_token` directly as `idpToken`
- Simpler implementation, fewer dependencies

### Custom JWT Creation (Microsoft)
- When using proxy IdP or custom issuer
- Decode provider's token to extract claims
- Create new RS256-signed JWT using `createIdToken`
- Requires RSA key pair and OIDC discovery endpoints

### When to Use Custom JWT
- Provider not directly supported by Sharetribe
- Need to transform or augment claims
- Using multi-tenant Azure AD (common endpoint)
- Issuer URL doesn't match Sharetribe expectations

---

## 6. State Parameter Pattern

Claude must always pass these parameters via OAuth state:

| Parameter | Purpose |
|-----------|---------|
| `from` | Original page user came from (for redirect after login) |
| `defaultReturn` | Default page if `from` not specified |
| `defaultConfirm` | Page for new user confirmation flow |
| `userType` | Type of user being created (buyer, seller, etc.) |

### Implementation
```javascript
const paramsAsString = JSON.stringify(params);
passport.authenticate('{provider}', { state: paramsAsString })(req, res, next);

// In verify callback:
const queryParams = JSON.parse(req.query.state);
```

---

## 7. Route Registration

Claude must ensure routes are registered in the Express app:

```javascript
// In server/apiRouter.js or equivalent
const {provider} = require('./api/auth/{provider}');

router.get('/api/auth/{provider}', {provider}.authenticate{Provider});
router.get('/api/auth/{provider}/callback', {provider}.authenticate{Provider}Callback);
```

---

## 8. Sharetribe Console Configuration

Claude must remind users to configure Sharetribe Console:

1. **Create Identity Provider** in Console → Build → Identity Providers
2. **Set IdP Client ID** - matches `{PROVIDER}_PROXY_CLIENT_ID` or `{PROVIDER}_CLIENT_ID`
3. **Set IdP ID** - identifier used in `loginWithIdp` call
4. **Configure JWKS URL** - if using custom JWT: `{rootUrl}/.well-known/jwks.json`
5. **Set Issuer URL** - if using custom JWT: `{rootUrl}`

---

## 9. Error Handling

Claude must implement proper error handling:

### In Verify Callback
```javascript
try {
  const queryParams = JSON.parse(state);
  // ... rest of logic
} catch (err) {
  return done(new Error('Invalid state parameter'));
}
```

### loginWithIdp Handles
- Provider errors → sets `st-autherror` cookie, redirects to `/login`
- Missing user data → sets `st-autherror` cookie, redirects to `/login`
- New user → sets `st-authinfo` cookie, redirects to confirmation page
- Successful login → redirects to `from` or `/login`

---

## 10. Provider-Specific Notes

### Microsoft
- Uses generic `passport-oauth2` strategy
- Requires explicit `authorizationURL` and `tokenURL`
- Multi-tenant: use `/common/` in URLs
- Must create custom JWT due to issuer mismatch

### LinkedIn
- Uses `passport-linkedin-oauth2` strategy
- Supports OpenID Connect natively
- `id_token` can be used directly
- Profile fields: `id`, `first-name`, `last-name`, `email-address`

### Google
- Uses `passport-google-oauth` strategy
- Native OpenID Connect support
- `id_token` in `rawReturn` parameter
- Scopes include googleapis URLs

### Apple (if implementing)
- Uses `passport-apple` strategy
- Requires special callback handling (POST, not GET)
- User data only provided on first authorization
- Must store user data from initial response

### GitHub (if implementing)
- Uses `passport-github2` strategy
- Does NOT provide email by default
- Requires separate API call for email
- No native OpenID Connect

---

## 11. Testing Checklist

Claude should recommend testing:

- [ ] Login with existing user
- [ ] Login with new user (confirmation flow)
- [ ] Redirect after successful login (`from` parameter)
- [ ] Error handling for invalid/expired tokens
- [ ] Development vs production callback URLs
- [ ] Token expiration and refresh
- [ ] Missing/invalid state parameter

---

## 12. Activation Conditions

This skill must be applied when the user asks to:

- Add a new SSO provider (Apple, GitHub, Twitter, etc.)
- Fix SSO authentication issues
- Understand how SSO works in this codebase
- Configure Sharetribe IdP settings
- Debug OAuth callback errors
- Implement social login features

Keywords that trigger this skill:
SSO, OAuth, OIDC, OpenID, passport, social login, identity provider,
IdP, Microsoft login, LinkedIn login, Google login, Apple login,
authentication, loginWithIdp, idpToken, single sign-on

---

## 13. Conflict Resolution

This skill:

- Takes precedence over general authentication advice
- Yields to security-focused skills for vulnerability analysis
- Complements sharetribe-coding-standards for code style
- Works alongside code-analysis-optimizer for debugging

---

## End of Skill
