(function(){
  const welcome=document.getElementById('welcome');
  const app=document.getElementById('appShell');
  const start=document.getElementById('startConfiguration');
  const saved=document.getElementById('openSavedWelcome');
  const home=document.getElementById('homeButton');
  function showApp(){welcome.classList.add('app-hidden');app.classList.remove('app-hidden');window.scrollTo(0,0);setTimeout(syncProgress,50)}
  function showWelcome(){app.classList.add('app-hidden');welcome.classList.remove('app-hidden');window.scrollTo(0,0)}
  function syncProgress(){const buttons=[...document.querySelectorAll('#nav button')];const active=buttons.findIndex(b=>b.classList.contains('active'));const n=(active<0?0:active)+1;const p=document.getElementById('progressText');const c=document.getElementById('chapterNo');if(p)p.textContent=String(n).padStart(2,'0')+' / '+String(buttons.length||11).padStart(2,'0');if(c)c.textContent=String(n).padStart(2,'0')}
  start.addEventListener('click',showApp);saved.addEventListener('click',()=>{showApp();setTimeout(()=>document.getElementById('findSaved').click(),120)});home.addEventListener('click',showWelcome);
  document.querySelectorAll('[data-welcome-lang]').forEach(b=>b.addEventListener('click',()=>{const lang=b.dataset.welcomeLang;document.querySelectorAll('[data-welcome-lang]').forEach(x=>x.classList.toggle('active',x===b));const target=document.getElementById(lang==='IT'?'langIT':'langEN');if(target)target.click();document.getElementById('welcomeText').textContent=lang==='IT'?'Crea una configurazione su misura per la tua visione.':'Build a configuration tailored to your vision.';start.textContent=lang==='IT'?'INIZIA CONFIGURAZIONE':'START CONFIGURATION';saved.textContent=lang==='IT'?'APRI SALVATA':'OPEN SAVED'}));
  const observer=new MutationObserver(syncProgress);observer.observe(document.getElementById('nav'),{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
})();
