# 《抖店达人邀约Chrome插件开发蓝图》

## 引言

本项目旨在开发一款谷歌浏览器插件，以自动化抖店后台精选联盟页面的达人筛选和邀约流程。本开发蓝图综合项目前期的用户需求分析、技术可行性研究、核心逻辑与交互流程设计、功能规格说明以及代码框架设计等成果，为插件的实际开发提供全面指导，确保项目顺利实施并达成预期目标。

## 项目概述

**核心功能:**
-   **达人信息提取与智能筛选:** 在抖店精选联盟达人列表页，根据用户预设的多个维度（内容类型、达人画像、粉丝画像、达人类型）自动提取并过滤达人信息。
-   **一键模拟邀约:** 对符合筛选条件的达人，自动化导航至其主页，模拟点击“在线沟通”，并在邀约信息编辑界面自动填写用户微信号并发送邀约。
-   **已邀约状态检测与跳过:** 智能识别达人是否已通过“在线沟通”沟通过（判断标准为点击“在线沟通”后页面是否直接跳转至聊天框），对已邀约达人自动跳过，避免重复操作。

**目标用户:** 抖店商家和运营人员。

**预期价值:** 显著提高在精选联盟筛选和邀约达人的效率，减少重复性劳动，释放人力成本。

## 技术栈与架构

**推荐技术选型:**
-   核心语言: JavaScript (ES6+)
-   页面结构: HTML5
-   样式表现: CSS3
-   扩展清单: Chrome Extension Manifest V3

**插件整体架构:**
插件将采用标准的Chrome Extension Manifest V3架构，主要包含以下模块：

1.  **内容脚本 (`content_script.js`):**
    -   直接注入并运行在抖店精选联盟网页的上下文中。
    -   职责：负责与页面DOM进行直接交互，包括达人信息的提取、根据指令模拟点击和填写输入框、监听页面局部DOM变化（如邀约弹窗出现、聊天框出现）。
    -   **核心技术:** DOM API (`querySelector`, `innerText`, `click`, `value`, `dispatchEvent`)，`MutationObserver` (用于等待元素加载或监测DOM变化)。
    -   **权限:** 需要在`manifest.json`中声明匹配抖店精选联盟URL的权限，以允许内容脚本注入和访问页面DOM。

2.  **背景服务工作线程 (`service_worker.js`):**
    -   在独立的后台线程中运行，无UI界面，也无法直接访问页面DOM。
    -   职责：作为整个插件的核心控制器，负责任务状态管理（存储于`chrome.storage.local`）、处理流程调度（如依次处理筛选出的达人）、监听浏览器事件（如标签页导航）、接收Popup和内容脚本的消息并向内容脚本发送指令。
    -   **核心技术:** Chrome Extension APIs (`chrome.storage.local`, `chrome.tabs`, `chrome.runtime`, `chrome.alarms`, `chrome.webNavigation` - 用于监听页面跳转), 异步编程 (`Promise`, `async/await`)。
    -   **生命周期:** Manifest V3的服务工作线程是事件驱动的，非持久化，空闲时会终止，因此**必须**使用`chrome.storage.local`进行状态持久化。

3.  **弹出页面 (`popup.html` 和 `popup.js`):**
    -   当用户点击浏览器工具栏上的插件图标时出现的界面。
    -   职责：提供用户界面，用于输入和保存微信号、启动和停止任务，以及展示当前任务状态和进度。
    -   **核心技术:** HTML/CSS构建UI，JavaScript (`popup.js`) 负责处理用户输入和点击事件，通过消息传递 (`chrome.runtime.sendMessage`) 与背景脚本通信，获取并更新状态。

**模块间的消息传递机制:**
-   内容脚本与背景脚本之间，以及Popup脚本与背景脚本之间，通过`chrome.runtime.sendMessage`和`chrome.runtime.onMessage.addListener`进行双向通信。
-   Popup向背景脚本发送指令（如“开始任务”、“保存微信号”）。
-   内容脚本向背景脚本发送筛选结果、达人处理结果（邀约成功、跳过、错误）、页面状态信息。
-   背景脚本向内容脚本发送操作指令（如“去处理达人X”、“填写微信号并发送”）、用户配置信息。
-   背景脚本向Popup发送状态更新信息，以便Popup实时展示进度。

