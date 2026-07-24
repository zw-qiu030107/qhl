// js/settings.js — 对话设置标签页交互

// 滑块实时数值更新
['temperature', 'topp'].forEach(id => {
  const slider = document.getElementById(`cs-${id}`);
  const display = document.getElementById(`${id}-val`);
  if (slider && display) {
    slider.addEventListener('input', () => {
      display.textContent = parseFloat(slider.value).toFixed(id === 'topp' ? 2 : 1);
    });
  }
});

// 流式输出切换开关
const streamingBtn = document.getElementById('cs-streaming');
if (streamingBtn) {
  streamingBtn.addEventListener('click', () => {
    const isActive = streamingBtn.classList.toggle('active');
    streamingBtn.setAttribute('aria-checked', isActive);
  });
}

// 作者注记频率警告显示
const anFreqInput = document.getElementById('cs-an-frequency');
const anWarning = document.getElementById('an-warning');
if (anFreqInput && anWarning) {
  const toggleWarning = () => {
    anWarning.style.display = parseFloat(anFreqInput.value) === 0 ? '' : 'none';
  };
  anFreqInput.addEventListener('input', toggleWarning);
  anFreqInput.addEventListener('change', toggleWarning);
  // 初始检查
  toggleWarning();
}

// ===== 全局设置对象 =====

const Settings = {
  defaults: {
    theme: 'default',
    fontSize: 'medium',
    bubbleStyle: 'default',
    apiUrl: '',
    apiKey: '',
    apiModel: '',
  },

  init() {
    this.load();
    document.getElementById('btn-settings').addEventListener('click', () => {
      ModalManager.open('modal-settings');
    });
    document.getElementById('setting-theme').addEventListener('change', (e) => this.set('theme', e.target.value));
    document.getElementById('setting-font-size').addEventListener('change', (e) => this.set('fontSize', e.target.value));
    document.getElementById('setting-bubble-style').addEventListener('change', (e) => this.set('bubbleStyle', e.target.value));
    document.getElementById('btn-clear-all').addEventListener('click', () => this.clearAll());

    // API 配置
    document.getElementById('setting-api-url').addEventListener('change', (e) => this.set('apiUrl', e.target.value));
    document.getElementById('setting-api-key').addEventListener('change', (e) => this.set('apiKey', e.target.value));
    document.getElementById('setting-api-model').addEventListener('change', (e) => this.set('apiModel', e.target.value));
    document.getElementById('btn-test-api').addEventListener('click', () => this.testApiConnection());
  },

  load() {
    const saved = window.storage?.get('settings') || {};
    const s = { ...this.defaults, ...saved };
    Object.entries(s).forEach(([k, v]) => {
      const el = document.getElementById(`setting-${k.replace(/([A-Z])/g, '-$1').toLowerCase()}`);
      if (el) el.value = v;
    });
    this.apply(s);
  },

  set(key, val) {
    const s = this.getAll();
    s[key] = val;
    window.storage?.set('settings', s);
    this.apply(s);
  },

  getAll() {
    return { ...this.defaults, ...(window.storage?.get('settings') || {}) };
  },

  getApiConfig() {
    const s = this.getAll();
    return { url: s.apiUrl, key: s.apiKey, model: s.apiModel };
  },

  apply(s) {
    document.documentElement.dataset.theme = s.theme;
    document.documentElement.style.setProperty('--font-size-multiplier',
      s.fontSize === 'small' ? '0.9' : s.fontSize === 'large' ? '1.15' : '1');
    document.body.dataset.bubbleStyle = s.bubbleStyle;
  },

  async testApiConnection() {
    const { url, key, model } = this.getApiConfig();
    const resultEl = document.getElementById('api-test-result');
    if (!url || !key) {
      resultEl.textContent = '请先填写接口地址和 API Key';
      resultEl.style.color = 'var(--danger)';
      return;
    }
    resultEl.textContent = '测试中…';
    resultEl.style.color = 'var(--text-muted)';
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
          model: model || 'gpt-4o',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5,
        }),
      });
      if (resp.ok) {
        resultEl.textContent = '连接成功';
        resultEl.style.color = 'var(--success)';
        this.set('apiUrl', url);
        this.set('apiKey', key);
        this.set('apiModel', model);
      } else {
        const err = await resp.text();
        resultEl.textContent = `连接失败: ${resp.status}`;
        resultEl.style.color = 'var(--danger)';
        console.warn('[API Test]', err);
      }
    } catch (e) {
      resultEl.textContent = `网络错误: ${e.message}`;
      resultEl.style.color = 'var(--danger)';
    }
  },

  clearAll() {
    if (confirm('确定要清空所有本地数据吗？此操作不可撤销。')) {
      window.storage?.clearAll();
      window.notifications?.show('success', '已清空', '所有本地数据已清除，刷新页面生效');
    }
  }
};

// ===== 键盘快捷键与导航按钮绑定 =====

// Ctrl+H 打开对话历史, Ctrl+B 打开书签
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'h') {
    e.preventDefault();
    ModalManager.open('modal-chat-history');
  }
  if (e.ctrlKey && e.key === 'b') {
    e.preventDefault();
    ModalManager.open('modal-bookmarks');
  }
});

// 导航按钮点击打开对应模态框
document.getElementById('btn-history')?.addEventListener('click', () => {
  ModalManager.open('modal-chat-history');
});
document.getElementById('btn-bookmarks')?.addEventListener('click', () => {
  ModalManager.open('modal-bookmarks');
});

// 通知按钮 — 显示最近通知
document.getElementById('btn-notifications')?.addEventListener('click', () => {
  const recent = window.storage?.get('notification_history') || [];
  if (recent.length === 0) {
    window.notifications?.show('info', '通知中心', '暂无通知记录');
  } else {
    window.notifications?.show('info', '通知中心', `最近 ${recent.length} 条通知，详情见控制台`);
    console.table(recent.slice(-10));
  }
});
