import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloudUiSession} from '../cloud/cloud-ui-session.mjs';
import {iraqBusinessDay} from '../cloud/business-day.mjs';
import {validateCloudState} from '../cloud/cloud-state.mjs';
const stations=Array.from({length:16},(_,i)=>({id:i===0?'VIP-01':(i<8?'PS5-':'PS4-')+String(i+1).padStart(2,'0'),type:i===0?'VIP':i<8?'PS5':'PS4',rate:i===0?10000:i<8?5000:3000}));
function backend(){
 let data={stations,active:{},sessions:[],archives:{},bills:[],sales:[],adjustments:[],settings:{}},revision=1,writes=0;
 return {client:{async read(){return {initialized:true,revision,state:structuredClone(data)}},async write(expected,next){assert.equal(expected,revision);validateCloudState(next);data=structuredClone(next);writes++;return ++revision}},
 get state(){return structuredClone(data)},get writes(){return writes}};
}
test('two devices complete a VIP session once and retain exact cash ledger',async()=>{
 const b=backend(),pc=createCloudUiSession(b.client),phone=createCloudUiSession(b.client);
 const start=Date.parse('2026-10-22T06:00:00Z'),end=start+3600000,day=iraqBusinessDay(end);
 await pc.refresh();await phone.refresh();
 await pc.execute('start',{stationId:'VIP-01',id:'session-1',at:start});
 await assert.rejects(phone.execute('finish',{stationId:'VIP-01',endedAt:end,billId:'bill-x',movementId:'movement-x',businessDay:day}),/changed on another device/);
 await phone.refresh();
 await phone.execute('finish',{stationId:'VIP-01',endedAt:end,billId:'bill-1',movementId:'movement-1',businessDay:day});
 const s=b.state;
 assert.equal(s.sessions.length,1);assert.equal(s.bills.length,1);assert.equal(s.adjustments.length,1);
 assert.equal(s.sessions[0].charge,10000);assert.equal(s.bills[0].amount,10000);assert.equal(s.adjustments[0].amount,10000);
 assert.equal(s.active['VIP-01'],undefined);assert.equal(b.writes,2);
 await pc.refresh();
 await assert.rejects(pc.execute('finish',{stationId:'VIP-01',endedAt:end,billId:'bill-2',movementId:'movement-2',businessDay:day}),/Invalid active session/);
 assert.equal(b.writes,2);validateCloudState(b.state);
});
test('sale and cash adjustment preserve both financial records',async()=>{
 const b=backend(),pc=createCloudUiSession(b.client),phone=createCloudUiSession(b.client);
 await pc.refresh();await phone.refresh();
 await pc.execute('sale',{id:'sale-1',movementId:'sale-movement-1',name:'Water',qty:2,price:500,at:Date.parse('2026-10-22T08:00:00Z'),businessDay:'2026-10-22'});
 await assert.rejects(phone.execute('cash',{id:'cash-1',amount:-250,description:'Change correction',at:Date.parse('2026-10-22T08:01:00Z'),businessDay:'2026-10-22'}),/changed on another device/);
 await phone.refresh();
 await phone.execute('cash',{id:'cash-1',amount:-250,description:'Change correction',at:Date.parse('2026-10-22T08:01:00Z'),businessDay:'2026-10-22'});
 const s=b.state;
 assert.equal(s.sales[0].total,1000);assert.equal(s.adjustments.length,2);
 assert.equal(s.adjustments.reduce((n,x)=>n+x.amount,0),750);
 validateCloudState(s);
});
