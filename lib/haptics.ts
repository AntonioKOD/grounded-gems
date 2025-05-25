/**
 * Safely trigger vibration feedback if available
 * @param duration Duration in milliseconds
 */
export function safeVibrate(duration: number) {
  if (typeof window !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(duration)
  }
}

/**
 * Trigger light haptic feedback
 */
export function lightHaptics() {
  safeVibrate(30)
}

/**
 * Trigger medium haptic feedback
 */
export function mediumHaptics() {
  safeVibrate(50)
}

/**
 * Trigger strong haptic feedback
 */
export function strongHaptics() {
  safeVibrate(100)
} 