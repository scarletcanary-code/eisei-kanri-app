(function() {
  'use strict';

  var state = {
    difficulty: null, // 'standard', 'hard', or null (not selected)
    category: null,
    questions: [],
    currentIndex: 0,
    selectedChoice: -1,
    answered: false,
    correctCount: 0,
    totalAnswered: 0,
    shuffledChoices: null,
    lastShuffledIndex: -1
  };

  function getBank() {
    return state.difficulty === 'hard' ? (window.QuestionBankHard || {}) : (window.QuestionBank || {});
  }

  function render(container) {
    if (!state.difficulty) {
      renderDifficultySelect(container);
    } else if (!state.category) {
      renderCategorySelect(container);
    } else {
      renderQuestion(container);
    }
  }

  function renderDifficultySelect(container) {
    var html = '<div class="card" style="text-align:center">';
    html += '<h2 class="card-title">学習モード - 難易度を選択</h2>';
    html += '<div style="display:flex;flex-direction:column;gap:16px;max-width:400px;margin:0 auto">';

    // Standard
    var stdCount = 0;
    CATEGORIES.forEach(function(cat) { stdCount += (window.QuestionBank[cat.key] || []).length; });
    html += '<button class="category-select-btn" data-difficulty="standard" style="text-align:center">';
    html += '<div style="font-size:18px;font-weight:700">📘 標準問題</div>';
    html += '<span class="q-count">本試験レベル・' + stdCount + '問</span>';
    html += '</button>';

    // Hard
    var hardCount = 0;
    CATEGORIES.forEach(function(cat) { hardCount += (window.QuestionBankHard && window.QuestionBankHard[cat.key] || []).length; });
    html += '<button class="category-select-btn" data-difficulty="hard" style="text-align:center;border-color:#dc2626">';
    html += '<div style="font-size:18px;font-weight:700;color:#dc2626">🔥 難問チャレンジ</div>';
    html += '<span class="q-count">本試験より難しめ・' + hardCount + '問</span>';
    html += '</button>';

    html += '</div>';
    html += '<div class="btn-row" style="margin-top:24px"><a href="#dashboard" class="btn btn-outline">ダッシュボードに戻る</a></div>';
    html += '</div>';

    container.innerHTML = html;

    container.querySelectorAll('[data-difficulty]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        state.difficulty = btn.getAttribute('data-difficulty');
        render(container);
      });
    });
  }

  function renderCategorySelect(container) {
    var bank = getBank();
    var diffLabel = state.difficulty === 'hard' ? '🔥 難問チャレンジ' : '📘 標準問題';

    var html = '<div class="card">';
    html += '<h2 class="card-title">' + diffLabel + ' - 科目を選択</h2>';
    html += '<div class="category-select-grid">';

    CATEGORIES.forEach(function(cat) {
      var qs = bank[cat.key] || [];
      var stats = Storage.getCategoryStats(cat.key);
      html += '<button class="category-select-btn" data-category="' + cat.key + '">';
      html += '<div>' + cat.label + '</div>';
      html += '<span class="q-count">' + qs.length + '問';
      if (stats.total > 0) {
        html += ' / 正答率 ' + stats.accuracy + '%';
      }
      html += '</span>';
      html += '</button>';
    });

    // All categories shuffle option
    var totalQ = 0;
    CATEGORIES.forEach(function(cat) {
      totalQ += (bank[cat.key] || []).length;
    });
    html += '<button class="category-select-btn" data-category="all">';
    html += '<div>全科目シャッフル</div>';
    html += '<span class="q-count">' + totalQ + '問</span>';
    html += '</button>';

    html += '</div>';
    html += '<div class="btn-row">';
    html += '<button class="btn btn-outline" id="back-to-difficulty">難易度選択に戻る</button>';
    html += '<a href="#dashboard" class="btn btn-outline">ダッシュボードに戻る</a>';
    html += '</div>';
    html += '</div>';

    container.innerHTML = html;

    container.querySelectorAll('.category-select-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        startStudy(btn.getAttribute('data-category'));
        render(container);
      });
    });

    var backBtn = container.querySelector('#back-to-difficulty');
    if (backBtn) {
      backBtn.addEventListener('click', function() {
        state.difficulty = null;
        render(container);
      });
    }
  }

  function startStudy(categoryKey) {
    var bank = getBank();
    state.category = categoryKey;
    state.currentIndex = 0;
    state.selectedChoice = -1;
    state.answered = false;
    state.correctCount = 0;
    state.totalAnswered = 0;
    state.lastShuffledIndex = -1;

    if (categoryKey === 'all') {
      var all = [];
      CATEGORIES.forEach(function(cat) {
        all = all.concat(bank[cat.key] || []);
      });
      state.questions = shuffleArray(all);
    } else {
      state.questions = shuffleArray(bank[categoryKey] || []);
    }
  }

  function renderQuestion(container) {
    if (state.currentIndex >= state.questions.length) {
      renderComplete(container);
      return;
    }

    var q = state.questions[state.currentIndex];
    var catLabel = '';
    CATEGORIES.forEach(function(cat) {
      if (cat.key === q.category) catLabel = cat.shortLabel;
    });

    // Shuffle choices once per question
    if (state.lastShuffledIndex !== state.currentIndex) {
      state.shuffledChoices = shuffleChoices(q);
      state.lastShuffledIndex = state.currentIndex;
      state.selectedChoice = -1;
    }
    var sc = state.shuffledChoices;

    var diffBadge = state.difficulty === 'hard' ? '<span class="badge badge-fail" style="font-size:11px">難問</span>' : '';

    var html = '<div class="card">';

    // Header
    html += '<div class="question-header">';
    html += '<span class="counter">問題 ' + (state.currentIndex + 1) + ' / ' + state.questions.length + '</span>';
    html += '<span class="counter">' + state.correctCount + ' / ' + state.totalAnswered + ' 正解</span>';
    html += '</div>';
    html += '<div class="question-header"><span class="badge badge-pass">' + catLabel + '</span>' + diffBadge + '</div>';

    // Question text
    html += '<div class="question-text">' + formatText(q.question) + '</div>';

    // Choices (use shuffled)
    html += '<ul class="choices-list">';
    sc.choices.forEach(function(choice, i) {
      var cls = 'choice-btn';
      if (state.answered) {
        cls += ' disabled';
        if (i === sc.correctIndex) cls += ' correct';
        else if (i === state.selectedChoice && i !== sc.correctIndex) cls += ' incorrect';
      } else if (i === state.selectedChoice) {
        cls += ' selected';
      }
      html += '<li><button class="' + cls + '" data-index="' + i + '">' + escapeHtml(choice) + '</button></li>';
    });
    html += '</ul>';

    // Answer button or explanation
    if (!state.answered) {
      html += '<div class="btn-row">';
      html += '<button class="btn btn-primary btn-lg" id="submit-answer"' +
        (state.selectedChoice < 0 ? ' disabled style="opacity:0.5;cursor:not-allowed"' : '') +
        '>回答する</button>';
      html += '</div>';
    } else {
      var isCorrect = state.selectedChoice === sc.correctIndex;
      html += '<div class="explanation">';
      html += '<strong style="color:' + (isCorrect ? 'var(--success)' : 'var(--danger)') + '">';
      html += isCorrect ? '正解！' : '不正解';
      html += '</strong><br>';
      html += formatExplanation(remapExplanation(q.explanation, sc.originalToNew));
      html += '</div>';
      html += '<div class="btn-row">';
      if (state.currentIndex < state.questions.length - 1) {
        html += '<button class="btn btn-primary btn-lg" id="next-question">次の問題</button>';
      } else {
        html += '<button class="btn btn-success btn-lg" id="next-question">結果を見る</button>';
      }
      html += '</div>';
    }

    // Back button
    html += '<div class="btn-row" style="margin-top:8px">';
    html += '<button class="btn btn-outline btn-sm" id="back-to-select">科目選択に戻る</button>';
    html += '</div>';

    html += '</div>';
    container.innerHTML = html;

    // Event listeners
    container.querySelectorAll('.choice-btn:not(.disabled)').forEach(function(btn) {
      btn.addEventListener('click', function() {
        state.selectedChoice = parseInt(btn.getAttribute('data-index'));
        render(container);
      });
    });

    var submitBtn = container.querySelector('#submit-answer');
    if (submitBtn && state.selectedChoice >= 0) {
      submitBtn.addEventListener('click', function() {
        state.answered = true;
        state.totalAnswered++;
        var isCorrect = state.selectedChoice === state.shuffledChoices.correctIndex;
        if (isCorrect) state.correctCount++;
        Storage.saveAnswer(q.id, q.category, isCorrect, 'study');
        render(container);
      });
    }

    var nextBtn = container.querySelector('#next-question');
    if (nextBtn) {
      nextBtn.addEventListener('click', function() {
        state.currentIndex++;
        state.selectedChoice = -1;
        state.answered = false;
        render(container);
      });
    }

    var backBtn = container.querySelector('#back-to-select');
    if (backBtn) {
      backBtn.addEventListener('click', function() {
        state.category = null;
        state.questions = [];
        render(container);
      });
    }
  }

  function renderComplete(container) {
    var pct = state.totalAnswered > 0 ? Math.round((state.correctCount / state.totalAnswered) * 100) : 0;
    var html = '<div class="card" style="text-align:center">';
    html += '<h2 class="card-title">学習完了</h2>';
    html += '<div class="verdict ' + (pct >= 60 ? 'pass' : 'fail') + '">';
    html += state.correctCount + ' / ' + state.totalAnswered + ' 正解 (' + pct + '%)';
    html += '</div>';
    html += '<div class="btn-row" style="justify-content:center">';
    html += '<button class="btn btn-primary" id="retry-study">もう一度学習する</button>';
    html += '<a href="#dashboard" class="btn btn-outline">ダッシュボードに戻る</a>';
    html += '</div>';
    html += '</div>';

    container.innerHTML = html;

    container.querySelector('#retry-study').addEventListener('click', function() {
      state.category = null;
      render(container);
    });
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function formatText(str) {
    return escapeHtml(str).replace(/\n/g, '<br>');
  }

  function formatExplanation(str) {
    var html = escapeHtml(str).replace(/\n/g, '<br>');
    html = html.replace(/([。）])(?=(?:選択肢[1-5]|[A-E])[はもの])/g, '$1</p><p>');
    html = html.replace(/([。）])(?=よって|したがって|以上より|なお[、])/g, '$1</p><p>');
    html = html.replace(/(正しい|正解)/g, '<span class="exp-correct">$1</span>');
    html = html.replace(/(誤り|誤っている|不正解|間違い)/g, '<span class="exp-incorrect">$1</span>');
    return '<p>' + html + '</p>';
  }

  window.Study = {
    render: function(container) {
      state.difficulty = null;
      state.category = null;
      state.questions = [];
      state.currentIndex = 0;
      state.selectedChoice = -1;
      state.answered = false;
      state.correctCount = 0;
      state.totalAnswered = 0;
      state.lastShuffledIndex = -1;
      render(container);
    }
  };
})();
