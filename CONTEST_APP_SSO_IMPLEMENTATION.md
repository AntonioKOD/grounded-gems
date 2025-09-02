# Contest App SSO Implementation

## Overview
Successfully implemented user session management with iron-session and SSO integration with the core Sacavia app for seamless authentication.

## Implementation Details

### **Session Management (`/lib/session.ts`)**

#### **Iron Session Configuration**
```typescript
export const ironOptions = {
  cookieName: 'contest_sess',
  password: process.env.SESSION_PASSWORD,
  ttl: 7 * 24 * 60 * 60, // 7 days
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    httpOnly: true,
  },
};
```

#### **Session Functions**
- **`getSession()`**: Retrieve or create session
- **`setUserId()`**: Set user ID in session
- **`clearSession()`**: Clear user session
- **`requireUser()`**: Require authentication (throws error if not logged in)
- **`isAuthenticated()`**: Check if user is authenticated
- **`getCurrentUserId()`**: Get current user ID if authenticated

### **SSO Integration (`/lib/sso.ts`)**

#### **JWT Verification**
```typescript
export async function verifyCoreSSO(token: string): Promise<SSOVerificationResult> {
  const decoded = jwt.verify(token, SSO_JWT_SECRET, {
    algorithms: ['HS256'],
    issuer: process.env.SSO_ISSUER || 'sacavia-core',
    audience: process.env.SSO_AUDIENCE || 'sacavia-contest',
  }) as SSOTokenPayload;
  
  return { sub: decoded.sub, isValid: true };
}
```

#### **SSO Features**
- **Token Verification**: HS256 JWT with configurable issuer/audience
- **Error Handling**: Comprehensive JWT error handling
- **Configuration Validation**: Environment variable validation
- **Token Creation**: For testing and development purposes

### **Authentication Routes**

#### **Auth Callback (`/app/auth/callback/route.ts`)**
- **GET Method**: Receives `?token` and optional `?redirectTo`
- **Token Verification**: Verifies SSO token from core app
- **Session Creation**: Sets user ID in session
- **Redirect Handling**: Redirects to intended destination or home

#### **Logout (`/app/auth/logout/route.ts`)**
- **POST/GET Methods**: Clears user session
- **Redirect Support**: Optional redirect after logout
- **Error Handling**: Graceful fallback on errors

#### **Auth Status (`/app/auth/me/route.ts`)**
- **GET Method**: Returns current authentication status
- **User Information**: Provides user details if authenticated
- **Session Data**: Includes session metadata

### **Client Components**

#### **Login to Vote Button (`/components/auth/login-to-vote-button.tsx`)**
```typescript
export function LoginToVoteButton({ variant, size, children }) {
  const handleLoginClick = () => {
    const returnTo = `${contestAppUrl}${pathname}`;
    const loginUrl = `${coreAppUrl}/login?returnTo=${encodeURIComponent(returnTo)}`;
    window.open(loginUrl, '_blank') || window.location.href = loginUrl;
  };
  
  return (
    <Button onClick={handleLoginClick} variant={variant} size={size}>
      <LogIn className="w-4 h-4" />
      {children || 'Login to Vote'}
    </Button>
  );
}
```

#### **Button Variants**
- **`LoginToVoteButton`**: Standard login button with LogIn icon
- **`VoteLoginButton`**: Alternative with Vote icon
- **`LoginToVoteLink`**: Simple text link version

### **Authentication Hooks**

#### **useAuth Hook (`/hooks/use-auth.ts`)**
```typescript
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const checkAuth = useCallback(async () => { /* ... */ }, []);
  const login = useCallback((redirectTo?: string) => { /* ... */ }, [pathname]);
  const logout = useCallback(async (redirectTo?: string) => { /* ... */ }, [router]);
  const requireAuth = useCallback((redirectTo?: string) => { /* ... */ }, [authState, login]);

  return { ...authState, login, logout, requireAuth, checkAuth };
}
```

#### **useRequireAuth Hook**
- **Route Protection**: Automatically redirects unauthenticated users
- **Loading States**: Handles authentication check loading
- **Configurable Redirects**: Custom redirect destinations

## Authentication Flow

### **1. User Attempts to Vote**
```
User clicks vote → Check authentication → Not logged in → Show "Login to Vote" button
```

### **2. Login Process**
```
Click "Login to Vote" → Redirect to core app login → User logs in → Core app generates SSO token
```

### **3. SSO Callback**
```
Core app redirects to /auth/callback?token=xxx → Verify JWT token → Create session → Redirect to original page
```

### **4. Voting Success**
```
User is now authenticated → Can vote successfully → Session persists for 7 days
```

## Environment Configuration

### **Required Variables**
```bash
# Session Management
SESSION_PASSWORD=your-super-secure-session-password-at-least-32-characters-long

# SSO Configuration
SSO_JWT_SECRET=your-sso-jwt-secret-shared-with-core-app
SSO_ISSUER=sacavia-core
SSO_AUDIENCE=sacavia-contest
```

