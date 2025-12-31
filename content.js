// --- 初始化 DOM 元素 ---
const highlightBox = document.createElement('div');
highlightBox.id = 'my-trans-highlight';
document.body.appendChild(highlightBox);

const popupBox = document.createElement('div');
popupBox.id = 'my-trans-popup';
document.body.appendChild(popupBox);

// 创建状态提示框
const statusToast = document.createElement('div');
statusToast.id = 'my-trans-status-toast';
document.body.appendChild(statusToast);

// --- 变量 ---
let debounceTimer = null;
let currentWord = '';
let isTranslationEnabled = true; // 翻译功能启用状态
let lastEscTime = 0; // 上次按ESC的时间
const DOUBLE_PRESS_INTERVAL = 500; // 双击间隔时间（毫秒）

// --- 辅助函数：判断字符是否为英文 ---
function isEnglishChar(char) {
  return /^[a-zA-Z]$/.test(char);
}

// --- 核心函数：获取鼠标下的单词 ---
function getWordAtPoint(x, y) {
  // 1. 获取光标位置 Range
  let range;
  // 兼容性处理，大部分现代浏览器用 caretRangeFromPoint
  if (document.caretRangeFromPoint) {
    range = document.caretRangeFromPoint(x, y);
  } else if (document.caretPositionFromPoint) {
    // Firefox 使用这个
    const pos = document.caretPositionFromPoint(x, y);
    range = document.createRange();
    range.setStart(pos.offsetNode, pos.offset);
    range.setEnd(pos.offsetNode, pos.offset);
  }
  
  if (!range || !range.startContainer) return null;
  
  const node = range.startContainer;
  const offset = range.startOffset;

  // 必须是文本节点
  if (node.nodeType !== Node.TEXT_NODE) return null;

  const text = node.textContent;
  
  // 2. 左右扩展寻找单词边界
  let start = offset;
  let end = offset;

  // 向左找
  while (start > 0 && isEnglishChar(text[start - 1])) {
    start--;
  }
  // 向右找
  while (end < text.length && isEnglishChar(text[end])) {
    end++;
  }

  // 如果没有选中有效的单词（比如点在空格上）
  if (start === end) return null;

  // 3. 构建完整的单词 Range
  const wordRange = document.createRange();
  wordRange.setStart(node, start);
  wordRange.setEnd(node, end);

  // 4. 检查鼠标是否真的在单词的矩形范围内
  const rect = wordRange.getBoundingClientRect();
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    return null; // 鼠标不在单词上，不翻译
  }

  return {
    word: text.slice(start, end),
    range: wordRange
  };
}

// --- 监听鼠标移动 ---
document.addEventListener('mousemove', (e) => {
  // 如果翻译功能被禁用，直接返回
  if (!isTranslationEnabled) {
    return;
  }

  // 1. 鼠标一动，就清除之前的定时器和弹窗
  clearTimeout(debounceTimer);
  highlightBox.style.display = 'none';
  popupBox.style.display = 'none';

  // 2. 只有停顿 400ms 毫秒后才触发 (防抖)
  debounceTimer = setTimeout(() => {
    const result = getWordAtPoint(e.clientX, e.clientY);

    // 只有当捕捉到单词，且单词长度大于1时才翻译
    if (result && result.word.length > 1) {
      handleTranslation(result.word, result.range);
    }
  }, 50); // 150ms 更快响应
});

// --- 处理翻译流程 ---
function handleTranslation(text, range) {
  currentWord = text;
  
  // 1. 显示高亮框
  const rect = range.getBoundingClientRect();
  // 加上 window.scrollY 是为了防止页面滚动后位置不对
  highlightBox.style.width = `${rect.width}px`;
  highlightBox.style.height = `${rect.height}px`;
  highlightBox.style.top = `${rect.top + window.scrollY}px`;
  highlightBox.style.left = `${rect.left + window.scrollX}px`;
  highlightBox.style.display = 'block';

  // 2. 发送给后台请求翻译（不显示 Loading）
  chrome.runtime.sendMessage({ action: 'translate', text: text }, (response) => {
    if (response && response.result) {
      showPopup(rect, response.result);
    }
  });
}

// --- 显示弹窗 ---
function showPopup(rect, text) {
  popupBox.innerText = text;
  popupBox.style.display = 'block';
  
  // 计算弹窗位置（显示在高亮框上方 10px）
  const popupHeight = popupBox.offsetHeight;
  const popupWidth = popupBox.offsetWidth;
  
  // 简单计算：水平居中，垂直在上方
  let top = rect.top + window.scrollY - popupHeight - 10;
  let left = rect.left + window.scrollX + (rect.width / 2) - (popupWidth / 2);
  let isBelow = false; // 记录弹框是否在下方

  // 边界检查：防止弹框超出屏幕
  // 右边界检查
  if (left + popupWidth > window.innerWidth + window.scrollX) {
    left = window.innerWidth + window.scrollX - popupWidth - 10;
  }
  // 左边界检查
  if (left < window.scrollX) {
    left = window.scrollX + 10;
  }
  // 顶部边界检查：如果上方空间不够，显示在下方
  if (top < window.scrollY) {
    top = rect.bottom + window.scrollY + 10;
    isBelow = true;
  }

  // 根据位置添加或移除 below 类
  if (isBelow) {
    popupBox.classList.add('below');
  } else {
    popupBox.classList.remove('below');
  }

  popupBox.style.top = `${top}px`;
  popupBox.style.left = `${left}px`;
}

// --- 显示状态提示 ---
function showStatusToast(message) {
  statusToast.innerText = message;
  statusToast.style.display = 'block';
  statusToast.style.opacity = '1';

  // 2秒后淡出
  setTimeout(() => {
    statusToast.style.opacity = '0';
    setTimeout(() => {
      statusToast.style.display = 'none';
    }, 300);
  }, 2000);
}

// --- 监听 ESC 键 ---
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const currentTime = Date.now();
    const timeSinceLastEsc = currentTime - lastEscTime;

    if (timeSinceLastEsc < DOUBLE_PRESS_INTERVAL) {
      // 双击 ESC - 开启翻译
      isTranslationEnabled = true;
      showStatusToast('✓ 翻译功能已开启');
      lastEscTime = 0; // 重置
    } else {
      // 单击 ESC - 关闭翻译
      isTranslationEnabled = false;
      highlightBox.style.display = 'none';
      popupBox.style.display = 'none';
      showStatusToast('✗ 翻译功能已关闭（双击 ESC 重新开启）');
      lastEscTime = currentTime;
    }
  }
});