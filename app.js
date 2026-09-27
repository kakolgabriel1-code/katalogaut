const $=(s,p=document)=>p.querySelector(s), $$=(s,p=document)=>[...p.querySelectorAll(s)];
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n||0);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const cleanName=n=>String(n||'').replace(/^White\s+/i,'').replace(/\((Pearl White|Green|WorldRally Blue Mica|White)\)$/i,'').trim();
const initials=c=>((c.brand||'HSC').slice(0,2)+(cleanName(c.name).split(/\s+/).slice(-1)[0]||'').slice(0,1)).toUpperCase();
let cars=[], filtered=[], current=null, category='Wszystkie', favorites=new Set(JSON.parse(localStorage.getItem('hsc-favorites')||'[]')), compare=[];
const spritePath='assets/updated/catalog-updates-sprite.webp';
function imageMarkup(c,cls='media-img',lazy=true){
  const img=String(c.image||'');
  if(!img || img===spritePath || Number.isInteger(c.spriteIndex)){
    return `<div class="media-fallback ${cls}" role="img" aria-label="${esc(cleanName(c.name))}"><small>HSC · PHOTO UPDATE</small><b>${esc(initials(c))}</b></div>`;
  }
  return `<img class="${cls}" src="${esc(img)}" alt="${esc(cleanName(c.name))}" ${lazy?'loading="lazy" decoding="async"':''} onerror="this.replaceWith(makeFallbackNode('${esc(c.id)}'))">`;
}
function makeFallbackNode(id){const c=cars.find(x=>x.id===id)||{};const d=document.createElement('div');d.className='media-fallback media-img';d.setAttribute('role','img');d.setAttribute('aria-label',cleanName(c.name));d.innerHTML=`<small>HSC · PHOTO UPDATE</small><b>${esc(initials(c))}</b>`;return d}
window.makeFallbackNode=makeFallbackNode;
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),1700)}
function saveFav(){localStorage.setItem('hsc-favorites',JSON.stringify([...favorites]))}
function heroPick(){return [...cars].sort((a,b)=>b.price-a.price)[0]||cars[0]}
function topCars(){
  const hero=heroPick();
  const rest=[...cars].filter(c=>!hero||c.id!==hero.id).sort((a,b)=>(b.featured-a.featured)||(b.price-a.price));
  return hero?[hero,...rest].slice(0,5):rest.slice(0,5)
}
async function init(){
  try{const r=await fetch('cars.json?v=15',{cache:'no-store'});cars=await r.json();if(!Array.isArray(cars))cars=cars.cars||[]}
  catch(e){$('#resultCount').textContent='Nie udało się załadować katalogu';return}
  populate(); renderAll(); bind();
}
function populate(){
  const brands=[...new Set(cars.map(c=>c.brand).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pl'));
  $('#brandFilter').innerHTML='<option value="">Wszystkie marki</option>'+brands.map(b=>`<option>${esc(b)}</option>`).join('');
  renderChips();
  $('#statCars').textContent=cars.length;
  $('#statBrands').textContent=brands.length;
  $('#statCats').textContent=new Set(cars.map(c=>c.category)).size;
  $('#statTop').textContent=money(Math.max(...cars.map(c=>c.price))).replace('$','$');
}
function renderChips(){
  const order=['Wszystkie','Sedan / miejskie','SUV','Klasyki / JDM','Pickup','Vany / użytkowe','Supercar','Sportowe','Motocykle','Rowery','ATV'];
  const counts=new Map();cars.forEach(c=>counts.set(c.category,(counts.get(c.category)||0)+1));
  $('#categoryChips').innerHTML=order.filter(x=>x==='Wszystkie'||counts.has(x)).map(x=>`<button class="chip ${x===category?'active':''}" data-cat="${esc(x)}">${esc(x)} · ${x==='Wszystkie'?cars.length:counts.get(x)}</button>`).join('');
}
function applyFilters(){
  const q=$('#searchInput').value.trim().toLowerCase(), brand=$('#brandFilter').value, pf=$('#priceFilter').value, sort=$('#sortSelect').value;
  const onlyUpdated=$('#updatedToggle').classList.contains('active'), onlyFav=$('#favoritesToggle').classList.contains('active');
  filtered=cars.filter(c=>{
    const hay=[c.name,c.brand,c.id,c.code,c.category,c.sourcePack].join(' ').toLowerCase();
    if(q&&!hay.includes(q))return false;if(brand&&c.brand!==brand)return false;if(category!=='Wszystkie'&&c.category!==category)return false;
    if(onlyUpdated&&!c.updated)return false;if(onlyFav&&!favorites.has(c.id))return false;
    if(pf){const [op,v]=pf.split(':'),n=+v;if(op==='lte'&&c.price>n)return false;if(op==='gte'&&c.price<n)return false}
    return true;
  });
  if(sort==='priceDesc')filtered.sort((a,b)=>b.price-a.price);else if(sort==='priceAsc')filtered.sort((a,b)=>a.price-b.price);else if(sort==='featured')filtered.sort((a,b)=>(b.featured-a.featured)||(b.updated-a.updated)||(b.price-a.price));else filtered.sort((a,b)=>cleanName(a.name).localeCompare(cleanName(b.name),'pl'));
}
function renderAll(){applyFilters();renderHero();renderFeatured();renderGrid();renderCompareDock()}
function renderHero(){
  const pick=heroPick();if(!pick)return;current=current||pick;
  const bg=(pick.image&&pick.image!==spritePath&&!Number.isInteger(pick.spriteIndex))?`url("${pick.image}")`:'radial-gradient(circle at 75% 35%,rgba(255,154,77,.18),transparent 25%),linear-gradient(135deg,#17120e,#080706 68%)';
  $('#heroBackdrop').style.backgroundImage=bg;
  $('#heroFocusMedia').innerHTML=imageMarkup(pick,'media-img',false);
  $('#heroId').textContent=pick.id;$('#heroCategory').textContent=pick.category;$('#heroName').textContent=cleanName(pick.name);$('#heroPrice').textContent=money(pick.price);
  $('#heroFocus').dataset.id=pick.id;$('#heroOpenCar').dataset.id=pick.id;
}
function renderFeatured(){
  $('#featuredGrid').innerHTML=topCars().slice(0,5).map(c=>`<article class="featured-card" data-id="${esc(c.id)}" tabindex="0" role="button"><div class="media-wrap">${imageMarkup(c)}</div><div class="featured-copy"><span>${esc(c.category)} · ${esc(c.id)}</span><h3>${esc(cleanName(c.name))}</h3><strong>${money(c.price)}</strong></div></article>`).join('');
}
function card(c){
  const fav=favorites.has(c.id);return `<article class="car-card" data-id="${esc(c.id)}" tabindex="0"><div class="card-media">${imageMarkup(c)}<div class="card-top-actions"><div class="badge-stack"><span class="badge">${esc(c.category)}</span>${c.updated?'<span class="badge updated">UPDATE</span>':''}${c.image?'<span class="badge photo-ready">FULL FRAME</span>':''}</div><button class="heart ${fav?'active':''}" data-fav="${esc(c.id)}" type="button" aria-label="Ulubione">${fav?'♥':'♡'}</button></div></div><div class="card-body"><div class="card-meta"><span>${esc(c.brand||'—')}</span><span>${esc(c.id)}</span></div><h3>${esc(cleanName(c.name))}</h3><div class="card-foot"><div class="card-price">${money(c.price)} <small>RP</small></div><div class="card-actions"><button class="mini-action" data-compare="${esc(c.id)}" type="button">+ porównaj</button><button class="mini-action" data-open="${esc(c.id)}" type="button">zobacz →</button></div></div></div></article>`}
function renderGrid(){
  $('#carGrid').innerHTML=filtered.map(card).join('');$('#resultCount').textContent=`${filtered.length} z ${cars.length} pojazdów`;
  $('#emptyState').hidden=filtered.length!==0;renderChips();
}
function openCar(id){
  const c=cars.find(x=>x.id===id);if(!c)return;current=c;
  $('#modalMedia').innerHTML=imageMarkup(c,'media-img',false);$('#modalCategory').textContent=c.category;$('#modalId').textContent=c.id;$('#modalUpdated').hidden=!c.updated;$('#modalBrand').textContent=c.brand||'—';$('#modalBrand2').textContent=c.brand||'—';$('#modalName').textContent=cleanName(c.name);$('#modalPrice').textContent=money(c.price);$('#modalVariants').textContent=c.variantColors?.length?`${c.variants??c.variantColors.length} · ${c.variantColors.join(' / ')}`:(c.variants??'—');$('#modalCategory2').textContent=c.category||'—';$('#modalCode').textContent=c.code||'—';$('#modalPack').textContent=c.sourcePack||'—';updateModalFav();updateModalCompare();updateModalPosition();if(!$('#carModal').open)$('#carModal').showModal();document.body.style.overflow='hidden'}
function closeDialog(d){d.close();if(!$('#compareModal').open&&!$('#carModal').open)document.body.style.overflow=''}
function modalSequence(){return filtered.length?filtered:cars}
function updateModalPosition(){
  if(!current||!$('#modalPosition'))return;
  const seq=modalSequence(),i=seq.findIndex(c=>c.id===current.id);
  $('#modalPosition').textContent=i>=0?`${i+1} / ${seq.length}`:'—'
}
function moveModal(dir){
  if(!current)return;
  const seq=modalSequence();if(!seq.length)return;
  let i=seq.findIndex(c=>c.id===current.id);if(i<0)i=0;
  const next=seq[(i+dir+seq.length)%seq.length];
  if(next)openCar(next.id)
}
function toggleFav(id){favorites.has(id)?favorites.delete(id):favorites.add(id);saveFav();renderGrid();updateModalFav();toast(favorites.has(id)?'Dodano do ulubionych':'Usunięto z ulubionych')}
function updateModalFav(){if(!current)return;const on=favorites.has(current.id),b=$('#modalFavorite');b.classList.toggle('active',on);b.textContent=on?'♥ W ulubionych':'♡ Dodaj do ulubionych'}
function toggleCompare(id){
  if(compare.includes(id)){compare=compare.filter(x=>x!==id)}else{if(compare.length>=3){toast('Możesz porównać maksymalnie 3 auta');return}compare.push(id)}
  renderCompareDock();updateModalCompare();toast(compare.includes(id)?'Dodano do porównania':'Usunięto z porównania')
}
function updateModalCompare(){if(!current)return;$('#addCompareModal').textContent=compare.includes(current.id)?'✓ W porównaniu':'+ Porównaj'}
function renderCompareDock(){
  const d=$('#compareDock');d.hidden=compare.length===0;$('#compareCount').textContent=`${compare.length} / 3`;$('#compareItems').innerHTML=compare.map(id=>{const c=cars.find(x=>x.id===id);return `<span class="compare-chip">${esc(c?cleanName(c.name):id)}</span>`}).join('')
}
function openCompare(){
  if(!compare.length)return;const cs=compare.map(id=>cars.find(x=>x.id===id)).filter(Boolean);const row=(label,fn)=>`<tr><td>${label}</td>${cs.map(c=>`<td>${fn(c)}</td>`).join('')}</tr>`;
  $('#compareTable').innerHTML=`<thead><tr><th>Pojazd</th>${cs.map(c=>`<th>${esc(cleanName(c.name))}</th>`).join('')}</tr></thead><tbody>${row('Zdjęcie',c=>`<div class="compare-thumb">${imageMarkup(c)}</div>`)}${row('Cena RP',c=>`<strong>${money(c.price)}</strong>`)}${row('Marka',c=>esc(c.brand||'—'))}${row('Kategoria',c=>esc(c.category||'—'))}${row('Warianty',c=>esc(c.variants??'—'))}${row('HSC ID',c=>`<code>${esc(c.id)}</code>`)}</tbody>`;
  $('#compareModal').showModal();document.body.style.overflow='hidden'
}
function reset(){category='Wszystkie';$('#searchInput').value='';$('#brandFilter').value='';$('#priceFilter').value='';$('#sortSelect').value='name';$('#updatedToggle').classList.remove('active');$('#favoritesToggle').classList.remove('active');renderAll()}
function bind(){
  ['input','change'].forEach(ev=>$('#searchInput').addEventListener(ev,renderAll));['brandFilter','priceFilter','sortSelect'].forEach(id=>$('#'+id).addEventListener('change',renderAll));$('#resetFilters').addEventListener('click',reset);
  document.addEventListener('click',e=>{const cat=e.target.closest('[data-cat]');if(cat){category=cat.dataset.cat;renderAll();return}const fav=e.target.closest('[data-fav]');if(fav){e.stopPropagation();toggleFav(fav.dataset.fav);return}const cmp=e.target.closest('[data-compare]');if(cmp){e.stopPropagation();toggleCompare(cmp.dataset.compare);return}const open=e.target.closest('[data-open]');if(open){e.stopPropagation();openCar(open.dataset.open);return}const card=e.target.closest('.car-card,.featured-card');if(card)openCar(card.dataset.id)});
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#searchInput').focus();$('#catalog').scrollIntoView({behavior:'smooth'})}if(e.key==='Escape'&&document.activeElement===$('#searchInput'))$('#searchInput').blur();if($('#carModal').open&&e.key==='ArrowLeft'){e.preventDefault();moveModal(-1)}if($('#carModal').open&&e.key==='ArrowRight'){e.preventDefault();moveModal(1)}});
  $('#heroFocus').addEventListener('click',()=>openCar($('#heroFocus').dataset.id));$('#heroOpenCar').addEventListener('click',()=>openCar($('#heroOpenCar').dataset.id));
  $('#openSearch').addEventListener('click',()=>{$('#catalog').scrollIntoView({behavior:'smooth'});setTimeout(()=>$('#searchInput').focus(),450)});
  $('#modalClose').onclick=()=>closeDialog($('#carModal'));$('#carModal').addEventListener('click',e=>{if(e.target===$('#carModal'))closeDialog($('#carModal'))});
  $('#copyId').addEventListener('click',async()=>{if(!current)return;try{await navigator.clipboard.writeText(current.id);toast('Skopiowano '+current.id)}catch{toast(current.id)}});
  $('#modalFavorite').addEventListener('click',()=>current&&toggleFav(current.id));$('#addCompareModal').addEventListener('click',()=>current&&toggleCompare(current.id));$('#modalPrev').addEventListener('click',()=>moveModal(-1));$('#modalNext').addEventListener('click',()=>moveModal(1));
  $('#updatedToggle').addEventListener('click',e=>{e.currentTarget.classList.toggle('active');e.currentTarget.setAttribute('aria-pressed',e.currentTarget.classList.contains('active'));renderAll()});
  $('#favoritesToggle').addEventListener('click',e=>{e.currentTarget.classList.toggle('active');e.currentTarget.setAttribute('aria-pressed',e.currentTarget.classList.contains('active'));renderAll()});
  const savedCompact=localStorage.getItem('hsc-compact')==='1';if(savedCompact){$('#carGrid').classList.add('compact');$('#compactToggle').setAttribute('aria-pressed','true');$('#compactToggle').innerHTML='<span>▤</span> Duże karty'}
  $('#compactToggle').addEventListener('click',e=>{const on=$('#carGrid').classList.toggle('compact');localStorage.setItem('hsc-compact',on?'1':'0');e.currentTarget.setAttribute('aria-pressed',on);e.currentTarget.innerHTML=on?'<span>▤</span> Duże karty':'<span>▦</span> Kompaktowo'});
  $('#clearCompare').addEventListener('click',()=>{compare=[];renderCompareDock();updateModalCompare()});$('#openCompare').addEventListener('click',openCompare);$('#compareClose').addEventListener('click',()=>closeDialog($('#compareModal')));$('#compareModal').addEventListener('click',e=>{if(e.target===$('#compareModal'))closeDialog($('#compareModal'))});
  $('#backTop').addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));
  addEventListener('scroll',()=>{const d=document.documentElement,p=scrollY/(d.scrollHeight-innerHeight);$('#scrollProgress').style.width=(Math.max(0,Math.min(1,p))*100)+'%';$('#backTop').classList.toggle('show',scrollY>700)} ,{passive:true});
}
init();