(function() {
  'use strict';

  var firebaseConfig = {
    apiKey: "AIzaSyCHpdj4oWm3HXQbEr54bZDC06JzyQkgLvU",
    authDomain: "eisei-kanri-app.firebaseapp.com",
    projectId: "eisei-kanri-app",
    storageBucket: "eisei-kanri-app.firebasestorage.app",
    messagingSenderId: "658042824784",
    appId: "1:658042824784:web:da254f112518ccde394955"
  };

  firebase.initializeApp(firebaseConfig);

  window.db = firebase.firestore();
  window.auth = firebase.auth();
})();
