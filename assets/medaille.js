/* MÉDAILLES DE PROFIL : le même dessin que l'appli MyEly (app/appli.js, MyEly.avatar), recopié pour que le site les affiche.
   La clé vient de profiles.avatar (app/supabase/avatar_profil.sql). Le site ne fait qu'AFFICHER : le choix et les succès
   restent dans l'appli. ⚠️ Si l'appli change ses emblèmes ou leur dessin, recopier ici (dernière copie : 04/10, style « appli connue »). */
(function(){
  var EMBLEMES = [
    ["laurier", "Laurier", '<path d="M12 20c-4-1-7-4-7.5-9M12 20c4-1 7-4 7.5-9"/><path d="M5 13c-1.5-.5-2.3-1.8-2.3-3.2 1.4.1 2.5.9 2.8 2.2M6.2 16.2c-1.6 0-2.8-.9-3.3-2.3 1.4-.3 2.7.3 3.4 1.5M4.6 9.8C3.4 8.9 3 7.5 3.4 6.2c1.3.5 2.1 1.6 2 3M19 13c1.5-.5 2.3-1.8 2.3-3.2-1.4.1-2.5.9-2.8 2.2M17.8 16.2c1.6 0 2.8-.9 3.3-2.3-1.4-.3-2.7.3-3.4 1.5M19.4 9.8c1.2-.9 1.6-2.3 1.2-3.6-1.3.5-2.1 1.6-2 3"/>', "bronze"],
    ["colonne", "Colonne", '<path d="M5 4h14M6.5 4c0 1.4 1 2.3 2.3 2.3h6.4c1.3 0 2.3-.9 2.3-2.3M8.5 6.3v11.4M12 6.3v11.4M15.5 6.3v11.4M6.5 17.7h11M5 20.5h14"/>', "bronze"],
    ["amphore", "Amphore", '<path d="M9 3h6M10.2 3v3.2C7.4 7.6 6 10 6 13c0 4 2.7 7.5 6 7.5s6-3.5 6-7.5c0-3-1.4-5.4-4.2-6.8V3"/><path d="M8.6 7.6C5.8 7.4 5 10.4 6.6 12M15.4 7.6c2.8-.2 3.6 2.8 2 4.4M7 12.5h10"/>', "bronze"],
    ["olivier", "Olivier", '<path d="M4 20c5-4 9-9 15-16"/><path d="M8.5 14.5c-.3-2 .6-3.6 2.4-4.3.3 2-.6 3.6-2.4 4.3zM12.2 10.4c-.2-2 .8-3.5 2.6-4 .2 2-.8 3.5-2.6 4zM10.6 16.4c1.8-.9 3.6-.7 4.8.6-1.8.9-3.6.7-4.8-.6zM14.4 12.2c1.8-.8 3.5-.5 4.6.8-1.8.8-3.5.5-4.6-.8z"/>', "bronze"],
    ["chouette", "Chouette", '<path d="M6 4.5v8.5c0 4 2.7 7 6 7s6-3 6-7V4.5c-2 1.5-4 2.2-6 2.2s-4-.7-6-2.2z"/><circle cx="9.5" cy="11" r="1.9"/><circle cx="14.5" cy="11" r="1.9"/><path d="M11.3 13.8l.7 1.4.7-1.4M9.5 17.2c1.6.8 3.4.8 5 0"/>', "argent"],
    ["lyre", "Lyre", '<path d="M7.2 3.5C4.6 6.6 5 12.5 9 15h6c4-2.5 4.4-8.4 1.8-11.5"/><path d="M6.4 6.5h11.2M10 6.5V15M12 6.5V15M14 6.5V15M9 15l-.6 5.5h7.2L15 15"/>', "argent"],
    ["casque", "Casque", '<path d="M7 20v-7.5C7 7.8 9.6 5 13 5c3.6 0 6 2.6 6 7v2.5h-4.6L13 17v3z"/><path d="M13 9.6h6M9.6 5.8C9.8 3.6 12 2.2 15.2 2.8"/>', "or"],
    ["eclair", "Éclair", '<path d="M13.5 2.5L5.5 13.5h6l-1 8 8-11h-6z"/>', "argent"],
    ["vague", "Vague", '<path d="M3 14.5c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 3 3M3 19c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 3 3"/><path d="M7.5 11.2c0-3.3 2.4-5.7 5.6-5.7 2.2 0 3.9 1.1 4.5 2.8-1.6-.6-3.4 0-3.9 1.6"/>', "or"],
    ["soleil", "Soleil", '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.8M12 18.7v2.8M2.5 12h2.8M18.7 12h2.8M5.3 5.3l2 2M16.7 16.7l2 2M5.3 18.7l2-2M16.7 7.3l2-2"/>', "or"],
    ["etoile", "Étoile", '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4l-5.3 3 1.2-6-4.5-4.1 6-.7z"/>', "elysium"]
  ];
  window.ElyMedaille = {
    emblemes: EMBLEMES,
    html: function (cle, initiale, cls) {
      var e = EMBLEMES.filter(function (x) { return x[0] === cle; })[0];
      if (!e) return '<span class="av ' + (cls || "") + '">' + initiale + "</span>";
      // style « Comme une appli connue » (04/10) : disque plein à la couleur du rang, emblème au trait épais, rien de gravé
      var M = { bronze: ["#B9804F", "#FFFFFF"], argent: ["#97A1AD", "#FFFFFF"], or: ["#D3A52A", "#FFFFFF"], elysium: ["#2E9BFF", "#111111"] }[e[3]] || ["#97A1AD", "#FFFFFF"];
      return '<span class="av emb md ' + (cls || "") + '"><svg viewBox="0 0 100 100" aria-hidden="true">' +
        '<circle cx="50" cy="50" r="50" fill="' + M[0] + '"/>' +
        '<circle cx="50" cy="50" r="42" fill="none" stroke="' + M[1] + '" stroke-opacity=".28" stroke-width="2"/>' +
        '<g fill="none" stroke="' + M[1] + '" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" transform="translate(23 23) scale(2.25)">' + e[2] + "</g></svg></span>";
    }
  };
})();
