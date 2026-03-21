(function() {
  'use strict';

  var currentUser = null;
  var onAuthChangeCallbacks = [];

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

  function signInWithGoogle() {
    var provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(function(error) {
      console.error('Login error:', error);
      if (error.code !== 'auth/popup-closed-by-user') {
        alert('ログインに失敗しました: ' + error.message);
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

  // Listen for auth state changes
  auth.onAuthStateChanged(function(user) {
    currentUser = user;
    renderAuthArea();

    // Notify Storage module
    onAuthChangeCallbacks.forEach(function(cb) {
      cb(user);
    });
  });

  window.Auth = {
    getUser: function() { return currentUser; },
    onAuthChange: function(cb) { onAuthChangeCallbacks.push(cb); },
    signOut: signOut
  };
})();
