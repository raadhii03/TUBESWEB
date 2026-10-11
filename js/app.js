const DEFAULT_POS = {lat:-6.9175,lng:107.6191}; // Bandung, dipakai kalau lokasi ditolak
const rp = n => "Rp " + n.toLocaleString("id-ID");
const fmtJarak = km => km < 1 ? Math.round(km*1000)+" m" : km.toFixed(1)+" km";

function hitungJarak(a, b){ // rumus Haversine, hasil dalam km
  const R=6371, r=x=>x*Math.PI/180;
  const dLat=r(b.lat-a.lat), dLng=r(b.lng-a.lng);
  const h=Math.sin(dLat/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}
function getPosisi(cb){
  const el=document.getElementById("lokasi-status");
  if(!navigator.geolocation){ if(el) el.textContent="Browser tidak mendukung lokasi, memakai pusat Bandung."; return cb(DEFAULT_POS); }
  navigator.geolocation.getCurrentPosition(
    p=>{ if(el) el.textContent="Jarak dihitung dari lokasimu saat ini."; cb({lat:p.coords.latitude,lng:p.coords.longitude}); },
    ()=>{ if(el) el.textContent="Lokasi tidak diizinkan, memakai pusat Bandung."; cb(DEFAULT_POS); },
    {enableHighAccuracy:true,timeout:8000});
}
function urutkan(pos){ return SPBU.map(s=>({...s,jarak:hitungJarak(pos,s)})).sort((a,b)=>a.jarak-b.jarak); }
const badge = s => `<span class="badge ${s.buka?'text-bg-success':'text-bg-secondary'}">${s.status}</span>`;

function initDashboard(){
  const map=L.map("map").setView([DEFAULT_POS.lat,DEFAULT_POS.lng],12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"&copy; OpenStreetMap"}).addTo(map);
  const layer=L.layerGroup().addTo(map);
  const render=pos=>{
    const data=urutkan(pos); layer.clearLayers();
    L.circleMarker([pos.lat,pos.lng],{radius:8,color:"#e4002b",fillOpacity:.9}).addTo(layer).bindPopup("Lokasimu");
    data.forEach(s=>L.marker([s.lat,s.lng]).addTo(layer).bindPopup(`<b>${s.nama}</b><br>${fmtJarak(s.jarak)}<br><a href="detail.html?id=${s.id}">Lihat detail</a>`));
    map.setView([pos.lat,pos.lng],13);
    const buka=data.filter(s=>s.buka);
    document.getElementById("stat-total").textContent=data.length;
    document.getElementById("stat-buka").textContent=buka.length;
    document.getElementById("stat-dekat").textContent=buka.length?fmtJarak(buka[0].jarak):"-";
    document.getElementById("list-terdekat").innerHTML=buka.slice(0,3).map(s=>`
      <a href="detail.html?id=${s.id}" class="card spbu-item border-0 shadow-sm text-decoration-none text-body"><div class="card-body py-2">
        <div class="d-flex justify-content-between gap-2"><strong>${s.nama}</strong><span class="dist">${fmtJarak(s.jarak)}</span></div>
        <div class="small text-secondary">${s.alamat}</div></div></a>`).join("");
  };
  const ambil=()=>getPosisi(render);
  document.getElementById("btn-lokasi").addEventListener("click",ambil);
  ambil();
}

function initDaftar(){
  let data=[];
  const tampil=q=>{
    const f=data.filter(s=>(s.nama+s.alamat).toLowerCase().includes(q.toLowerCase()));
    document.getElementById("tabel-spbu").innerHTML=f.length?f.map(s=>`
      <tr class="${s.buka?'':'text-secondary'}"><td>${s.no}</td><td><strong>${s.nama}</strong><div class="small text-secondary">${s.alamat}</div></td>
      <td class="dist">${fmtJarak(s.jarak)}</td><td>${badge(s)}</td>
      <td class="small">${s.bbm.join(", ")||"-"}</td>
      <td><a class="btn btn-sm btn-outline-primary" href="detail.html?id=${s.id}">Detail</a></td></tr>`).join("")
      :`<tr><td colspan="6" class="text-center text-secondary py-4">Tidak ada SPBU yang cocok. Coba kata kunci lain.</td></tr>`;
  };
  getPosisi(pos=>{ data=urutkan(pos); tampil(""); });
  document.getElementById("cari").addEventListener("input",e=>tampil(e.target.value));
}

function initDetail(){
  const id=+new URLSearchParams(location.search).get("id")||1;
  const s=SPBU.find(x=>x.id===id)||SPBU[0];
  document.getElementById("d-nama").textContent=`${s.nama} (${s.no})`;
  document.getElementById("d-alamat").textContent=s.alamat;
  document.getElementById("d-status").innerHTML=badge(s);
  document.getElementById("d-bbm").innerHTML=Object.entries(HARGA).map(([n,h])=>{
    const ada=s.bbm.includes(n);
    return `<li class="list-group-item d-flex justify-content-between"><span>${n}</span><span>${ada?rp(h):'<span class="text-secondary">Tidak tersedia</span>'}</span></li>`;}).join("");
  document.getElementById("d-rute").href=`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`;
  getPosisi(pos=>document.getElementById("d-jarak").textContent="Jarak dari kamu: "+fmtJarak(hitungJarak(pos,s)));
}