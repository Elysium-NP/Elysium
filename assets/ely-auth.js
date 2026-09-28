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
      return Promise.all([
        sb.from("profiles").select("*").eq("id", s.user.id).maybeSingle(),
        // abonnement Stripe (écrit uniquement par le serveur, à partir des confirmations Stripe)
        sb.from("abonnements").select("*").eq("user_id", s.user.id).maybeSingle()
      ]).then(function (res) {
          var q = res[0], ab = (res[1] && !res[1].error && res[1].data) || null;
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
            // PAYÉ = abonnement Stripe en cours (actif, en essai, ou paiement en retard de relance).
            // demo_paid : bascule du « coin démo » du compte admin, jamais utilisée par un vrai client.
            abonnement: ab,
            paid: !!(ab && ["active", "trialing", "past_due"].indexOf(ab.statut) > -1) || !!prev.demo_paid,
            demo_paid: !!prev.demo_paid,
            quest: !!prev.quest,
            cadence: prev.cadence, confort: prev.confort, abo_apres: prev.abo_apres,
            formule: prev.formule || (s.user.user_metadata || {}).formule,
            formule_prix: prev.formule_prix || (s.user.user_metadata || {}).formule_prix,
            created: prev.created || Date.now()
          };
          writeMirror(u);
          return u;
        });
    }).catch(function () { return readMirror(); });
  }

  var ready = refresh();

  /* PRÉCAUTIONS « Avant de continuer » (validé par Damien & Yoann, 28/09). Liste MOT POUR MOT.
     ⛔ Aucune donnée de santé : on ne garde QUE la déclaration « aucune situation » (booléen + date +
     version de la liste), comme preuve. Une personne concernée ne laisse AUCUNE trace.
     Changer la liste = changer LISTE_PRECAUTIONS (les déclarations d'une autre version ne comptent plus). */
  var LISTE_PRECAUTIONS = "2026-09-28";
  var SITUATIONS = [
    "Moins de 18 ans",
    "Grossesse ou allaitement",
    "Régime végétarien ou vegan",
    "Diabète (type 1, ou type 2 sous traitement)",
    "Maladie des reins ou du foie",
    "Maladie cardiaque ou cardiovasculaire sous traitement",
    "Trouble du comportement alimentaire (anorexie, boulimie, hyperphagie), actuel ou récent",
    "Chirurgie de l'obésité (sleeve, bypass…)",
    "Maladie inflammatoire de l'intestin (Crohn, RCH)",
    "Cancer en cours de traitement",
    "Toute pathologie pour laquelle un médecin t'a prescrit une alimentation particulière"
  ];
  function declaration() {
    return { declaration_aucune_situation: true,
             declaration_aucune_situation_le: new Date().toISOString(),
             declaration_liste: LISTE_PRECAUTIONS };
  }
  function aDeclare(meta) {
    return !!meta && meta.declaration_aucune_situation === true && meta.declaration_liste === LISTE_PRECAUTIONS;
  }

  window.ElyAuth = {
    ready: ready,          // Promesse : résolue quand session + profil sont chargés
    client: sb,            // client Supabase brut (poids, mensurations…)
    isReal: !!sb,          // false = librairie non chargée (mode dégradé)

    user: readMirror,      // SYNCHRONE (miroir local)

    /* Inscription. Renvoie {user, needsEmailConfirm}. */
    signup: function (data) {
      if (!sb) return Promise.reject(new Error("Supabase indisponible"));
      // la case « Je ne suis dans aucune de ces situations » est obligatoire pour créer un compte
      if (data.declaration !== true) return Promise.reject(new Error("Déclaration manquante"));
      var meta = {
        prenom: (data.prenom || "").trim(),
        nom: (data.nom || "").trim(),
        naissance: (data.naissance || "").trim(),
        sexe: (data.sexe || "").trim().toUpperCase(),
        taille_cm: data.taille ? parseInt(data.taille, 10) : null,
        // formule choisie AVANT la création du compte (parcours « comme dans le commerce », 27/09)
        formule: data.formule || null, formule_prix: data.formule_prix || null
      };
      var d = declaration(); for (var k in d) meta[k] = d[k];
      return sb.auth.signUp({
        email: (data.email || "").trim(),
        password: data.password,
        options: {
          // Où atterrit le client APRÈS avoir cliqué le lien de confirmation. Sans ça,
          // Supabase le renvoyait sur la racine du site SANS aucun message — il ne savait
          // même pas si ça avait marché (relevé par Dimitri le 27/07).
          emailRedirectTo: location.origin + "/bienvenue",
          data: meta
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

    /* ------------------------------------------------------------------ */
    /* TYPE DE COMPTE — il y en a TROIS (décision Dimitri 27/07) :
         "client" -> espace perso classique
         "coach"  -> Damien & Yoann : ils arrivent DIRECTEMENT sur /coach et ne
                     voient jamais l'espace client (ni paiement, ni
                     questionnaire — ça ne les concerne pas)
         "mixte"  -> le compte de Dimitri : espace client + raccourci coach,
                     pour garder la vision d'ensemble. Temporaire.
       La source de vérité est la table `admins` (colonne `acces`) : le RLS fait
       qu'un client n'y lit rien, donc il ne peut pas se hisser en coach depuis
       son navigateur. Ce n'est de toute façon qu'un AIGUILLAGE d'affichage —
       chaque page refait son propre contrôle côté serveur.
       Renvoie une Promesse. Volontairement PAS mémorisé : sur la page de
       connexion, `ready` s'est résolu AVANT le login (personne n'était connecté
       à l'ouverture) — un résultat mis en cache figerait « client » et enverrait
       les coachs au mauvais endroit. On relit donc le miroir, que `login` vient
       de rafraîchir. C'est une lecture par clé primaire, elle ne coûte rien. */
    acces: function () {
      return ready.catch(function () {}).then(function () {
        var u = readMirror();
        if (!u || !u.id || !sb) return "client";
        return sb.from("admins").select("acces").eq("user_id", u.id).maybeSingle()
          .then(function (r) { return (r && r.data && r.data.acces) || "client"; })
          .catch(function () { return "client"; });
      });
    },

    /* Où envoyer ce compte après connexion / à l'ouverture d'une page privée. */
    accueil: function () {
      return this.acces().then(function (a) {
        return a === "coach" ? "coach.html" : "espace.html";
      });
    },

    /* Démo/transition : gardés en local tant que Stripe et le questionnaire
       ne sont pas câblés côté serveur (ils deviendront des colonnes en base). */
    setPaid: function (v) { var u = readMirror() || {}; u.demo_paid = !!v; u.paid = !!v || !!(u.abonnement && ["active", "trialing", "past_due"].indexOf(u.abonnement.statut) > -1); writeMirror(u); },
    refresh: refresh,

    /* PAIEMENT STRIPE (fonction serveur « stripe-paiement ») : renvoie vers la page Stripe.
       formule : "f1" | "f2" | "f3". Rien n'est encaissé ici : c'est Stripe qui gère la carte. */
    payer: function (formule) {
      if (!sb) return Promise.reject(new Error("Paiement indisponible pour le moment."));
      // GARDE-FOU CENTRAL : pas de Stripe sans la déclaration « aucune situation » (comptes créés
      // avant le 28/09 compris ; le compte admin « mixte » aussi, c'est un vrai paiement).
      // getUser() relit le compte sur le serveur (pas une copie locale périmée).
      return sb.auth.getUser().then(function (r) {
        var usr = r && r.data && r.data.user;
        if (!usr || !aDeclare(usr.user_metadata)) {
          var ici = location.pathname.split("/").pop() || "espace.html";
          location.href = "precautions.html?formule=" + encodeURIComponent(formule || "") +
                          "&retour=" + encodeURIComponent(ici);
          throw new Error("Une étape reste à valider avant le paiement.");
        }
        return sb.functions.invoke("stripe-paiement", { body: { action: "checkout", formule: formule } })
        .then(function (r) { if (r.data && r.data.url) { location.href = r.data.url; return; }
          throw new Error((r.data && r.data.erreur) || "Paiement indisponible pour le moment."); });
      });
    },
    /* ACHAT À L'UNITÉ (boutique, 28/09 ; e-book d'abord) : même garde-fou que payer, puis page Stripe.
       L'appelant a déjà fait cocher la case « accès immédiat / perte du droit de rétractation ».
       Les refus du serveur (« Pas encore disponible », « Tu l'as déjà »…) remontent en message d'erreur. */
    acheter: function (produit) {
      if (!sb) return Promise.reject(new Error("Paiement indisponible pour le moment."));
      return sb.auth.getUser().then(function (r) {
        var usr = r && r.data && r.data.user, ici = location.pathname.split("/").pop() || "espace.html";
        if (!usr) { location.href = "connexion.html"; throw new Error("Connecte-toi pour acheter."); }
        if (!aDeclare(usr.user_metadata)) {
          location.href = "precautions.html?retour=" + encodeURIComponent(ici);
          throw new Error("Une étape reste à valider avant le paiement.");
        }
        return sb.functions.invoke("stripe-paiement", { body: { action: "achat", produit: produit, renonciation: true } })
        .then(function (r) {
          if (r.data && r.data.url) { location.href = r.data.url; return; }
          var c = r.error && r.error.context;          // réponse non 2xx : le message est dans son corps JSON
          return (c && c.json ? c.json().catch(function () { return {}; }) : Promise.resolve(r.data || {}))
            .then(function (d) { throw new Error((d && d.erreur) || "Paiement indisponible pour le moment."); });
        });
      });
    },
    /* Précautions : liste affichée (inscription.html, precautions.html) + déclaration à enregistrer. */
    situations: SITUATIONS,
    declaration: declaration,
    aDeclare: aDeclare,
    /* portail client Stripe : changer de formule (au prorata), résilier, carte, factures */
    portail: function () {
      return sb.functions.invoke("stripe-paiement", { body: { action: "portail" } })
        .then(function (r) { if (r.data && r.data.url) { location.href = r.data.url; return; }
          throw new Error((r.data && r.data.erreur) || "Portail indisponible pour le moment."); });
    },
    setQuest: function (v) { var u = readMirror() || {}; u.quest = !!v; writeMirror(u); }
  };
})();
