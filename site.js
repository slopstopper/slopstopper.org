(function(){
  var root = document.documentElement;
  var SUN = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>';
  var MOON = '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>';
  var ico = document.getElementById('tico'), lbl = document.getElementById('tlbl');

  function apply(t){
    root.setAttribute('data-theme', t);
    // icon shows the theme you'd switch TO
    ico.innerHTML = (t === 'dark') ? SUN : MOON;
    lbl.textContent = (t === 'dark') ? 'Light' : 'Dark';
  }
  var saved = null;
  try { saved = localStorage.getItem('ss-theme'); } catch(e){}
  var initial = saved || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  apply(initial);

  document.getElementById('ttog').addEventListener('click', function(){
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    apply(next);
    try { localStorage.setItem('ss-theme', next); } catch(e){}
  });

  // copy buttons
  document.querySelectorAll('.copy').forEach(function(b){
    b.addEventListener('click', function(){
      var text = b.getAttribute('data-copy').replace(/&#10;/g, '\n');
      navigator.clipboard.writeText(text).then(function(){
        var old = b.textContent; b.textContent = 'Copied'; b.classList.add('done');
        setTimeout(function(){ b.textContent = old; b.classList.remove('done'); }, 1400);
      });
    });
  });

  // smooth scroll for in-page anchors
  // nav hrefs are stamped as {{root}}#id (e.g. "./#tools"), so match any
  // same-page hash link, not only bare "#id"
  document.querySelectorAll('a[href*="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      var u = new URL(a.href, location.href);
      if(u.pathname !== location.pathname || !u.hash) return;
      var el = document.getElementById(u.hash.slice(1));
      if(el){ e.preventDefault(); el.scrollIntoView({behavior:'smooth', block:'start'}); }
    });
  });

  // scroll reveal
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reduce && 'IntersectionObserver' in window){
    document.querySelectorAll('section > :not(.snum), .tool').forEach(function(el){ el.classList.add('reveal'); });
    var io = new IntersectionObserver(function(es){
      es.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); } });
    }, {rootMargin:'0px 0px -8% 0px', threshold:0.08});
    document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });
  }
})();

