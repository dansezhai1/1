document.addEventListener('DOMContentLoaded', () => {
  const wechatIdInput = document.getElementById('wechatId');
  const saveWechatIdButton = document.getElementById('saveWechatId');
  const startButton = document.getElementById('startButton');
  const stopButton = document.getElementById('stopButton');

  const statusDisplay = document.getElementById('statusDisplay');
  const processedCountDisplay = document.getElementById('processedCount');
  const invitedCountDisplay = document.getElementById('invitedCount');
  const skippedCountDisplay = document.getElementById('skippedCount');
  const errorCountDisplay = document.getElementById('errorCount');
  const lastErrorDisplay = document.getElementById('lastError');

  // --- Helper Functions to Update UI ---
  function updateStatusDisplay(state) {
    statusDisplay.textContent = state.status || '空闲';
    processedCountDisplay.textContent = state.processedCount || 0;
    invitedCountDisplay.textContent = state.invitedCount || 0;
    skippedCountDisplay.textContent = state.skippedCount || 0;
    errorCountDisplay.textContent = state.errorCount || 0;
    lastErrorDisplay.textContent = state.lastError || '';
  }

  function updateButtonStates(isRunning) {
    startButton.disabled = isRunning;
    stopButton.disabled = !isRunning;
  }

  // --- Initial State Fetch from Service Worker ---
  chrome.runtime.sendMessage({ action: 'getPluginState' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error getting plugin state:', chrome.runtime.lastError.message);
      lastErrorDisplay.textContent = '无法加载初始状态: ' + chrome.runtime.lastError.message;
      // Initialize with default/empty state if service worker is not ready or has error
      updateStatusDisplay({});
      updateButtonStates(false);
      return;
    }
    if (response) {
      if (response.wechatId) {
        wechatIdInput.value = response.wechatId;
      }
      updateStatusDisplay(response.state || {});
      updateButtonStates(response.state ? response.state.isRunning : false);
    } else {
      // Handle cases where response might be undefined (e.g., SW not fully active yet)
      console.warn('No initial response from service worker. Assuming default state.');
      updateStatusDisplay({});
      updateButtonStates(false);
    }
  });

  // --- Event Listeners ---
  saveWechatIdButton.addEventListener('click', () => {
    const wechatIdValue = wechatIdInput.value.trim();
    if (wechatIdValue) {
      chrome.runtime.sendMessage({ action: 'saveWechatId', data: wechatIdValue }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error saving WeChat ID:', chrome.runtime.lastError.message);
          lastErrorDisplay.textContent = '保存微信ID失败: ' + chrome.runtime.lastError.message;
        } else if (response && response.success) {
          lastErrorDisplay.textContent = '微信ID已保存!';
          setTimeout(() => lastErrorDisplay.textContent = '', 3000); // Clear after 3s
        } else {
          lastErrorDisplay.textContent = '保存微信ID失败。';
        }
      });
    } else {
      lastErrorDisplay.textContent = '请输入微信ID。';
    }
  });

  startButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'startTask' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error starting task:', chrome.runtime.lastError.message);
        lastErrorDisplay.textContent = '启动任务失败: ' + chrome.runtime.lastError.message;
      } else if (response && response.success) {
        updateButtonStates(true);
        statusDisplay.textContent = '运行中...'; // Optimistic update
      } else {
        lastErrorDisplay.textContent = '启动任务失败。可能未保存微信ID。';
      }
    });
  });

  stopButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'stopTask' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error stopping task:', chrome.runtime.lastError.message);
        lastErrorDisplay.textContent = '停止任务失败: ' + chrome.runtime.lastError.message;
      } else if (response && response.success) {
        updateButtonStates(false);
        statusDisplay.textContent = '已停止'; // Optimistic update
      } else {
        lastErrorDisplay.textContent = '停止任务失败。';
      }
    });
  });

  // --- Listener for Messages from Service Worker ---
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updatePopupState') {
      updateStatusDisplay(message.state);
      updateButtonStates(message.state.isRunning);
    }
    // Keep the message channel open for asynchronous sendResponse if needed, though not used here
    return true;
  });

  // Initial button state
  updateButtonStates(false); // Assume not running initially
});
