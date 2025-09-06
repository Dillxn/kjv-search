// Simple utility to test localStorage functionality
export function testLocalStorage(): boolean {
  if (typeof window === 'undefined') {
    
    return false;
  }

  try {
    const testKey = 'kjv-storage-test';
    const testValue = { test: true, timestamp: Date.now() };
    
    // Test write
    localStorage.setItem(testKey, JSON.stringify(testValue));
    
    
    // Test read
    const retrieved = localStorage.getItem(testKey);
    if (!retrieved) {
      console.error('✗ localStorage read test failed - no data retrieved');
      return false;
    }
    
    const parsed = JSON.parse(retrieved);
    if (parsed.test !== true) {
      console.error('✗ localStorage read test failed - data corrupted');
      return false;
    }
    
    
    
    // Test delete
    localStorage.removeItem(testKey);
    const afterDelete = localStorage.getItem(testKey);
    if (afterDelete !== null) {
      console.error('✗ localStorage delete test failed');
      return false;
    }
    
    
    
    return true;
  } catch (error) {
    console.error('✗ localStorage test failed:', error);
    return false;
  }
}

export function getLocalStorageInfo(): void {
  if (typeof window === 'undefined') {
    
    return;
  }

  try {
    const used = new Blob(Object.values(localStorage)).size;
    
    
    
    // Check for our specific key
    const kjvData = localStorage.getItem('kjv-tab-manager');
    if (kjvData) {
      
      
      
      // Validate JSON structure
      try {
        const parsed = JSON.parse(kjvData);
        
        
        
      } catch (parseError) {
        console.error('✗ kjv-tab-manager JSON is corrupted:', parseError);
      }
    } else {
      
    }

    // Check for dev backup
    const backupData = localStorage.getItem('kjv-dev-backup');
    if (backupData) {
      
    }
  } catch (error) {
    console.error('Error getting localStorage info:', error);
  }
}