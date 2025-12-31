// 翻译源配置和实现

const translators = {
  google: {
    name: 'Google Translate',
    needsApiKey: false,
    translate: async (text) => {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data && data[0] && data[0][0] && data[0][0][0]) {
        return data[0][0][0];
      }
      throw new Error('翻译失败');
    }
  },

  deepl: {
    name: 'DeepL',
    needsApiKey: true,
    translate: async (text, apiKey) => {
      if (!apiKey) throw new Error('请配置 DeepL API Key');

      const url = 'https://api-free.deepl.com/v2/translate';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: [text],
          target_lang: 'ZH'
        })
      });

      const data = await response.json();
      if (data.translations && data.translations[0]) {
        return data.translations[0].text;
      }
      throw new Error('DeepL 翻译失败');
    }
  },

  youdao: {
    name: '有道翻译',
    needsApiKey: true,
    translate: async (text, apiKey, appSecret) => {
      if (!apiKey || !appSecret) throw new Error('请配置有道翻译 APP ID 和密钥');

      // 有道翻译需要签名（v3版本）
      const salt = String(new Date().getTime());
      const curtime = String(Math.round(new Date().getTime() / 1000));
      const sign = await generateYoudaoSign(apiKey, text, salt, curtime, appSecret);

      const url = 'https://openapi.youdao.com/api';

      // 使用POST方法，通过FormData传递参数
      const formData = new URLSearchParams();
      formData.append('q', text);
      formData.append('from', 'auto');
      formData.append('to', 'zh-CHS');
      formData.append('appKey', apiKey);
      formData.append('salt', salt);
      formData.append('sign', sign);
      formData.append('signType', 'v3');
      formData.append('curtime', curtime);

      console.log('[有道翻译] 请求URL:', url);
      console.log('[有道翻译] 请求参数:', { appKey: apiKey, salt, curtime, sign, text });

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: formData.toString()
        });

        console.log('[有道翻译] 响应状态:', response.status);

        const data = await response.json();
        console.log('[有道翻译] 响应数据:', data);

        if (data.errorCode === '0' && data.translation && data.translation[0]) {
          return data.translation[0];
        }
        throw new Error(`有道翻译失败: errorCode=${data.errorCode}`);
      } catch (error) {
        console.error('[有道翻译] 请求错误:', error);
        throw error;
      }
    }
  },

  baidu: {
    name: '百度翻译',
    needsApiKey: true,
    translate: async (text, appId, secretKey) => {
      if (!appId || !secretKey) throw new Error('请配置百度翻译 APP ID 和密钥');

      // 百度翻译需要签名
      const salt = new Date().getTime();
      const sign = await generateBaiduSign(appId, text, salt, secretKey);

      const url = `https://fanyi-api.baidu.com/api/trans/vip/translate?q=${encodeURIComponent(text)}&from=auto&to=zh&appid=${appId}&salt=${salt}&sign=${sign}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.trans_result && data.trans_result[0]) {
        return data.trans_result[0].dst;
      }
      throw new Error(`百度翻译失败: ${data.error_code || '未知错误'}`);
    }
  }
};

// 有道翻译签名生成（v3版本）
async function generateYoudaoSign(appKey, query, salt, curtime, appSecret) {
  const input = truncate(query);
  const str = appKey + input + salt + curtime + appSecret;
  const sign = await sha256(str);

  console.log('[有道签名] input:', input);
  console.log('[有道签名] 待签名字符串:', str);
  console.log('[有道签名] 签名结果:', sign);

  return sign;
}

// 百度翻译签名生成
async function generateBaiduSign(appId, query, salt, secretKey) {
  const str = appId + query + salt + secretKey;
  return await md5(str);
}

// 截断字符串（有道翻译要求）
// 注意：需要使用UTF-8字节长度，而不是字符长度
function truncate(q) {
  const len = getByteLength(q);
  if (len <= 20) return q;
  return q.substring(0, 10) + len + q.substring(q.length - 10, q.length);
}

// 获取字符串的UTF-8字节长度
function getByteLength(str) {
  return new TextEncoder().encode(str).length;
}

// SHA256 哈希
async function sha256(str) {
  const buffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// MD5 哈希（使用简单实现）
async function md5(str) {
  // 注意：浏览器不支持MD5，这里需要引入第三方库或使用crypto-js
  // 为简化，这里返回一个占位符
  // 实际使用时建议引入 crypto-js 库
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 导出翻译器（用于service worker）
if (typeof self !== 'undefined' && self.translators === undefined) {
  self.translators = translators;
}
