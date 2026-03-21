(function() {
  'use strict';

  window.CATEGORIES = [
    { key: 'hazardous-health', label: '労働衛生（有害業務に係るもの）', shortLabel: '衛生（有害）', examCount: 10, pointsPerQ: 8 },
    { key: 'general-health',   label: '労働衛生（有害業務に係るものを除く）', shortLabel: '衛生（一般）', examCount: 7,  pointsPerQ: 10 },
    { key: 'hazardous-law',    label: '関係法令（有害業務に係るもの）', shortLabel: '法令（有害）', examCount: 10, pointsPerQ: 8 },
    { key: 'general-law',      label: '関係法令（有害業務に係るものを除く）', shortLabel: '法令（一般）', examCount: 7,  pointsPerQ: 10 },
    { key: 'physiology',       label: '労働生理', shortLabel: '労働生理', examCount: 10, pointsPerQ: 10 }
  ];

  window.TOTAL_EXAM_POINTS = 400;
  window.PASS_TOTAL_PERCENT = 0.6;
  window.PASS_SUBJECT_PERCENT = 0.4;
  window.EXAM_TIME_SECONDS = 3 * 60 * 60;

  function route() {
    var hash = location.hash || '#dashboard';
    var app = document.getElementById('app');
    if (!app) return;

    if (hash === '#study') {
      Study.render(app);
    } else if (hash === '#exam') {
      Exam.render(app);
    } else if (hash === '#exam-result') {
      Exam.renderResult(app);
    } else {
      Dashboard.render(app);
    }
  }

  // Utility: shuffle array (Fisher-Yates)
  window.shuffleArray = function(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  };

  // Utility: shuffle choices of a question, returning new correctIndex
  // Returns { choices: [...], correctIndex: number, originalToNew: {0:3, 1:0, ...} }
  window.shuffleChoices = function(q) {
    var indices = [];
    for (var i = 0; i < q.choices.length; i++) indices.push(i);
    var shuffled = shuffleArray(indices);

    var newChoices = [];
    var newCorrectIndex = 0;
    var originalToNew = {}; // maps original index -> new index
    for (var j = 0; j < shuffled.length; j++) {
      newChoices.push(q.choices[shuffled[j]]);
      originalToNew[shuffled[j]] = j;
      if (shuffled[j] === q.correctIndex) newCorrectIndex = j;
    }
    return { choices: newChoices, correctIndex: newCorrectIndex, originalToNew: originalToNew };
  };

  // Utility: remap choice numbers in explanation text after shuffle
  // e.g. "正解は2" -> "正解は4", "選択肢1" -> "選択肢3"
  window.remapExplanation = function(text, originalToNew) {
    if (!text || !originalToNew) return text;
    // Replace "正解は N" pattern
    text = text.replace(/正解は\s*([1-5])/g, function(match, n) {
      var orig = parseInt(n) - 1;
      var newIdx = originalToNew[orig];
      return '正解は' + (newIdx !== undefined ? newIdx + 1 : n);
    });
    // Replace "選択肢N" pattern (e.g. 選択肢1, 選択肢2)
    text = text.replace(/選択肢\s*([1-5])/g, function(match, n) {
      var orig = parseInt(n) - 1;
      var newIdx = originalToNew[orig];
      return '選択肢' + (newIdx !== undefined ? newIdx + 1 : n);
    });
    return text;
  };

  window.addEventListener('hashchange', route);
  document.addEventListener('DOMContentLoaded', route);
})();
