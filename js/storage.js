(function() {
  'use strict';

  var STORAGE_KEY = 'eisei-study-progress';
  var MAX_HISTORY = 5000;

  function getProgress() {
    try {
      var data = localStorage.getItem(STORAGE_KEY);
      if (!data) return createEmpty();
      var parsed = JSON.parse(data);
      if (!parsed.version) return createEmpty();
      return parsed;
    } catch (e) {
      return createEmpty();
    }
  }

  function createEmpty() {
    return { version: 1, history: [], examResults: [] };
  }

  function save(progress) {
    if (progress.history.length > MAX_HISTORY) {
      progress.history = progress.history.slice(-MAX_HISTORY);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }

  function saveAnswer(questionId, category, correct, mode) {
    var progress = getProgress();
    progress.history.push({
      questionId: questionId,
      category: category,
      correct: correct,
      timestamp: Date.now(),
      mode: mode || 'study'
    });
    save(progress);
  }

  function saveExamResult(result) {
    var progress = getProgress();
    progress.examResults.push(result);
    save(progress);
  }

  function getCategoryStats(category) {
    var progress = getProgress();
    var items = progress.history.filter(function(h) { return h.category === category; });
    var correct = items.filter(function(h) { return h.correct; }).length;
    return {
      total: items.length,
      correct: correct,
      accuracy: items.length > 0 ? Math.round((correct / items.length) * 100) : 0
    };
  }

  function getOverallStats() {
    var progress = getProgress();
    var items = progress.history;
    var correct = items.filter(function(h) { return h.correct; }).length;
    return {
      total: items.length,
      correct: correct,
      accuracy: items.length > 0 ? Math.round((correct / items.length) * 100) : 0
    };
  }

  function getExamResults() {
    return getProgress().examResults;
  }

  function resetProgress() {
    localStorage.removeItem(STORAGE_KEY);
  }

  window.Storage = {
    getProgress: getProgress,
    saveAnswer: saveAnswer,
    saveExamResult: saveExamResult,
    getCategoryStats: getCategoryStats,
    getOverallStats: getOverallStats,
    getExamResults: getExamResults,
    resetProgress: resetProgress
  };
})();