### **Security Requirements**
- **SESSION_PASSWORD**: Minimum 32 characters, cryptographically secure
- **SSO_JWT_SECRET**: Shared secret between core app and contest app
- **Production**: Secure cookies, HTTPS only

## Security Features

### **Session Security**
- **Iron Session**: Encrypted, tamper-proof session storage
- **HTTP Only Cookies**: Prevents XSS attacks
- **Secure Cookies**: HTTPS only in production
- **SameSite Policy**: CSRF protection

### **JWT Security**
- **Algorithm Restriction**: HS256 only
- **Issuer/Audience Validation**: Prevents token misuse
- **Expiration Checking**: Automatic token expiry
- **Secret Rotation**: Configurable JWT secrets

### **CORS & Origin Protection**
- **Origin Validation**: Only allows core app origin
- **Redirect Validation**: Prevents open redirects
- **Token Validation**: Comprehensive JWT verification

## Integration Points

### **Core App Integration**
- **Login Redirect**: Seamless redirect to core app login
- **Return URL**: Automatic return to contest app after login
- **Token Exchange**: Secure JWT token verification
- **Session Sync**: Consistent authentication state

### **Contest App Features**
- **Voting Protection**: Requires authentication for voting
- **User Experience**: Smooth login flow without losing context
- **Session Persistence**: 7-day session duration
- **Error Handling**: Graceful fallbacks for auth failures

## Usage Examples

### **Protecting Voting Actions**
```typescript
import { useAuth } from '@/hooks/use-auth';

function VoteButton({ entryId }) {
  const { isAuthenticated, login } = useAuth();
  
  const handleVote = () => {
    if (!isAuthenticated) {
      login(); // Redirects to core app login
      return;
    }
    
    // Proceed with voting
    submitVote(entryId);
  };
  
  return (
    <Button onClick={handleVote}>
      {isAuthenticated ? 'Vote' : 'Login to Vote'}
    </Button>
  );
}
```

### **Route Protection**
```typescript
import { useRequireAuth } from '@/hooks/use-auth';

function ProtectedPage() {
  const { isAuthenticated, isLoading } = useRequireAuth('/login');
  
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return null; // Will redirect
  
  return <ProtectedContent />;
}
```

### **Login Button Integration**
```typescript
import { LoginToVoteButton } from '@/components/auth/login-to-vote-button';

function ContestEntry({ entry }) {
  return (
    <div>
      <h3>{entry.title}</h3>
      <LoginToVoteButton variant="outline" size="sm">
        Login to Vote
      </LoginToVoteButton>
    </div>
  );
}
```

## Testing & Validation

### **Session Testing**
1. **Login Flow**: Test complete SSO flow
2. **Session Persistence**: Verify 7-day session duration
3. **Logout Flow**: Test session clearing
4. **Error Scenarios**: Invalid tokens, expired sessions

### **Security Testing**
1. **Token Validation**: Invalid JWT handling
2. **Session Security**: Cookie tampering attempts
3. **CORS Validation**: Origin restriction testing
4. **Redirect Security**: Open redirect prevention

## Dependencies Added

### **Production Dependencies**
- **iron-session**: Secure session management
- **jsonwebtoken**: JWT verification and creation

### **Development Dependencies**
- **@types/jsonwebtoken**: TypeScript types for JWT

## Next Steps

### **Immediate Actions**
1. **Install Dependencies**: Run `npm install` to add new packages
2. **Environment Setup**: Configure session and SSO variables
3. **Core App Integration**: Ensure SSO JWT secret is shared
4. **Testing**: Validate complete authentication flow

### **Future Enhancements**
1. **Session Refresh**: Automatic session extension
2. **Multi-Device Sync**: Consistent auth across devices
3. **Advanced Security**: Rate limiting, audit logging
4. **User Profile**: Extended user information display

## Files Created/Modified

### **New Files**
- `lib/session.ts` - Session management with iron-session
- `lib/sso.ts` - SSO JWT verification
- `app/auth/callback/route.ts` - SSO callback handler
- `app/auth/logout/route.ts` - Logout handler
- `app/auth/me/route.ts` - Authentication status endpoint
- `components/auth/login-to-vote-button.tsx` - Login button components
- `components/ui/button.tsx` - Button UI component
- `lib/utils.ts` - Utility functions
- `hooks/use-auth.ts` - Authentication hooks

### **Modified Files**
- `package.json` - Added iron-session and jsonwebtoken dependencies
- `env.example` - Added session and SSO configuration

## Compliance & Standards

- **Security**: Industry-standard session and JWT security
- **Privacy**: Minimal data collection, secure storage
- **Accessibility**: Screen reader friendly login buttons
- **Performance**: Efficient authentication checks
- **Scalability**: Stateless JWT verification

---

**Ready for secure SSO integration! 🔐**
