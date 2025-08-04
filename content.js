// YouTube Audio to English Extension - Content Script
// Automatically switches YouTube videos to English audio when available

console.log('🎯 YouTube Audio Extension: Content script loaded!');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  MAX_DETECTION_ATTEMPTS: 3,
  DETECTION_INTERVAL: 500, // milliseconds
  SELECTORS: {
    AUDIO_BUTTON: [
      'button.ytp-button[data-title-no-tooltip*="Audio track"]',
      'button.ytp-button[data-title-no-tooltip*="audio track"]',
      'button.ytp-button[data-title-no-tooltip*="Audio"]',
      'button.ytp-button[data-title-no-tooltip*="audio"]',
      'button[aria-label*="Audio track"]',
      'button[aria-label*="audio track"]',
      'button[aria-label*="Audio"]',
      'button[aria-label*="audio"]',
      'button[title*="Audio track"]',
      'button[title*="audio track"]',
      'button[title*="Audio"]',
      'button[title*="audio"]',
      '.ytp-settings-button[data-title-no-tooltip*="Audio"]',
      '.ytp-settings-button[aria-label*="Audio"]',
      '[data-tooltip-target-id*="audio"]',
      '[data-tooltip-target-id*="Audio"]',
      '*[data-title-no-tooltip*="Audio"]',
      '*[aria-label*="Audio"]',
      '*[title*="Audio"]'
    ],
    MENU_ITEMS: [
      '.ytp-menuitem-label',
      '.ytp-menuitem',
      '[role="menuitem"]',
      '.ytp-panel-menu .ytp-menuitem',
      '.ytp-panel-menu .ytp-menuitem-label',
      '.ytp-panel-menu .ytp-menuitem-content'
    ],
    SETTINGS_BUTTON: '.ytp-settings-button',
    VIDEO_PLAYER: '.html5-video-player'
  }
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

let state = {
  isEnabled: true,
  isProcessing: false,
  detectionAttempts: 0,
  currentUrl: window.location.href
};

// ============================================================================
// INITIALIZATION
// ============================================================================

// Load extension state from storage
chrome.storage.local.get(['audioToEnglishEnabled'], (result) => {
  state.isEnabled = result.audioToEnglishEnabled !== false;
  console.log('Extension loaded, enabled:', state.isEnabled);
});

// Send loading confirmation to background script
chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_LOADED' });

// ============================================================================
// MESSAGE HANDLERS
// ============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);
  
  switch (message.type) {
    case 'TOGGLE_STATE':
      state.isEnabled = message.enabled;
      console.log(`Extension ${state.isEnabled ? 'enabled' : 'disabled'}`);
      break;
      
    case 'DEBUG_AUDIO':
      console.log('🔍 Debug: Manual audio detection test triggered');
      const result = debugAudioDetection();
      sendResponse(result);
      break;
  }
});

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Main function to detect and switch audio to English
 */
function detectAndSwitchAudio() {
  if (!state.isEnabled || state.isProcessing) {
    console.log('Skipping audio detection - enabled:', state.isEnabled, 'processing:', state.isProcessing);
    return;
  }
  
  state.detectionAttempts = 0;
  console.log('Starting audio detection... (Max attempts: ' + CONFIG.MAX_DETECTION_ATTEMPTS + ')');
  
  const interval = setInterval(() => {
    if (!state.isEnabled) {
      console.log('Extension disabled, stopping detection');
      clearInterval(interval);
      return;
    }
    
    state.detectionAttempts++;
    console.log(`Detection attempt ${state.detectionAttempts}/${CONFIG.MAX_DETECTION_ATTEMPTS}`);
    
    const audioButton = findAudioButton();
    if (audioButton) {
      handleDirectAudioButton(audioButton, interval);
    } else {
      handleSettingsMenuApproach(interval);
    }
  }, CONFIG.DETECTION_INTERVAL);
}

/**
 * Handle direct audio button found
 */
