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
    document.querySelectorAll('section > *, .tool').forEach(function(el){ el.classList.add('reveal'); });
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
  var theta=0, omega=0, raf=null, markX=0, L=600;
  // Free swing (owner, 2026-09-25): no gutter cap, no small wall. Each tap adds energy in the
  // direction of travel, so you can pump it higher; light damping lets that accumulate. The only
  // stop is THETA_MAX, just short of horizontal, where a real string would go slack.
  var K=16, C=0.5, KICK=0.7, PUMP=0.35, THETA_MAX=1.45;   // spring, damping, tap impulse, pump gain, angle stop (~83°)
  var OMAX=5.5;                                  // velocity cap: √(2K(1−cos θmax)) ≈ 5.31, so the stop is reachable
  if(plumb.classList.contains('plumb--character')){ KICK=0.95; }  // Plumb is heavier than the bob: a poke sends it further

  function place(){
    markX=mark.getBoundingClientRect().left; plumb.style.left=markX+'px';
    L=plumb.offsetHeight||600;
  }
  function apply(){ plumb.style.transform='rotate('+theta.toFixed(4)+'rad)'; plumb._theta=theta; }
  function step(){
    var dt=1/60, a=-K*Math.sin(theta)-C*omega;
    omega+=a*dt; theta+=omega*dt;
    if(theta>THETA_MAX){ theta=THETA_MAX; if(omega>0) omega=0; }       // string goes slack past here: stop and fall back
    else if(theta<-THETA_MAX){ theta=-THETA_MAX; if(omega<0) omega=0; }
    apply();
    if(Math.abs(theta)<0.001 && Math.abs(omega)<0.003){ theta=0; omega=0; apply(); raf=null; return; }
    raf=requestAnimationFrame(step);
  }
  function physics(){ if(raf) cancelAnimationFrame(raf); raf=requestAnimationFrame(step); plumb.dispatchEvent(new Event('plumb-move')); }
  function kick(clientX){
    var dir;
    if(Math.abs(omega)<0.06 && Math.abs(theta)<0.03){ dir = (clientX - markX) < -1 ? -1 : 1; }   // first push: away from the click side
    else { dir = omega>=0 ? 1 : -1; }                                                          // already swinging: add energy
    omega += dir*(KICK + PUMP*Math.abs(omega));   // like pumping a swing: a tap at speed adds more, so rhythm gets you to the top
    if(omega>OMAX) omega=OMAX; else if(omega<-OMAX) omega=-OMAX;
    plumb.classList.add('poked'); setTimeout(function(){ plumb.classList.remove('poked'); }, 150);
    physics();
  }
  if(!reduce) plumb._kick=kick;   // the character (site.js below) pokes the line from a tap on the figure, on any device

  place();
  window.addEventListener('resize', place);

  if(!reduce) grab.addEventListener('pointerdown', function(e){ e.preventDefault(); kick(e.clientX); });
  if(canSwing){
    plumb.classList.add('swingable');
  } else if(plumb.classList.contains('plumb--character')){
    grab.style.pointerEvents='none';               // Plumb himself takes the tap (site.js below); no double kick
  } else {
    // touch / coarse pointer: no full-height strip, but the bob is tappable (a generous zone around it)
    grab.style.top='auto'; grab.style.bottom='-18px'; grab.style.height='80px';
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
//      detection flash while the law block is in view, and limbs that swing with the line ----
(function(){
  var fig=document.getElementById('plumb'); if(!fig) return;
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  // hang Plumb from the gutter line: the character IS the plumb bob (all viewports; hero Plumb is the no-JS fallback)
  var hang=document.querySelector('.plumb--character .hang');
  if(hang){
    hang.appendChild(fig);
    document.body.classList.add('pl-hanging');
    window.dispatchEvent(new Event('resize'));   // let the swing code re-measure its length
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
  // limbs: each arm and leg is its own small pendulum, driven by the body's swing and
  // settling at its own rate, so a poke makes Plumb flail and then hang still again
  var line=document.querySelector('.plumb');
  if(!reduce && line){
    var limbs=[
      {el:document.getElementById('arm-l'), origin:'232px 546px', k:22, c:1.9, g:-9, phi:0, w:0},
      {el:document.getElementById('arm-r'), origin:'368px 546px', k:19, c:1.7, g:-9, phi:0, w:0},
      {el:document.getElementById('leg-l'), origin:'270px 706px', k:30, c:2.3, g:-5.5, phi:0, w:0},
      {el:document.getElementById('leg-r'), origin:'336px 708px', k:27, c:2.1, g:-5.5, phi:0, w:0}
    ].filter(function(l){ return l.el; });
    limbs.forEach(function(l){ l.el.style.transformOrigin=l.origin; });
    var lraf=null, lastTheta=0;
    function limbStep(){
      var dt=1/60, theta=line._theta||0, moving=false;
      var accel=(theta-lastTheta)/dt; lastTheta=theta;          // body angular velocity: the drive
      limbs.forEach(function(l){
        var a=-l.k*l.phi - l.c*l.w + l.g*accel;                // spring back to hanging, damped, driven by the body
        l.w+=a*dt; l.phi+=l.w*dt;
        if(l.phi>0.7) l.phi=0.7; else if(l.phi<-0.7) l.phi=-0.7;   // ~40°: flail, not windmill
        l.el.style.transform='rotate('+l.phi.toFixed(4)+'rad)';
        if(Math.abs(l.phi)>0.002||Math.abs(l.w)>0.01) moving=true;
      });
      if(moving||Math.abs(theta)>0.001){ lraf=requestAnimationFrame(limbStep); } else { lraf=null; }
    }
    function limbsGo(){ if(!lraf) lraf=requestAnimationFrame(limbStep); }
    line.addEventListener('plumb-move', limbsGo);
    limbsGo();
    // a tap on Plumb himself pokes the line, on any device (the grab strip is desktop-only)
    fig.addEventListener('pointerdown', function(e){ if(line._kick) line._kick(e.clientX); });
  }
})();
// ---- feedback page: show the sent panel after Formspree returns to ?sent=1 ----
(function(){
  var sent=document.getElementById('sent'); if(!sent) return;
  if(new URLSearchParams(location.search).get('sent')==='1'){ sent.classList.add('show'); sent.setAttribute('tabindex','-1'); sent.focus(); }
})();
