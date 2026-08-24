(() => {
  'use strict';

  const subjectInput = document.getElementById('subject');
  if (!subjectInput) return;

  const label = document.querySelector('label[for="subject"]');
  if (label) label.textContent = 'タイトル';

  subjectInput.placeholder = '例：第3章の復習 / 過去問2025 / 今日の演習';
})();