function handleDirectAudioButton(audioButton, interval) {
  state.isProcessing = true;
  console.log('🎵 Audio track button found, attempting to switch to English...');
  
  try {
    audioButton.click();
    console.log('Clicked audio button');
    
    const menuItems = findMenuItems();
    if (menuItems.length === 0) {
      console.log('❌ No menu items found');
      state.isProcessing = false;
      return;
    }
    
    const englishItem = findEnglishOption(menuItems);
    if (englishItem) {
      console.log('Found English option:', englishItem.innerText);
      englishItem.click();
      console.log('✅ Successfully switched audio to English');
    } else {
      console.log('❌ English audio track not found. Available options:', 
        menuItems.map(item => item.innerText || item.textContent).slice(0, 5));
    }
    
    document.body.click(); // Close menu
    state.isProcessing = false;
    console.log('Menu closed');
    clearInterval(interval);
    
  } catch (error) {
    console.error('Error clicking audio button:', error);
    state.isProcessing = false;
    clearInterval(interval);
  }
}

/**
 * Handle settings menu approach when no direct audio button found
 */
function handleSettingsMenuApproach(interval) {
  const settingsButton = document.querySelector(CONFIG.SELECTORS.SETTINGS_BUTTON);
  
  if (settingsButton && state.detectionAttempts >= 2) {
    console.log('🎛️ No direct audio button found, trying settings menu approach...');
    trySettingsMenuApproach();
    clearInterval(interval);
    return;
  }
  
  console.log(`Audio button not found on attempt ${state.detectionAttempts}/${CONFIG.MAX_DETECTION_ATTEMPTS}`);
  
  if (state.detectionAttempts >= CONFIG.MAX_DETECTION_ATTEMPTS) {
    console.log(`🛑 Reached maximum detection attempts (${CONFIG.MAX_DETECTION_ATTEMPTS}). Stopping audio detection.`);
    console.log('This video likely has only one audio track or no audio options available.');
    clearInterval(interval);
  }
}

/**
 * Try settings menu approach
 */
