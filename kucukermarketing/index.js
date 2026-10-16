(function(){
  "use strict";

  /* Let op: het "hidden"-attribuut wordt op SVG-elementen niet altijd
     betrouwbaar bijgewerkt via de .hidden-property (dat werkt wel voor
     gewone HTML-elementen, maar niet consistent voor <svg>). Daarom hier
     expliciet setAttribute/removeAttribute gebruiken i.p.v. ".hidden = ..." */
  function setSvgHidden(el, isHidden){
    if(!el) return;
    if(isHidden){ el.setAttribute("hidden", ""); }
    else { el.removeAttribute("hidden"); }
  }

  var menuToggle = document.getElementById("menuToggle");
  var mobilePanel = document.getElementById("mobilePanel");
  var iconMenu = document.getElementById("iconMenu");
  var iconClose = document.getElementById("iconClose");

  function closeMobileMenu(){
    if(!mobilePanel) return;
    mobilePanel.classList.remove("open");
    if(menuToggle) menuToggle.setAttribute("aria-expanded","false");
    setSvgHidden(iconMenu, false);
    setSvgHidden(iconClose, true);
  }

  if(menuToggle){
    menuToggle.addEventListener("click", function(){
      var open = mobilePanel.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
      setSvgHidden(iconMenu, open);
      setSvgHidden(iconClose, !open);
    });
  }

  /* ---------- Eigen smooth-scroll voor interne links (#...) ----------
     We animeren zelf met requestAnimationFrame in plaats van te vertrouwen
     op CSS scroll-behavior:smooth, omdat sommige besturingssystemen/browsers
     (bijv. bij "verminderde beweging" aan) die CSS negeren en dan gewoon
     instant springen. Zo scrollt het altijd zichtbaar, op elk apparaat. */
  var HEADER_OFFSET = 84;
  var SCROLL_DURATION = 650;
  var scrollAnimToken = 0; /* zorgt dat een nieuwe klik een lopende scroll-animatie overneemt i.p.v. ermee te vechten */

  function easeInOutQuad(t){
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function animateScrollTo(targetY, onDone){
    targetY = Math.max(0, Math.min(targetY, document.documentElement.scrollHeight - window.innerHeight));
    var startY = window.scrollY;
    var distance = targetY - startY;
    var myToken = ++scrollAnimToken;
    if(Math.abs(distance) < 1){ if(onDone) onDone(); return; }
    var startTime = null;
    function step(timestamp){
      if(myToken !== scrollAnimToken) return; /* overruled door een nieuwere klik */
      if(startTime === null) startTime = timestamp;
      var elapsed = timestamp - startTime;
      var progress = Math.min(elapsed / SCROLL_DURATION, 1);
      /* behavior:"auto" i.p.v. de CSS scroll-behavior:smooth laten overnemen:
         anders start elke losse scrollTo-aanroep hier óók nog eens zijn eigen
         native "smooth" animatie, en die twee vechten dan met elkaar om de
         uiteindelijke positie (vaak blijft hij dan ergens halverwege steken). */
      window.scrollTo({top: startY + distance * easeInOutQuad(progress), left: 0, behavior: "auto"});
      if(progress < 1){
        requestAnimationFrame(step);
      } else {
        /* De rekentijd zegt dat we klaar zijn, maar de browser past de
           scroll soms met een klein beetje vertraging pas echt toe.
           Wacht tot window.scrollY ook werkelijk is aangekomen voor we
           onDone aanroepen — anders laat de scrollspy de highlight
           (het grijze balkje) te vroeg weer los, nog voordat de pagina
           zelf is uitgescrolld, en "sleept" hij zichtbaar mee. */
        var safety = 90; /* ruime marge, ~1.5s bij 60fps */
        (function waitForRealPosition(){
          if(myToken !== scrollAnimToken) return;
          if(Math.abs(window.scrollY - targetY) < 3 || safety <= 0){
            if(onDone) onDone();
            return;
          }
          safety--;
          requestAnimationFrame(waitForRealPosition);
        })();
      }
    }
    requestAnimationFrame(step);
  }

  var DIENSTEN_IDS = ["diensten","socialmedia","meta-ads","google-ads","seo-blogs"];
  var sections = ["diensten","waarom","socialmedia","meta-ads","google-ads","seo-blogs","combideal","contact"]
    .map(function(id){ return document.getElementById(id); }).filter(Boolean);
  var navLinks = document.querySelectorAll("[data-nav]");

  /* Terwijl we zelf programmatisch naar een sectie scrollen, negeren we de
     scroll-gebaseerde highlight (anders "sleept" de grijze balk even mee
     over de secties die onderweg gepasseerd worden, voordat hij op de
     aangeklikte lande). We zetten de juiste link meteen bij klik vast. */
  var suppressSpy = false;

  function setActiveNav(id){
    navLinks.forEach(function(a){
      var target = a.getAttribute("data-nav");
      var isMatch = (target === id) || (target === "diensten" && DIENSTEN_IDS.indexOf(id) !== -1);
      if(isMatch){ a.setAttribute("aria-current","page"); }
      else { a.removeAttribute("aria-current"); }
    });
  }

  function onScroll(){
    if(suppressSpy) return;
    var pos = window.scrollY + 110;
    var current = null;
    sections.forEach(function(sec){
      if(sec.offsetTop <= pos) current = sec.id;
    });
    setActiveNav(current);
  }
  window.addEventListener("scroll", onScroll, {passive:true});
  onScroll();

  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener("click", function(e){
      var hash = a.getAttribute("href");
      if(!hash || hash.length < 2) return;
      var isOpen = mobilePanel && mobilePanel.classList.contains("open");
      if(a.classList.contains("nav-link") || (mobilePanel && mobilePanel.contains(a))){
        closeMobileMenu();
      }
      if(hash === "#top"){
        e.preventDefault();
        suppressSpy = true;
        setActiveNav(null);
        animateScrollTo(0, function(){ suppressSpy = false; onScroll(); });
        history.pushState(null, "", "#top");
        return;
      }
      var target = document.getElementById(hash.slice(1));
      if(!target) return;
      e.preventDefault();
      suppressSpy = true;
      setActiveNav(target.id);
      var targetY = target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
      /* Als het mobiele menu nog dichtklapt, geeft dat een layout-shift;
         we wachten die ene frame uit zodat de eindpositie klopt. */
      if(isOpen){
        requestAnimationFrame(function(){
          var fixedY = target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
          animateScrollTo(fixedY, function(){ suppressSpy = false; onScroll(); });
        });
      } else {
        animateScrollTo(targetY, function(){ suppressSpy = false; onScroll(); });
      }
      history.pushState(null, "", hash);
    });
  });

  var yearEl = document.getElementById("year");
  if(yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Contactformulier ---------- */
  var form = document.getElementById("contactForm");
  var successBox = document.getElementById("successBox");
  var resetBtn = document.getElementById("resetForm");
  var submitBtn = document.getElementById("submitBtn");
  var formError = document.getElementById("formError");
  var CONTACT_EMAIL = "ummetkucuker@hotmail.com";

  if(form){
    form.addEventListener("submit", function(e){
      e.preventDefault();
      if(!form.checkValidity()){
        form.reportValidity();
        return;
      }
      var service = Array.prototype.filter.call(form.service, function(cb){ return cb.checked; })
        .map(function(cb){ return cb.value; }).join(", ") || "(niet opgegeven)";
      var name = form.name.value.trim();
      var email = form.email.value.trim();
      var phone = form.phone.value.trim();
      var message = form.message.value.trim();

      if(formError) formError.hidden = true;
      if(submitBtn){ submitBtn.disabled = true; submitBtn.textContent = "Versturen…"; }

      var payload = {
        dienst: service,
        name: name,
        email: email,
        phone: phone || "(niet opgegeven)",
        message: message,
        _subject: "Nieuw bericht via website — " + name,
        _template: "table",
        _captcha: "false"
      };

      fetch("https://formsubmit.co/ajax/" + CONTACT_EMAIL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function(res){
          if(!res.ok) throw new Error("network");
          return res.json();
        })
        .then(function(){
          form.style.display = "none";
          if(successBox) successBox.classList.add("show");
        })
        .catch(function(){
          if(formError) formError.hidden = false;
        })
        .finally(function(){
          if(submitBtn){ submitBtn.disabled = false; submitBtn.textContent = "Verstuur bericht"; }
        });
    });
  }
  if(resetBtn){
    resetBtn.addEventListener("click", function(){
      form.reset();
      if(successBox) successBox.classList.remove("show");
      form.style.display = "block";
    });
  }
})();
