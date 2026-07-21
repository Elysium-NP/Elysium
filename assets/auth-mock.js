/* ============================================================================
   AUTH-MOCK — maquette de navigation UNIQUEMENT (localStorage).
   ⚠️ CE N'EST PAS UNE VRAIE AUTHENTIFICATION : aucune sécurité, aucun serveur.
   Sert à visualiser le parcours (inscription -> connexion -> espace membre).
   À REMPLACER par Supabase Auth (vraie auth + RLS) en phase suivante.
   ============================================================================ */
(function () {
  "use strict";
  var KEY = "ely_user_demo";

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); }
    catch (e) { return null; }
  }
  function write(u) { localStorage.setItem(KEY, JSON.stringify(u)); }

  window.ElyAuth = {
    // "inscription" : mémorise un utilisateur de démo
    signup: function (data) {
      write({ prenom: (data.prenom || "").trim(), email: (data.email || "").trim(), paid: false, created: Date.now() });
      return this.user();
    },
    // "connexion" : réutilise l'utilisateur existant ou en crée un minimal
    login: function (email) {
      var u = read() || { prenom: "", email: (email || "").trim(), paid: false, created: Date.now() };
      u.email = (email || u.email || "").trim();
      write(u);
      return u;
    },
    user: read,
    logout: function () { localStorage.removeItem(KEY); },
    // démo paywall : bascule le statut "payé"
    setPaid: function (v) { var u = read() || {}; u.paid = !!v; write(u); },
    // démo gating : bascule "questionnaire rempli" (le programme ne s'affiche que si payé ET rempli)
    setQuest: function (v) { var u = read() || {}; u.quest = !!v; write(u); },
    // à mettre en haut des pages privées : redirige vers la connexion si non connecté
    requireAuth: function (redirect) {
      if (!read()) { location.replace(redirect || "connexion.html"); return false; }
      return true;
    }
  };
})();