function trySettingsMenuApproach() {
  console.log('🔧 Trying settings menu approach...');
  
  const settingsButton = document.querySelector(CONFIG.SELECTORS.SETTINGS_BUTTON);
  if (!settingsButton) {
    console.log('❌ Settings button not found');
    return;
  }
  
  state.isProcessing = true;
  console.log('Clicking settings button...');
  settingsButton.click();
  
  const audioTrackOption = findAudioTrackInSettings();
  if (audioTrackOption) {
    console.log('Found Audio track option in settings, clicking...');
    audioTrackOption.click();
    
    const englishOption = findEnglishInAudioMenu();
    if (englishOption) {
      console.log('Found English option in audio menu, clicking...');
      englishOption.click();
      console.log('✅ Successfully switched audio to English via settings menu');
    } else {
      console.log('❌ English option not found in audio track menu');
    }
    
    document.body.click(); // Close menus
    state.isProcessing = false;
  } else {
    console.log('❌ Audio track option not found in settings menu');
    document.body.click(); // Close settings menu
    state.isProcessing = false;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Find audio button using multiple selectors
 */
function findAudioButton() {
  for (const selector of CONFIG.SELECTORS.AUDIO_BUTTON) {
    const button = document.querySelector(selector);
    if (button) {
      console.log('Found audio button with selector:', selector);
      return button;
    }
  }
  
  const settingsButton = document.querySelector(CONFIG.SELECTORS.SETTINGS_BUTTON);
  if (settingsButton) {
    console.log('Settings button found - this video might have audio options in settings');
  }
  
  return null;
}

/**
 * Find menu items using multiple selectors
 */
function findMenuItems() {
  for (const selector of CONFIG.SELECTORS.MENU_ITEMS) {
    const items = Array.from(document.querySelectorAll(selector));
    if (items.length > 0) {
      console.log('Found menu items with selector:', selector, 'count:', items.length);
      return items;
    }
  }
  return [];
}

/**
 * Find English option in menu items
 */
function findEnglishOption(menuItems) {
  return menuItems.find(item => {
    const text = item.innerText || item.textContent || '';
    return text.toLowerCase().includes('english');
  });
}

/**
 * Find audio track option in settings menu
 */
function findAudioTrackInSettings() {
  const menuItems = document.querySelectorAll('.ytp-menuitem, .ytp-menuitem-label, [role="menuitem"]');
  for (const item of menuItems) {
    const text = item.innerText || item.textContent || '';
    if (text.toLowerCase().includes('audio track')) {
      console.log('Found Audio track option:', text);
      return item;
    }
  }
  return null;
}

/**
 * Find English option in audio menu
 */
function findEnglishInAudioMenu() {
  const menuItems = document.querySelectorAll('.ytp-menuitem, .ytp-menuitem-label, [role="menuitem"]');
  for (const item of menuItems) {
    const text = item.innerText || item.textContent || '';
    if (text.toLowerCase().includes('english')) {
      console.log('Found English option:', text);
      return item;
    }
  }
  return null;
}

/**
 * Debug function to analyze current page state
 */
function debugAudioDetection() {
  console.log('=== AUDIO DETECTION DEBUG ===');
  
  const result = {
    url: window.location.href,
    isVideoPage: window.location.href.includes('watch'),
    extensionEnabled: state.isEnabled,
    isProcessing: state.isProcessing,
    videoPlayerFound: !!document.querySelector(CONFIG.SELECTORS.VIDEO_PLAYER),
    totalButtons: document.querySelectorAll('.ytp-button').length,
    audioButtonFound: !!findAudioButton(),
    settingsButtonFound: !!document.querySelector(CONFIG.SELECTORS.SETTINGS_BUTTON),
    availableButtons: [],
    allPlayerElements: []
  };
  
  // Get available buttons
  const allButtons = document.querySelectorAll('.ytp-button');
  allButtons.forEach((button, index) => {
    const title = button.getAttribute('data-title-no-tooltip') || button.getAttribute('aria-label') || 'No title';
    result.availableButtons.push(title);
    console.log(`Button ${index}:`, title);
  });
  
  // Get audio-related elements
  const playerElements = document.querySelectorAll('.ytp-player-content *');
  playerElements.forEach((element, index) => {
    if (index < 20) {
      const tagName = element.tagName;
      const className = element.className;
      const title = element.getAttribute('data-title-no-tooltip') || element.getAttribute('aria-label') || element.getAttribute('title') || '';
      if (title && title.toLowerCase().includes('audio')) {
        result.allPlayerElements.push(`${tagName}.${className}: "${title}"`);
      }
    }
  });
  
  // Get audio button details
  const audioButton = findAudioButton();
  if (audioButton) {
    result.audioButtonDetails = {
      title: audioButton.getAttribute('data-title-no-tooltip'),
      ariaLabel: audioButton.getAttribute('aria-label'),
      className: audioButton.className,
      visible: audioButton.offsetParent !== null
    };
  }
  
  console.log('=== END DEBUG ===');
  return result;
}

// ============================================================================
// PAGE INITIALIZATION
// ============================================================================

/**
 * Initialize extension on page load
 */
function initializeExtension() {
  console.log('Initializing extension...');
  if (window.location.href.includes('watch')) {
    console.log('🎬 YouTube video page detected, starting audio detection...');
    detectAndSwitchAudio();
  } else {
    console.log('📺 Not on a YouTube video page');
  }
}

// Initialize on page load
console.log('About to initialize extension...');
initializeExtension();

// Watch for URL changes (YouTube SPA navigation)
const observer = new MutationObserver(() => {
  if (window.location.href !== state.currentUrl) {
    state.currentUrl = window.location.href;
    console.log('URL changed to:', state.currentUrl);
    if (window.location.href.includes('watch')) {
      console.log('🔄 Page changed to video, checking for audio options...');
      detectAndSwitchAudio();
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });
console.log('YouTube Audio Extension: Setup complete!'); 