/* Pure timed-session countdown helpers. Display-only; never end or bill sessions. */
export function timedSessionStatus(active,now){
 if(!active||active.endsAt===null||active.endsAt===undefined)return {timed:false,remainingMs:null,expired:false};
 const endsAt=Number(active.endsAt);
 if(!Number.isSafeInteger(endsAt)||endsAt<0||!Number.isSafeInteger(now)||now<0)throw Error('Invalid countdown timestamp');
 const remainingMs=Math.max(0,endsAt-now);
 return {timed:true,remainingMs,expired:endsAt<=now};
}
export function formatCountdown(milliseconds){
 if(!Number.isSafeInteger(milliseconds)||milliseconds<0)throw Error('Invalid countdown duration');
 const seconds=Math.ceil(milliseconds/1000);
 const hours=Math.floor(seconds/3600),minutes=Math.floor(seconds%3600/60),rest=seconds%60;
 return [hours,minutes,rest].map(n=>String(n).padStart(2,'0')).join(':');
}
