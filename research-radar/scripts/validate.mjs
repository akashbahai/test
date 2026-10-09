import fs from 'node:fs';
import assert from 'node:assert/strict';
import {deadlineInstant} from '../core.js';
const c=JSON.parse(fs.readFileSync(new URL('../events.json',import.meta.url),'utf8'));
assert.equal(c.schemaVersion,1);assert.ok(Number.isFinite(Date.parse(c.updatedAt)));
const ids=new Set();
const isDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&new Date(v+'T12:00:00Z').toISOString().startsWith(v);
for(const e of c.events){
 assert.ok(!ids.has(e.id),'Duplicate ID '+e.id);ids.add(e.id);
 for(const k of ['id','name','location','source','relevance','fit','type','checkedAt'])assert.ok(e[k],`${e.id}: missing ${k}`);
 assert.ok(['Conference','Workshop','Course'].includes(e.type));assert.ok(['High','Relevant','Selective'].includes(e.fit));assert.ok(['official','needs-review'].includes(e.verification));
 assert.ok(isDate(e.checkedAt));assert.ok(Array.isArray(e.topics));assert.ok(Array.isArray(e.deadlines));
 for(const u of [e.source,...(e.sources||[])])assert.equal(new URL(u).protocol,'https:');
 for(const k of ['start','end','opens'])if(e[k])assert.ok(isDate(e[k]),`${e.id}: invalid ${k}`);
 if(e.start&&e.end)assert.ok(e.start<=e.end,`${e.id}: reversed dates`);
 for(const d of e.deadlines){assert.ok(d.label);if(d.date){assert.ok(isDate(d.date),`${e.id}: invalid deadline`);const t=deadlineInstant(d);if(t)assert.ok(Number.isFinite(t.getTime()));}if(d.requires)assert.ok(e.deadlines.find(x=>x.id===d.requires),`${e.id}: missing gate`);}
}
console.log(`Catalog valid: ${c.events.length} unique events; date, source and dependency checks passed.`);
