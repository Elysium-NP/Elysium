/* MAQUETTE DE L'ESPACE COACHS (30/09) : coach.html, TEL QUEL, branché sur des données d'exemple.
   coach.html charge ce fichier à la place de assets/ely-auth.js quand l'adresse contient « maquette »
   (/coach-maquette, réécrit vers coach.html par _redirects) : la maquette est donc TOUJOURS la vraie page,
   à jour à chaque modification. Aucune connexion à Supabase : une petite base en mémoire, remise à zéro
   à chaque chargement ; rien de ce qu'on fait ici ne part nulle part.
   Données : assets/dietes_maquette.json (diètes réelles anonymisées) + assets/retours_maquette.json. */
(function(){
  'use strict';
  var JOUR=86400000, now=Date.now();
  function iso(ms){ return new Date(ms).toISOString(); }
  function jourIso(ms){ return iso(ms).slice(0,10); }
  function clone(x){ return x==null?x:JSON.parse(JSON.stringify(x)); }
  function charger(url){ var x=new XMLHttpRequest(); x.open('GET',url,false); x.send(null); return x.status===200?JSON.parse(x.responseText):[]; }   // synchrone : la page démarre avec ses données

  var MOI={id:'demo-coach-damien',email:'maquette@elysium.local',prenom:'Damien',nom:'H.'};
  var DIETES=charger('assets/dietes_maquette.json?v=1'), RETOURS=charger('assets/retours_maquette.json?v=1');

  // ---------- la base ----------
  var DB={profiles:[],questionnaires:[],programmes:[],abonnements:[],poids:[],mensurations:[],messages:[],notes_coachs:[],
          retours_coach:clone(RETOURS),retours:[],admins:[{user_id:MOI.id,nom:'Damien Hurey',titre:'Coach'},{user_id:'demo-coach-yoann',nom:'Yoann David',titre:'Coach'}],
          paiements:[],stats_historique:[]};
  var PRIX={f1:1990,f2:2590,f3:2990}, Q={
    obj:'Quel est ton objectif principal ?', refus:'Des aliments que tu refuses de manger / que tu n’aimes pas ou des restrictions religieuses\nou éthiques ? (Intolérances, écœurements, goûts...)\n(Attention à ne rien oublier, aucune modification ne sera faite une fois la programmation terminée)',
    all:'Allergies, intolérances ou pathologies à signaler ?', reg:'As-tu un régime particulier ? (choix multiple possible)',
    cons:'Y a-t-il des aliments que tu souhaites absolument conserver dans ton alimentation ?'};
  // données de calcul d'EXEMPLE (le moteur déposera les vraies dans diagnostic.calcul) : cohérentes avec la cible de la diète
  function calculDemo(d){ var kc=+(d.cible||{}).kcal||2200, p=d.profil_maquette||{}, h=/^h/i.test(p.sexe||''), poids=h?84:68, aj=/masse/i.test(JSON.stringify(d.questionnaire_cle||{}))?10:-15,
        tdee=Math.round(kc/(1+aj/100)), pal=1.55;
    return {pal:pal,tmb:Math.round(tdee/pal),tdee:tdee,ajustement_pct:aj,ajustement_kcal:kc-tdee,prot_g_kg:Math.round(((d.cible||{}).proteines||0)/(poids-2)*100)/100,
      lip_g_kg:Math.round(((d.cible||{}).lipides||0)/(poids-2)*100)/100,poids:poids,poids_forme:poids-2,taille:h?178:165,age:parseInt(String(p.age_approx||'35'),10)||35}; }
  var vus={}, k=0;
  DIETES.forEach(function(d){
    DB.programmes.push({id:d.id,user_id:d.user_id,version:d.version,statut:d.statut,menu:d.menu,cible:d.cible,diagnostic:Object.assign({calcul:calculDemo(d)},d.diagnostic||{}),
      created_at:d.created_at,traite_at:d.traite_at||null,traite_par:d.traite_at?MOI.id:null,client_externe:null});
    if(vus[d.user_id]) return; vus[d.user_id]=1; k++;
    var p=d.profil_maquette||{}, nm=String(p.prenom||'Client').split(' '), homme=/^h/i.test(p.sexe||''), age=parseInt(String(p.age_approx||'35'),10)+2,
        qc=d.questionnaire_cle||{}, depart=homme?84:72, debut=now-(40+k*6)*JOUR;
    DB.profiles.push({id:d.user_id,prenom:nm[0],nom:nm.slice(1).join(' ')||'',sexe:homme?'HOMME':'FEMME',naissance:(new Date().getFullYear()-age)+'-0'+(1+k%9)+'-1'+k,
      taille_cm:homme?178:165,formule:p.formule||'f2',created_at:iso(debut)});
    var rep={}; rep[Q.obj]=qc.objectif||''; rep[Q.refus]=qc.refus||'Rien de particulier'; rep[Q.all]=qc.allergies||'Rien'; rep[Q.reg]=qc.regime||'Aucun'; rep[Q.cons]=qc.conserver||'Rien de particulier';
    rep['Poids (en kg)']=String(depart); rep['Nombre moyen de pas par jour ? (Si tu utilises une montre connectée ou ton téléphone)']='10.000–13.000';
    rep['En moyenne, combien de séances de sport fais-tu (ou feras-tu) par semaine ?']=String(2+k%4); rep['Es-tu plutôt team sucré ou salé au petit-déjeuner ? (choix multiple possible)']=k%2?'Sucré':'Sucré, Salé';
    rep['Ville']='Amiens'; rep['Code postal']='80000';
    DB.questionnaires.push({user_id:d.user_id,type:'nutrition',statut:'valide',reponses:rep,valide_at:iso(debut+JOUR),created_at:iso(debut)});
    var f=p.formule||'f2';
    DB.abonnements.push({user_id:d.user_id,formule:f,statut:'active',montant_cents:PRIX[f],periode_fin:iso(now+(5+k*3)*JOUR),resiliation_prevue:false,resilie_le:null,stripe_subscription_id:'sub_demo_'+k});
    for(var m=0;m<2;m++) DB.paiements.push({id:'pay_demo_'+k+'_'+m,user_id:d.user_id,stripe_customer_id:'cus_demo_'+k,formule:f,montant_cents:PRIX[f],frais_cents:Math.round(PRIX[f]*0.015+25),
      rembourse_cents:0,statut:'paye',periode_debut:iso(debut+m*28*JOUR),periode_fin:iso(debut+(m+1)*28*JOUR),paye_le:iso(debut+m*28*JOUR),echoue_le:null,litige_frais_cents:0,created_at:iso(debut+m*28*JOUR)});
    var sens=/masse|muscle/i.test(qc.objectif||'')?0.35:-0.55;
    for(var w=0;w<5;w++) DB.poids.push({user_id:d.user_id,date:jourIso(debut+(w*7+2)*JOUR),kg:Math.round((depart+sens*w+(w%2?0.2:-0.1))*10)/10});
    DB.mensurations.push({id:k,user_id:d.user_id,date:jourIso(debut+3*JOUR),epaules:homme?112:98,poitrine:homme?100:90,taille:homme?86:72,hanches:homme?98:100,cuisse:homme?58:56,bras:homme?34:28});
  });
  // une cliente d'EXEMPLE venue du Google Form (pas de compte) : diète validée + fiche de sa version -> bouton « Envoyer par mail »
  if(DIETES[0]){ var gf=DIETES[0];
    DB.programmes.push({id:9100,user_id:null,version:1,statut:'valide',menu:gf.menu,cible:gf.cible,
      diagnostic:Object.assign({calcul:calculDemo(gf),pdf:{chemin:'p/9100.pdf',le:iso(now-JOUR),version:1}},gf.diagnostic||{}),
      created_at:iso(now-2*JOUR),traite_at:iso(now-JOUR),traite_par:MOI.id,
      client_externe:{id:'gf:lea-martin',source:'google_form',prenom:'Léa',nom:'Martin',sexe:'Femme',age:31,email:'lea.martin@exemple.fr',
        horodateur_form:'30/09/2026 18:20:11',questionnaire:{'Quel est ton objectif principal ?':'Perte de poids'}}}); }
  // deux fils de messages : un client Formule Elysium (messagerie ouverte) et un ancien fil d'un client Odyssée
  // (lecture seule : la messagerie est réservée à la Formule Elysium depuis le 02/10)
  if(DB.profiles[0]){ var a=(DB.profiles.filter(function(p){ return p.formule==='f3'; })[0]||DB.profiles[0]).id, b=(DB.profiles[2]||DB.profiles[0]).id;
    DB.messages.push({id:1,client_id:a,auteur_id:a,texte:'Bonjour, est-ce que je peux remplacer le riz par des pâtes le midi ?',created_at:iso(now-2*JOUR),lu_at:null,depuis_equipe:false},
                     {id:2,client_id:b,auteur_id:MOI.id,texte:'Ta nouvelle diète est en ligne. Pense à ta pesée du lundi matin, à jeun.',created_at:iso(now-3*JOUR),lu_at:iso(now-3*JOUR),depuis_equipe:true},
                     {id:3,client_id:b,auteur_id:b,texte:'Merci ! Je commence lundi.',created_at:iso(now-3*JOUR+3600000),lu_at:iso(now-3*JOUR+7200000),depuis_equipe:false}); }
  if(DB.profiles[1]) DB.retours.push({user_id:DB.profiles[1].id,programme_id:9021,plat:'Carbonara',avis:'plus_jamais',created_at:iso(now-JOUR)});
  for(var mo=1;mo<=9;mo++) DB.stats_historique.push({annee:2026,mois:mo,prog_alimentaires:18+mo*3,prog_entrainement:4+mo,hommes:9+mo,femmes:11+mo*2});

  // v_file_coach : la vue de la base (questionnaire validé + profil + dernière version du programme)
  function fileCoach(){
    return DB.questionnaires.filter(function(q){ return q.statut==='valide'; }).map(function(q){
      var p=DB.profiles.filter(function(x){ return x.id===q.user_id; })[0]||{}, pr=DB.programmes.filter(function(x){ return x.user_id===q.user_id; }).sort(function(a,b){ return b.version-a.version; })[0],
          pd=DB.poids.filter(function(x){ return x.user_id===q.user_id; }).sort(function(a,b){ return a.date<b.date?1:-1; })[0];
      return {user_id:q.user_id,prenom:p.prenom,nom:p.nom,sexe:p.sexe,naissance:p.naissance,taille_cm:p.taille_cm,reponses:q.reponses,questionnaire_valide_at:q.valide_at,
        programme_id:pr?pr.id:null,version:pr?pr.version:null,menu:pr?pr.menu:null,cible:pr?pr.cible:null,diagnostic:pr?pr.diagnostic:null,statut:pr?pr.statut:null,
        programme_at:pr?pr.created_at:null,dernier_poids:pd?pd.kg:null,etape:!pr?'a_generer':pr.statut==='en_attente'?'a_relire':pr.statut};
    }).sort(function(a,b){ return a.questionnaire_valide_at<b.questionnaire_valide_at?-1:1; });
  }

  // ---------- un client Supabase minimal (ce que coach.html utilise) ----------
  var seq=100000;
  function Req(table){ this.t=table; this.f=[]; this.o=null; this.n=null; this.one=null; this.op='select'; this.val=null; }
  Req.prototype={
    select:function(){ if(this.op==='select') this.op='select'; return this; },
    eq:function(c,v){ this.f.push(function(r){ return r[c]===v; }); return this; },
    neq:function(c,v){ this.f.push(function(r){ return r[c]!==v; }); return this; },
    is:function(c,v){ this.f.push(function(r){ return v===null?r[c]==null:r[c]===v; }); return this; },
    in:function(c,L){ this.f.push(function(r){ return (L||[]).indexOf(r[c])>-1; }); return this; },
    lt:function(c,v){ this.f.push(function(r){ return r[c]<v; }); return this; },
    lte:function(c,v){ this.f.push(function(r){ return r[c]<=v; }); return this; },
    gt:function(c,v){ this.f.push(function(r){ return r[c]>v; }); return this; },
    gte:function(c,v){ this.f.push(function(r){ return r[c]>=v; }); return this; },
    order:function(c,o){ this.o={c:c,asc:!(o&&o.ascending===false)}; return this; },
    limit:function(n){ this.n=n; return this; },
    maybeSingle:function(){ this.one='maybe'; return this; },
    single:function(){ this.one='single'; return this; },
    insert:function(rows){ this.op='insert'; this.val=rows; return this; },
    upsert:function(rows){ this.op='insert'; this.val=rows; return this; },
    update:function(v){ this.op='update'; this.val=v; return this; },
    delete:function(){ this.op='delete'; return this; },
    run:function(){
      var t=this.t, self=this;
      if(t==='v_file_coach') return {data:fileCoach(),error:null};
      if(!DB[t]) return {data:null,error:{message:'table absente de la maquette : '+t}};
      var ok=function(r){ return self.f.every(function(f){ return f(r); }); };
      if(this.op==='insert'){ var L=[].concat(this.val).map(function(r){ var x=clone(r); if(x.id==null) x.id=++seq; if(!x.created_at) x.created_at=iso(Date.now());
          if(t==='messages'&&x.auteur_id==null) x.auteur_id=MOI.id; if(t==='notes_coachs'&&x.auteur_id==null) x.auteur_id=MOI.id; if(t==='retours_coach'&&x.coach_id==null) x.coach_id=MOI.id; return x; });
        DB[t]=DB[t].concat(L); return {data:clone(L),error:null}; }
      if(this.op==='update'){ var U=DB[t].filter(ok); U.forEach(function(r){ Object.assign(r,clone(self.val)); }); return {data:clone(U),error:null}; }
      if(this.op==='delete'){ var D=DB[t].filter(ok); DB[t]=DB[t].filter(function(r){ return !ok(r); }); return {data:clone(D),error:null}; }
      var R=DB[t].filter(ok);
      if(this.o){ var c=this.o.c, s=this.o.asc?1:-1; R=R.slice().sort(function(a,b){ return a[c]===b[c]?0:(a[c]>b[c]?s:-s); }); }
      if(this.n!=null) R=R.slice(0,this.n);
      R=clone(R);
      if(this.one) return {data:R[0]||null,error:this.one==='single'&&!R.length?{message:'aucune ligne'}:null};
      return {data:R,error:null};
    },
    then:function(res,rej){ var r; try{ r=this.run(); }catch(e){ r={data:null,error:{message:String(e)}}; } return Promise.resolve(r).then(res,rej); }
  };
  function rpc(nom,args){
    if(nom==='noms_coachs') return Promise.resolve({data:DB.admins.map(function(a){ return {user_id:a.user_id,prenom:String(a.nom).split(' ')[0],titre:a.titre}; }),error:null});
    if(nom==='coach_abonnements_suivi') return Promise.resolve({data:DB.abonnements.map(function(a){ return {user_id:a.user_id,formule:a.formule,statut:a.statut,periode_fin:a.periode_fin,resiliation_prevue:a.resiliation_prevue}; }),error:null});
    if(nom==='editer_programme'){   // même règle que la fonction de la base : nouvelle version, l'ancienne passe en « remplacée »
      var o=DB.programmes.filter(function(x){ return x.id===args.p_depuis; })[0];
      if(!o) return Promise.resolve({data:null,error:{message:'diète introuvable'}});
      var d=clone(o.diagnostic||{}); delete d.verdict; delete d.pdf; d.edition={par:MOI.id,le:iso(Date.now()),depuis_programme:o.id,depuis_version:o.version,changements:args.p_changements};
      var n={id:++seq,user_id:o.user_id,client_externe:o.client_externe,version:o.version+1,menu:clone(args.p_menu),cible:clone(o.cible),diagnostic:d,
        statut:args.p_valider?'valide':'en_attente',traite_par:args.p_valider?MOI.id:null,traite_at:args.p_valider?iso(Date.now()):null,created_at:iso(Date.now())};
      // la maquette joue aussi la « veille » du moteur, tout de suite : fiche, liste de courses et contrôle de la version retouchée
      d.pdf={chemin:'p/'+n.id+'.pdf',le:iso(Date.now()),version:n.version};
      d.controle={version:n.version,le:iso(Date.now()),bloquants:[],a_relire:['RÈGLE COACH : programme : exemple de la maquette — pulpe de tomate : 200 g sur la semaine pour un plancher d’achat de 300 g']};
      if(o.menu&&o.menu.courses) n.menu.courses=clone(o.menu.courses);
      DB.programmes.push(n); o.statut='remplace'; o.traite_par=MOI.id; o.traite_at=iso(Date.now());
      return Promise.resolve({data:n.id,error:null}); }
    return Promise.resolve({data:null,error:{message:'fonction absente de la maquette : '+nom}});
  }
  var client={
    from:function(t){ return new Req(t); }, rpc:rpc,
    channel:function(){ var c={on:function(){ return c; },subscribe:function(){ return c; }}; return c; },
    removeChannel:function(){},
    // fiches : un vrai petit PDF d'exemple servi par le site (la sécurité du site interdit de charger un fichier fabriqué
    // dans le navigateur) ; les autres stockages restent vides
    storage:{from:function(b){ return {createSignedUrl:function(){ return Promise.resolve(b==='fiches'
      ? {data:{signedUrl:new URL('assets/fiche-maquette.pdf',location.origin+'/').href},error:null}
      : {data:null,error:{message:'Maquette : pas de fichier.'}}); }}; }},
    auth:{mfa:{getAuthenticatorAssuranceLevel:function(){ return Promise.resolve({data:{currentLevel:'aal2',nextLevel:'aal2'},error:null}); },
               listFactors:function(){ return Promise.resolve({data:{totp:[{id:'demo',status:'verified',friendly_name:'Maquette'}],all:[]},error:null}); },
               enroll:function(){ return Promise.resolve({data:null,error:{message:'Maquette'}}); },
               challengeAndVerify:function(){ return Promise.resolve({data:{},error:null}); },
               unenroll:function(){ return Promise.resolve({data:{},error:null}); }},
          refreshSession:function(){ return Promise.resolve({data:{},error:null}); }}
  };
  window.ElyAuth={client:client, ready:Promise.resolve(MOI), user:function(){ return MOI; }, requireAuth:function(){ return true; },
    acces:function(){ return Promise.resolve('coach'); }, logout:function(){ location.href='coach-maquette'; }};
  window.ELY_MAQUETTE_COACH=true;

  // bandeau : on sait toujours qu'on est sur la maquette
  document.addEventListener('DOMContentLoaded',function(){
    document.title='ELYSIUM · Espace coachs (maquette)';
    var b=document.createElement('div'); b.className='maq-bandeau';
    b.innerHTML='<b>Maquette</b> · la vraie page, avec des données d’exemple. Rien n’est enregistré : tout revient à zéro au rechargement.';
    b.style.cssText='padding:7px 14px;font:13px/1.35 Arial,sans-serif;background:#ffd966;color:#111;text-align:center;border-bottom:1px solid #d9b43c';
    document.body.insertBefore(b,document.body.firstChild);   // en haut, ne suit pas le défilement
  });
})();
