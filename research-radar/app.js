import {createWorldMap} from './map.js';
import {TZ,localDay,formatDate,deadlineInstant,singaporeTime,remainingDays,nextDeadline,status,eventDates,primaryDeadline,escapeText as esc,safeUrl,exportCsv,exportCalendar,eligibleDeadlines,isPast} from './core.js';

const DATA_URL='https://raw.githubusercontent.com/akashbahai/test/master/research-radar/events.json';
const $=id=>document.getElementById(id);
const filters=['search','topic','type','status','fit','country','tier','lineage','sort'];
const worldMap=createWorldMap();
const tierLabels={T1:'T1 · Field flagship',T2:'T2 · Leading specialist',T3:'T3 · Regional / emerging',Workshop:'Workshop · unranked',Training:'Training · unranked'};
const tierOrder={T1:0,T2:1,T3:2,Workshop:3,Training:4};
let catalog=null, currentView='all', saved=new Set(), visible=[], toastTimer, loadGeneration=0;
try {saved=new Set(JSON.parse(localStorage.getItem('research-radar-saved')||'[]'));} catch {}
const now=()=>new Date();
const byDeadline=(a,b)=>(nextDeadline(a)?.date||'9999').localeCompare(nextDeadline(b)?.date||'9999') || a.name.localeCompare(b.name);
function validCatalog(c){return c?.schemaVersion===1 && typeof c.updatedAt==='string' && Number.isFinite(Date.parse(c.updatedAt)) && Array.isArray(c.events) && c.events.length>0 && c.events.every(e=>typeof e.id==='string'&&typeof e.name==='string'&&Array.isArray(e.topics)&&Array.isArray(e.deadlines)&&e.deadlines.every(d=>typeof d.label==='string'&&(!d.date||/^\d{4}-\d{2}-\d{2}$/.test(d.date))));}
function notify(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3500);}
function notice(text){$('notice').textContent=text;$('notice').hidden=!text;}
function accept(c,origin){
  if(!validCatalog(c)) throw new Error('Invalid event catalog');
  if(catalog && Date.parse(c.updatedAt)<Date.parse(catalog.updatedAt))return;
  catalog=c;catalog.origin=origin;
  try{localStorage.setItem('research-radar-cache',JSON.stringify(c));}catch{}
  const topic=$('topic').value;
  $('topic').innerHTML='<option value="">All research areas</option>'+[...new Set(c.events.flatMap(e=>e.topics))].sort().map(t=>`<option>${esc(t)}</option>`).join('');
  $('topic').value=topic;
  const country=$('country').value;
  $('country').innerHTML='<option value="">All locations</option>'+[...new Set(c.events.map(e=>e.country||'To be announced'))].sort().map(t=>`<option>${esc(t)}</option>`).join('');
  $('country').value=country;
  render();
}
async function fetchJson(url){const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}
async function loadData(manual=false){
  const gen=++loadGeneration;$('refresh').disabled=true;
  if(!catalog){try{const c=JSON.parse(localStorage.getItem('research-radar-cache'));if(validCatalog(c))accept(c,'saved copy');}catch{}}
  const result=await Promise.allSettled([fetchJson('./events.json'),fetchJson(DATA_URL+'?v='+Math.floor(Date.now()/60000))].map((promise,i)=>promise.then(c=>{if(gen===loadGeneration)accept(c,i===1?'GitHub live catalog':'bundled catalog');return c;})));
  if(gen!==loadGeneration)return;
  $('refresh').disabled=false;
  if(!catalog){notice('The event catalog could not be loaded. Check your connection and choose Refresh data.');$('events-body').innerHTML='';$('empty').hidden=false;return;}
  const age=Math.floor((Date.now()-Date.parse(catalog.updatedAt))/86400000);
  if(age>3)notice(`The latest catalog review is ${age} days old. Check official sources for deadline changes.`);
  else if(result[1].status==='rejected')notice('The live catalog is unavailable. Showing the latest available saved or bundled data; verification dates remain visible.');
  else notice('');
  if(manual)notify('Latest available catalog loaded. Source checks run on the daily schedule.');
}
function selectedEvents(){
  const q=$('search').value.toLowerCase().trim(),topic=$('topic').value,type=$('type').value,st=$('status').value,fit=$('fit').value,country=$('country').value,tier=$('tier').value,lineage=$('lineage').value;
  let list=catalog.events.filter(e=>{
    if(!$('past').checked&&e.end&&e.end<localDay())return false;
    if(currentView==='shortlist'&&!saved.has(e.id))return false;
    if(q&&!`${e.name} ${e.fullName||''} ${e.location} ${e.country||''} ${e.tierField||''} ${e.topics.join(' ')} ${e.relevance} ${e.notes||''}`.toLowerCase().includes(q))return false;
    if(topic&&!e.topics.includes(topic)||type&&type!==e.type||fit&&fit!==e.fit)return false;
    if(country&&country!==e.country||tier&&tier!==e.tier||lineage&&!e.lineage)return false;
    const s=status(e).key;
    if(st==='soon'&&s!=='soon')return false;
    if(st==='upcoming'&&!nextDeadline(e))return false;
    if(st==='unknown'&&!['unknown','not-open'].includes(s))return false;
    if(['closed','waitlist'].includes(st)&&s!==st)return false;
    return true;
  });
  const sort=$('sort').value;
  return list.sort(sort==='country'?(a,b)=>{const key=e=>['Online','To be announced','Multiple / online'].includes(e.country)?'zz'+e.country:e.country||'zz';return key(a).localeCompare(key(b))||a.name.localeCompare(b.name);}:sort==='tier'?(a,b)=>(tierOrder[a.tier]??9)-(tierOrder[b.tier]??9)||byDeadline(a,b):sort==='name'?(a,b)=>a.name.localeCompare(b.name):sort==='date'?(a,b)=>(a.start||'9999').localeCompare(b.start||'9999'):sort==='fit'?(a,b)=>({High:0,Relevant:1,Selective:2}[a.fit]-{High:0,Relevant:1,Selective:2}[b.fit]||byDeadline(a,b)):byDeadline);
}
function badge(e){const s=status(e);return `<span class="status ${esc(s.key)}">${esc(s.label)}</span>`;}
function deadlineCell(e){
  const p=primaryDeadline(e);
  if(!p)return `<div class="deadline-date">${e.submissionState==='closed'?'Closed':'Not announced'}</div><div class="secondary">${esc(e.abstractNote||'See official source')}</div>`;
  let s=`<div class="deadline-kind">${esc(p.label)}</div><div class="deadline-date">${p.date?formatDate(p.date):'Not announced'}</div>`;
  if(p.date)s+=`<div class="secondary">${esc(p.time&&p.zone?p.time+' '+p.zone:'Cutoff time unverified')}</div>`;
  const second=e.deadlines.find(x=>x!==p && x.date && x.actionable!==false && !/late-breaking/i.test(x.label));
  if(second)s+=`<div class="secondary">${esc(second.label)}: ${formatDate(second.date)}</div>`;
  if(e.deadlines.length>2)s+=`<div class="secondary">${e.deadlines.length} deadlines · open details</div>`;
  return s;
}
function renderRows(){
  $('events-body').innerHTML=visible.map(e=>`<tr>
    <td><button class="save-button ${saved.has(e.id)?'saved':''}" data-save="${esc(e.id)}" aria-label="${saved.has(e.id)?'Unsave':'Save'} ${esc(e.name)}" aria-pressed="${saved.has(e.id)}">${saved.has(e.id)?'★':'☆'}</button></td>
    <td><button class="event-name" data-detail="${esc(e.id)}">${esc(e.name)}</button><div class="event-meta">${esc(e.type)}${e.lineage?' · '+esc(e.lineage.label):''}${e.watchlist?' · Discovery watchlist':''}</div><div class="topics">${e.topics.slice(0,3).map(t=>`<span>${esc(t)}</span>`).join('')}</div></td>
    <td><div>${esc(e.location)}</div><div class="secondary">${esc(eventDates(e))}</div></td>
    <td><span class="tier ${esc(e.tier||'')}">${esc(tierLabels[e.tier]||'Unranked')}</span><div class="tier-field">${esc(e.tierField||'')}</div><span class="fit ${esc(e.fit)}">${esc(e.fit)}</span><div class="secondary">${esc(e.relevance)}</div></td>
    <td>${deadlineCell(e)}</td>
    <td>${badge(e)}${e.verification==='needs-review'?'<div class="review-flag">△ Needs review · see details</div>':''}<a class="source-link" href="${esc(safeUrl(e.source))}" target="_blank" rel="noopener noreferrer">Official source</a></td>
    </tr>`).join('');
}
function renderTimeline(){
  const deadlines=visible.flatMap(e=>eligibleDeadlines(e).map(d=>({e,d}))).sort((a,b)=>a.d.date.localeCompare(b.d.date));
  let month='';
  $('timeline-view').innerHTML=deadlines.map(({e,d})=>{
    const m=d.date.slice(0,7),heading=m!==month?`<h3 class="timeline-month">${new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(d.date+'T12:00:00Z'))}</h3>`:'';month=m;
    return `${heading}<div class="timeline-row"><span class="day">${+d.date.slice(-2)}</span><div class="time-main"><button class="event-name" data-detail="${esc(e.id)}">${esc(e.name)}</button><div class="secondary">${esc(d.label)} · ${esc(singaporeTime(d)||'Date only · cutoff time unverified')}</div></div><span class="fit ${esc(e.fit)}">${esc(e.fit)} relevance</span></div>`;
  }).join('')||'<div class="empty"><strong>No upcoming dated deadlines in this view</strong><p>Unannounced and closed calls remain available in All opportunities.</p></div>';
}
function renderSources(){
  const needs=catalog.events.filter(e=>e.verification==='needs-review');
  $('sources-view').innerHTML=`<div class="source-panel"><h2>Updates you can trace</h2><p>${esc(catalog.coverage)}</p><p><strong>Loaded from:</strong> ${esc(catalog.origin)}<br><strong>Scheduled review:</strong> ${catalog.updatePolicy.enabled?'Daily, around 08:00 Singapore time':'Not yet active'}</p><p>The scheduled research task checks official calls, course calendars and newly announced editions, then saves verified changes to the GitHub catalog. This page reloads that catalog on opening and every 15 minutes. Refresh data retrieves the catalog; it does not start a new web search.</p><p>Verification history is retained in the source data. The latest catalog update appears in the page footer. If a source fails, its previous deadline is retained and the failure is recorded. Records that could not be checked keep their previous verification date.</p></div>
  <div class="source-panel"><h2>Official discovery sources</h2><div class="source-cards">${[
    ['CSHL meetings','https://meetings.cshl.edu/meetingshome.aspx','Genomics, data science, networks'],['CSHL courses','https://meetings.cshl.edu/courses','Advanced practical training'],['EMBL events','https://www.embl.org/events/','AI, proteomics, imaging and omics'],['EMBL-EBI training','https://www.ebi.ac.uk/training/live-events/','Bioinformatics courses and webinars'],['ISCB conferences','https://www.iscb.org/conferences-events','ISMB/ECCB, GLBIO and communities'],['Wellcome Sanger training','https://coursesandconferences.wellcomeconnectingscience.org/','Genomics and computational training']
  ].map(([n,u,t])=>`<a href="${u}" target="_blank" rel="noopener noreferrer">${n}<span>${t}</span></a>`).join('')}</div></div>
  <div class="source-panel"><h2>Field tiers, research fit & origins</h2><p>${esc(catalog.tierPolicy?.note||'Tiers are editorial judgements within each field.')}</p><div class="tier-guide"><p><b>T1 · Field flagship</b><br>A central international venue in its own discipline.</p><p><b>T2 · Leading specialist</b><br>A focused, well-established research community.</p><p><b>T3 · Regional / emerging</b><br>Useful regional communities or newer focused meetings.</p></div><p>Workshops and courses are unranked. A workshop at NeurIPS does not inherit NeurIPS’s main-conference tier. MLCB and ML4H have documented NeurIPS workshop origins; WABI evolved from a workshop series. Other independent specialist conferences are not labelled spin-offs without evidence.</p><p>ICLR, ICML, NeurIPS, CVPR, ICCV, ECCV, ACL and EMNLP are retained for specific biomedical ML, imaging or NLP routes. Broad AI planning entries with weaker direct fit have been removed from the active catalog.</p><p>${esc(catalog.researchNotes||'')}</p></div>
  <div class="source-panel"><h2>Reading the deadlines</h2><ul><li><strong>Abstract registration</strong> often gates a later full-paper submission. Missing that first deadline can close the entire track.</li><li><strong>Poster abstracts</strong> and proceedings papers are separate routes. Course applications are labelled explicitly.</li><li><strong>Not announced</strong> means no verified date was available; it is never filled from last year’s calendar.</li><li><strong>AoE</strong> is UTC−12. A 23:59 AoE cutoff is 19:59 Singapore time on the following day.</li><li>Exact cutoffs are converted to Singapore time in event details. Date-only deadlines export as all-day calendar reminders, with the time uncertainty preserved.</li><li>High relevance means a close match to biomedical AI, proteomics, multi-omics, imaging or foundation-model work; it is not a conference ranking.</li><li>Your shortlist is saved only in this browser. Calendar export is a snapshot, not a subscribed live calendar.</li></ul></div>
  ${needs.length?`<div class="source-panel"><h2>Items needing organizer clarification</h2>${needs.map(e=>`<p><button class="event-name" data-detail="${esc(e.id)}">${esc(e.name)}</button><br>${esc(e.notes)}</p>`).join('')}</div>`:''}
  ${catalog.lastRun?`<div class="source-panel"><h2>Latest review</h2><p>${esc(catalog.lastRun.summary||'')}</p></div>`:''}`;
}
function render(){
  if(!catalog)return;
  const live=catalog.events.filter(e=>!e.end||e.end>=localDay());
  $('stat-total').textContent=live.length;
  $('stat-soon').textContent=live.filter(e=>status(e).key==='soon').length;
  $('stat-high').textContent=live.filter(e=>e.fit==='High').length;
  $('stat-unknown').textContent=live.filter(e=>!primaryDeadline(e)?.date).length;
  $('nav-count').textContent=catalog.events.length;
  $('saved-count').textContent=saved.size;
  $('today').textContent=new Intl.DateTimeFormat('en-GB',{timeZone:TZ,day:'numeric',month:'short',year:'numeric'}).format(now());
  $('schedule-title').textContent=catalog.updatePolicy.enabled?'Daily source review':'Source review';
  $('schedule-text').textContent=catalog.updatePolicy.enabled?'Official sources checked each morning, around 08:00 SGT.':'Schedule not active yet.';
  $('verified-summary').textContent=`Last catalog update: ${new Intl.DateTimeFormat('en-SG',{timeZone:TZ,dateStyle:'medium',timeStyle:'short'}).format(new Date(catalog.updatedAt))} SGT · ${catalog.events.length} entries · individual source history in CSV`;
  const upcoming=live.filter(e=>nextDeadline(e)&&!['not-open','waitlist','closed'].includes(status(e).key)).sort(byDeadline).slice(0,3);
  $('next-deadlines').innerHTML=upcoming.map(e=>{const d=nextDeadline(e);return `<button class="deadline-card" data-detail="${esc(e.id)}"><span class="date-block">${+d.date.slice(-2)}<small>${new Intl.DateTimeFormat('en-GB',{month:'short',timeZone:'UTC'}).format(new Date(d.date+'T12:00:00Z'))}</small></span><span><b>${esc(e.name)}</b><p>${esc(d.label)} · ${remainingDays(d)} days</p></span></button>`;}).join('');
  visible=selectedEvents();
  $('result-count').textContent=`${visible.length} shown`;
  $('results-label').textContent=currentView==='shortlist'?'My shortlist':currentView==='timeline'?'Upcoming deadlines':currentView==='map'?'World map':'All opportunities';
  $('page-title').innerHTML=currentView==='sources'?'Sources & updates<span>.</span>':currentView==='map'?'Your research, worldwide<span>.</span>':'Research radar<span>.</span>';
  $('results-section').hidden=currentView==='sources';$('controls').hidden=currentView==='sources';$('sources-view').hidden=currentView!=='sources';$('next-section').hidden=['sources','map'].includes(currentView);document.querySelector('.stats').hidden=currentView==='map';
  $('table-view').hidden=['timeline','map'].includes(currentView)||!visible.length;
  $('map-view').hidden=currentView!=='map';
  $('timeline-view').hidden=currentView!=='timeline';
  $('empty').hidden=visible.length>0||['timeline','map'].includes(currentView);
  document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===currentView);b.setAttribute('aria-current',b.dataset.view===currentView?'page':'false');});
  renderRows();renderTimeline();renderSources();if(currentView==='map')worldMap.update(visible);
}
function toggleSave(id){
  saved.has(id)?saved.delete(id):saved.add(id);
  try{localStorage.setItem('research-radar-saved',JSON.stringify([...saved]));}catch{notify('Browser storage is unavailable; shortlist lasts for this session.');}
  render();
  const b=$('detail-content').querySelector('[data-save]');if(b){const yes=saved.has(id);b.textContent=yes?'★ Saved to shortlist':'☆ Save to shortlist';b.setAttribute('aria-pressed',String(yes));}
}
function showDetail(id){
  const e=catalog.events.find(x=>x.id===id);if(!e)return;
  const sources=[...new Set([e.source,...(e.sources||[])])];
  $('detail-content').innerHTML=`<h2>${esc(e.name)}</h2>${e.fullName?`<p>${esc(e.fullName)}</p>`:''}<span class="fit ${esc(e.fit)}">${esc(e.fit)} relevance</span> ${badge(e)}
  <div class="detail-facts"><strong>${esc(e.location)}</strong><br>${esc(eventDates(e))}<br>${esc(e.type)}${e.lineage?' · '+esc(e.lineage.label):''}${e.watchlist?' · Discovery watchlist':''}</div>
  <h3>Standing in its field</h3><p><span class="tier ${esc(e.tier||'')}">${esc(tierLabels[e.tier]||'Unranked')}</span> · ${esc(e.tierField||'')}</p><p>${esc(e.tierReason||'')}</p>${e.lineage?`<h3>Workshop origins</h3><p>${esc(e.lineage.detail)} <a href="${esc(safeUrl(e.lineage.source))}" target="_blank" rel="noopener noreferrer">History source</a></p>`:''}<h3>Why it fits your work</h3><p>${esc(e.relevance)}</p>
  <h3>Submission & application dates</h3>${e.deadlines.length?e.deadlines.map(d=>`<div class="deadline-detail"><div><b>${esc(d.label)}</b>${d.requires?'<div class="secondary">Requires earlier abstract registration</div>':''}${d.actionable===false?'<div class="secondary">For previously reviewed / accepted work</div>':''}</div><div><strong>${d.date?formatDate(d.date):'Not announced'}</strong><div class="secondary">${d.date?esc(d.time&&d.zone?d.time+' '+d.zone:'Cutoff time / timezone unverified'):''}</div>${singaporeTime(d)?`<div class="secondary">${esc(singaporeTime(d))}</div>`:''}${d.date&&isPast(d)?'<div class="secondary">Deadline passed</div>':''}</div></div>`).join(''):'<p>No remaining main-track submission deadline has been verified.</p>'}
  ${e.opens?`<p>Applications open ${formatDate(e.opens)}.</p>`:''}${e.notes?`<h3>${e.verification==='needs-review'?'Source clarification needed':'Important details'}</h3><p>${esc(e.notes)}</p>`:''}
  <h3>Official sources</h3><div class="source-list">${sources.map(u=>`<a href="${esc(safeUrl(u))}" target="_blank" rel="noopener noreferrer">${esc(u)}</a>`).join('')}</div>${e.checkError?`<p class="secondary">Latest source check failed: ${esc(e.checkError)}</p>`:''}
  <div class="dialog-actions"><button class="button" data-save="${esc(e.id)}" aria-pressed="${saved.has(e.id)}">${saved.has(e.id)?'★ Saved to shortlist':'☆ Save to shortlist'}</button><button class="button" data-calendar="${esc(e.id)}">Export deadlines</button><a class="button primary-button" href="${esc(safeUrl(e.source))}" target="_blank" rel="noopener noreferrer">Open official page</a></div>`;
  if(!$('detail').open)$('detail').showModal();
}
function download(text,name,type){const u=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);}
function calendar(events){if(!events.some(e=>eligibleDeadlines(e).length)){notify('No upcoming dated deadlines to export.');return;}download(exportCalendar(events),'research-radar-deadlines.ics','text/calendar;charset=utf-8');notify('Calendar snapshot downloaded. Date-only cutoffs are all-day reminders.');}
function reset(){for(const id of filters)$(id).value=id==='sort'?'deadline':'';$('past').checked=false;worldMap.reset();render();}
document.addEventListener('click',ev=>{
  const b=ev.target.closest('button');if(!b)return;
  if(b.dataset.save){toggleSave(b.dataset.save);return;}
  if(b.dataset.detail){showDetail(b.dataset.detail);return;}
  if(b.dataset.calendar){calendar(catalog.events.filter(e=>e.id===b.dataset.calendar));return;}
  if(b.dataset.view){currentView=b.dataset.view;render();return;}
  if(b.dataset.quick){currentView='all';reset();if(b.dataset.quick==='soon')$('status').value='soon';if(b.dataset.quick==='unknown')$('status').value='unknown';if(b.dataset.quick==='high')$('fit').value='High';render();$('controls').scrollIntoView({block:'nearest'});}
});
for(const id of filters)$(id).addEventListener(id==='search'?'input':'change',render);
$('past').addEventListener('change',render);
$('reset').onclick=reset;$('empty-reset').onclick=reset;
$('refresh').onclick=()=>loadData(true);
$('csv').onclick=()=>{download(exportCsv(visible),'research-radar-events.csv','text/csv;charset=utf-8');notify('Filtered events exported.');};
$('ics').onclick=()=>calendar(visible);
$('close-detail').onclick=()=>$('detail').close();
$('detail').addEventListener('click',e=>{if(e.target===$('detail')){const r=$('detail').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('detail').close();}});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!$('detail').open){e.preventDefault();$('search').focus();}});
loadData();
setInterval(()=>{if(!document.hidden)loadData();},15*60*1000);
setInterval(()=>{if(catalog&&!document.hidden)render();},60*1000);
