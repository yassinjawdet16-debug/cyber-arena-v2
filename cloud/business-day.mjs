export function iraqBusinessDay(timestamp){
 if(!Number.isSafeInteger(timestamp)||timestamp<0)throw Error('Invalid timestamp');
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Baghdad',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date(timestamp));
 const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
 const offset=Number(p.hour)<6?1:0;
 return new Date(Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day)-offset)).toISOString().slice(0,10);
}
