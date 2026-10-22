import {iraqBusinessDay} from './business-day.mjs';
// Pure cloud mutations: run only through cloud coordinator, never directly against localStorage.
export const cloudCommands={
 start({stationId,id,at,minutes=null}){return s=>{
  const st=s.stations.find(x=>x.id===stationId);
  if(!st||s.active[stationId])throw Error('Station unavailable');
  if(!id||!Number.isSafeInteger(at)||at<0||minutes!==null&&(!Number.isSafeInteger(minutes)||minutes<=0))throw Error('Invalid session');
  if([...s.sessions,...Object.values(s.active),...Object.values(s.archives).flat(),...s.bills,...s.sales,...s.adjustments].some(x=>x.id===id))throw Error('Duplicate session');
  s.active[stationId]={id,stationId,startedAt:at,rate:st.rate,durationMinutes:minutes,endsAt:minutes===null?null:at+minutes*60000,discount:0};
 }},
 extend({stationId,minutes,at}){return s=>{
  const a=s.active[stationId];if(!a||a.endsAt===null||!Number.isSafeInteger(minutes)||minutes<=0||!Number.isSafeInteger(at)||at<a.startedAt||!Number.isSafeInteger(Math.max(a.endsAt,at)+minutes*60000))throw Error('Invalid extension');
  a.endsAt=Math.max(a.endsAt,at)+minutes*60000;a.durationMinutes=Math.ceil((a.endsAt-a.startedAt)/60000);
 }},
 discount({stationId,type,value}){return s=>{
  const a=s.active[stationId];
  if(!a||!['fixed','percent'].includes(type)||!Number.isFinite(value)||value<0||type==='percent'&&value>100||type==='fixed'&&(!Number.isSafeInteger(value)||value%250!==0))throw Error('Invalid discount');
  a.discountType=type;a.discountValue=value;a.discount=type==='fixed'?value:0;
 }},
 finish({stationId,endedAt,billId,movementId,businessDay}){
  return state=>{
   const a=state.active[stationId],station=state.stations.find(x=>x.id===stationId);
   if(!a||!station||a.rate!==station.rate)throw Error('Invalid active session');
   if(!Number.isSafeInteger(endedAt)||endedAt<a.startedAt||!billId||!movementId||billId===movementId||!/^(?:\\d{4})-(?:\\d{2})-(?:\\d{2})$/.test(businessDay)||businessDay!==iraqBusinessDay(endedAt))throw Error('Invalid completion');
   const all=[...state.sessions,...Object.values(state.archives).flat()];
   if(all.some(x=>x.id===a.id)||state.bills.some(x=>x.sessionId===a.id)||state.adjustments.some(x=>x.kind==='session'&&x.sessionId===a.id))throw Error('Session already completed or billed');
   const ids=new Set([...all,...state.bills,...state.adjustments,...state.sales].map(x=>x.id));
   if(ids.has(billId)||ids.has(movementId))throw Error('Duplicate financial ID');
   const mins=Math.max(0,(endedAt-a.startedAt)/60000),raw=mins*a.rate/60;
   const requested=a.discountType==='percent'?raw*(Number(a.discountValue)||0)/100:Number(a.discountValue??a.discount??0);
   if(!Number.isFinite(raw)||!Number.isFinite(requested)||requested<0)throw Error('Invalid session charge');
   const discount=Math.min(raw,requested),charge=Math.round(Math.max(0,raw-discount)/250)*250;
   if(!Number.isSafeInteger(charge))throw Error('Invalid final charge');
   const session={...a,endedAt,minutes:Math.ceil(mins),rawCharge:Math.round(raw),discount,discountType:a.discountType||'fixed',discountValue:a.discountValue??a.discount??0,charge,completedAt:endedAt,archived:false};
   state.sessions.unshift(session);
   delete state.active[stationId];
   state.bills.unshift({id:billId,sessionId:session.id,stationId,createdAt:endedAt,businessDay,archived:false,kind:'session',minutes:session.minutes,rate:a.rate,rawCharge:session.rawCharge,discount,amount:charge,status:'unprinted',printedAt:null,jobStatus:'not-sent'});
   state.adjustments.push({id:movementId,date:businessDay,businessDay,at:endedAt,kind:'session',sessionId:session.id,amount:charge,description:'Session '+stationId});
  };
 },
 archive({businessDay,at}){return s=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(businessDay)||!Number.isSafeInteger(at)||at<0||businessDay!==iraqBusinessDay(at))throw Error('Invalid archive request');
  const keep=[];
  for(const session of s.sessions){
   if(typeof session.endedAt!=='number'||session.endedAt>at)throw Error('Invalid session archive time');
   const day=iraqBusinessDay(session.endedAt);
   if(day>=businessDay){keep.push(session);continue}
   const archive=s.archives[day]??=[];
   if(archive.some(x=>x.id===session.id))throw Error('Duplicate archived session');
   archive.push({...session,archived:true});s.archives[day]=archive;
  }
  s.sessions=keep;
  for(const bill of s.bills){if(bill.businessDay&&bill.businessDay<businessDay){bill.archived=true;bill.archivedAt=at}}
  s.lastArchiveDay=businessDay;
 }},
 sale({id,movementId,name,qty,price,at,businessDay}){return s=>{
  if(!id||!movementId||id===movementId||!name?.trim()||!Number.isSafeInteger(qty)||qty<=0||!Number.isSafeInteger(price)||price<0||!Number.isSafeInteger(qty*price)||!Number.isSafeInteger(at)||at<0||!/^\d{4}-\d{2}-\d{2}$/.test(businessDay)||businessDay!==iraqBusinessDay(at))throw Error('Invalid sale');
  if([...s.sales,...s.adjustments,...s.bills,...s.sessions,...Object.values(s.active),...Object.values(s.archives).flat()].some(x=>x.id===id||x.id===movementId))throw Error('Duplicate sale');
  s.sales.unshift({id,name,qty,unitPrice:price,total:qty*price,createdAt:at,date:businessDay,businessDay});
  s.adjustments.push({id:movementId,date:businessDay,businessDay,at,kind:'sale',amount:qty*price,description:qty+' × '+name});
 }},
 cash({id,amount,description,at,businessDay}){return s=>{
  if(!id||!Number.isSafeInteger(amount)||amount%250!==0||!Number.isSafeInteger(at)||at<0||!/^\d{4}-\d{2}-\d{2}$/.test(businessDay)||businessDay!==iraqBusinessDay(at)||[...s.adjustments,...s.bills,...s.sales,...s.sessions,...Object.values(s.active),...Object.values(s.archives).flat()].some(x=>x.id===id))throw Error('Invalid adjustment');
  s.adjustments.push({id,date:businessDay,businessDay,at,kind:'adjustment',amount,description:description||'Adjustment'});
 }}
};
