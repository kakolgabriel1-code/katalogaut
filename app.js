let cars=[];
let activeCategory='Wszystkie';
let currentModalCar=null;

const $=s=>document.querySelector(s);
const grid=$('#carGrid');
const search=$('#searchInput');
const brand=$('#brandFilter');
const price=$('#priceFilter');
const sort=$('#sortSelect');
const chips=$('#categoryChips');
const empty=$('#emptyState');
const count=$('#resultCount');
const modal=$('#carModal');

const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);

function categories(){
  return ['Wszystkie',...new Set(cars.map(c=>c.category))];
}

function renderChips(){
  chips.innerHTML=categories().map(cat=>{
    const amount=cat==='Wszystkie'?cars.length:cars.filter(c=>c.category===cat).length;
    return `<button class="chip ${cat===activeCategory?'active':''}" data-cat="${cat}">${cat} · ${amount}</button>`;
  }).join('');
  chips.querySelectorAll('.chip').forEach(btn=>{
    btn.onclick=()=>{
      activeCategory=btn.dataset.cat;
      renderChips();
      render();
    };
  });
}

function fillBrands(){
  const brands=[...new Set(cars.map(c=>c.brand))].sort((a,b)=>a.localeCompare(b));
  brand.innerHTML='<option value="">Wszystkie marki</option>'+brands.map(b=>`<option value="${b}">${b}</option>`).join('');
}

function filteredCars(){
  const q=search.value.trim().toLowerCase();
  const maxPrice=Number(price.value||0);

  const out=cars.filter(c=>{
    const categoryOk=activeCategory==='Wszystkie'||c.category===activeCategory;
    const brandOk=!brand.value||c.brand===brand.value;
    const priceOk=!maxPrice||c.price<=maxPrice;
    const haystack=`${c.name} ${c.brand} ${c.id} ${c.code||''}`.toLowerCase();
    const searchOk=!q||haystack.includes(q);
    return categoryOk&&brandOk&&priceOk&&searchOk;
  });

  if(sort.value==='priceAsc') out.sort((a,b)=>a.price-b.price);
  else if(sort.value==='priceDesc') out.sort((a,b)=>b.price-a.price);
  else if(sort.value==='name') out.sort((a,b)=>a.name.localeCompare(b.name));
  else out.sort((a,b)=>(Number(b.featured)-Number(a.featured))||a.id.localeCompare(b.id));

  return out;
}

function carCard(c){
  return `
    <article class="car-card" data-id="${c.id}" tabindex="0" aria-label="${c.name}">
      <div class="car-image">
        <img loading="lazy" src="${c.image}" alt="${c.name}">
        <span class="car-badge">${c.category}</span>
      </div>
      <div class="card-body">
        <div class="card-meta"><span>${c.brand}</span><span>${c.id}</span></div>
        <h3>${c.name}</h3>
        <div class="card-foot">
          <span class="card-price">${money(c.price)}</span>
          <span class="card-open">Zobacz auto →</span>
        </div>
      </div>
    </article>`;
}

function render(){
  const list=filteredCars();
  grid.innerHTML=list.map(carCard).join('');
  count.textContent=`${list.length} z ${cars.length} pojazdów`;
  empty.hidden=list.length>0;

  grid.querySelectorAll('.car-card').forEach(el=>{
    const open=()=>openModal(cars.find(c=>c.id===el.dataset.id));
    el.onclick=open;
    el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}};
  });
}

function openModal(c){
  if(!c)return;
  currentModalCar=c;
  $('#modalImage').src=c.image;
  $('#modalImage').alt=c.name;
  $('#modalCategory').textContent=c.category;
  $('#modalId').textContent=c.id;
  $('#modalBrand').textContent=c.brand;
  $('#modalName').textContent=c.name;
  $('#modalPrice').textContent=money(c.price);
  $('#modalVariants').textContent=c.variants??'—';
  $('#modalCode').textContent=c.code||'—';
  $('#copyId').textContent='Kopiuj ID pojazdu';
  modal.showModal();
}

function setFeatured(){
  const featured=cars.filter(c=>c.featured);
  const pool=featured.length?featured:cars;
  const c=pool[Math.floor(Math.random()*pool.length)];
  if(!c)return;
  $('#heroImage').src=c.image;
  $('#heroImage').alt=c.name;
  $('#heroName').textContent=c.name;
  $('#heroCategory').textContent=c.category.toUpperCase();
  $('#heroPrice').textContent=money(c.price);
  $('#heroId').textContent=c.id;
  $('#featuredCard').onclick=()=>openModal(c);
}

function resetFilters(){
  search.value='';
  brand.value='';
  price.value='';
  sort.value='featured';
  activeCategory='Wszystkie';
  renderChips();
  render();
}

$('#modalClose').onclick=()=>modal.close();
$('#modalCloseBottom').onclick=()=>modal.close();
modal.addEventListener('click',e=>{if(e.target===modal)modal.close();});
search.oninput=render;
brand.onchange=render;
price.onchange=render;
sort.onchange=render;
$('#resetFilters').onclick=resetFilters;

$('#copyId').onclick=async()=>{
  if(!currentModalCar)return;
  try{
    await navigator.clipboard.writeText(currentModalCar.id);
    $('#copyId').textContent='Skopiowano ✓';
  }catch{
    $('#copyId').textContent=currentModalCar.id;
  }
};

fetch('cars.json')
  .then(r=>{
    if(!r.ok)throw new Error('cars.json');
    return r.json();
  })
  .then(data=>{
    cars=data;
    $('#vehicleCount').textContent=cars.length;
    $('#brandCount').textContent=new Set(cars.map(c=>c.brand)).size;
    $('#categoryCount').textContent=new Set(cars.map(c=>c.category)).size;
    fillBrands();
    renderChips();
    render();
    setFeatured();
  })
  .catch(err=>{
    console.error(err);
    count.textContent='Błąd ładowania katalogu';
    grid.innerHTML='<div class="empty-state"><strong>Nie udało się załadować katalogu.</strong><span>Odśwież stronę po chwili.</span></div>';
  });