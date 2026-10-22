import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloudUiSession} from '../cloud/cloud-ui-session.mjs';
const state=()=>({
 stations:Array.from({length:16},(_,i)=>({id:i===0?'VIP-01':(i<8?'PS5-':'PS4-')+String(i+1).padStart(2,'0'),type:i===0?'VIP':i<8?'PS5':'PS4',rate:i===0?10000:i<8?5000:3000})),
 active:{},sessions:[],archives:{},bills:[],sales:[],adjustments:[],settings:{}
});
function mock(){let revision=0,data=state(),writes=0;return {client:{
 async read(){return {initialized:true,revision,state:structuredClone(data)}},
 async write(expected,next){assert.equal(expected,revision);data=structuredClone(next);writes++;return ++revision}
 },get writes(){return writes},get data(){return data}}}
test('editing is blocked before initial cloud refresh',async()=>{
 const m=mock(),ui=createCloudUiSession(m.client);
 await assert.rejects(ui.execute('start',{stationId:'VIP-01',id:'S1',at:1000}),/Refresh/);
 assert.equal(m.writes,0);
});
test('successful refresh and start commits once',async()=>{
 const m=mock(),ui=createCloudUiSession(m.client);
 await ui.refresh();await ui.execute('start',{stationId:'VIP-01',id:'S1',at:1000});
 assert.equal(m.writes,1);assert.equal(m.data.active['VIP-01'].id,'S1');
 assert.equal(ui.status().revision,1);
});
test('failed render after write blocks retry without duplicate writes',async()=>{
 const m=mock();let calls=0;
 const ui=createCloudUiSession(m.client,{render(){if(++calls===2)throw Error('screen crashed')}});
 await ui.refresh();
 await assert.rejects(ui.execute('start',{stationId:'VIP-01',id:'S1',at:1000}),/committed/i);
 assert.equal(ui.status().blocked,true);
 await assert.rejects(ui.execute('start',{stationId:'VIP-01',id:'S2',at:1001}),/refresh/i);
 assert.equal(m.writes,1);
 await ui.refresh();assert.equal(ui.current().state.active['VIP-01'].id,'S1');
});
test('failed refresh blocks financial edits',async()=>{
 const m=mock(),ui=createCloudUiSession(m.client,{render(){throw Error('render failed')}});
 await assert.rejects(ui.refresh(),/render failed/);
 await assert.rejects(ui.execute('start',{stationId:'VIP-01',id:'S1',at:1000}),/render failed/);
 assert.equal(m.writes,0);
});
test('lock clears ready snapshot',async()=>{
 const m=mock(),ui=createCloudUiSession(m.client);await ui.refresh();ui.lock();
 assert.equal(ui.status().ready,false);
 await assert.rejects(ui.execute('start',{stationId:'VIP-01',id:'S1',at:1000}),/locked/);
});
