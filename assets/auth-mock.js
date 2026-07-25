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
    // "inscription" : mémorise un utilisateur de démo. Champs d'IDENTITÉ (nom, prénom, naissance,
    // sexe, taille) fournis à la création -> serviront à la programmation et seront VERROUILLÉS
    // ensuite (anti-fraude, Yoann). L'âge est calculé depuis la date de naissance.
    signup: function (data) {
      var dob = (data.naissance || "").trim(), age = null;
      if (dob) {
        var d = new Date(dob), n = new Date();
        age = n.getFullYear() - d.getFullYear() - ((n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) ? 1 : 0);
      }
      write({
        prenom: (data.prenom || "").trim(), nom: (data.nom || "").trim(),
        email: (data.email || "").trim(), naissance: dob, age: age,
        sexe: (data.sexe || "").trim(), taille: data.taille ? parseInt(data.taille, 10) : null,
        paid: false, created: Date.now()
      });
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
