(function() {
  'use strict';

  var STORAGE_KEY = 'eisei-study-progress';
  var MAX_HISTORY = 5000;
  var cachedProgress = null;
  var currentUid = null;
  var syncInProgress = false;

  // ===== Local Storage =====

  function getLocalProgress() {
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

  function saveLocal(progress) {
    if (progress.history.length > MAX_HISTORY) {
      progress.history = progress.history.slice(-MAX_HISTORY);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }

  function createEmpty() {
    return { version: 1, history: [], examResults: [] };
  }

  // ===== Firestore Sync =====

  function getFirestoreRef() {
    if (!currentUid) return null;
    return db.collection('users').doc(currentUid);
  }

  function saveToFirestore(progress) {
    var ref = getFirestoreRef();
    if (!ref || syncInProgress) return;

    var data = {
      version: progress.version,
      history: JSON.stringify(progress.history),
      examResults: JSON.stringify(progress.examResults),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    ref.set(data).catch(function(err) {
      console.error('Firestore save error:', err);
    });
  }

  function loadFromFirestore(callback) {
    var ref = getFirestoreRef();
    if (!ref) { callback(null); return; }

    syncInProgress = true;
    ref.get().then(function(doc) {
      syncInProgress = false;
      if (doc.exists) {
        var data = doc.data();
        var progress = {
          version: data.version || 1,
          history: JSON.parse(data.history || '[]'),
          examResults: JSON.parse(data.examResults || '[]')
        };
        callback(progress);
      } else {
        callback(null);
      }
    }).catch(function(err) {
      syncInProgress = false;
      console.error('Firestore load error:', err);
      callback(null);
    });
  }

  function mergeProgress(local, cloud) {
    if (!cloud) return local;
    if (!local || local.history.length === 0) return cloud;

    // Merge histories by timestamp (dedup by questionId + timestamp)
    var allHistory = local.history.concat(cloud.history);
    var seen = {};
    var merged = [];
    allHistory.forEach(function(h) {
      var key = h.questionId + '_' + h.timestamp;
      if (!seen[key]) {
        seen[key] = true;
        merged.push(h);
      }
    });
    merged.sort(function(a, b) { return a.timestamp - b.timestamp; });

    // Merge exam results by date
    var allExams = (local.examResults || []).concat(cloud.examResults || []);
    var seenExam = {};
    var mergedExams = [];
    allExams.forEach(function(e) {
      var key = e.date;
      if (!seenExam[key]) {
        seenExam[key] = true;
        mergedExams.push(e);
      }
    });
    mergedExams.sort(function(a, b) { return a.date - b.date; });

    return { version: 1, history: merged, examResults: mergedExams };
  }

  // ===== Public API =====

  function getProgress() {
    if (cachedProgress) return cachedProgress;
    return getLocalProgress();
  }

  function save(progress) {
    if (progress.history.length > MAX_HISTORY) {
      progress.history = progress.history.slice(-MAX_HISTORY);
    }
    cachedProgress = progress;
    saveLocal(progress);
    if (currentUid) {
      saveToFirestore(progress);
    }
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
    cachedProgress = null;
    localStorage.removeItem(STORAGE_KEY);
    if (currentUid) {
      var ref = getFirestoreRef();
      if (ref) ref.delete().catch(function(err) { console.error(err); });
    }
  }

  // ===== Auth State Listener =====

  Auth.onAuthChange(function(user) {
    if (user) {
      currentUid = user.uid;
      // Load from Firestore and merge with local data
      loadFromFirestore(function(cloudProgress) {
        var localProgress = getLocalProgress();
        var merged = mergeProgress(localProgress, cloudProgress);
        cachedProgress = merged;
        saveLocal(merged);
        saveToFirestore(merged);

        // Re-render the current page
        if (typeof route === 'function') {
          route();
        } else {
          var evt = new HashChangeEvent('hashchange');
          window.dispatchEvent(evt);
        }
      });
    } else {
      currentUid = null;
      cachedProgress = null;

      // Re-render
      var evt = new HashChangeEvent('hashchange');
      window.dispatchEvent(evt);
    }
  });

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
