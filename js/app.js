// js/app.js — 应用初始化入口
const App = {
  async init() {
    // 1. 基础组件初始化（带空保护，部分模块可能尚未创建）
    try { notifications.init(); } catch (e) { console.warn('[App] notifications.init 失败:', e.message); }

    if (typeof ModalManager !== 'undefined') {
      try { ModalManager.init(); } catch (e) { console.warn('[App] ModalManager.init 失败:', e.message); }
    }

    if (typeof Settings !== 'undefined') {
      try { Settings.init(); } catch (e) { console.warn('[App] Settings.init 失败:', e.message); }
    }

    // 2. 加载角色卡
    await this.loadCharacterCard();

    // 3. 初始化各模块（带空保护）
    if (typeof ChatRenderer !== 'undefined') {
      try { ChatRenderer.init(); } catch (e) { console.warn('[App] ChatRenderer.init 失败:', e.message); }
    }
    if (typeof ChatInput !== 'undefined') {
      try { ChatInput.init(); } catch (e) { console.warn('[App] ChatInput.init 失败:', e.message); }
    }
    if (typeof CharacterSettings !== 'undefined') {
      try { CharacterSettings.init(); } catch (e) { console.warn('[App] CharacterSettings.init 失败:', e.message); }
    }
    if (typeof WorldBook !== 'undefined') {
      try { WorldBook.init(); } catch (e) { console.warn('[App] WorldBook.init 失败:', e.message); }
    }
    if (typeof CharacterManager !== 'undefined') {
      try { CharacterManager.init(); } catch (e) { console.warn('[App] CharacterManager.init 失败:', e.message); }
    }
    if (typeof CharacterEditor !== 'undefined') {
      try { CharacterEditor.init(); } catch (e) { console.warn('[App] CharacterEditor.init 失败:', e.message); }
    }

    // 4. 加载持久化状态
    state.init({
      messages: [],
      showLeftPanel: true,
      showRightPanel: true,
    });

    console.log('[App] 初始化完成');
  },

  async loadCharacterCard() {
    let card = storage.get('character_card');
    if (!card) {
      // 从 data/qhl.json 读取默认角色卡
      try {
        const resp = await fetch('data/qhl.json');
        card = await resp.json();
        storage.set('character_card', card);
      } catch (e) {
        console.warn('[App] 无法加载默认角色卡:', e.message);
      }
    }
  }
};

// 启动
document.addEventListener('DOMContentLoaded', () => App.init());
