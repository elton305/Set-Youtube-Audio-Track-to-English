// YouTube Audio to English Extension - Popup Script
// Handles the extension popup UI and user interactions

// ============================================================================
// DOM ELEMENTS
// ============================================================================

const elements = {
  toggleSwitch: null,
  statusElement: null,
  statusText: null,
  debugBtn: null
};

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
  initializeElements();
  loadCurrentState();
  setupEventListeners();
});

/**
 * Initialize DOM element references
 */
function initializeElements() {
  elements.toggleSwitch = document.getElementById('toggleSwitch');
  elements.statusElement = document.getElementById('status');
  elements.statusText = document.getElementById('statusText');
  elements.debugBtn = document.getElementById('debugBtn');
}

/**
 * Load current extension state from storage
 */
function loadCurrentState() {
  chrome.storage.local.get(['audioToEnglishEnabled'], function(result) {
    const isEnabled = result.audioToEnglishEnabled !== false; // Default to true
    updateUI(isEnabled);
  });
}

/**
 * Setup event listeners for user interactions
 */
function setupEventListeners() {
  // Handle toggle switch click
  elements.toggleSwitch.addEventListener('click', handleToggleClick);
  
  // Handle debug button click
  elements.debugBtn.addEventListener('click', handleDebugClick);
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Handle toggle switch click
 */
function handleToggleClick() {
  chrome.storage.local.get(['audioToEnglishEnabled'], function(result) {
    const currentState = result.audioToEnglishEnabled !== false;
    const newState = !currentState;
    
    // Save to storage
    chrome.storage.local.set({ audioToEnglishEnabled: newState });
    
    // Update UI
    updateUI(newState);
    
    // Send message to content script
    sendMessageToContentScript({
      type: 'TOGGLE_STATE',
      enabled: newState
    });
  });
}

/**
 * Handle debug button click
 */
function handleDebugClick() {
  sendMessageToContentScript({
    type: 'DEBUG_AUDIO'
  }, handleDebugResponse);
}

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

/**
 * Send message to content script
 */
function sendMessageToContentScript(message, callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (tabs[0] && tabs[0].url && tabs[0].url.includes('youtube.com')) {
      if (callback) {
        // For debug button
        elements.statusText.textContent = 'Testing audio detection...';
        elements.statusElement.className = 'status active';
        
        chrome.tabs.sendMessage(tabs[0].id, message, function(response) {
          if (response) {
            callback(response);
          } else {
            handleDebugError('Could not test audio detection');
          }
        });
      } else {
        // For toggle
        chrome.tabs.sendMessage(tabs[0].id, message);
      }
    } else {
      if (callback) {
        handleDebugError('Please open a YouTube page first');
      }
    }
  });
}

/**
 * Handle debug response from content script
 */
function handleDebugResponse(result) {
  displayDebugResults(result);
}

/**
 * Handle debug error
 */
function handleDebugError(message) {
  elements.statusText.textContent = 'Error: ' + message;
  elements.statusElement.className = 'status inactive';
}

// ============================================================================
// UI UPDATES
// ============================================================================

/**
 * Update UI based on extension state
 */
function updateUI(isEnabled) {
  if (isEnabled) {
    elements.toggleSwitch.classList.add('active');
    elements.statusElement.className = 'status active';
    elements.statusText.textContent = 'Extension is enabled';
  } else {
    elements.toggleSwitch.classList.remove('active');
    elements.statusElement.className = 'status inactive';
    elements.statusText.textContent = 'Extension is disabled';
  }
}

/**
 * Display debug results in the popup
 */
function displayDebugResults(result) {
  let statusMessage = '';
  let statusClass = 'status inactive';
  
  if (!result.isVideoPage) {
    statusMessage = '❌ Not on a YouTube video page';
  } else if (!result.extensionEnabled) {
    statusMessage = '❌ Extension is disabled';
  } else if (!result.videoPlayerFound) {
    statusMessage = '❌ Video player not found';
  } else if (result.totalButtons === 0) {
    statusMessage = '❌ No player buttons found';
  } else if (result.audioButtonFound) {
    statusMessage = `✅ Audio button found! (${result.audioButtonDetails.title || result.audioButtonDetails.ariaLabel})`;
    statusClass = 'status active';
  } else {
    // Check if we found any audio-related elements
    if (result.allPlayerElements.length > 0) {
      statusMessage = `⚠️ Found ${result.allPlayerElements.length} audio-related elements but no audio button`;
    } else {
      statusMessage = `ℹ️ No audio button found. This video likely has only one audio track. Found ${result.totalButtons} other buttons.`;
    }
  }
  
  elements.statusText.textContent = statusMessage;
  elements.statusElement.className = statusClass;
  
  // Log detailed results to console
  logDebugResults(result);
}

/**
 * Log detailed debug results to console
 */
function logDebugResults(result) {
  console.log('=== DEBUG RESULTS ===');
  console.log('URL:', result.url);
  console.log('Is video page:', result.isVideoPage);
  console.log('Extension enabled:', result.extensionEnabled);
  console.log('Video player found:', result.videoPlayerFound);
  console.log('Total buttons:', result.totalButtons);
  console.log('Audio button found:', result.audioButtonFound);
  
  if (result.audioButtonDetails) {
    console.log('Audio button details:', result.audioButtonDetails);
  }
  
  console.log('Available buttons:', result.availableButtons);
  
  if (result.allPlayerElements.length > 0) {
    console.log('Audio-related elements found:', result.allPlayerElements);
  }
  
  console.log('=== END DEBUG RESULTS ===');
} 