/* UN JOUR DU PROGRAMME : du format programmes.menu aux cartes repas.
   Partagé par l'espace client (espace.html) et la journée exemple de l'accueil (index.html) :
   Damien & Yoann (30/09) veulent que l'exemple soit IDENTIQUE à ce que voit un client — même code, même CSS (assets/jour.css). */
(function(){
  var MEALS={petit_dejeuner:'Petit-déjeuner',dejeuner:'Déjeuner',collation:'Collation',collation_2:'Collation',diner:'Dîner'};
  var EMO={petit_dejeuner:'☀️',dejeuner:'🍴',collation:'🍎',collation_2:'🍎',diner:'🌙'};
  function r0(x){ return Math.round(+x||0); }
  function esc(t){ return String(t).replace(/[&<>"]/g,function(ch){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]; }); }
  function deplier(q){ return String(q).replace(/(^|\s)(\d+(?:[.,]\d+)?)\s*tr\.?(?=\s|$)/g,function(_,a,n){ return a+n+(parseFloat(n.replace(',','.'))>1?' tranches':' tranche'); }); }
  // pastille du repas (style « appli connue », 04/10) : icône au trait, couleur du repas — jamais d'emoji dans la pastille
  var ICO={pdj:'<path d="M4 17h16M7 17a5 5 0 0 1 10 0M12 7V5M6.3 9.3L5 8M17.7 9.3L19 8"/>',
    dej:'<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
    col:'<path d="M6 18c0-7 5-12 13-12 0 8-5 13-12 13"/><path d="M6 18l6-6"/>',
    din:'<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'};
  function pastille(t){ return '<span class="pst" aria-hidden="true"><svg viewBox="0 0 24 24">'+ICO[coulRepas(t)]+'</svg></span>'; }
  function coulRepas(t){ t=String(t).toLowerCase();
    return /petit/.test(t)?'pdj':/d[ée]jeuner/.test(t)?'dej':/collation/.test(t)?'col':/d[îi]ner/.test(t)?'din':'dej'; }
  function ingPhrase(x){
    var q=deplier(String(x[0]||'').trim()), n=String(x[1]||'').trim();
    if(!n) return q;
    if(/^[\d.,\/½¼¾]+$/.test(q)) return q+' '+n;                           // « 1 œuf », « 4 galettes de riz »
    return q+(/^[aeiouyhâéèêëîïôûœ]/i.test(n)?" d'":' de ')+n;              // « 20 g de fromage », « 5 g d'huile »
  }
  // un jour de programmes.menu -> {j, repas:[{type, emo, kcal, rec, cle, seas, ings, m}]}
  // collations comme sur la fiche PDF des coachs : une = l'après-midi ; deux = matin (après le petit-déj) + après-midi
  function depuisMenu(j){
    var deux=(j.repas||[]).some(function(r){ return r.type==='collation_2'; });
    var ORD=deux?{petit_dejeuner:0,collation:1,dejeuner:2,collation_2:3,diner:4}:{petit_dejeuner:0,dejeuner:1,collation:2,collation_2:3,diner:4};
    var LIB={collation:deux?'Collation · matin':'Collation · après-midi',collation_2:'Collation · après-midi'};
    return {j:j.jour, repas:(j.repas||[]).slice().sort(function(a,b){ return (ORD[a.type]!=null?ORD[a.type]:9)-(ORD[b.type]!=null?ORD[b.type]:9); }).map(function(r){
      var m=r.macros||{};
      return {type:LIB[r.type]||MEALS[r.type]||String(r.type||'').replace(/_/g,' '), emo:EMO[r.type]||'', kcal:r0(m.kcal),
        rec:esc(r.titre||''),            // ⛔ jamais `recette` (clé interne) AFFICHÉE côté client…
        cle:r.recette||'',               // …elle sert seulement à retrouver la recette : menu.recettes[repas.recette]
        seas:'', m:[r0(m.proteines),r0(m.glucides),r0(m.lipides)],
        ings:(r.ingredients||[]).map(function(i){
          return (i.ligne||i.affichage) ? [esc(i.ligne||i.affichage),''] : [r0(i.grammes)+' g', esc(i.aliment||i.ingredient||'')]; })};
    })};
  }
  // les cartes d'un jour (la recette se déroule sous le plat, dans .rc)
  function meals(d){
    var m=d.repas.map(function(r,i){
      // un aliment par ligne, comme sur leurs fiches (Damien 30/09 : « l'effet liste plutôt qu'à la suite »)
      var ings='<li>'+r.ings.map(ingPhrase).join('</li><li>')+'</li>', id='rc-'+d.j+'-'+i;
      return '<article class="meal '+coulRepas(r.type)+' rv"><div class="meal-hd">'+pastille(r.type)+'<span class="mt2">'+r.type+'</span><i>'+r.kcal+' kcal</i></div>'+
        '<div class="meal-in"><button type="button" class="dish plat" aria-expanded="false" aria-controls="'+id+'" data-j="'+d.j+'" data-i="'+i+'">'+
          '<span class="dn">'+r.rec+'</span><span class="voir">Voir la recette<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></span></button>'+
        '<ul class="ings-l">'+ings+'</ul>'+
        (r.seas?'<p class="seas">'+r.seas+'</p>':'')+
        '<div class="mac"><span class="p">P '+r.m[0]+'</span><span class="g">G '+r.m[1]+'</span><span class="l">L '+r.m[2]+'</span></div></div>'+
        '<div class="rc" id="'+id+'"><div class="rc-in"></div></div></article>';
    }).join('');
    return '<div class="meals n'+d.repas.length+'">'+m+'</div>';   // n4 / n5 : grille par moment de la journée
  }
  window.ElyJour={depuisMenu:depuisMenu, meals:meals, deplier:deplier, ingPhrase:ingPhrase, coulRepas:coulRepas};
})();