下图展示了插件的主要模块及其通信关系：

```svg
<svg width="800" height="400" xmlns="http://www.w3.org/2000/svg">
  <style>
    .module { stroke: black; stroke-width: 2; fill: #cceeff; }
    .storage { stroke: black; stroke-width: 2; fill: #ffffcc; }
    .page { stroke: black; stroke-width: 2; fill: #aaffaa; }
    .text { font-family: sans-serif; font-size: 12px; text-anchor: middle; fill: black; }
    .arrow { stroke: black; stroke-width: 2; marker-end: url(#arrowhead); }
    #arrowhead { fill: black; }
    .label { font-size: 10px; fill: gray; text-anchor: middle; }
  </style>
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7"></polygon>
    </marker>
  </defs>

  <!-- Modules -->
  <rect x="100" y="150" width="120" height="60" rx="10" ry="10" class="module"></rect>
  <text x="160" y="185" class="text">Popup</text>

  <rect x="340" y="50" width="150" height="70" rx="10" ry="10" class="module"></rect>
  <text x="415" y="80" class="text">Background</text>
  <text x="415" y="95" class="text">Service Worker</text>
    <text x="415" y="110" class="label">(流程控制, 状态管理)</text>


  <rect x="340" y="250" width="150" height="70" rx="10" ry="10" class="module"></rect>
  <text x="415" y="285" class="text">Content Script</text>
    <text x="415" y="300" class="label">(DOM交互, 筛选, 模拟操作)</text>

  <rect x="600" y="150" width="150" height="60" rx="10" ry="10" class="page"></rect>
  <text x="675" y="185" class="text">抖店精选联盟页面</text>


  <rect x="365" y="150" width="100" height="60" rx="5" ry="5" class="storage"></rect>
  <text x="415" y="185" class="text">chrome.storage.local</text>
  <text x="415" y="200" class="label">(微信号, 任务状态)</text>


  <!-- Arrows -->
  <!-- Popup <-> Background -->
  <line x1="220" y1="180" x2="340" y2="100" class="arrow"></line>
  <text x="280" y="140" class="label">指令/状态请求</text>
  <line x1="340" y1="100" x2="220" y2="180" class="arrow"></line>
  <text x="280" y="155" class="label">状态更新/响应</text>


  <!-- Background <-> Content Script -->
  <line x1="415" y1="120" x2="415" y2="250" class="arrow"></line>
    <text x="405" y="185" class="label">指令/配置</text>
  <line x1="415" y1="250" x2="415" y2="120" class="arrow"></line>
    <text x="425" y="185" class="label">结果/状态报告</text>


  <!-- Content Script <-> Web Page -->
  <line x1="490" y1="285" x2="600" y2="185" class="arrow"></line>
  <text x="545" y="255" class="label">DOM读/写</text>
  <line x1="600" y1="185" x2="490" y1="285" class="arrow"></line>
  <text x="545" y="270" class="label">事件/DOM变化</text>


  <!-- Background <-> Storage -->
  <line x1="415" y1="120" x2="415" y2="150" class="arrow"></line>
    <text x="405" y="135" class="label">存/取状态</text>
  <line x1="415" y1="150" x2="415" y2="120" class="arrow"></line>
    <text x="425" y="135" class="label">存/取状态</text>


  <!-- Background <-> Tabs API -->
    <rect x="340" y="0" width="150" height="40" rx="5" ry="5" class="module"></rect>
    <text x="415" y="25" class="text">chrome.tabs / webNavigation</text>
     <line x1="415" y1="40" x2="415" y2="50" class="arrow"></line>
      <line x1="415" y1="50" x2="415" y2="40" class="arrow"></line>
</svg>

## 核心功能模块实现指南

### 1. 达人信息提取与筛选逻辑

-   **实现位置:** `content_script.js`
-   **要点:**
    -   在正确的抖店精选联盟列表页注入内容脚本 (`manifest.json`配置`content_scripts`)。
    -   使用`MutationObserver`监听页面动态加载，确保达人列表完全加载稳定后再进行提取。
    -   分析抖店页面DOM结构，使用稳定、鲁棒的CSS选择器或相对XPath定位达人列表容器和每个达人条目内的信息元素（昵称、主页链接、内容类型、达人画像、粉丝画像、达人类型）。
    -   编写JavaScript逻辑，遍历每个达人条目，提取所需信息。
    -   根据预设的筛选条件（硬编码在内容脚本或由背景脚本通过消息传递下发），对提取的达人数据进行过滤。
    -   将符合条件的达人列表（包含唯一标识符如达人ID、昵称、主页URL等）通过`chrome.runtime.sendMessage`发送给`service_worker.js`。
-   **参考:** 《抖店精选联盟达人邀约Chrome插件核心逻辑与交互流程设计文档》中的“1. 达人筛选逻辑”部分及相关流程图。

### 2. 模拟邀约流程

-   **实现位置:** 主要由`content_script.js`执行页面操作，`service_worker.js`协调流程和页面导航。
-   **要点:**
    -   `service_worker.js`从待处理达人列表中取出一个达人。
    -   `service_worker.js`使用`chrome.tabs.update`导航当前标签页到达人列表页（确保内容脚本在正确页面）或直接导航到达人主页URL。
    -   如果导航到列表页，`service_worker.js`通知`content_script.js`定位并模拟点击当前达人的主页链接。
    -   `service_worker.js`监听`chrome.tabs.onUpdated`检测页面是否成功跳转到达人主页。
    -   页面成功加载达人主页后，`service_worker.js`通知`content_script.js`。
    -   `content_script.js`使用`MutationObserver`等待“在线沟通”按钮出现，并模拟点击 (`element.click()`)。
    -   等待短暂延迟，判断点击“在线沟通”后的页面状态。

### 3. 已邀约状态检测与跳过机制

-   **实现位置:** `content_script.js`进行页面DOM/URL检测，`service_worker.js`根据结果处理流程。
-   **要点:**
    -   **检测逻辑:** 在`content_script.js`中，点击“在线沟通”后，检测当前页面URL是否快速变化到聊天界面路径（例如`/chat/`)，或者监测页面DOM是否出现聊天界面的特有元素或邀约编辑界面的特有元素。这可以通过监听`window.location.href`变化或使用`MutationObserver`实现。
    -   **判断:**
        -   若检测到页面跳转到聊天框URL或出现聊天DOM，则判定该达人**已邀约**。
        -   若检测到页面URL不变，但出现邀约信息编辑界面的DOM（如输入框、发送按钮），则判定该达人**未邀约**。
    -   **报告结果:** `content_script.js`将判断结果（已邀约/未邀约）通过`chrome.runtime.sendMessage`发送给`service_worker.js`。
    -   **流程处理:** `service_worker.js`收到结果后：
        -   若为**已邀约**，更新`chrome.storage.local`中的状态计数 (`skippedCount`++)，然后进入处理下一个达人的流程。
        -   若为**未邀约**，则指示`content_script.js`继续执行填充微信号和发送邀约的步骤。
-   **参考:** 《抖店精选联盟达人邀约Chrome插件核心逻辑与交互流程设计文档》中的“2. 一键邀约与已邀约检测流程”部分及相关流程图。

### 4. 用户界面 (Popup) 交互逻辑

-   **实现位置:** `popup.html` 和 `popup.js`
-   **要点:**
    -   `popup.html` 构建UI界面：微信号输入框、保存按钮、开始/停止按钮、状态显示区域。
    -   `popup.js` 在`DOMContentLoaded`时，通过`chrome.runtime.sendMessage`向背景脚本请求保存的微信号和当前任务状态，并填充UI。
    -   监听保存按钮点击：获取输入框微信号，使用`chrome.runtime.sendMessage`发送给背景脚本保存至`chrome.storage.local`。
    -   监听开始/停止按钮点击：使用`chrome.runtime.sendMessage`发送相应的指令给背景脚本。
    -   监听背景脚本发送的状态更新消息 (`chrome.runtime.onMessage`)，实时更新Popup界面的状态显示区域（处理进度、计数、错误信息等）和按钮的启用/禁用状态。
-   **参考:** 《抖店精选联盟达人邀约Chrome插件功能规格说明书》中的“3. 插件UI/UX交互设计”部分。

### 5. 数据存储

-   **实现位置:** `service_worker.js`使用`chrome.storage.local` API。
-   **要点:**
    -   用户微信号：在Popup保存时由背景脚本接收并存储。在邀约时由背景脚本读取并传递给内容脚本。
    -   任务状态：包括`isRunning` (是否运行), `currentTalentIndex` (当前处理索引), `talentsList` (筛选出的达人列表), `processedCount`, `invitedCount`, `skippedCount`, `errorCount`, `lastError` 等。
    -   Service Worker启动时加载状态，任务进行中频繁更新状态（每处理一个达人或改变任务状态），任务结束时最终保存状态。
    -   `chrome.storage.local`是异步API，读写操作需使用Promises/async-await处理。
-   **参考:** 《抖店精选联盟达人邀约Chrome插件功能规格说明书》中的“4. 数据处理与存储”部分。

### 6. 错误处理与日志记录

-   **实现位置:** 各模块（内容脚本、背景脚本）
-   **要点:**
    -   在关键操作点（如元素定位、模拟点击、页面导航、消息发送接收、`chrome.storage`操作）加入`try...catch`块捕获异常。
    -   记录错误信息，包括错误类型、发生位置、关联的达人ID/昵称等。
    -   将错误信息通过消息传递报告给背景脚本。
    -   背景脚本将错误信息存储在`chrome.storage.local`的`lastError`字段，并更新`errorCount`。
    -   Popup界面读取并显示最近的错误信息。
    -   使用`console.log`, `console.error`, `console.warn`进行开发和调试时的日志记录。

## 开发步骤建议

1.  **环境搭建:** 安装Node.js (用于包管理如npm/yarn), 配置VS Code等开发环境。
2.  **Manifest文件配置:** 创建`manifest.json`，定义插件元信息、版本V3、请求的权限（tabs, storage, scripting, declarativeNetRequest等根据实际需要），以及声明Service Worker、Popup、Content Scripts。
3.  **Popup页面与逻辑:** 开发`popup.html`和`popup.js`，实现微信号输入/保存UI和基础交互，向背景脚本发送保存/开始/停止消息。
4.  **背景脚本基础:** 创建`service_worker.js`，实现消息监听器，接收Popup的消息，实现微信号的`chrome.storage.local`存取逻辑。
5.  **内容脚本DOM操作:** 在`content_script.js`中，编写基础的DOM元素定位（使用选择器）和信息提取代码，模拟点击和输入的代码片段。暂不包含复杂逻辑。
6.  **数据存储集成:** 在背景脚本中，实现任务状态对象结构，使用`chrome.storage.local`进行状态的加载、保存和更新。
7.  **消息通信联调:** 联调Popup、背景脚本、内容脚本之间的消息传递，确保指令和数据能正确发送和接收。
8.  **筛选逻辑实现:** 在内容脚本中完善达人信息提取和筛选代码，将筛选结果发送给背景脚本。
9.  **邀约流程模拟:** 在内容脚本中实现模拟点击达人主页、点击“在线沟通”、填充微信号、点击发送等步骤的代码。
10. **状态检测与跳过:** 在内容脚本中实现点击“在线沟通”后页面状态（已邀约/未邀约）的检测逻辑，并将结果报告给背景脚本。
11. **流程控制与状态管理:** 在背景脚本中实现基于`chrome.storage.local`状态的完整任务流程控制，包括遍历达人列表、根据内容脚本报告结果更新状态、处理下一个达人、任务暂停与恢复。
12. **错误处理集成:** 在各模块关键位置加入错误捕获和报告逻辑，在背景脚本中记录错误状态，在Popup中展示。
13. **测试与调试:** 进行单元测试和集成测试，重点关注DOM定位稳定性、流程状态切换、异常场景处理。使用Chrome扩展开发者工具进行调试。
14. **打包发布:** 完成测试后，打包插件进行内部测试或提交到Chrome Web Store。

## 关键代码片段参考

以下是伪代码文档中的一些核心片段，展示了关键模块间的通信和数据处理方式：

**1. 内容脚本接收指令并发送结果:**
```javascript
// content_script.js
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === 'processTalent') {
        // 收到处理单个达人指令，包含达人信息和微信号
        const { talent, wechatId } = request;
        // 执行处理逻辑...
        const resultStatus = await processSingleTalent(talent, wechatId); // 例如返回 'invited', 'skipped', 'error'
        // 向背景脚本报告结果
        chrome.runtime.sendMessage({
            action: 'talentProcessResult',
            talentId: talent.id,
            status: resultStatus,
            message: resultStatus === 'error' ? '具体错误信息' : ''
        });
    }
    // ... 其他消息处理
});
```

**2. 背景脚本接收Popup指令并处理，接收内容脚本结果并更新状态:**
```javascript
// service_worker.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'startTask':
            startTask(); // 启动任务流程
            break;
        case 'saveWechatId':
            chrome.storage.local.get('pluginState', (result) => {
                const state = result.pluginState || {};
                state.wechatId = request.data;
                chrome.storage.local.set({ pluginState: state });
            });
            return true; // 异步响应
        case 'filteredTalentsList':
            // 接收筛选结果并存储
             chrome.storage.local.get('pluginState', (result) => {
                const state = result.pluginState || {};
                state.talentsList = request.data;
                 state.currentTalentIndex = 0; // 重置进度
                 // ... 重置其他计数
                chrome.storage.local.set({ pluginState: state }, () => {
                    // 收到列表后，如果任务已启动，开始处理第一个
                     loadPluginState().then(currentState => {
                         if(currentState.isRunning && currentState.talentsList.length > 0){
                              processNextTalent(currentState);
                         }
                         notifyPopupStateChange(currentState); // 通知Popup更新列表大小
                     });
                });
             });
             break;
        case 'talentProcessResult':
            // 接收单个达人处理结果，更新状态并处理下一个
            handleTalentProcessResult(request.talentId, request.status, request.message);
            break;
        case 'getPluginState':
             // 向Popup发送当前状态
             loadPluginState().then(state => sendResponse({ status: 'success', state: state }));
             return true; // 异步响应
        // ... 其他消息类型
    }
});

