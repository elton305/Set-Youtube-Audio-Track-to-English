// YouTube Audio to English Extension - Background Script
// Handles extension lifecycle and inter-script communication

console.log('🎯 YouTube Audio Extension: Background script loaded!');

// ============================================================================
// EXTENSION LIFECYCLE
// ============================================================================

/**
 * Handle extension installation/update
 */
chrome.runtime.onInstalled.addListener(() => {
  console.log('YouTube Audio Extension installed/updated');
  
  // Set default state if not already set
  chrome.storage.local.get(['audioToEnglishEnabled'], (result) => {
    if (result.audioToEnglishEnabled === undefined) {
      chrome.storage.local.set({ audioToEnglishEnabled: true });
      console.log('Set default extension state to enabled');
    }
  });
});

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message, 'from:', sender.tab?.url);
  
  switch (message.type) {
    case 'CONTENT_SCRIPT_LOADED':
      handleContentScriptLoaded(sender);
      break;
      
    default:
      console.log('Unknown message type:', message.type);
      break;
  }
});

/**
 * Handle content script loaded confirmation
 */
function handleContentScriptLoaded(sender) {
  console.log('Content script confirmed loaded on:', sender.tab?.url);
}

// ============================================================================
// TAB MONITORING
// ============================================================================

/**
 * Monitor YouTube page loads for debugging
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com')) {
    console.log('YouTube page loaded:', tab.url);
  }
}); 