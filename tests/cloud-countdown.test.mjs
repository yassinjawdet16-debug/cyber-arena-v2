import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {timedSessionStatus,formatCountdown} from '../cloud/cloud-countdown.mjs';
const ui=readFileSync(new URL('../cloud/cloud-manager-ui.mjs',import.meta.url),'utf8');
test('untimed session has no countdown',()=>{
 assert.deepEqual(timedSessionStatus({endsAt:null},1000),{timed:false,remainingMs:null,expired:false});
});
test('timed session countdown handles expiration without negative time',()=>{
 assert.deepEqual(timedSessionStatus({endsAt:61000},1000),{timed:true,remainingMs:60000,expired:false});
 assert.deepEqual(timedSessionStatus({endsAt:61000},61000),{timed:true,remainingMs:0,expired:true});
 assert.deepEqual(timedSessionStatus({endsAt:61000},70000),{timed:true,remainingMs:0,expired:true});
});
test('countdown formatting rounds up remaining seconds',()=>{
 assert.equal(formatCountdown(3601000),'01:00:01');
 assert.equal(formatCountdown(1001),'00:00:02');
 assert.equal(formatCountdown(0),'00:00:00');
});
test('cloud manager countdown is display-only and never automatically bills',()=>{
 assert.match(ui,/setInterval\(updateCountdowns,1000\)/);
 assert.match(ui,/TIME UP — extend or finish manually/);
 assert.match(ui,/data-countdown/);
 const update=ui.slice(ui.indexOf('function updateCountdowns(){'),ui.indexOf('function render(snapshot){'));
 assert.doesNotMatch(update,/session\.execute|cloudCommands\.finish|client\.write/);
});
