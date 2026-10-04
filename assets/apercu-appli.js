/* MAQUETTE « COMME UNE APPLI CONNUE » SUR LA VITRINE : chargé seulement en aperçu (?style=appli, voir site.js).
   1. la journée d'exemple de l'accueil devient l'écran « Ma diète » de l'appli, dans un téléphone ;
   2. sur mobile, une barre d'onglets comme dans l'appli remplace le menu burger. Rien n'est enregistré. */
(function(){
  var I={diete:'<path d="M4 6h16M4 12h16M4 18h10"/>',courses:'<path d="M3 4h2l2.4 11h10.2L20 8H6.2"/><circle cx="9.5" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/>',
    suivi:'<path d="M3 17l6-6 4 4 8-8"/>',messages:'<path d="M4 5h16v11H8l-4 4z"/>',compte:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
    accueil:'<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>',methode:'<path d="M5 4h11l3 3v13H5z"/><path d="M9 11h6M9 15h6"/>',formules:'<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18"/>',
    resultats:'<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>'};
  function svg(p){ return '<svg viewBox="0 0 24 24" aria-hidden="true">'+p+'</svg>'; }

  // 1. le téléphone (accueil)
  function telephone(){
    var day=document.querySelector('.day'), ex=document.getElementById('jour-exemple');
    if(!day||!ex||day.querySelector('.tel-ecran')) return true;
    if(!ex.querySelector('.meal')) return false;                    // la journée n'est pas encore dessinée
    var kc=0; [].forEach.call(ex.querySelectorAll('.meal-hd i'),function(i){ kc+=parseInt(String(i.textContent).replace(/\D/g,''),10)||0; });
    var n=ex.querySelectorAll('.meal').length;
    var ecran=document.createElement('div'); ecran.className='tel-ecran';
    ecran.innerHTML='<span class="tel-encoche" aria-hidden="true"></span><div class="tel-defile">'+
      '<div class="tel-sur">Ma diète · exemple</div><div class="tel-titre">Jour 1</div>'+
      '<div class="tel-jours" aria-hidden="true"><span class="on">1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>Off</span></div>'+
      '<div class="tel-gros"><b>'+kc.toLocaleString('fr-FR')+'</b><span>kcal</span></div>'+
      '<div class="tel-sous">'+n+' repas · pesés au gramme · objectif <b>maintien</b></div></div>'+
      '<div class="tel-onglets" aria-hidden="true">'+[['Diète','diete'],['Courses','courses'],['Suivi','suivi'],['Messages','messages'],['Compte','compte']].map(function(x,i){
        return '<div'+(i===0?' class="on"':'')+'>'+svg(I[x[1]])+x[0]+'</div>'; }).join('')+'</div>';
    ecran.querySelector('.tel-defile').appendChild(ex);
    day.appendChild(ecran);
    return true;
  }
  (function essai(k){ if(!telephone()&&k<40) setTimeout(function(){ essai(k+1); },150); })(0);

  // « // Ta pesée » -> « Ta pesée » (lu par la pastille, voir la feuille)
  [].forEach.call(document.querySelectorAll('.sec-head .lbl'),function(l){ l.setAttribute('data-t',String(l.textContent).replace(/^\s*\/\/\s*/,'').trim()); });

  // chiffres qui sont des mots : une taille à part (voir .v.mot)
  [].forEach.call(document.querySelectorAll('.figures .v'),function(v){ if(!/\d/.test(v.textContent)) v.classList.add('mot'); });

  // 2. la barre d'onglets (mobile)
  var go=document.querySelector('nav.menu a.go'), ici=location.pathname.replace(/\/$/,'/index').replace(/\.html$/,'').split('/').pop()||'index';
  var L=[['Accueil','index.html','accueil','index'],['Méthode','methode.html','methode','methode'],['Formules','formules.html','formules','formules'],['Résultats','resultats.html','resultats','resultats'],
    [go?String(go.textContent).trim():'Connexion',go?go.getAttribute('href'):'connexion.html','compte','connexion']];
  var bar=document.createElement('nav'); bar.className='appbar'; bar.setAttribute('aria-label','Navigation');
  bar.innerHTML=L.map(function(x){ return '<a href="'+x[1]+'"'+(ici===x[3]?' aria-current="page"':'')+'>'+svg(I[x[2]])+x[0]+'</a>'; }).join('');
  document.body.appendChild(bar);
  // bouton clair / obscur sur mobile (le menu qui le porte est masqué) : il actionne le vrai bouton du site
  var tb=document.querySelector('nav.menu .theme-btn');
  if(tb){ var m=document.createElement('button'); m.type='button'; m.className='theme-mob'; m.setAttribute('aria-label','Changer de thème');
    m.innerHTML=svg('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'); m.addEventListener('click',function(){ tb.click(); }); document.body.appendChild(m); }
})();
