import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudCommands} from '../cloud/cloud-commands.mjs';
const state=endsAt=>({active:{'VIP-01':{id:'s1',stationId:'VIP-01',startedAt:1000,endsAt,durationMinutes:1}}});
test('timed extension rejects malformed string end timestamp without mutation',()=>{
 const s=state('61000');const before=JSON.stringify(s);
 assert.throws(()=>cloudCommands.extend({stationId:'VIP-01',minutes:5,at:2000})(s),/Invalid extension/);
 assert.equal(JSON.stringify(s),before);
});
test('timed extension rejects missing end timestamp without mutation',()=>{
 const s=state(undefined);const before=JSON.stringify(s);
 assert.throws(()=>cloudCommands.extend({stationId:'VIP-01',minutes:5,at:2000})(s),/Invalid extension/);
 assert.equal(JSON.stringify(s),before);
});
test('valid timed extension still works',()=>{
 const s=state(61000);cloudCommands.extend({stationId:'VIP-01',minutes:5,at:2000})(s);
 assert.equal(s.active['VIP-01'].endsAt,361000);
});
