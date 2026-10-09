import test from 'node:test';
import assert from 'node:assert/strict';
import {deadlineInstant,singaporeTime,status,eligibleDeadlines,exportCalendar,exportCsv,safeUrl} from '../core.js';
test('AoE cutoff converts to next-day Singapore evening',()=>{
 const d={date:'2026-10-28',time:'23:59',zone:'AoE'};
 assert.equal(deadlineInstant(d).toISOString(),'2026-10-29T11:59:00.000Z');assert.match(singaporeTime(d),/19:59/);
});
test('IANA conversions account for summer and winter',()=>{
 assert.equal(deadlineInstant({date:'2026-12-01',time:'23:59',zone:'America/Los_Angeles'}).toISOString(),'2026-12-02T07:59:00.000Z');
 assert.equal(deadlineInstant({date:'2027-07-01',time:'23:59',zone:'Europe/London'}).toISOString(),'2027-07-01T22:59:00.000Z');
});
test('Unknown timezones never become fabricated exact times',()=>{
 assert.equal(deadlineInstant({date:'2027-02-01',zone:'EDT as published',time:'23:59'}),null);
 assert.equal(deadlineInstant({date:'2027-02-01'}),null);
});
test('Missing mandatory abstract closes paper route',()=>{
 const e={deadlines:[{id:'abstract',label:'Abstract',date:'2026-10-01',zone:'AoE',time:'23:59'},{label:'Paper',date:'2026-10-20',requires:'abstract'}]};
 assert.equal(eligibleDeadlines(e,new Date('2026-10-09T12:00:00Z')).length,0);assert.equal(status(e,new Date('2026-10-09T12:00:00Z')).key,'closed');
});
test('Waiting-list and future application openings override countdowns',()=>{
 const e={deadlines:[{label:'Course application',date:'2027-03-01'}],opens:'2026-12-14'};
 assert.equal(status(e,new Date('2026-10-09')).key,'not-open');
 assert.equal(status({...e,submissionState:'waitlist'},new Date('2026-10-09')).key,'waitlist');
 assert.equal(eligibleDeadlines({...e,submissionState:'waitlist'}).length,0);
});
test('Calendar preserves exact and uncertain deadlines separately',()=>{
 const e={id:'demo',name:'Demo',source:'https://example.com',deadlines:[{label:'Abstract',date:'2027-01-01',zone:'AoE',time:'23:59'},{label:'Application',date:'2027-02-01'}]};
 const out=exportCalendar([e],new Date('2026-10-09T00:00:00Z'));
 assert.match(out,/DTSTART:20270102T115900Z/);assert.match(out,/DTSTART;VALUE=DATE:20270201/);assert.match(out,/DTEND;VALUE=DATE:20270202/);
});
test('Output handles spreadsheet formula injection and unsafe URLs',()=>{
 const e={name:'=1+1',topics:[],deadlines:[],source:'https://example.com'};
 assert.match(exportCsv([e]),/"'=1\+1"/);assert.equal(safeUrl('javascript:alert(1)'),'#');
});
