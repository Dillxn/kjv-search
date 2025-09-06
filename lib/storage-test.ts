// Simple utility to test localStorage functionality
export function testLocalStorage(): boolean {
  if (typeof window === 'undefined') {
    console.log('Not in browser environment');
    return false;
  }

  try {
    const testKey = 'kjv-storage-test';
    const testValue = { test: true, timestamp: Date.now() };
    
    // Test write
    localStorage.setItem(testKey, JSON.stringify(testValue));
    console.log('✓ localStorage write test passed');
    
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
    
    console.log('✓ localStorage read test passed');
    
    // Test delete
    localStorage.removeItem(testKey);
    const afterDelete = localStorage.getItem(testKey);
    if (afterDelete !== null) {
      console.error('✗ localStorage delete test failed');
      return false;
    }
    
    console.log('✓ localStorage delete test passed');
    console.log('✓ All localStorage tests passed');
    return true;
  } catch (error) {
    console.error('✗ localStorage test failed:', error);
    return false;
  }
}

export function getLocalStorageInfo(): void {
  if (typeof window === 'undefined') {
    console.log('Not in browser environment');
    return;
  }

  try {
    const used = new Blob(Object.values(localStorage)).size;
    console.log('localStorage usage:', used, 'bytes');
    console.log('localStorage keys:', Object.keys(localStorage));
    
    // Check for our specific key
    const kjvData = localStorage.getItem('kjv-tab-manager');
    if (kjvData) {
      console.log('kjv-tab-manager data size:', kjvData.length, 'characters');
      console.log('kjv-tab-manager data preview:', kjvData.substring(0, 200) + '...');
      
      // Validate JSON structure
      try {
        const parsed = JSON.parse(kjvData);
        console.log('✓ kjv-tab-manager JSON is valid');
        console.log('  - tabs count:', parsed.tabs?.length || 0);
        console.log('  - active tab:', parsed.activeTabId);
      } catch (parseError) {
        console.error('✗ kjv-tab-manager JSON is corrupted:', parseError);
      }
    } else {
      console.log('kjv-tab-manager data: not found');
    }

    // Check for dev backup
    const backupData = localStorage.getItem('kjv-dev-backup');
    if (backupData) {
      console.log('🔧 Dev backup found:', backupData.length, 'characters');
    }
  } catch (error) {
    console.error('Error getting localStorage info:', error);
  }
}