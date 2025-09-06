import { APP_CONFIG } from './constants';

// Development helper to improve localStorage persistence during HMR
export class DevStorageHelper {
  private static readonly DEV_BACKUP_KEY = 'kjv-dev-backup';
  private static backupInterval: NodeJS.Timeout | null = null;

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
      // Remove old backup data
      const backupData = localStorage.getItem(this.DEV_BACKUP_KEY);
      if (backupData) {
        const backup = JSON.parse(backupData);
        if (backup.timestamp && Date.now() - backup.timestamp > 24 * 60 * 60 * 1000) {
          localStorage.removeItem(this.DEV_BACKUP_KEY);
        }
      }

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

  static startDevBackup(): void {
    if (process.env.NODE_ENV !== 'development' || typeof window === 'undefined') {
      return;
    }

    // Clear any existing interval
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
    }

    // Backup localStorage during development
    this.backupInterval = setInterval(() => {
      try {
        const tabManagerData = localStorage.getItem('kjv-tab-manager');
        if (tabManagerData) {
          const backup = {
            timestamp: Date.now(),
            data: tabManagerData,
          };
          localStorage.setItem(this.DEV_BACKUP_KEY, JSON.stringify(backup));
        }
      } catch (error) {
        console.warn('Dev backup failed:', error);
      }
    }, APP_CONFIG.UI.DEV_BACKUP_INTERVAL);

    
  }

  static stopDevBackup(): void {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
      
    }
  }

  static restoreFromBackup(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      const backupData = localStorage.getItem(this.DEV_BACKUP_KEY);
      if (!backupData) {
        return false;
      }

      const backup = JSON.parse(backupData);
      const currentData = localStorage.getItem('kjv-tab-manager');
      
      // Only restore if current data is missing or backup is newer
      if (!currentData || (backup.timestamp && Date.now() - backup.timestamp < 30000)) {
        localStorage.setItem('kjv-tab-manager', backup.data);
        
        return true;
      }
    } catch (error) {
      console.warn('Failed to restore from backup:', error);
    }

    return false;
  }

  static clearBackup(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.DEV_BACKUP_KEY);
    }
  }
}