// 异步加载状态
async function loadPluginState() {
    return new Promise(resolve => {
        chrome.storage.local.get('pluginState', (result) => {
            // Provide default state if none exists
            resolve(result.pluginState || { /* default structure */ });
        });
    });
}

// 异步保存状态
async function savePluginState(state) {
    return new Promise(resolve => {
        chrome.storage.local.set({ pluginState: state }, resolve);
    });
}

// 通知Popup状态变化
async function notifyPopupStateChange(state) {
    chrome.runtime.sendMessage({ action: 'updatePopupState', state: state }).catch(error => { /* popup not open */ });
}

// 处理下一个达人 (伪代码)
async function processNextTalent(state) {
     // 从state获取当前达人，使用 chrome.tabs.update 导航页面，然后向内容脚本发送 'processTalent' 消息
     // ... navigation and messaging logic ...
}

// 处理达人处理结果 (伪代码)
async function handleTalentProcessResult(talentId, status, message) {
    let state = await loadPluginState();
    // ... 根据 status 更新 state 中的计数和错误信息 ...
    // ... Increment currentTalentIndex ...
    await savePluginState(state);
    notifyPopupStateChange(state);
    // ... 如果任务还在运行，继续 processNextTalent(state) ...
}

```

**3. Popup脚本接收状态更新:**
```javascript
// popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updatePopupState') {
        updateStatusDisplay(request.state); // 更新界面显示
        updateButtonStates(request.state); // 更新按钮状态
    }
});

