(function() {
  'use strict';

  function render(container) {
    var overall = Storage.getOverallStats();
    var examResults = Storage.getExamResults();

    var html = '';

    // Hero section
    html += '<div class="card" style="text-align:center">';
    html += '<h2 class="card-title" style="font-size:22px">第一種衛生管理者 試験対策</h2>';
    html += '<p style="color:var(--text-muted);margin-bottom:20px">合格基準：各科目40%以上 かつ 合計60%以上（44問 / 制限時間3時間）</p>';
    html += '<div class="btn-row" style="justify-content:center">';
    html += '<a href="#study" class="btn btn-primary btn-lg">学習モード</a>';
    html += '<a href="#exam" class="btn btn-success btn-lg">模擬試験</a>';
    html += '</div>';
    html += '</div>';

    // Overall progress
    html += '<div class="card">';
    html += '<h3 class="card-title">学習進捗</h3>';
    if (overall.total === 0) {
      html += '<div class="empty-state">まだ問題を解いていません。学習モードから始めましょう。</div>';
    } else {
      html += '<div class="stat-row">';
      html += '<span class="stat-label">総回答数</span>';
      html += '<span class="stat-value">' + overall.total + '問（正答 ' + overall.correct + '問）</span>';
      html += '</div>';
      html += '<div class="stat-row">';
      html += '<span class="stat-label">全体正答率</span>';
      html += '<span class="stat-value">' + overall.accuracy + '%</span>';
      html += '</div>';
      var barClass = overall.accuracy >= 60 ? 'success' : overall.accuracy >= 40 ? 'warning' : 'danger';
      html += '<div class="progress-bar-wrapper"><div class="progress-bar-fill ' + barClass + '" style="width:' + overall.accuracy + '%"></div></div>';
    }
    html += '</div>';

    // Per-category progress
    html += '<div class="card">';
    html += '<h3 class="card-title">科目別正答率</h3>';
    CATEGORIES.forEach(function(cat) {
      var stats = Storage.getCategoryStats(cat.key);
      var bank = window.QuestionBank[cat.key] || [];
      html += '<div class="category-item">';
      html += '<div class="stat-row">';
      html += '<span class="stat-label">' + cat.shortLabel + '</span>';
      if (stats.total > 0) {
        html += '<span class="stat-value">' + stats.accuracy + '% (' + stats.correct + '/' + stats.total + ')</span>';
      } else {
        html += '<span class="stat-value">未学習（' + bank.length + '問）</span>';
      }
      html += '</div>';
      if (stats.total > 0) {
        var catBarClass = stats.accuracy >= 60 ? 'success' : stats.accuracy >= 40 ? 'warning' : 'danger';
        html += '<div class="progress-bar-wrapper"><div class="progress-bar-fill ' + catBarClass + '" style="width:' + stats.accuracy + '%"></div></div>';
        if (stats.accuracy < 60) {
          html += '<div style="font-size:12px;color:var(--danger);margin-top:2px">弱点科目 - 重点的に学習しましょう</div>';
        }
      }
      html += '</div>';
    });
    html += '</div>';

    // Exam history
    html += '<div class="card">';
    html += '<h3 class="card-title">模擬試験の履歴</h3>';
    if (examResults.length === 0) {
      html += '<div class="empty-state">まだ模擬試験を受けていません。</div>';
    } else {
      var recent = examResults.slice(-5).reverse();
      recent.forEach(function(result) {
        var date = new Date(result.date);
        var dateStr = date.getFullYear() + '/' + (date.getMonth() + 1) + '/' + date.getDate();
        html += '<div class="exam-history-item">';
        html += '<span>' + dateStr + '</span>';
        html += '<span>' + result.totalPoints + ' / 400点</span>';
        html += '<span class="badge ' + (result.passed ? 'badge-pass' : 'badge-fail') + '">';
        html += result.passed ? '合格' : '不合格';
        html += '</span>';
        html += '</div>';
      });
    }
    html += '</div>';

    // Reset button
    html += '<div style="text-align:center;margin-top:12px">';
    html += '<button class="btn btn-sm" id="reset-progress" style="color:var(--text-muted)">進捗をリセット</button>';
    html += '</div>';

    container.innerHTML = html;

    // Reset handler
    var resetBtn = container.querySelector('#reset-progress');
    if (resetBtn) {
      resetBtn.addEventListener('click', function() {
        showConfirmDialog(container, '全ての学習進捗と模擬試験の履歴をリセットしますか？この操作は元に戻せません。', function() {
          Storage.resetProgress();
          render(container);
        });
      });
    }
  }

  function showConfirmDialog(container, message, onConfirm) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = '<div class="modal-box">' +
      '<p>' + message + '</p>' +
      '<div class="btn-row" style="justify-content:center">' +
      '<button class="btn btn-danger" id="confirm-yes">リセットする</button>' +
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

  window.Dashboard = { render: render };
})();
