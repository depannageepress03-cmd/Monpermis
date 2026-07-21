/** Animation d’intro Monpermis.bj — HTML embarqué pour WebView (sans blur CSS). */
export const MONPERMIS_INTRO_HTML = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>monpermis.bj — Animation</title>
<style>
  :root{
    --bg:        #FAF9F6;
    --green:     #1FA857;
    --yellow:    #F5B31B;
    --navy:      #14263F;
    --ease-out:  cubic-bezier(.22, 1, .36, 1);
    --logo-w:    min(232px, 56vw);
  }

  *{ margin:0; padding:0; box-sizing:border-box; }

  html, body{
    height:100%;
    width:100%;
    overflow:hidden;
    background:var(--bg);
    font-family:system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    display:flex;
    align-items:center;
    justify-content:center;
    -webkit-tap-highlight-color:transparent;
  }

  .ambient{
    position:fixed;
    inset:0;
    background:radial-gradient(ellipse 55% 45% at 50% 44%,
               #ffffff 0%, var(--bg) 70%);
    opacity:0;
    animation:fadeIn 1.6s ease-out forwards;
  }
  @keyframes fadeIn{ to{ opacity:1; } }

  .scene{
    position:relative;
    display:flex;
    flex-direction:column;
    align-items:center;
    animation:drift 11s ease-in-out 3s infinite;
  }
  @keyframes drift{
    0%, 100%{ transform:translateY(0); }
    50%     { transform:translateY(-3px); }
  }

  .scene::before{
    content:"";
    position:absolute;
    top:56%;
    width:180px; height:26px;
    border-radius:50%;
    background:radial-gradient(ellipse, rgba(14,34,64,.10), transparent 70%);
    opacity:0;
    animation:fadeIn 1.4s ease-out .8s forwards;
  }

  .logo{
    width:var(--logo-w);
    position:relative;
  }
  .logo svg{ width:100%; height:auto; display:block; overflow:visible; }

  /* Révélation nette : opacity + translate (pas de blur — bug Android WebView) */
  .shape{
    opacity:0;
    transform:translateY(10px);
    animation:reveal 1.6s var(--ease-out) forwards;
  }
  .s-green { animation-delay:.25s; }
  .s-yellow{ animation-delay:.45s; }
  .s-navy  { animation-delay:.65s; }
  @keyframes reveal{
    to{ opacity:1; transform:translateY(0); }
  }

  .dash{
    opacity:0;
    animation:dashOn .7s ease-out forwards;
  }
  .dash:nth-child(1){ animation-delay:1.25s; }
  .dash:nth-child(2){ animation-delay:1.35s; }
  .dash:nth-child(3){ animation-delay:1.45s; }
  .dash:nth-child(4){ animation-delay:1.55s; }
  .dash:nth-child(5){ animation-delay:1.65s; }
  @keyframes dashOn{ to{ opacity:1; } }

  .dash-travel{
    animation:travel 8s linear 3.2s infinite;
  }
  @keyframes travel{
    from{ transform:translate(0, 0); }
    to  { transform:translate(49px, -65px); }
  }

  .shine{
    position:absolute;
    inset:0;
    pointer-events:none;
    background:linear-gradient(115deg,
      transparent 42%,
      rgba(255,255,255,.55) 50%,
      transparent 58%);
    transform:translateX(-120%);
    mix-blend-mode:soft-light;
    animation:shine 9s ease-in-out 4s infinite;
  }
  @keyframes shine{
    0%, 82%{ transform:translateX(-120%); }
    94%, 100%{ transform:translateX(120%); }
  }

  .wordmark{
    margin-top:calc(var(--logo-w) * .078);
    font-size:calc(var(--logo-w) * .128);
    font-weight:700;
    letter-spacing:.045em;
    display:flex;
  }
  .wordmark span{
    opacity:0;
    transform:translateY(8px);
    animation:reveal 1s var(--ease-out) forwards;
  }
  .wordmark .c-green { color:var(--green); }
  .wordmark .c-navy  { color:var(--navy); }

  @media (prefers-reduced-motion: reduce){
    *{ animation-duration:.01s !important; animation-delay:0s !important;
       animation-iteration-count:1 !important; }
  }
</style>
</head>
<body>

<div class="ambient"></div>

<div class="scene">
  <div class="logo">
    <svg viewBox="150 170 740 650" xmlns="http://www.w3.org/2000/svg" aria-label="Logo monpermis.bj">
      <defs>
        <clipPath id="road">
          <path d="M819,278 L801,277 L784,287 L711,349 L655,404 L535,538 L341,768 L433,768 L501,680 L519,684 L520,689 L463,768 L555,768 L651,610 L699,541 L704,542 L704,752 L708,761 L719,768 L814,768 L825,761 L830,748 L830,298 L827,286 Z"/>
        </clipPath>
      </defs>

      <path class="shape s-green" fill="var(--green)"
        d="M211,222 L199,231 L195,242 L195,749 L206,766 L224,768 L249,749 L333,657 L333,510 L304,469 L303,462 L322,466 L375,444 L392,443 L404,447 L427,465 L496,401 L288,260 L229,224 Z"/>

      <path class="shape s-yellow" fill="var(--yellow)"
        d="M830,218 L809,222 L770,238 L708,270 L633,316 L521,399 L429,480 L421,478 L398,458 L379,456 L328,477 L328,482 L435,599 L445,604 L632,393 L716,313 Z"/>

      <g class="shape s-navy">
        <path fill="var(--navy)"
          d="M819,278 L801,277 L784,287 L711,349 L655,404 L535,538 L341,768 L433,768 L501,680 L519,684 L520,689 L463,768 L555,768 L651,610 L699,541 L704,542 L704,752 L708,761 L719,768 L814,768 L825,761 L830,748 L830,298 L827,286 Z"/>

        <g clip-path="url(#road)">
          <g class="dash-travel" fill="#ffffff">
            <path class="dash" d="M534,663 L518,658 L476,715 L494,720 Z"/>
            <path class="dash" d="M583,598 L567,593 L525,650 L543,655 Z"/>
            <path class="dash" d="M632,526 L622,522 L590,564 L603,569 Z"/>
            <path class="dash" d="M675,462 L669,461 L641,496 L640,500 L647,503 L650,502 L675,466 Z"/>
            <path class="dash" d="M712,415 L705,412 L688,435 L695,438 Z"/>
          </g>
        </g>
      </g>
    </svg>
    <div class="shine"></div>
  </div>

  <div class="wordmark" id="wordmark" aria-label="monpermis.bj"></div>
</div>

<script>
  (function () {
    var wm = document.getElementById('wordmark');
    var segments = [
      ['mon',    'c-navy'],
      ['permis', 'c-navy'],
      ['.bj',    'c-green']
    ];
    var i = 0;
    for (var s = 0; s < segments.length; s++) {
      var text = segments[s][0];
      var cls = segments[s][1];
      for (var c = 0; c < text.length; c++) {
        var span = document.createElement('span');
        span.className = cls;
        span.textContent = text.charAt(c);
        span.style.animationDelay = (1.6 + i * 0.04) + 's';
        wm.appendChild(span);
        i++;
      }
    }

    function notifyDone() {
      try {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage('intro-done');
        }
      } catch (e) {}
    }

    var doneAt = 1600 + i * 40 + 1100;
    setTimeout(function () {
      document.body.style.transition = 'opacity .4s ease';
      document.body.style.opacity = '0';
      setTimeout(notifyDone, 400);
    }, doneAt);

    // Filet de sécurité si les timers sont ralentis
    setTimeout(notifyDone, doneAt + 2000);
  })();
</script>

</body>
</html>
`
