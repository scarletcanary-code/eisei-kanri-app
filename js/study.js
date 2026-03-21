(function() {
  'use strict';

  var state = {
    category: null,
    questions: [],
    currentIndex: 0,
    selectedChoice: -1,
    answered: false,
    correctCount: 0,
    totalAnswered: 0,
    shuffledChoices: null, // { choices: [...], correctIndex: number }
    lastShuffledIndex: -1  // track which question was shuffled
  };

  function render(container) {
    if (!state.category) {
      renderCategorySelect(container);
    } else {
      renderQuestion(container);
    }
  }

  function renderCategorySelect(container) {
    var html = '<div class="card">';
    html += '<h2 class="card-title">学習モード - 科目を選択</h2>';
    html += '<div class="category-select-grid">';

    CATEGORIES.forEach(function(cat) {
      var bank = window.QuestionBank[cat.key] || [];
      var stats = Storage.getCategoryStats(cat.key);
      html += '<button class="category-select-btn" data-category="' + cat.key + '">';
      html += '<div>' + cat.label + '</div>';
      html += '<span class="q-count">' + bank.length + '問';
      if (stats.total > 0) {
        html += ' / 正答率 ' + stats.accuracy + '%';
      }
      html += '</span>';
      html += '</button>';
    });

    // All categories shuffle option
    var totalQ = 0;
    CATEGORIES.forEach(function(cat) {
      totalQ += (window.QuestionBank[cat.key] || []).length;
    });
    html += '<button class="category-select-btn" data-category="all">';
    html += '<div>全科目シャッフル</div>';
    html += '<span class="q-count">' + totalQ + '問</span>';
    html += '</button>';

    html += '</div>';
    html += '<div class="btn-row"><a href="#dashboard" class="btn btn-outline">ダッシュボードに戻る</a></div>';
    html += '</div>';

    container.innerHTML = html;

    container.querySelectorAll('.category-select-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        startStudy(btn.getAttribute('data-category'));
        render(container);
      });
    });
  }

  function startStudy(categoryKey) {
    state.category = categoryKey;
    state.currentIndex = 0;
    state.selectedChoice = -1;
    state.answered = false;
    state.correctCount = 0;
    state.totalAnswered = 0;

    if (categoryKey === 'all') {
      var all = [];
      CATEGORIES.forEach(function(cat) {
        all = all.concat(window.QuestionBank[cat.key] || []);
      });
      state.questions = shuffleArray(all);
    } else {
      state.questions = shuffleArray(window.QuestionBank[categoryKey] || []);
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

    // Shuffle choices once per question (regenerate when question changes)
    if (state.lastShuffledIndex !== state.currentIndex) {
      state.shuffledChoices = shuffleChoices(q);
      state.lastShuffledIndex = state.currentIndex;
      state.selectedChoice = -1;
    }
    var sc = state.shuffledChoices;

    var html = '<div class="card">';

    // Header
    html += '<div class="question-header">';
    html += '<span class="counter">問題 ' + (state.currentIndex + 1) + ' / ' + state.questions.length + '</span>';
    html += '<span class="counter">' + state.correctCount + ' / ' + state.totalAnswered + ' 正解</span>';
    html += '</div>';
    html += '<div class="question-header"><span class="badge badge-pass">' + catLabel + '</span></div>';

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
      // Result indicator
      var isCorrect = state.selectedChoice === sc.correctIndex;
      html += '<div class="explanation">';
      html += '<strong style="color:' + (isCorrect ? 'var(--success)' : 'var(--danger)') + '">';
      html += isCorrect ? '正解！' : '不正解';
      html += '</strong><br>';
      html += formatExplanation(q.explanation);
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
    // 選択肢ラベルの前で段落分け
    html = html.replace(/([。）])(?=(?:選択肢[1-5]|[A-E])[はもの])/g, '$1</p><p>');
    // 「よって」「したがって」「なお」の前で段落分け
    html = html.replace(/([。）])(?=よって|したがって|以上より|なお[、])/g, '$1</p><p>');
    // 「正しい」「誤り」等をハイライト
    html = html.replace(/(正しい|正解)/g, '<span class="exp-correct">$1</span>');
    html = html.replace(/(誤り|誤っている|不正解|間違い)/g, '<span class="exp-incorrect">$1</span>');
    return '<p>' + html + '</p>';
  }

  window.Study = {
    render: function(container) {
      state.category = null;
      state.questions = [];
      state.currentIndex = 0;
      state.selectedChoice = -1;
      state.answered = false;
      state.correctCount = 0;
      state.totalAnswered = 0;
      render(container);
    }
  };
})();
