(function() {
  'use strict';

  var currentUser = null;
  var onAuthChangeCallbacks = [];
  var redirectPending = false;

  // 画面上にステータスメッセージを表示（モバイルデバッグ用）
  function showAuthStatus(msg) {
    var el = document.getElementById('auth-status');
    if (!el) {
      el = document.createElement('div');
      el.id = 'auth-status';
      el.style.cssText = 'position:fixed;bottom:0;left:0;right:0;padding:8px 12px;' +
        'background:#1e293b;color:#fbbf24;font-size:13px;z-index:9999;text-align:center;' +
        'transition:opacity .3s;';
      document.body.appendChild(el);
    }
    if (msg) {
      el.textContent = msg;
      el.style.opacity = '1';
      el.style.display = 'block';
    } else {
      el.style.opacity = '0';
      setTimeout(function() { el.style.display = 'none'; }, 300);
    }
  }

  function renderAuthArea() {
    var area = document.getElementById('auth-area');
    if (!area) return;

    if (currentUser) {
      var photo = currentUser.photoURL || '';
      var name = currentUser.displayName || 'ユーザー';
      area.innerHTML =
        '<div class="auth-user">' +
          (photo ? '<img src="' + photo + '" alt="" class="auth-avatar">' : '') +
          '<span class="auth-name">' + escapeHtml(name) + '</span>' +
          '<button class="btn btn-sm auth-logout-btn" id="logout-btn">ログアウト</button>' +
        '</div>';
      area.querySelector('#logout-btn').addEventListener('click', signOut);
    } else {
      area.innerHTML =
        '<button class="btn btn-sm auth-login-btn" id="login-btn">' +
          '<svg viewBox="0 0 24 24" width="16" height="16" style="margin-right:4px"><path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>' +
          'Googleでログイン' +
        '</button>';
      area.querySelector('#login-btn').addEventListener('click', signInWithGoogle);
    }
  }

  function detectInAppBrowser() {
    var ua = navigator.userAgent || '';
    if (/Line\//i.test(ua)) return 'LINE';
    if (/FBAN|FBAV/i.test(ua)) return 'Facebook';
    if (/Instagram/i.test(ua)) return 'Instagram';
    if (/Twitter/i.test(ua)) return 'Twitter';
    if (/YJApp/i.test(ua) || /Yahoo/i.test(ua) && /Mobile/i.test(ua) && !/Chrome/i.test(ua)) return 'Yahoo!';
    return null;
  }

  function showOpenInBrowserBanner() {
    var appName = detectInAppBrowser();
    if (!appName) return;

    var existing = document.getElementById('inapp-banner');
    if (existing) return;

    var url = location.href;
    var banner = document.createElement('div');
    banner.id = 'inapp-banner';
    banner.innerHTML =
      '<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;">' +
        '<div style="background:#fff;border-radius:12px;padding:24px 20px;max-width:340px;width:100%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.2);">' +
          '<div style="font-size:32px;margin-bottom:12px;">&#128274;</div>' +
          '<h3 style="margin:0 0 8px;font-size:17px;color:#1e293b;">外部ブラウザで開いてください</h3>' +
          '<p style="margin:0 0 16px;font-size:14px;color:#64748b;line-height:1.6;">' +
            appName + 'のアプリ内ブラウザでは<br>Googleログインが利用できません。<br>' +
            '<strong>Chrome</strong>または<strong>Safari</strong>で開いてください。' +
          '</p>' +
          '<button id="inapp-copy-btn" style="display:block;width:100%;padding:12px;margin-bottom:8px;' +
            'background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;">' +
            'URLをコピー' +
          '</button>' +
          '<p style="margin:8px 0 0;font-size:12px;color:#94a3b8;">コピー後、Chromeに貼り付けて開いてください</p>' +
          '<button id="inapp-close-btn" style="margin-top:12px;background:none;border:none;color:#94a3b8;font-size:13px;cursor:pointer;text-decoration:underline;">' +
            'ログインせずに使う' +
          '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(banner);

    document.getElementById('inapp-copy-btn').addEventListener('click', function() {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function() {
          document.getElementById('inapp-copy-btn').textContent = 'コピーしました!';
          document.getElementById('inapp-copy-btn').style.background = '#16a34a';
        });
      } else {
        // フォールバック: テキスト選択
        var input = document.createElement('input');
        input.value = url;
        input.style.cssText = 'position:fixed;top:-9999px;';
        document.body.appendChild(input);
        input.select();
        input.setSelectionRange(0, 99999);
        document.execCommand('copy');
        document.body.removeChild(input);
        document.getElementById('inapp-copy-btn').textContent = 'コピーしました!';
        document.getElementById('inapp-copy-btn').style.background = '#16a34a';
      }
    });

    document.getElementById('inapp-close-btn').addEventListener('click', function() {
      banner.remove();
    });
  }

  function signInWithGoogle() {
    var provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');

    if (detectInAppBrowser()) {
      showOpenInBrowserBanner();
      return;
    }

    // ポップアップを試行 → ブロックされたらリダイレクト
    showAuthStatus('ログイン中...');
    auth.signInWithPopup(provider).then(function(result) {
      showAuthStatus('');
      console.log('Popup login success:', result.user.displayName);
    }).catch(function(error) {
      console.error('Popup error:', error.code, error.message);
      if (error.code === 'auth/popup-blocked') {
        showAuthStatus('リダイレクト方式でログイン中...');
        try { sessionStorage.setItem('auth_redirect_pending', '1'); } catch(e) {}
        auth.signInWithRedirect(provider);
      } else if (error.code === 'auth/popup-closed-by-user') {
        showAuthStatus('');
      } else {
        showAuthStatus('エラー: ' + error.code);
        setTimeout(function() { showAuthStatus(''); }, 5000);
      }
    });
  }

  function signOut() {
    auth.signOut().catch(function(error) {
      console.error('Logout error:', error);
    });
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // リダイレクトから戻ったか確認
  var wasRedirect = false;
  try { wasRedirect = sessionStorage.getItem('auth_redirect_pending') === '1'; } catch(e) {}

  if (wasRedirect) {
    showAuthStatus('認証結果を確認中...');
    try { sessionStorage.removeItem('auth_redirect_pending'); } catch(e) {}
  }

  // リダイレクト方式のログイン結果を処理
  auth.getRedirectResult().then(function(result) {
    if (result && result.user) {
      console.log('Redirect login success:', result.user.displayName);
      showAuthStatus('ログイン成功: ' + result.user.displayName);
      setTimeout(function() { showAuthStatus(''); }, 2000);
    } else if (wasRedirect) {
      // リダイレクトから戻ったのに結果がない = 第三者Cookie問題の可能性
      console.warn('Redirect returned but no auth result');
      showAuthStatus('ログインが完了しませんでした。ブラウザ設定を確認してください。');
      setTimeout(function() { showAuthStatus(''); }, 8000);
    }
  }).catch(function(error) {
    console.error('Redirect login error:', error.code, error.message);
    if (error.code === 'auth/network-request-failed') {
      showAuthStatus('ネットワークエラー: サードパーティCookieの許可が必要です');
    } else if (error.code && error.code !== 'auth/popup-closed-by-user') {
      showAuthStatus('エラー: ' + error.code);
    }
    setTimeout(function() { showAuthStatus(''); }, 8000);
  });

  // Listen for auth state changes
  auth.onAuthStateChanged(function(user) {
    currentUser = user;
    renderAuthArea();

    if (user && wasRedirect) {
      showAuthStatus('');
    }

    // Notify Storage module
    onAuthChangeCallbacks.forEach(function(cb) {
      cb(user);
    });
  });

  // ページ読み込み時にアプリ内ブラウザを検出して案内表示
  if (detectInAppBrowser() && !currentUser) {
    showOpenInBrowserBanner();
  }

  window.Auth = {
    getUser: function() { return currentUser; },
    onAuthChange: function(cb) { onAuthChangeCallbacks.push(cb); },
    signOut: signOut
  };
})();
