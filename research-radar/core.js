export const TZ = 'Asia/Singapore';
export const dayMs = 86400000;
export function localDay(now = new Date(), zone = TZ) {
  return new Intl.DateTimeFormat('en-CA', {timeZone: zone, year:'numeric', month:'2-digit', day:'2-digit'}).format(now);
}
export function formatDate(date) {
  return date ? new Intl.DateTimeFormat('en-GB', {day:'numeric', month:'short', year:'numeric', timeZone:'UTC'}).format(new Date(date+'T12:00:00Z')) : 'To be announced';
}
export function deadlineInstant(d) {
  if (!d.date || !d.time || !d.zone) return null;
  if (d.zone === 'AoE') return new Date(`${d.date}T${d.time}:00-12:00`);
  if (d.zone === 'EDT') return new Date(`${d.date}T${d.time}:00-04:00`);
  if (d.zone.includes('as published')) return null;
  // Convert an IANA wall-clock time using the offset on that specific date (DST aware).
  const wall = Date.parse(`${d.date}T${d.time}:00Z`);
  let guess = wall;
  for (let i=0; i<3; i++) {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {timeZone:d.zone, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(guess)).map(x=>[x.type,x.value]));
    const displayed = Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);
    guess += wall - displayed;
  }
  return new Date(guess);
}
export function singaporeTime(d) {
  const t=deadlineInstant(d);
  return t ? new Intl.DateTimeFormat('en-SG',{timeZone:TZ,day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(t)+' SGT' : null;
}
export function isPast(d, now = new Date()) {
  const at = deadlineInstant(d);
  if(at) return at.getTime() < now.getTime();
  // A date without a verified cutoff is never advertised as safely open on that date.
  return d.date ? now.getTime() > Date.parse(d.date+'T23:59:59-12:00') : false;
}
export function remainingDays(d, now = new Date()) {
  if(!d?.date) return null;
  const at = deadlineInstant(d);
  return at ? Math.ceil((at-now)/dayMs) : Math.round((Date.parse(d.date+'T00:00:00Z')-Date.parse(localDay(now)+'T00:00:00Z'))/dayMs);
}
export function eligibleDeadlines(e, now = new Date()) {
  if(['closed','waitlist'].includes(e.submissionState)) return [];
  return e.deadlines.filter(d=>d.actionable!==false && d.date && !isPast(d,now) && (!d.requires || !isPast(e.deadlines.find(x=>x.id===d.requires) || {},now)));
}
export function nextDeadline(e, now = new Date()) {
  return eligibleDeadlines(e,now).sort((a,b)=>(deadlineInstant(a)?.getTime()||Date.parse(a.date))-(deadlineInstant(b)?.getTime()||Date.parse(b.date)))[0] || null;
}
export function status(e, now = new Date()) {
  if(e.submissionState==='waitlist') return {key:'waitlist',label:'Waitlist only'};
  if(e.opens && e.opens>localDay(now)) return {key:'not-open',label:'Opens '+formatDate(e.opens)};
  if(e.submissionState==='not-open') return {key:'not-open',label:'Not open yet'};
  if(e.submissionState==='closed') return {key:'closed',label:'Submissions closed'};
  const d=nextDeadline(e,now);
  if(d) {
    const days=remainingDays(d,now);
    const exact=deadlineInstant(d);
    const label=!exact ? (days<0?'Date passed · verify time':days===0?'Due today · verify time':`In ${days} days · time unverified`) : days===0?'Due today':days===1?'Due in 1 day':`Due in ${days} days`;
    return {key:days<=30?'soon':'upcoming',label,days};
  }
  if(e.deadlines.some(d=>!d.date)) return {key:'unknown',label:'Awaiting deadline'};
  if(e.deadlines.length) return {key:'closed',label:'Submissions closed'};
  return {key:'unknown',label:'Awaiting deadline'};
}
export function eventDates(e) {
  if(!e.start) return 'Dates to be announced';
  if(e.start===e.end) return formatDate(e.start);
  return `${formatDate(e.start)} – ${formatDate(e.end)}`;
}
export function primaryDeadline(e) {
  return e.deadlines.find(d=>/abstract|registration|application/i.test(d.label) && !/commitment/i.test(d.label)) || e.deadlines.find(d=>d.actionable!==false) || null;
}
export function escapeText(s) { return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
export function safeUrl(s) { try {const u=new URL(s);return u.protocol==='https:'?u.href:'#';} catch{return '#';} }
export function csvCell(value) {
  let s=String(value??'');
  if(/^[=+@\-\t\r]/.test(s)) s="'"+s;
  return '"'+s.replaceAll('"','""')+'"';
}
export function exportCsv(events) {
  const header=['Event','Type','Location','Start','End','Relevance','Why relevant','Deadline type','Deadline date','Time','Timezone','Singapore time','Source','Verified on','Notes'];
  const rows=events.flatMap(e=>(e.deadlines.length?e.deadlines:[{}]).map(d=>[e.name,e.type,e.location,e.start,e.end,e.fit,e.relevance,d.label,d.date,d.time,d.zone,singaporeTime(d),e.source,e.checkedAt,e.notes]));
  return [header,...rows].map(r=>r.map(csvCell).join(',')).join('\r\n');
}
const icsEscape=s=>String(s??'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
function fold(s) {
  // iCalendar lines are folded by UTF-8 octets, not characters.
  let out='',line='',bytes=0;
  for(const char of s){const n=new TextEncoder().encode(char).length;if(bytes+n>73){out+=line+'\r\n ';line='';bytes=1;}line+=char;bytes+=n;}
  return out+line;
}
export function exportCalendar(events, now=new Date()) {
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Research Radar//Deadline calendar//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
  for(const e of events) for(const d of eligibleDeadlines(e,now)) {
    const at=deadlineInstant(d);
    const stamp=t=>t.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
    const day=d.date.replaceAll('-','');
    lines.push('BEGIN:VEVENT',`UID:${e.id}-${d.label.replace(/[^a-z0-9]/gi,'')}-${day}@research-radar`, `DTSTAMP:${stamp(now)}`);
    if(at) lines.push(`DTSTART:${stamp(at)}`,`DTEND:${stamp(new Date(at.getTime()+60000))}`);
    else {const next=new Date(d.date+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+1);lines.push(`DTSTART;VALUE=DATE:${day}`,`DTEND;VALUE=DATE:${next.toISOString().slice(0,10).replaceAll('-','')}`);}
    lines.push(`SUMMARY:${icsEscape(e.name+' — '+d.label)}`,`DESCRIPTION:${icsEscape((at?'Exact cutoff converted to UTC.':'Date-only reminder: cutoff time / timezone unverified; check organizer.')+'\n'+(e.notes||'')+'\n'+e.source)}`,`URL:${safeUrl(e.source)}`,'END:VEVENT');
  }
  lines.push('END:VCALENDAR'); return lines.map(fold).join('\r\n')+'\r\n';
}
