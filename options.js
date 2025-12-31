// 设置页面逻辑

// 加载保存的配置
async function loadSettings() {
  const settings = await chrome.storage.sync.get({
    translator: 'google',
    deeplApiKey: '',
    youdaoAppId: '',
    youdaoAppSecret: '',
    baiduAppId: '',
    baiduSecretKey: '',
    targetLang: 'zh-CN'
  });

  // 设置翻译源单选按钮
  document.querySelector(`input[name="translator"][value="${settings.translator}"]`).checked = true;

  // 设置API配置
  document.getElementById('deeplApiKey').value = settings.deeplApiKey;
  document.getElementById('youdaoAppId').value = settings.youdaoAppId;
  document.getElementById('youdaoAppSecret').value = settings.youdaoAppSecret;
  document.getElementById('baiduAppId').value = settings.baiduAppId;
  document.getElementById('baiduSecretKey').value = settings.baiduSecretKey;
  document.getElementById('targetLang').value = settings.targetLang;

  // 显示对应的API配置区域
  toggleApiConfig(settings.translator);
}

// 切换API配置显示
function toggleApiConfig(translator) {
  const configs = ['deeplConfig', 'youdaoConfig', 'baiduConfig'];
  configs.forEach(id => {
    document.getElementById(id).style.display = 'none';
  });

  if (translator === 'deepl') {
    document.getElementById('deeplConfig').style.display = 'block';
  } else if (translator === 'youdao') {
    document.getElementById('youdaoConfig').style.display = 'block';
  } else if (translator === 'baidu') {
    document.getElementById('baiduConfig').style.display = 'block';
  }
}

// 保存设置
async function saveSettings() {
  const translator = document.querySelector('input[name="translator"]:checked').value;

  const settings = {
    translator: translator,
    deeplApiKey: document.getElementById('deeplApiKey').value.trim(),
    youdaoAppId: document.getElementById('youdaoAppId').value.trim(),
    youdaoAppSecret: document.getElementById('youdaoAppSecret').value.trim(),
    baiduAppId: document.getElementById('baiduAppId').value.trim(),
    baiduSecretKey: document.getElementById('baiduSecretKey').value.trim(),
    targetLang: document.getElementById('targetLang').value
  };

  // 验证API配置
  if (translator === 'deepl' && !settings.deeplApiKey) {
    showStatus('请填写 DeepL API Key', 'error');
    return;
  }
  if (translator === 'youdao' && (!settings.youdaoAppId || !settings.youdaoAppSecret)) {
    showStatus('请填写有道翻译 APP ID 和 Secret', 'error');
    return;
  }
  if (translator === 'baidu' && (!settings.baiduAppId || !settings.baiduSecretKey)) {
    showStatus('请填写百度翻译 APP ID 和密钥', 'error');
    return;
  }

  await chrome.storage.sync.set(settings);
  showStatus('设置已保存', 'success');
}

// 测试翻译
async function testTranslation() {
  showStatus('正在测试翻译...', 'info');

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'translate',
      text: 'hello'
    });

    if (response && response.result && !response.error) {
      showStatus(`测试成功！翻译结果: ${response.result}`, 'success');
    } else {
      showStatus('翻译失败，请检查配置是否正确', 'error');
    }
  } catch (error) {
    showStatus('翻译失败，请检查配置是否正确', 'error');
  }
}

// 显示状态消息
function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = 'status ' + type;
  statusDiv.style.display = 'block';

  // 3秒后自动隐藏（除了错误消息）
  if (type !== 'error') {
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();

  // 监听翻译源切换
  document.querySelectorAll('input[name="translator"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      toggleApiConfig(e.target.value);
    });
  });

  // 保存按钮
  document.getElementById('saveBtn').addEventListener('click', saveSettings);

  // 测试按钮
  document.getElementById('testBtn').addEventListener('click', testTranslation);

  // 密码显示/隐藏切换
  document.querySelectorAll('.toggle-password').forEach(toggle => {
    toggle.addEventListener('click', function() {
      const targetId = this.getAttribute('data-target');
      const input = document.getElementById(targetId);

      if (input.type === 'password') {
        input.type = 'text';
        this.textContent = '🙈';
        this.classList.add('active');
      } else {
        input.type = 'password';
        this.textContent = '👁️';
        this.classList.remove('active');
      }
    });
  });
});
