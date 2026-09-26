let cars=[];
let activeCategory='Wszystkie';
let updatedOnly=false;
let currentCar=null;

const $=s=>document.querySelector(s);
const grid=$('#carGrid');
const search=$('#searchInput');
const brand=$('#brandFilter');
const price=$('#priceFilter');
const sort=$('#sortSelect');
const chips=$('#categoryChips');
const count=$('#resultCount');
const empty=$('#emptyState');
const modal=$('#carModal');
const toast=$('#toast');

const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

function spriteXY(index){return {x:index%4,y:Math.floor(index/4)}}
function mediaHTML(c,extra=''){
  if(Number.isInteger(c.spriteIndex)){
    const p=spriteXY(c.spriteIndex);
    return '<div class="sprite '+extra+'" style="--sx:'+p.x+';--sy:'+p.y+'" role="img" aria-label="'+esc(c.name)+'"></div>';
  }
  return '<img class="'+extra+'" src="'+esc(c.image)+'" alt="'+esc(c.name)+'" loading="lazy" decoding="async">';
}

function categoryList(){return ['Wszystkie',...new Set(cars.map(c=>c.category))]}
function renderChips(){
  chips.innerHTML=categoryList().map(cat=>{
    const n=cat==='Wszystkie'?cars.length:cars.filter(c=>c.category===cat).length;
    return '<button type="button" class="chip '+(cat===activeCategory?'active':'')+'" data-cat="'+esc(cat)+'">'+esc(cat)+' · '+n+'</button>'
  }).join('');
  chips.querySelectorAll('.chip').forEach(b=>b.onclick=()=>{activeCategory=b.dataset.cat;renderChips();renderCars()});
}
function fillBrands(){
  const list=[...new Set(cars.map(c=>c.brand))].sort((a,b)=>a.localeCompare(b,'pl'));
  brand.innerHTML='<option value="">Wszystkie marki</option>'+list.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');
}
function priceOK(c){
  if(!price.value)return true;
  const [op,val]=price.value.split(':'); const n=Number(val);
  return op==='lte'?c.price<=n:c.price>=n;
}
function filtered(){
  const q=search.value.trim().toLowerCase();
  let out=cars.filter(c=>{
    const hay=(c.name+' '+c.brand+' '+c.id+' '+(c.code||'')).toLowerCase();
    return (activeCategory==='Wszystkie'||c.category===activeCategory)
      &&(!brand.value||c.brand===brand.value)
      &&priceOK(c)
      &&(!updatedOnly||c.updated)
      &&(!q||hay.includes(q));
  });
  if(sort.value==='priceDesc')out.sort((a,b)=>b.price-a.price);
  else if(sort.value==='priceAsc')out.sort((a,b)=>a.price-b.price);
  else if(sort.value==='name')out.sort((a,b)=>a.name.localeCompare(b.name,'pl'));
  else out.sort((a,b)=>(Number(b.featured)-Number(a.featured))||(Number(b.updated)-Number(a.updated))||(b.price-a.price));
  return out;
}
function card(c){
  return '<article class="car-card" tabindex="0" data-id="'+esc(c.id)+'" aria-label="'+esc(c.name)+'">'
    +'<div class="card-media">'+mediaHTML(c)
    +'<div class="card-badges"><span class="badge">'+esc(c.category)+'</span>'+(c.updated?'<span class="badge updated">POPRAWIONE</span>':'')+'</div></div>'
    +'<div class="card-body"><div class="card-meta"><span>'+esc(c.brand)+'</span><span>'+esc(c.id)+'</span></div>'
    +'<h3>'+esc(c.name)+'</h3><div class="card-foot"><span class="card-price">'+money(c.price)+' <small>RP</small></span><span class="card-open">Zobacz auto →</span></div></div></article>';
}
function renderCars(){
  const list=filtered();
  grid.innerHTML=list.map(card).join('');
  count.textContent=list.length+' z '+cars.length+' pojazdów';
  empty.hidden=list.length>0;
  grid.querySelectorAll('.car-card').forEach(el=>{
    const fn=()=>openModal(cars.find(c=>c.id===el.dataset.id));
    el.onclick=fn; el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fn()}};
  });
}
function renderFeatured(){
  const list=[...cars].sort((a,b)=>(Number(b.featured)-Number(a.featured))||(b.price-a.price)).slice(0,3);
  $('#featuredGrid').innerHTML=list.map(c=>'<article class="featured-mini" tabindex="0" data-id="'+c.id+'"><div class="mini-media">'+mediaHTML(c)+'</div><div class="mini-copy"><span>'+esc(c.category)+'</span><h3>'+esc(c.name)+'</h3><strong>'+money(c.price)+'</strong></div></article>').join('');
  document.querySelectorAll('.featured-mini').forEach(el=>{const fn=()=>openModal(cars.find(c=>c.id===el.dataset.id));el.onclick=fn;el.onkeydown=e=>{if(e.key==='Enter'){fn()}}});
}
function setHero(){
  const c=[...cars].sort((a,b)=>(Number(b.featured)-Number(a.featured))||(b.price-a.price))[0];
  if(!c)return;
  $('#heroMedia').innerHTML=mediaHTML(c);
  $('#heroId').textContent=c.id; $('#heroCategory').textContent=c.category.toUpperCase();
  $('#heroName').textContent=c.name; $('#heroPrice').textContent=money(c.price);
  const fn=()=>openModal(c); $('#heroCar').onclick=fn; $('#heroCar').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fn()}};
}
function openModal(c){
  if(!c)return; currentCar=c;
  $('#modalMedia').innerHTML=mediaHTML(c);
  $('#modalCategory').textContent=c.category; $('#modalCategory2').textContent=c.category; $('#modalId').textContent=c.id;
  $('#modalBrand').textContent=c.brand; $('#modalName').textContent=c.name; $('#modalPrice').textContent=money(c.price);
  $('#modalVariants').textContent=c.variants??'—'; $('#modalCode').textContent=c.code||'—'; $('#modalPack').textContent=c.sourcePack||'—';
  $('#modalUpdated').hidden=!c.updated; $('#copyId').textContent='Kopiuj ID pojazdu';
  modal.showModal(); document.body.classList.add('modal-open');
}
function closeModal(){if(modal.open)modal.close();document.body.classList.remove('modal-open')}
function showToast(msg){toast.textContent=msg;toast.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>toast.classList.remove('show'),1600)}
function reset(){
  search.value='';brand.value='';price.value='';sort.value='featured';activeCategory='Wszystkie';updatedOnly=false;
  $('#updatedToggle').classList.remove('active');$('#updatedToggle').setAttribute('aria-pressed','false');renderChips();renderCars();
}
function init(data){
  cars=data;
  $('#statCars').textContent=cars.length; $('#statBrands').textContent=new Set(cars.map(c=>c.brand)).size; $('#statCats').textContent=new Set(cars.map(c=>c.category)).size;
  $('#statTop').textContent=money(Math.max(...cars.map(c=>c.price))).replace('.00','');
  fillBrands();renderChips();renderFeatured();setHero();renderCars();
}
search.oninput=renderCars; brand.onchange=renderCars; price.onchange=renderCars; sort.onchange=renderCars;
$('#resetFilters').onclick=reset;
$('#updatedToggle').onclick=()=>{updatedOnly=!updatedOnly;$('#updatedToggle').classList.toggle('active',updatedOnly);$('#updatedToggle').setAttribute('aria-pressed',String(updatedOnly));renderCars()};
$('#modalClose').onclick=closeModal; $('#modalCloseBottom').onclick=closeModal;
modal.addEventListener('close',()=>document.body.classList.remove('modal-open'));
modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});
$('#copyId').onclick=async()=>{if(!currentCar)return;try{await navigator.clipboard.writeText(currentCar.id);showToast('Skopiowano '+currentCar.id);$('#copyId').textContent='Skopiowano ✓'}catch{showToast(currentCar.id)}};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.open&&document.activeElement===search){search.value='';renderCars()}});
const back=$('#backTop');window.addEventListener('scroll',()=>back.classList.toggle('show',scrollY>700),{passive:true});back.onclick=()=>scrollTo({top:0,behavior:'smooth'});

fetch('cars.json?v=4',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Nie udało się pobrać cars.json');return r.json()}).then(init).catch(err=>{console.error(err);count.textContent='Błąd ładowania katalogu';grid.innerHTML='<div class="empty-state"><strong>Nie udało się załadować katalogu.</strong><span>Odśwież stronę po chwili.</span></div>'});
