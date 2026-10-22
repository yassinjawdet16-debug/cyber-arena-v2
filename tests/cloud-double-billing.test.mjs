import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudCommands} from '../cloud/cloud-commands.mjs';
const stations=Array.from({length:16},(_,i)=>({id:i===0?'VIP-01':(i<8?'PS5-':'PS4-')+String(i+1).padStart(2,'0'),type:i===0?'VIP':i<8?'PS5':'PS4',rate:i===0?10000:i<8?5000:3000}));
const state=()=>({stations,active:{'VIP-01':{id:'S1',stationId:'VIP-01',startedAt:1000,rate:10000,endsAt:null,discount:0}},sessions:[],archives:{},bills:[],sales:[],adjustments:[],settings:{}});
const finish=cloudCommands.finish({stationId:'VIP-01',endedAt:3601000,billId:'B2',movementId:'M2',businessDay:'2026-10-22'});
test('existing bill prevents another completion',()=>{const s=state();s.bills.push({id:'B1',sessionId:'S1'});const before=JSON.stringify(s);assert.throws(()=>finish(s),/already completed or billed/);assert.equal(JSON.stringify(s),before)});
test('existing cash entry prevents another completion',()=>{const s=state();s.adjustments.push({id:'M1',kind:'session',sessionId:'S1',amount:10000});const before=JSON.stringify(s);assert.throws(()=>finish(s),/already completed or billed/);assert.equal(JSON.stringify(s),before)});
