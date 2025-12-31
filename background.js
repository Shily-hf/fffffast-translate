// 导入翻译器配置
importScripts('translators.js');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translate') {
    handleTranslation(request.text)
      .then(result => sendResponse({ result }))
      .catch(error => {
        console.error('Translation error:', error);
        sendResponse({ result: "翻译失败", error: error.message });
      });

    return true; // 保持消息通道打开
  }
});

// 处理翻译请求
async function handleTranslation(text) {
  // 获取用户设置
  const settings = await chrome.storage.sync.get({
    translator: 'google',
    deeplApiKey: '',
    youdaoAppId: '',
    youdaoAppSecret: '',
    baiduAppId: '',
    baiduSecretKey: '',
    targetLang: 'zh-CN'
  });

  const translatorName = settings.translator;
  const translator = translators[translatorName];

  if (!translator) {
    throw new Error(`未知的翻译源: ${translatorName}`);
  }

  // 根据不同翻译源调用相应的API
  try {
    let result;
    switch (translatorName) {
      case 'google':
        result = await translator.translate(text);
        break;

      case 'deepl':
        result = await translator.translate(text, settings.deeplApiKey);
        break;

      case 'youdao':
        result = await translator.translate(text, settings.youdaoAppId, settings.youdaoAppSecret);
        break;

      case 'baidu':
        result = await translator.translate(text, settings.baiduAppId, settings.baiduSecretKey);
        break;

      default:
        throw new Error('不支持的翻译源');
    }

    return result;
  } catch (error) {
    throw new Error(`${translator.name} 翻译失败: ${error.message}`);
  }
}