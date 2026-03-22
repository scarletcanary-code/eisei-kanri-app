(function() {
  'use strict';

  var state = {
    started: false,
    questions: [],
    answers: [],       // array of { questionIndex, selectedChoice } or null
    currentIndex: 0,
    startTime: 0,
    timerInterval: null,
    finished: false,
    result: null
  };

  function render(container) {
    if (state.finished) {
      renderResult(container);
    } else if (state.started) {
      renderExam(container);
    } else {
      renderStart(container);
    }
  }

  function renderStart(container) {
    var html = '<div class="card" style="text-align:center">';
    html += '<h2 class="card-title" style="font-size:22px">模擬試験</h2>';
    html += '<div style="text-align:left;margin-bottom:24px">';
    html += '<p style="margin-bottom:12px">本番と同じ形式で模擬試験を行います。</p>';
    html += '<table class="result-table">';
    html += '<thead><tr><th class="subject-name">科目</th><th>問題数</th><th>配点</th><th>満点</th></tr></thead>';
    html += '<tbody>';
    var totalQ = 0;
    CATEGORIES.forEach(function(cat) {
      html += '<tr>';
      html += '<td class="subject-name">' + cat.shortLabel + '</td>';
      html += '<td>' + cat.examCount + '問</td>';
      html += '<td>' + cat.pointsPerQ + '点</td>';
      html += '<td>' + (cat.examCount * cat.pointsPerQ) + '点</td>';
      html += '</tr>';
      totalQ += cat.examCount;
    });
    html += '</tbody>';
    html += '<tfoot><tr><td class="subject-name">合計</td><td>' + totalQ + '問</td><td>—</td><td>400点</td></tr></tfoot>';
    html += '</table>';
    html += '<ul style="font-size:14px;color:var(--text-muted);margin-top:16px;padding-left:20px">';
    html += '<li>制限時間：3時間</li>';
    html += '<li>合格基準：各科目40%以上 かつ 合計60%以上（240点以上）</li>';
    html += '<li>問題は科目ごとにランダムに出題されます</li>';
    html += '</ul>';
    html += '</div>';
    html += '<div class="btn-row" style="justify-content:center">';
    html += '<button class="btn btn-success btn-lg" id="start-exam">試験を開始する</button>';
    html += '<a href="#dashboard" class="btn btn-outline btn-lg">戻る</a>';
    html += '</div>';
    html += '</div>';

    container.innerHTML = html;

    container.querySelector('#start-exam').addEventListener('click', function() {
      startExam();
      render(container);
    });
  }

  function startExam() {
    state.started = true;
    state.finished = false;
    state.currentIndex = 0;
    state.startTime = Date.now();
    state.result = null;

    // Select questions per category (mix standard + hard)
    var selected = [];
    CATEGORIES.forEach(function(cat) {
      var stdBank = window.QuestionBank[cat.key] || [];
      var hardBank = (window.QuestionBankHard && window.QuestionBankHard[cat.key]) || [];
      // Combine both banks and shuffle
      var combined = shuffleArray(stdBank.concat(hardBank));
      var count = Math.min(cat.examCount, combined.length);
      for (var i = 0; i < count; i++) {
        selected.push(combined[i]);
      }
      // If not enough questions, repeat from start
      for (var j = count; j < cat.examCount; j++) {
        selected.push(combined[j % combined.length]);
      }
    });

    state.questions = selected;
    state.answers = new Array(selected.length);
    // Pre-shuffle choices for each question
    state.shuffledChoicesMap = new Array(selected.length);
    for (var i = 0; i < state.answers.length; i++) {
      state.answers[i] = -1; // -1 = unanswered
      state.shuffledChoicesMap[i] = shuffleChoices(selected[i]);
    }

    startTimer();
  }

  function startTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = setInterval(function() {
      updateTimer();
    }, 1000);
    document.addEventListener('visibilitychange', onVisibilityChange);
  }

  function stopTimer() {
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
    document.removeEventListener('visibilitychange', onVisibilityChange);
  }

  function onVisibilityChange() {
    if (!document.hidden) {
      updateTimer();
    }
  }

  function updateTimer() {
    var elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    var remaining = EXAM_TIME_SECONDS - elapsed;
    if (remaining <= 0) {
      finishExam();
      return;
    }
    var timerEl = document.querySelector('.timer-bar');
    if (timerEl) {
      timerEl.textContent = '残り時間 ' + formatTime(remaining);
      if (remaining <= 600) {
        timerEl.style.background = '#dc2626';
      }
    }
  }

  function formatTime(seconds) {
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    var s = seconds % 60;
    return h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function getRemainingSeconds() {
    var elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    return Math.max(0, EXAM_TIME_SECONDS - elapsed);
  }

  function renderExam(container) {
    var q = state.questions[state.currentIndex];
    var catLabel = '';
    CATEGORIES.forEach(function(cat) {
      if (cat.key === q.category) catLabel = cat.shortLabel;
    });

    var html = '';

    // Timer
    html += '<div class="timer-bar">残り時間 ' + formatTime(getRemainingSeconds()) + '</div>';

    // Add padding for timer bar
    html += '<div style="margin-top:52px">';

    // Exam layout
    html += '<div class="exam-layout">';

    // Question area
    html += '<div class="card">';
    html += '<div class="question-header">';
    html += '<span class="counter">問' + (state.currentIndex + 1) + ' / ' + state.questions.length + '</span>';
    html += '<span class="badge badge-pass">' + catLabel + '</span>';
    html += '</div>';
    html += '<div class="question-text">' + formatText(q.question) + '</div>';
    var sc = state.shuffledChoicesMap[state.currentIndex];
    html += '<ul class="choices-list">';
    sc.choices.forEach(function(choice, i) {
      var cls = 'choice-btn';
      if (state.answers[state.currentIndex] === i) cls += ' selected';
      html += '<li><button class="' + cls + '" data-index="' + i + '">' + formatText(choice) + '</button></li>';
    });
    html += '</ul>';

    // Navigation buttons
    html += '<div class="btn-row">';
    if (state.currentIndex > 0) {
      html += '<button class="btn btn-outline" id="prev-q">前の問題</button>';
    }
    if (state.currentIndex < state.questions.length - 1) {
      html += '<button class="btn btn-primary" id="next-q">次の問題</button>';
    }
    html += '<button class="btn btn-danger" id="finish-exam" style="margin-left:auto">試験を終了する</button>';
    html += '</div>';
    html += '</div>';

    // Navigator sidebar
    html += '<div class="card">';
    html += '<h3 class="card-title" style="font-size:14px">問題一覧</h3>';
    html += '<div class="nav-grid">';
    for (var i = 0; i < state.questions.length; i++) {
      var cellCls = 'nav-cell';
      if (state.answers[i] >= 0) cellCls += ' answered';
      if (i === state.currentIndex) cellCls += ' current';
      html += '<button class="' + cellCls + '" data-nav="' + i + '">' + (i + 1) + '</button>';
    }
    html += '</div>';
    var answeredCount = state.answers.filter(function(a) { return a >= 0; }).length;
    html += '<div style="font-size:13px;color:var(--text-muted);margin-top:8px">回答済み ' + answeredCount + ' / ' + state.questions.length + '</div>';
    html += '</div>';

    html += '</div>'; // exam-layout
    html += '</div>'; // margin-top

    container.innerHTML = html;

    // Choice handlers
    container.querySelectorAll('.choice-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        state.answers[state.currentIndex] = parseInt(btn.getAttribute('data-index'));
        renderExam(container);
      });
    });

    // Nav handlers
    container.querySelectorAll('.nav-cell').forEach(function(cell) {
      cell.addEventListener('click', function() {
        state.currentIndex = parseInt(cell.getAttribute('data-nav'));
        renderExam(container);
      });
    });

    var prevBtn = container.querySelector('#prev-q');
    if (prevBtn) {
      prevBtn.addEventListener('click', function() {
        state.currentIndex--;
        renderExam(container);
      });
    }

    var nextBtn = container.querySelector('#next-q');
    if (nextBtn) {
      nextBtn.addEventListener('click', function() {
        state.currentIndex++;
        renderExam(container);
      });
    }

    container.querySelector('#finish-exam').addEventListener('click', function() {
      var unanswered = state.answers.filter(function(a) { return a < 0; }).length;
      var msg = '試験を終了しますか？';
      if (unanswered > 0) {
        msg = '未回答の問題が' + unanswered + '問あります。試験を終了しますか？';
      }
      showConfirmDialog(msg, function() {
        finishExam();
      });
    });
  }

  function finishExam() {
    stopTimer();
    state.finished = true;
    state.started = false;

    var timeUsed = Math.floor((Date.now() - state.startTime) / 1000);
    var result = evaluateExam();
    result.date = Date.now();
    result.timeUsedSeconds = timeUsed;
    state.result = result;

    // Save answers to history
    state.questions.forEach(function(q, i) {
      var selectedIdx = state.answers[i];
      var correct = selectedIdx === state.shuffledChoicesMap[i].correctIndex;
      Storage.saveAnswer(q.id, q.category, correct, 'exam');
    });

    Storage.saveExamResult(result);

    var container = document.getElementById('app');
    if (container) renderResult(container);
  }

  function evaluateExam() {
    var totalPoints = 0;
    var allSubjectsPassed = true;
    var scores = {};

    CATEGORIES.forEach(function(cat) {
      var correctCount = 0;
      var total = 0;
      state.questions.forEach(function(q, i) {
        if (q.category === cat.key) {
          total++;
          if (state.answers[i] === state.shuffledChoicesMap[i].correctIndex) correctCount++;
        }
      });
      var points = correctCount * cat.pointsPerQ;
      var maxPoints = cat.examCount * cat.pointsPerQ;
      var subjectPassed = points >= maxPoints * PASS_SUBJECT_PERCENT;
      if (!subjectPassed) allSubjectsPassed = false;
      totalPoints += points;
      scores[cat.key] = {
        correct: correctCount,
        total: total,
        points: points,
        maxPoints: maxPoints,
        subjectPassed: subjectPassed
      };
    });

    var passed = allSubjectsPassed && totalPoints >= TOTAL_EXAM_POINTS * PASS_TOTAL_PERCENT;
    return { scores: scores, totalPoints: totalPoints, passed: passed };
  }

  function renderResult(container) {
    var result = state.result;
    if (!result) {
      location.hash = '#dashboard';
      return;
    }

    var html = '';

    // Verdict
    html += '<div class="verdict ' + (result.passed ? 'pass' : 'fail') + '">';
    html += result.passed ? '合格' : '不合格';
    html += '</div>';

    // Score table
    html += '<div class="card">';
    html += '<h3 class="card-title">科目別成績</h3>';
    html += '<table class="result-table">';
    html += '<thead><tr><th class="subject-name">科目</th><th>正答数</th><th>得点</th><th>満点</th><th>判定</th></tr></thead>';
    html += '<tbody>';
    CATEGORIES.forEach(function(cat) {
      var s = result.scores[cat.key];
      html += '<tr>';
      html += '<td class="subject-name">' + cat.shortLabel + '</td>';
      html += '<td>' + s.correct + ' / ' + s.total + '</td>';
      html += '<td>' + s.points + '点</td>';
      html += '<td>' + s.maxPoints + '点</td>';
      html += '<td><span class="badge ' + (s.subjectPassed ? 'badge-pass' : 'badge-fail') + '">' +
        (s.subjectPassed ? '合格' : '不合格') + '</span></td>';
      html += '</tr>';
    });
    html += '</tbody>';
    html += '<tfoot><tr>';
    html += '<td class="subject-name">合計</td>';
    var totalCorrect = 0;
    CATEGORIES.forEach(function(cat) { totalCorrect += result.scores[cat.key].correct; });
    html += '<td>' + totalCorrect + ' / 44</td>';
    html += '<td>' + result.totalPoints + '点</td>';
    html += '<td>400点</td>';
    html += '<td><span class="badge ' + (result.passed ? 'badge-pass' : 'badge-fail') + '">' +
      (result.passed ? '合格' : '不合格') + '</span></td>';
    html += '</tr></tfoot>';
    html += '</table>';

    if (result.timeUsedSeconds) {
      html += '<div style="text-align:center;color:var(--text-muted);font-size:14px;margin-top:8px">';
      html += '所要時間：' + formatTime(result.timeUsedSeconds);
      html += '</div>';
    }
    html += '</div>';

    // Review questions
    if (state.questions.length > 0) {
      html += '<div class="card">';
      html += '<h3 class="card-title">問題の振り返り</h3>';
      state.questions.forEach(function(q, i) {
        var selected = state.answers[i];
        var sc = state.shuffledChoicesMap[i];
        var isCorrect = selected === sc.correctIndex;
        var catLabel = '';
        CATEGORIES.forEach(function(cat) {
          if (cat.key === q.category) catLabel = cat.shortLabel;
        });

        html += '<div class="category-item">';
        html += '<div class="question-header">';
        html += '<span class="counter" style="color:' + (isCorrect ? 'var(--success)' : 'var(--danger)') + '">';
        html += '問' + (i + 1) + ' ' + (isCorrect ? '正解' : '不正解');
        html += '</span>';
        html += '<span class="badge badge-pass" style="font-size:11px">' + catLabel + '</span>';
        html += '</div>';
        html += '<div style="font-size:14px;font-weight:600;margin:8px 0;line-height:1.7">' + formatText(q.question) + '</div>';

        // Show choices with correct/incorrect markers (shuffled order)
        html += '<ul class="choices-list" style="gap:4px">';
        sc.choices.forEach(function(choice, ci) {
          var cls = 'choice-btn disabled';
          if (ci === sc.correctIndex) cls += ' correct';
          else if (ci === selected && ci !== sc.correctIndex) cls += ' incorrect';
          html += '<li><button class="' + cls + '" style="padding:8px 12px;font-size:13px">' + formatText(choice) + '</button></li>';
        });
        html += '</ul>';

        html += '<div class="explanation" style="margin-top:8px;font-size:13px">' + formatExplanation(remapExplanation(q.explanation, sc.originalToNew, q.choices)) + '</div>';
        html += '</div>';
      });
      html += '</div>';
    }

    // Actions
    html += '<div class="btn-row" style="justify-content:center;margin-bottom:24px">';
    html += '<a href="#exam" class="btn btn-success" id="retry-exam">もう一度受験する</a>';
    html += '<a href="#dashboard" class="btn btn-outline">ダッシュボードに戻る</a>';
    html += '</div>';

    container.innerHTML = html;
    window.scrollTo(0, 0);
  }

  function showConfirmDialog(message, onConfirm) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = '<div class="modal-box">' +
      '<p>' + message + '</p>' +
      '<div class="btn-row" style="justify-content:center">' +
      '<button class="btn btn-danger" id="confirm-yes">終了する</button>' +
      '<button class="btn btn-outline" id="confirm-no">キャンセル</button>' +
      '</div></div>';

    document.body.appendChild(overlay);

    overlay.querySelector('#confirm-yes').addEventListener('click', function() {
      document.body.removeChild(overlay);
      onConfirm();
    });
    overlay.querySelector('#confirm-no').addEventListener('click', function() {
      document.body.removeChild(overlay);
    });
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) document.body.removeChild(overlay);
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
    // 区切りキーワードで段落分け
    html = html.replace(/([。）])(?=よって|したがって|以上より|なお[、])/g, '$1</p><p>');
    // 正解/誤りのハイライト
    html = html.replace(/(正しい|正解)/g, '<span class="exp-correct">$1</span>');
    html = html.replace(/(誤り|誤っている|不正解|間違い)/g, '<span class="exp-incorrect">$1</span>');
    // 「…」引用部分をハイライト
    html = html.replace(/「([^」]{1,40})」/g, '<span class="exp-quote">「$1」</span>');
    return '<p>' + html + '</p>';
  }

  window.Exam = {
    render: function(container) {
      // Reset state when entering exam page fresh
      if (!state.started && !state.finished) {
        state.questions = [];
        state.answers = [];
        state.currentIndex = 0;
        state.result = null;
      }
      render(container);
    },
    renderResult: function(container) {
      if (state.result) {
        renderResult(container);
      } else {
        location.hash = '#dashboard';
      }
    }
  };
})();
