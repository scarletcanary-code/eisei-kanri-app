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

  window.addEventListener('hashchange', route);
  document.addEventListener('DOMContentLoaded', route);
})();
