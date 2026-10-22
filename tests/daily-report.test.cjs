const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('function printDailyReport(');
const end=html.indexOf('\nfunction openForm(',start);
assert.ok(start>=0&&end>start,'Daily report function missing');
const area={innerHTML:'',classList:{remove(){},add(){}}};
let prints=0;
const ctx={
 baghdadDayStart:()=> '2026-10-22',
 allSessions:()=>[{stationId:'VIP-01',endedAt:123,minutes:60,charge:10000},{stationId:'PS5-02',endedAt:123,minutes:30,charge:2500}],
 businessDayForTimestamp:()=> '2026-10-22',
 recordBusinessDay:()=> '2026-10-22',
 data:{sales:[{qty:2,name:'Water',total:1000}],adjustments:[{kind:'adjustment',amount:-750,at:123},{kind:'sale',amount:1000,at:123}],bills:[]},
 money:n=>n+' IQD',
 document:{getElementById:()=>area},
 escapeHTML:s=>s,
 window:{print:()=>prints++}
};
vm.runInNewContext(html.slice(start,end),ctx);
ctx.printDailyReport();
assert.match(area.innerHTML,/Session income: 12500 IQD/);
assert.match(area.innerHTML,/Extra sales: 1000 IQD/);
assert.match(area.innerHTML,/Cash adjustments: -750 IQD/);
assert.match(area.innerHTML,/Cash total: 12750 IQD/);
assert.equal(prints,1);
console.log('PASS daily report financial reconciliation');
