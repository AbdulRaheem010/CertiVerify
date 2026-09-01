const key='certiverify-theme';
function apply(theme){document.documentElement.dataset.theme=theme;document.querySelectorAll('[data-theme-toggle]').forEach(b=>b.setAttribute('aria-label',`Switch to ${theme==='dark'?'light':'dark'} mode`));}
const initial=localStorage.getItem(key)||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
apply(initial);

function ensureMobileNavigation(){
  const page=document.querySelector('.app-page');
  const sidebar=document.querySelector('.sidebar');
  if(!page||!sidebar)return;

  let toggles=[...document.querySelectorAll('[data-menu-toggle]')];
  if(!toggles.length){
    const button=document.createElement('button');
    button.className='mobile-menu-button';
    button.type='button';
    button.setAttribute('data-menu-toggle','');
    button.setAttribute('aria-label','Open navigation');
    button.setAttribute('aria-expanded','false');
    button.textContent='☰';
    page.appendChild(button);
    const backdrop=document.createElement('div');
    backdrop.className='mobile-nav-backdrop';
    backdrop.setAttribute('data-menu-toggle','');
    backdrop.setAttribute('aria-hidden','true');
    page.appendChild(backdrop);
    toggles=[button,backdrop];
  }

  if(!document.getElementById('certiverify-mobile-nav-style')){
    const style=document.createElement('style');
    style.id='certiverify-mobile-nav-style';
    style.textContent=`
      .mobile-menu-button{display:none}
      .mobile-nav-backdrop{display:none}
      @media(max-width:760px){
        .mobile-menu-button{display:grid;place-items:center;position:fixed;top:14px;left:14px;z-index:30;width:42px;height:42px;border:1px solid var(--line);border-radius:11px;background:var(--surface);color:var(--text);box-shadow:var(--shadow);font-size:20px}
        .mobile-nav-backdrop{position:fixed;inset:0;background:#0008;z-index:19}
        .sidebar{display:flex;flex-direction:column;position:fixed;z-index:20;top:0;left:-280px;width:260px;height:100vh;min-height:100vh;padding:24px 16px;transition:left .22s ease;box-shadow:18px 0 50px #0004}
        .sidebar nav{overflow:auto;max-height:calc(100vh - 110px)}
        .sidebar-logout{position:static;margin-top:auto;padding:12px;text-align:left}
        .app-page.nav-open .sidebar{left:0}
        .app-page.nav-open .mobile-nav-backdrop{display:block}
        .app-header{padding-left:52px;gap:12px}
        .app-header-copy{min-width:0}
        .app-header-actions{align-items:center}
        .app-header h1{font-size:25px}
        .app-main{width:100%;max-width:none}
        .table-wrap{max-width:100%;overflow-x:auto}
        th,td{white-space:nowrap}
      }
      @media(min-width:761px){.mobile-only-action{display:none!important}.mobile-menu-button{display:none!important}.mobile-nav-backdrop{display:none!important}}
    `;
    document.head.appendChild(style);
  }

  toggles.forEach(toggle=>toggle.addEventListener('click',(event)=>{
    event.preventDefault();
    const open=page.classList.toggle('nav-open');
    document.querySelectorAll('[data-menu-toggle].mobile-menu-button').forEach(btn=>btn.setAttribute('aria-expanded',String(open)));
    document.body.style.overflow=open?'hidden':'';
  }));

  sidebar.querySelectorAll('nav a').forEach(link=>link.addEventListener('click',()=>{
    page.classList.remove('nav-open');
    document.querySelectorAll('[data-menu-toggle].mobile-menu-button').forEach(btn=>btn.setAttribute('aria-expanded','false'));
    document.body.style.overflow='';
  }));
}

document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('[data-theme-toggle]').forEach(b=>b.addEventListener('click',()=>{const n=document.documentElement.dataset.theme==='dark'?'light':'dark';localStorage.setItem(key,n);apply(n)}));
  ensureMobileNavigation();
});
