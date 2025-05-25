// --- Constants and Initial State ---
const INITIAL_STATE = {
  wechatId: '',
  isRunning: false,
  // For future use:
  // talentsList: [],
  // currentTalentIndex: 0,
  processedCount: 0,
  invitedCount: 0,
  skippedCount: 0,
  errorCount: 0,
  lastError: '',
};

// --- Storage Helper Functions ---
async function loadState() {
  try {
    const result = await chrome.storage.local.get('pluginState');
    // If pluginState exists, merge with INITIAL_STATE to ensure all keys are present
    // This handles cases where new state properties are added in updated versions
    return result.pluginState ? { ...INITIAL_STATE, ...result.pluginState } : { ...INITIAL_STATE };
  } catch (error) {
    console.error('Error loading state:', error);
    return { ...INITIAL_STATE }; // Return default state in case of error
  }
}

async function saveState(state) {
  try {
    await chrome.storage.local.set({ pluginState: state });
  } catch (error) {
    console.error('Error saving state:', error);
  }
}

// --- Popup Notification Function ---
async function notifyPopupStateChange() {
  const currentState = await loadState();
  try {
    await chrome.runtime.sendMessage({ action: 'updatePopupState', state: currentState });
  } catch (error) {
    // It's common for this to error if the popup is not open.
    // console.log('Could not send state to popup (likely closed):', error.message);
  }
}

// --- Initialization ---
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('Extension installed, initializing state.');
    await saveState({ ...INITIAL_STATE });
  } else if (details.reason === 'update') {
    console.log('Extension updated, ensuring state is initialized.');
    // Ensure that new state fields are added if the extension is updated
    const currentState = await loadState(); // loadState already merges with INITIAL_STATE
    await saveState(currentState);
  }
});


// --- Main Message Handler ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Log all incoming messages for debugging
  // console.log('Message received in service worker:', request);

  (async () => {
    let state = await loadState();

    switch (request.action) {
      case 'getPluginState':
        // Include wechatId separately for convenience if needed, though it's in state
        sendResponse({ wechatId: state.wechatId, state: state });
        return true; // Indicates asynchronous response

      case 'saveWechatId':
        state.wechatId = request.data || '';
        await saveState(state);
        await notifyPopupStateChange(); // Notify popup about the change
        sendResponse({ success: true, wechatId: state.wechatId });
        return true;

      case 'startTask':
        if (!state.wechatId) {
          state.lastError = '微信ID未设置，无法开始任务。';
          await saveState(state);
          await notifyPopupStateChange();
          sendResponse({ success: false, error: state.lastError });
          return true;
        }
        state.isRunning = true;
        state.lastError = ''; // Clear previous errors
        state.status = '运行中'; // Using 'status' from popup.js for consistency
        await saveState(state);
        await notifyPopupStateChange();
        sendResponse({ success: true, state: state });
        // TODO: Add actual task starting logic here in future steps
        console.log('Task started (stub). WeChat ID:', state.wechatId);
        return true;

      case 'stopTask':
        state.isRunning = false;
        state.status = '已停止';
        await saveState(state);
        await notifyPopupStateChange();
        sendResponse({ success: true, state: state });
        console.log('Task stopped (stub).');
        return true;

      default:
        console.warn('Unknown action received:', request.action);
        sendResponse({ success: false, error: 'Unknown action' });
        return true; // Still need to respond even for unknown actions
    }
  })(); // Immediately-invoked async function expression

  // Important: return true to indicate that you will send a response asynchronously
  return true;
});

// Keep alive for a short period if needed, though event-driven is preferred.
// This can sometimes help with early `chrome.runtime.sendMessage` calls from popup on load.
// However, a well-structured communication flow should make this unnecessary.
/*
let lifeline;

keepAlive();

chrome.runtime.onConnect.addListener(port => {
  if (port.name === 'keepAlive') {
    lifeline = port;
    setTimeout(keepAliveForced, 295e3); // 5 minutes minus 5 seconds
    port.onDisconnect.addListener(keepAliveForced);
  }
});

function keepAliveForced() {
  lifeline?.disconnect();
  lifeline = null;
  keepAlive();
}

async function keepAlive() {
  if (lifeline) return;
  for (const tab of await chrome.tabs.query({ url: '*://*/*' })) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => chrome.runtime.connect({ name: 'keepAlive' }),
      });
      chrome.tabs.onUpdated.removeListener(retryOnTabUpdate);
      return;
    } catch (e) {}
  }
  chrome.tabs.onUpdated.addListener(retryOnTabUpdate);
}

async function retryOnTabUpdate(tabId, info, tab) {
  if (info.url && /^(file|https?):/.test(info.url)) {
    keepAlive();
  }
}
*/

console.log("Service worker script loaded and running.");
