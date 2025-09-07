import { APP_CONFIG } from './constants';

// Development helper for localStorage management
export class DevStorageHelper {

  // Storage quota monitoring
  static getStorageUsage(): { used: number; available: number; percentage: number } {
    if (typeof window === 'undefined') {
      return { used: 0, available: 0, percentage: 0 };
    }

    try {
      let used = 0;
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += localStorage[key].length + key.length;
        }
      }
      
      // Conservative estimate of localStorage limit (5MB)
      const estimated = 5 * 1024 * 1024;
      const available = Math.max(0, estimated - used);
      const percentage = (used / estimated) * 100;
      
      return { used, available, percentage };
    } catch (error) {
      console.warn('Failed to calculate storage usage:', error);
      return { used: 0, available: 0, percentage: 0 };
    }
  }

  static isStorageNearLimit(): boolean {
    const usage = this.getStorageUsage();
    return usage.percentage > 80; // Consider 80% as near limit
  }

  static cleanupOldData(): void {
    if (typeof window === 'undefined') return;

    try {
      // Clean up any other old KJV-related keys
      const keysToCheck = Object.keys(localStorage).filter(key =>
        key.startsWith('kjv-') && key !== 'kjv-tab-reducer-state'
      );

      keysToCheck.forEach(key => {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            // Remove data older than 7 days
            if (parsed.timestamp && Date.now() - parsed.timestamp > 7 * 24 * 60 * 60 * 1000) {
              localStorage.removeItem(key);
            }
          }
        } catch {
          // If we can't parse it, it might be corrupted - remove it
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Storage cleanup failed:', error);
    }
  }

}