/* Account pages do not load the intake app; keep their menu fully usable. */
(() => {
  const menu=document.querySelector('.menu-button'),nav=document.querySelector('#site-nav');
  if(!menu||!nav)return;
  const setMenu=open=>{const show=Boolean(open)&&matchMedia('(max-width: 980px)').matches;nav.classList.toggle('open',show);menu.setAttribute('aria-expanded',String(show));menu.setAttribute('aria-label',show?'Close Menu':'Open Menu');};
  menu.addEventListener('click',()=>setMenu(!nav.classList.contains('open')));
  nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>setMenu(false)));
  document.addEventListener('keydown',event=>{if(event.key==='Escape')setMenu(false)});
  document.addEventListener('click',event=>{if(event.target instanceof Element&&!event.target.closest('.site-header'))setMenu(false)});
  addEventListener('resize',()=>{if(!matchMedia('(max-width: 980px)').matches)setMenu(false)});
})();