// ---- click-to-swing plumb line ----
(function(){
  var plumb=document.querySelector('.plumb'), mark=document.querySelector('.plumb-mark');
  var grab=plumb&&plumb.querySelector('.grab');
  if(!plumb||!mark||!grab) return;
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canSwing=!reduce && matchMedia('(pointer:fine)').matches && window.innerWidth>=760;
  var theta=0, omega=0, raf=null, markX=0, L=600, MAXT=0.16;
  var K=16, C=1.4, KICK=0.62, OMAX=1.6;          // spring, damping, click impulse, velocity cap
  if(plumb.classList.contains('plumb--character')){ KICK=1.0; }   // Plumb is heavier than the bob: a poke sends it further

  function place(){
    markX=mark.getBoundingClientRect().left; plumb.style.left=markX+'px';
    L=plumb.offsetHeight||600;
    var hardCap = plumb.classList.contains('plumb--character') ? 0.24 : 0.17;   // Plumb may swing wider than the bob; it decays rather than hitting a wall
    MAXT=Math.min(hardCap, (parseFloat(plumb.dataset.maxSwing)||120)/L);   // and never past the gutter
  }
  function apply(){ plumb.style.transform='rotate('+theta.toFixed(4)+'rad)'; }
  function step(){
    var dt=1/60, a=-K*Math.sin(theta)-C*omega;
    omega+=a*dt; theta+=omega*dt;
    if(theta>MAXT){ theta=MAXT; if(omega>0) omega=0; }
    else if(theta<-MAXT){ theta=-MAXT; if(omega<0) omega=0; }
    apply();
    if(Math.abs(theta)<0.001 && Math.abs(omega)<0.003){ theta=0; omega=0; apply(); raf=null; return; }
    raf=requestAnimationFrame(step);
  }
  function physics(){ if(raf) cancelAnimationFrame(raf); raf=requestAnimationFrame(step); }

  place();
  window.addEventListener('resize', place);

  if(canSwing){
    plumb.classList.add('swingable');
    grab.addEventListener('pointerdown', function(e){
      e.preventDefault();
      var dir;
      if(Math.abs(omega)<0.06 && Math.abs(theta)<0.03){
        dir = (e.clientX - markX) < -1 ? -1 : 1;   // first push: shove the bob away from the click side
      } else {
        dir = omega>=0 ? 1 : -1;                   // already swinging: add energy in the same direction
      }
      omega += dir*KICK;
      if(omega>OMAX) omega=OMAX; else if(omega<-OMAX) omega=-OMAX;
      plumb.classList.add('poked'); setTimeout(function(){ plumb.classList.remove('poked'); }, 150);
      physics();
    });
  } else {
    grab.style.pointerEvents='none';               // no click strip on touch / coarse pointers
  }

  if(!reduce){ theta=0.15; omega=-0.10; physics(); }   // intro swing

  // Tuck the plumb away before it reaches the footer, so the fixed line
  // never crosses the full-width footer / colophon text at the bottom.
  var footer=document.querySelector('footer');
  if(footer){
    if('IntersectionObserver' in window){
      var fo=new IntersectionObserver(function(es){
        es.forEach(function(en){ plumb.classList.toggle('tucked', en.isIntersecting); });
      }, {rootMargin:'0px 0px -12% 0px'});
      fo.observe(footer);
    } else {
      var onScroll=function(){
        var r=footer.getBoundingClientRect();
        plumb.classList.toggle('tucked', r.top < window.innerHeight*0.88);
      };
      window.addEventListener('scroll', onScroll, {passive:true}); onScroll();
    }
  }
})();
// ---- Plumb (plumb-line page): grounded idle is CSS; this adds the once-only
//      detection flash when the law block scrolls in, and a wave on hover/tap ----
(function(){
  var fig=document.getElementById('plumb'); if(!fig) return;
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  // hang Plumb from the gutter line: the character IS the plumb bob (all viewports; hero Plumb is the no-JS fallback)
  var hang=document.querySelector('.plumb--character .hang');
  if(hang){
    hang.appendChild(fig);
    document.body.classList.add('pl-hanging');
    hang.parentNode.dataset.maxSwing = window.innerWidth<760 ? '52' : '110';   // wider swing where the gutter allows it
    window.dispatchEvent(new Event('resize'));   // let the swing code re-measure its length
    // right of way: fade any gutter section number the hanging figure passes over
    var snums=[].slice.call(document.querySelectorAll('.snum')), ticking=false;
    function yieldPass(){
      ticking=false;
      var r=hang.getBoundingClientRect();
      snums.forEach(function(n){
        var b=n.getBoundingClientRect();
        n.classList.toggle('yield', b.bottom>r.top-8 && b.top<r.bottom+8);
      });
    }
    window.addEventListener('scroll', function(){ if(!ticking){ ticking=true; requestAnimationFrame(yieldPass); } }, {passive:true});
    window.addEventListener('resize', yieldPass);
    yieldPass();
  }
  // detection: the bob holds amber for as long as the law block (the taint example) is in view
  var law=document.getElementById('law');
  if(law){
    if('IntersectionObserver' in window){
      var io=new IntersectionObserver(function(es){
        es.forEach(function(en){ fig.classList.toggle('detect', en.isIntersecting && en.intersectionRatio>=0.25); });
      }, {threshold:[0, 0.25, 0.5]});
      io.observe(law);
    } else { fig.classList.add('detect'); }
  }
  // wave on hover / tap of the figure; when hanging, a tap also nudges the line
  if(!reduce){
    var waving=false, grab=document.querySelector('.plumb .grab');
    function wave(){ if(waving) return; waving=true; fig.classList.add('wave');
      setTimeout(function(){ fig.classList.remove('wave'); waving=false; }, 800); }
    fig.addEventListener('pointerenter', wave);
    fig.addEventListener('pointerover', wave);
    fig.addEventListener('pointerdown', function(e){
      wave();
      if(grab && document.body.classList.contains('pl-hanging')){
        grab.dispatchEvent(new PointerEvent('pointerdown', {clientX:e.clientX, clientY:e.clientY, bubbles:false}));
      }
    });
  }
})();
// ---- feedback page: show the sent panel after Formspree returns to ?sent=1 ----
(function(){
  var sent=document.getElementById('sent'); if(!sent) return;
  if(new URLSearchParams(location.search).get('sent')==='1'){ sent.classList.add('show'); sent.setAttribute('tabindex','-1'); sent.focus(); }
})();