// DOMContentLoaded 时加载初始状态
document.addEventListener('DOMContentLoaded', () => {
    chrome.runtime.sendMessage({ action: 'getPluginState' }, (response) => {
        if (response && response.status === 'success' && response.state) {
            wechatInput.value = response.state.wechatId || '';
            updateStatusDisplay(response.state);
            updateButtonStates(response.state);
        }
    });
});
```

## 测试要点

-   **DOM元素定位稳定性:** 在抖店精选联盟和达人主页，反复测试达人列表、筛选信息元素、“在线沟通”按钮、邀约信息输入框、发送按钮等是否能被稳定准确地定位到，尤其在页面滚动或加载缓慢的情况下。
-   **筛选逻辑准确性:** 测试不同组合的筛选条件（美食、上海、50岁+粉丝、视频达人）是否能正确过滤出目标达人。
-   **邀约流程完整性:** 测试从点击“在线沟通”到填写微信号再到发送邀约的整个流程是否顺畅，能否成功模拟用户操作。
-   **已邀约检测可靠性:** 重点测试点击“在线沟通”后，通过URL变化或DOM变化判断是否已邀约的逻辑是否准确，能否区分跳转到聊天页和弹出邀约界面的情况。
-   **任务流程控制:** 测试任务的启动、暂停、继续、停止、完成等状态切换是否正确，进度计数是否准确。
-   **状态持久化:** 测试在任务运行过程中关闭/重启浏览器或重新加载扩展后，任务状态（特别是待处理列表和当前索引）能否通过`chrome.storage.local`正确恢复。
-   **异常场景处理:** 测试元素未找到、页面加载失败、导航异常、邀约发送失败等情况，错误信息是否被捕获、记录并在Popup中展示，任务流程能否健壮地继续或终止。
-   **多标签页影响:** 虽然插件主要针对当前活动标签页操作，但应确认在其他标签页操作或打开时是否会对插件运行造成干扰。
-   **不同网络环境:** 测试在网络较慢的情况下，等待机制是否有效，操作是否会超时失败。
-   **抖店页面更新适应性:** 预留维护成本，抖店后台界面可能更新，导致选择器失效或流程变化，需要定期检查和调整代码。

## 总结与展望

本蓝图为抖店达人邀约Chrome插件的开发提供了全面的技术指引和实现思路。通过采用清晰的模块划分、标准的Chrome Extension API以及鲁棒的错误处理机制，可以构建一个稳定、高效的自动化工具。

**总结:** 插件将通过内容脚本与抖店页面深度交互，利用背景服务工作线程进行全局流程控制和状态管理（通过`chrome.storage.local`实现持久化），并通过Popup界面与用户交互。核心挑战在于复杂动态DOM的稳定定位和页面状态的准确判断。

**未来可能的扩展方向:**
-   **更多筛选条件的自定义:** 允许用户在Popup界面配置更灵活的筛选条件。
-   **邀约文案模板:** 支持用户自定义邀约消息模板，提高个性化程度。
-   **处理更多邀约状态:** 例如，区分“邀约中”、“已回复”、“合作成功”等更细粒度的状态，并提供筛选或统计功能。
-   **任务导入/导出:** 支持导入或导出达人列表，方便用户管理。
-   **可视化报表:** 提供邀约任务的统计报表，分析成功率、耗时等。
-   **任务队列与调度:** 支持同时管理多个邀约任务队列。
-   **AI辅助判断:** 探索使用AI识别达人主页更多信息，进行更智能的评估和筛选。

通过本蓝图指导下的开发工作，我们有信心交付一款实用的抖店运营辅助工具。
