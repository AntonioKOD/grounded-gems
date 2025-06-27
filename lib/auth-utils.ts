// Remember Me Session Management
export const RememberMeHelper = {
  // Check if user has remember me enabled
  hasRememberMe(): boolean {
    if (typeof window === 'undefined') return false
    return document.cookie.includes('remember-me=true') || 
           localStorage.getItem('rememberMePreference') === 'true'
  },

  // Get saved email for remember me
  getSavedEmail(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('savedEmail')
  },

  // Clear remember me data
  clearRememberMe(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem('savedEmail')
    localStorage.removeItem('rememberMePreference')
    // Note: Cookies are cleared server-side during logout
  },

  // Check if session should be extended
  shouldExtendSession(): boolean {
    return this.hasRememberMe()
  },

  // Get session expiry info
  getSessionInfo(): { isRemembered: boolean; expiryHours: number } {
    const isRemembered = this.hasRememberMe()
    return {
      isRemembered,
      expiryHours: isRemembered ? 24 * 30 : 24 // 30 days vs 24 hours
    }
  }
} 