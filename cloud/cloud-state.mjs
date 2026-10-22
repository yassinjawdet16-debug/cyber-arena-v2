/*
 Cloud state preparation and validation for Cyber Arena V2.
 Pure functions: no network requests and no localStorage writes.
*/
const REQUIRED_ARRAYS=['sessions','sales','bills','adjustments'];
const PRIVATE_SETTINGS=new Set(['pin','bridgeToken','bridgeUrl','printerIp']);
const expectedStations=Array.from({length:16},(_,i)=>({
 id:i===0?'VIP-01':(i<8?'PS5-':'PS4-')+String(i+1).padStart(2,'0'),
 type:i===0?'VIP':i<8?'PS5':'PS4',
 rate:i===0?10000:i<8?5000:3000
}));
export class CloudStateValidationError extends Error {
 constructor(message){super(message);this.name='CloudStateValidationError'}
}
const fail=msg=>{throw new CloudStateValidationError(msg)};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const deepCopy=x=>JSON.parse(JSON.stringify(x));
export function validateCloudState(state){
 if(!object(state))fail('Cloud state must be an object');
 if(!Array.isArray(state.stations)||state.stations.length!==16)fail('Exactly 16 stations required');
 state.stations.forEach((st,i)=>{
  const expected=expectedStations[i];
  if(!object(st)||st.id!==expected.id||st.type!==expected.type||st.rate!==expected.rate)fail('Station order or rate mismatch: '+expected.id);
 });
 for(const name of REQUIRED_ARRAYS)if(!Array.isArray(state[name]))fail('Invalid '+name+' array');
 if(!object(state.active)||!object(state.archives)||!object(state.settings))fail('Invalid active sessions, archives, or settings');
 for(const key of PRIVATE_SETTINGS)if(Object.hasOwn(state.settings,key))fail('Private setting in cloud state: '+key);
 const allSessions=[...state.sessions];
 for(const [day,rows] of Object.entries(state.archives)){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Array.isArray(rows))fail('Invalid archive: '+day);
  allSessions.push(...rows);
 }
 const ids=new Set(),activeIds=new Set();
 const addId=(record,kind)=>{
  if(!object(record)||typeof record.id!=='string'||!record.id.trim()||ids.has(record.id))fail('Duplicate or invalid '+kind+' ID');
  ids.add(record.id);
 };
 for(const session of allSessions){
  addId(session,'completed session');
  if(!expectedStations.some(st=>st.id===session.stationId))fail('Invalid completed session station: '+session.id);
  if(!Number.isSafeInteger(session.endedAt)||!Number.isSafeInteger(session.startedAt)||session.endedAt<session.startedAt||session.startedAt<0)fail('Invalid completed session timestamps: '+session.id);
  if(!Number.isSafeInteger(session.charge)||session.charge<0||session.charge%250!==0)fail('Invalid completed session charge: '+session.id);
  if(session.rawCharge!==undefined&&(!Number.isSafeInteger(session.rawCharge)||session.rawCharge<0))fail('Invalid completed session raw charge: '+session.id);
 }
 for(const [stationId,session] of Object.entries(state.active)){
  if(!expectedStations.some(x=>x.id===stationId)||!object(session)||session.stationId!==stationId)fail('Invalid active station');
  if(activeIds.has(stationId))fail('Duplicate active station');
  activeIds.add(stationId);addId(session,'active session');
  const station=expectedStations.find(x=>x.id===stationId);
  if(!Number.isSafeInteger(session.startedAt)||session.startedAt<0||session.rate!==station.rate)fail('Invalid active session start or rate: '+stationId);
  if(session.endsAt!==null&&session.endsAt!==undefined&&(!Number.isSafeInteger(session.endsAt)||session.endsAt<=session.startedAt))fail('Invalid active session end time: '+stationId);
  if(session.durationMinutes!==undefined&&session.durationMinutes!==null&&(!Number.isSafeInteger(session.durationMinutes)||session.durationMinutes<=0||session.endsAt===null||session.endsAt===undefined))fail('Invalid timed session duration: '+stationId);
 }
 for(const kind of ['sales','bills','adjustments'])for(const record of state[kind])addId(record,kind);
 // Validate every ledger row, including archived-day rows, before a dashboard can trust totals.
 for(const sale of state.sales){
  if(!Number.isSafeInteger(sale.total)||sale.total<0)fail('Invalid sale total: '+sale.id);
  if(!Number.isSafeInteger(sale.qty)||sale.qty<=0||!Number.isSafeInteger(sale.unitPrice)||sale.unitPrice<0||!Number.isSafeInteger(sale.qty*sale.unitPrice)||sale.qty*sale.unitPrice!==sale.total)fail('Sale quantity, unit price or total mismatch: '+sale.id);
 }
 for(const movement of state.adjustments)if(!Number.isSafeInteger(movement.amount))fail('Invalid cash movement amount: '+movement.id);
 const completed=new Map(allSessions.map(x=>[x.id,x]));
 // A completed session must not remain active on another device.
 for(const session of Object.values(state.active)){
  if(completed.has(session.id))fail('Session is both active and completed: '+session.id);
 }
 // A single station cannot have two different active session entries.
 for(const session of Object.values(state.active)){
  if(!expectedStations.some(x=>x.id===session.stationId))fail('Unknown active station');
 }
 const bills=new Map(),movements=new Map();
 for(const b of state.bills){
  if(b.kind!=='session')continue;
  if(!completed.has(b.sessionId))fail('Orphan session bill: '+b.id);
  bills.set(b.sessionId,(bills.get(b.sessionId)||0)+1);
  if(!Number.isSafeInteger(b.amount)||b.amount<0||b.amount%250!==0||b.amount!==completed.get(b.sessionId).charge)fail('Bill amount mismatch: '+b.id);
 }
 for(const m of state.adjustments){
  if(m.kind!=='session'||!m.sessionId)continue;
  if(!completed.has(m.sessionId))fail('Orphan session cash movement: '+m.id);
  movements.set(m.sessionId,(movements.get(m.sessionId)||0)+1);
  if(!Number.isSafeInteger(m.amount)||m.amount<0||m.amount%250!==0||m.amount!==completed.get(m.sessionId).charge)fail('Cash movement amount mismatch: '+m.id);
 }
 for(const session of allSessions){
  if(bills.get(session.id)!==1)fail('Expected one bill for session '+session.id);
  if((movements.get(session.id)||0)>1)fail('Duplicate cash movement for session '+session.id);
 }
 return {valid:true,completedSessions:allSessions.length,activeSessions:activeIds.size,legacyCashMovements:state.adjustments.filter(x=>x.kind==='session'&&!x.sessionId).length};
}
export function prepareCloudState(localData){
 if(!object(localData))fail('Local data is missing');
 const copy=deepCopy(localData);
 if(!object(copy.settings))copy.settings={};
 for(const key of PRIVATE_SETTINGS)delete copy.settings[key];
 // Reject rather than silently remove any unexpected financial records.
 validateCloudState(copy);
 return copy;
}
