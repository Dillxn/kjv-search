// Development helper to improve localStorage persistence during HMR
export class DevStorageHelper {
  private static readonly DEV_BACKUP_KEY = 'kjv-dev-backup';
  private static backupInterval: NodeJS.Timeout | null = null;

  static startDevBackup(): void {
    if (process.env.NODE_ENV !== 'development' || typeof window === 'undefined') {
      return;
    }

    // Clear any existing interval
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
    }

    // Backup localStorage every 2 seconds during development
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
    }, 2000);

    
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