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
