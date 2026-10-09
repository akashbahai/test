import {escapeText as esc, eventDates, nextDeadline, formatDate} from './core.js';

// City-level equirectangular map; no geocoder, keys, tracking or tile service.
export const project = ({lat,lon}) => [(lon+180)*1000/360,(90-lat)*500/180];
export function groupLocations(events, width=1000) {
  const groups=[];
  for(const event of events) {
    if(!event.geo || !Number.isFinite(event.geo.lat) || !Number.isFinite(event.geo.lon)) continue;
    const [x,y]=project(event.geo);
    let group=groups.find(g=>Math.hypot(g.x-x,g.y-y)<20*width/1000);
    if(!group){group={x,y,events:[]};groups.push(group);}
    group.events.push(event);
  }
  return groups.map(g=>({...g,key:g.events.map(e=>e.id).sort().join('|')}));
}

export function createWorldMap() {
  const svg=document.getElementById('world-map'), land=document.getElementById('map-land'), pins=document.getElementById('map-pins');
  const list=document.getElementById('map-list'), info=document.getElementById('map-status'), title=document.getElementById('map-list-title');
  let events=[], groups=[], box=[0,0,1000,500], selected=null, loadPromise=null, drag=null, moved=false;
  const regions={world:[0,0,1000,500],europe:[420,45,240,155],asia:[675,90,285,250],americas:[70,70,340,300]};
  function clamp(){box[2]=Math.max(65,Math.min(1000,box[2]));box[3]=box[2]/2;box[0]=Math.max(0,Math.min(1000-box[2],box[0]));box[1]=Math.max(0,Math.min(500-box[3],box[1]));}
  function zoom(factor){const w=box[2],h=box[3];box[2]*=factor;box[3]*=factor;box[0]+=(w-box[2])/2;box[1]+=(h-box[3])/2;clamp();draw();}
  function choose(key){selected=key;drawList();drawPins();}
  function drawList(){
    const group=groups.find(g=>g.key===selected);
    const shown=group?group.events:events.filter(e=>e.geo);
    title.textContent=group?[...new Set(group.events.map(e=>e.geo.label))].join(' / '):'Mapped opportunities';
    document.getElementById('map-clear').hidden=!group;
    list.innerHTML=shown.map(e=>{const d=nextDeadline(e);return `<div class="map-event"><button class="event-name" data-detail="${esc(e.id)}">${esc(e.name)}</button><div class="secondary">${esc(e.location)} · ${esc(e.tier||'Unranked')} / ${esc(e.tierField||'')}</div><div class="secondary">${esc(eventDates(e))}</div><div class="map-deadline">${d?esc(d.label)+': '+formatDate(d.date):'Open details for submission status'}</div></div>`;}).join('')||'<p class="secondary">No mapped locations match these filters.</p>';
    const unknown=events.filter(e=>!e.geo);
    document.getElementById('map-unlocated').innerHTML=unknown.length?`<details><summary>${unknown.length} online, location pending or provider watchlist ${unknown.length===1?'entry':'entries'}</summary><p class="secondary">These are kept in the catalog without an invented map position.</p>${unknown.map(e=>`<p><button class="event-name" data-detail="${esc(e.id)}">${esc(e.name)}</button><span class="secondary"> · ${esc(e.location)}</span></p>`).join('')}</details>`:'';
  }
  function drawPins(){
    const s=box[2]/(svg.clientWidth||1000);
    pins.innerHTML=groups.map((g,i)=>{
      const names=g.events.map(e=>e.name).join(', '), active=g.key===selected;
      const label=g.events.length===1?g.events[0].name:`${g.events[0].geo.label} · ${g.events.length}`;
      return `<g class="map-pin ${active?'selected':''}" tabindex="0" role="button" aria-pressed="${active}" aria-label="${esc(names)}" data-map-group="${i}" transform="translate(${g.x} ${g.y}) scale(${s})"><title>${esc(names)}</title><circle class="pin-halo" r="15"/><circle class="pin-dot" r="${g.events.length>1?9:6}"/>${g.events.length>1?`<text class="pin-number" y="3.6">${g.events.length}</text>`:''}<text class="pin-label" x="14" y="4">${esc(label)}</text></g>`;
    }).join('');
  }
  function draw(){
    svg.setAttribute('viewBox',box.join(' '));groups=groupLocations(events,box[2]*1000/(svg.clientWidth||1000));
    if(selected&&!groups.some(g=>g.key===selected))selected=null;
    drawPins();drawList();
    info.textContent=`${events.filter(e=>e.geo).length} of ${events.length} matching opportunities mapped · ${new Set(events.filter(e=>e.geo).map(e=>e.country)).size} countries / territories`;
  }
  async function load(){
    if(loadPromise)return loadPromise;
    loadPromise=(async()=>{
      try{
        const r=await fetch('./world.json');if(!r.ok)throw new Error('Map unavailable');const data=await r.json();
        land.innerHTML=data.features.map(f=>{
          const path=f.polygons.flatMap(poly=>poly.map(ring=>'M'+ring.map(([lon,lat])=>project({lat,lon}).map(n=>n.toFixed(2)).join(',')).join('L')+'Z')).join('');
          return `<path d="${path}" fill-rule="evenodd"><title>${esc(f.name)}</title></path>`;
        }).join('');
        document.getElementById('map-load-note').textContent='Drag to pan · + / − to zoom · choose a pin to see conferences';
      }catch{
        document.getElementById('map-load-note').textContent='Map outlines unavailable. Location pins and the event list are still usable.';loadPromise=null;
      }
    })();return loadPromise;
  }
  function pick(ev){const pin=ev.target.closest('[data-map-group]');if(pin&&!moved){choose(groups[+pin.dataset.mapGroup].key);}}
  svg.addEventListener('click',pick);
  svg.addEventListener('keydown',ev=>{const pin=ev.target.closest('[data-map-group]');if(['Enter',' '].includes(ev.key)&&pin){ev.preventDefault();const i=pin.dataset.mapGroup;moved=false;pick(ev);pins.querySelector(`[data-map-group="${i}"]`)?.focus();}});
  svg.addEventListener('pointerdown',ev=>{if(ev.button!==0)return;moved=false;if(ev.target.closest('[data-map-group]'))return;drag={x:ev.clientX,y:ev.clientY,box:[...box]};svg.setPointerCapture?.(ev.pointerId);});
  svg.addEventListener('pointermove',ev=>{if(!drag)return;const r=svg.getBoundingClientRect();if(!r.width)return;const dx=(ev.clientX-drag.x)*drag.box[2]/r.width,dy=(ev.clientY-drag.y)*drag.box[2]/r.width;if(Math.abs(dx)+Math.abs(dy)>1)moved=true;box=[drag.box[0]-dx,drag.box[1]-dy,drag.box[2],drag.box[3]];clamp();draw();});
  svg.addEventListener('pointerup',()=>{drag=null;});svg.addEventListener('pointercancel',()=>{drag=null;});
  svg.addEventListener('wheel',ev=>{if(ev.ctrlKey||ev.metaKey){ev.preventDefault();zoom(ev.deltaY>0?1.2:1/1.2);}},{passive:false});
  document.getElementById('map-in').onclick=()=>zoom(1/1.6);
  document.getElementById('map-out').onclick=()=>zoom(1.6);
  document.getElementById('map-clear').onclick=()=>choose(null);
  document.querySelectorAll('[data-region]').forEach(b=>b.onclick=()=>{box=[...regions[b.dataset.region]];clamp();draw();});
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>{if(events.length&&svg.clientWidth)draw();}).observe(svg);
  return {update(next){events=next;draw();load();},reset(){box=[...regions.world];selected=null;draw();}};
}
