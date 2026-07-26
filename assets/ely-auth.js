/* ============================================================================
   ELY-AUTH — VRAIE authentification (Supabase). Remplace auth-mock.js.
   ----------------------------------------------------------------------------
   · Les 2 constantes ci-dessous sont PUBLIQUES par conception (clé "publishable") :
     elles vivent dans le navigateur du client. La sécurité ne repose PAS sur
     elles mais sur le RLS PostgreSQL (chaque client ne lit que ses lignes).
     La clé SECRÈTE (sb_secret_…) ne doit JAMAIS apparaître ici.
   · L'API publique (window.ElyAuth) garde la MÊME forme que la maquette pour
     que les pages existantes continuent de marcher — mais signup/login/logout
     renvoient désormais des Promesses (opérations réseau).
   · MIROIR local : le profil est recopié dans localStorage sous l'ancienne clé,
     ce qui permet à ElyAuth.user() de rester SYNCHRONE (index.html, choisir.html
     et espace.html le lisent ainsi sans être réécrits).
   ============================================================================ */
(function () {
  "use strict";

  var SB_URL = "https://xchahmcflineiupqmges.supabase.co";
  var SB_KEY = "sb_publishable_CBtiKYoE1OKZ5ag_wGvmtQ_rRCzaV2p";
  var SB_REF = "xchahmcflineiupqmges";       // sert au test de session synchrone
  var MIRROR = "ely_user_demo";              // miroir local (lecture synchrone)

  var sb = (window.supabase && window.supabase.createClient)
    ? window.supabase.createClient(SB_URL, SB_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      })
    : null;

  function readMirror() {
    try { return JSON.parse(localStorage.getItem(MIRROR) || "null"); } catch (e) { return null; }
  }
  function writeMirror(u) {
    if (u) localStorage.setItem(MIRROR, JSON.stringify(u));
    else localStorage.removeItem(MIRROR);
  }
  function calcAge(dob) {
    if (!dob) return null;
    var d = new Date(dob), n = new Date();
    return n.getFullYear() - d.getFullYear() -
      ((n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) ? 1 : 0);
  }
  function hasSessionToken() {                      // test SYNCHRONE (avant le réseau)
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf("sb-" + SB_REF) === 0 && k.indexOf("auth-token") > -1) return true;
      }
    } catch (e) {}
    return false;
  }

  /* Recharge session + profil depuis Supabase et rafraîchit le miroir local. */
  function refresh() {
    if (!sb) return Promise.resolve(readMirror());
    return sb.auth.getSession().then(function (r) {
      var s = r && r.data && r.data.session;
      if (!s) { writeMirror(null); return null; }
      return sb.from("profiles").select("*").eq("id", s.user.id).maybeSingle()
        .then(function (q) {
          var p = (q && q.data) || {};
          var prev = readMirror() || {};
          var u = {
            id: s.user.id,
            email: s.user.email || "",
            prenom: p.prenom || "",
            nom: p.nom || "",
            naissance: p.naissance || "",
            sexe: p.sexe || "",
            taille: p.taille_cm || null,
            age: calcAge(p.naissance),
            // paiement + questionnaire : encore locaux tant que Stripe et le
            // questionnaire ne sont pas branchés (phases suivantes).
            paid: !!prev.paid,
            quest: !!prev.quest,
            cadence: prev.cadence, confort: prev.confort, abo_apres: prev.abo_apres,
            formule: prev.formule, formule_prix: prev.formule_prix,
            created: prev.created || Date.now()
          };
          writeMirror(u);
          return u;
        });
    }).catch(function () { return readMirror(); });
  }

  var ready = refresh();

  window.ElyAuth = {
    ready: ready,          // Promesse : résolue quand session + profil sont chargés
    client: sb,            // client Supabase brut (poids, mensurations…)
    isReal: !!sb,          // false = librairie non chargée (mode dégradé)

    user: readMirror,      // SYNCHRONE (miroir local)

    /* Inscription. Renvoie {user, needsEmailConfirm}. */
    signup: function (data) {
      if (!sb) return Promise.reject(new Error("Supabase indisponible"));
      return sb.auth.signUp({
        email: (data.email || "").trim(),
        password: data.password,
        options: {
          data: {
            prenom: (data.prenom || "").trim(),
            nom: (data.nom || "").trim(),
            naissance: (data.naissance || "").trim(),
            sexe: (data.sexe || "").trim().toUpperCase(),
            taille_cm: data.taille ? parseInt(data.taille, 10) : null
          }
        }
      }).then(function (r) {
        if (r.error) throw r.error;
        // Si la confirmation par e-mail est activée, aucune session n'est ouverte
        // tant que le lien n'est pas cliqué.
        var needs = !(r.data && r.data.session);
        return refresh().then(function (u) { return { user: u, needsEmailConfirm: needs }; });
      });
    },

    /* Connexion e-mail + mot de passe. */
    login: function (email, password) {
      if (!sb) return Promise.reject(new Error("Supabase indisponible"));
      return sb.auth.signInWithPassword({
        email: (email || "").trim(), password: password
      }).then(function (r) {
        if (r.error) throw r.error;
        return refresh();
      });
    },

    logout: function () {
      writeMirror(null);
      return sb ? sb.auth.signOut().catch(function () {}) : Promise.resolve();
    },

    /* Mot de passe oublié : envoie le lien de réinitialisation. */
    resetPassword: function (email) {
      if (!sb) return Promise.reject(new Error("Supabase indisponible"));
      return sb.auth.resetPasswordForEmail((email || "").trim(),
        { redirectTo: location.origin + "/connexion.html" });
    },

    /* Garde des pages privées : test synchrone immédiat, puis confirmation réseau. */
    requireAuth: function (redirect) {
      var to = redirect || "connexion.html";
      if (!hasSessionToken()) { location.replace(to); return false; }
      ready.then(function (u) { if (!u) location.replace(to); });
      return true;
    },

    /* Démo/transition : gardés en local tant que Stripe et le questionnaire
       ne sont pas câblés côté serveur (ils deviendront des colonnes en base). */
    setPaid: function (v) { var u = readMirror() || {}; u.paid = !!v; writeMirror(u); },
    setQuest: function (v) { var u = readMirror() || {}; u.quest = !!v; writeMirror(u); }
  };
})();
