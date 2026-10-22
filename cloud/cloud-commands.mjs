// Pure cloud mutations: run only through cloud coordinator, never directly against localStorage.
export const cloudCommands={
 start({stationId,id,at,minutes=null}){return s=>{
  const st=s.stations.find(x=>x.id===stationId);
  if(!st||s.active[stationId])throw Error('Station unavailable');
  if(!id||!Number.isSafeInteger(at)||at<0||minutes!==null&&(!Number.isSafeInteger(minutes)||minutes<=0))throw Error('Invalid session');
  if([...s.sessions,...Object.values(s.active),...Object.values(s.archives).flat()].some(x=>x.id===id))throw Error('Duplicate session');
  s.active[stationId]={id,stationId,startedAt:at,rate:st.rate,durationMinutes:minutes,endsAt:minutes===null?null:at+minutes*60000,discount:0};
 }},
 extend({stationId,minutes,at}){return s=>{
  const a=s.active[stationId];if(!a||a.endsAt===null||!Number.isSafeInteger(minutes)||minutes<=0)throw Error('Invalid extension');
  a.endsAt=Math.max(a.endsAt,at)+minutes*60000;a.durationMinutes=Math.ceil((a.endsAt-a.startedAt)/60000);
 }},
 discount({stationId,type,value}){return s=>{
  const a=s.active[stationId];
  if(!a||!['fixed','percent'].includes(type)||!Number.isFinite(value)||value<0||type==='percent'&&value>100||type==='fixed'&&(!Number.isSafeInteger(value)||value%250!==0))throw Error('Invalid discount');
  a.discountType=type;a.discountValue=value;a.discount=type==='fixed'?value:0;
 }},
 sale({id,movementId,name,qty,price,at,businessDay}){return s=>{
  if(!id||!movementId||id===movementId||!name?.trim()||!Number.isSafeInteger(qty)||qty<=0||!Number.isSafeInteger(price)||price<0||!Number.isSafeInteger(qty*price))throw Error('Invalid sale');
  if([...s.sales,...s.adjustments].some(x=>x.id===id||x.id===movementId))throw Error('Duplicate sale');
  s.sales.unshift({id,name,qty,unitPrice:price,total:qty*price,createdAt:at,date:businessDay,businessDay});
  s.adjustments.push({id:movementId,date:businessDay,businessDay,at,kind:'sale',amount:qty*price,description:qty+' × '+name});
 }},
 cash({id,amount,description,at,businessDay}){return s=>{
  if(!id||!Number.isSafeInteger(amount)||amount%250!==0||s.adjustments.some(x=>x.id===id))throw Error('Invalid adjustment');
  s.adjustments.push({id,date:businessDay,businessDay,at,kind:'adjustment',amount,description:description||'Adjustment'});
 }}
};
