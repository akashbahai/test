import test from 'node:test';
import assert from 'node:assert/strict';
import {project,groupLocations} from '../map.js';

test('Map projects confirmed positions and omits unlocated events',()=>{
  assert.deepEqual(project({lat:0,lon:0}),[500,250]);
  const events=[{id:'online',geo:null},{id:'singapore',geo:{lat:1.29,lon:103.85}}];
  assert.equal(groupLocations(events).length,1);
  assert.equal(groupLocations(events)[0].events[0].id,'singapore');
});
test('Nearby cities separate on zoom; co-located events remain selectable together',()=>{
  const events=[{id:'a',geo:{lat:40,lon:0}},{id:'b',geo:{lat:40,lon:0}},{id:'c',geo:{lat:40,lon:3}}];
  assert.equal(groupLocations(events,1000).length,1);
  const close=groupLocations(events,200);
  assert.equal(close.length,2);assert.deepEqual(close[0].events.map(e=>e.id),['a','b']);
});
