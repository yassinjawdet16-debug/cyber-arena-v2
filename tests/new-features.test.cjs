const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const source=html.slice(html.indexOf('<script>')+8,html.indexOf('</script>'));
function extract(name,next){const a=source.indexOf('function '+name+'('),b=source.indexOf('function '+next+'(',a);assert.ok(a>=0&&b>a,name);return source.slice(a,b)}
const code=[
extract('sessionSegments','groupMembers'),
extract('groupMembers','transferStation'),
extract('transferStation','startSession'),
extract('sessionElapsed','pauseSession'),
extract('confirmFinishSession','extendSession'),
].join('\n');
let now=10000000;const realDate=Date;class MockDate extends realDate{static now(){return now}}
const stations=[{id:'PS5-02',rate:5000},{id:'PS4-11',rate:3000},{id:'PS5-04',rate:5000},{id:'PS4-10',rate:3000}];
const active={};const data={stations,active,sessions:[],adjustments:[],bills:[],settings:{}};
let confirm=()=>{},form='',status='';
const ctx={data,Date:MockDate,Math,Number,Object,Array,JSON,console,uid:(p)=>p+'-'+(++ctx.seq),seq:0,round250:n=>Math.round(n/250)*250,money:n=>String(n),localDateKey:()=> '2026-10-24',setStatus:s=>status=s,openForm:(t,b,cb)=>{form=b;confirm=cb},closeModal:()=>{},save:()=>{},renderAll:()=>{},openBillPreview:()=>{},document:{getElementById:id=>({value:id==='transferTarget'?'PS4-11':id==='groupTarget'?'SES-3':id==='finishDiscountType'?'fixed':'0'})}};
vm.createContext(ctx);vm.runInContext(code,ctx);
active['PS5-02']={id:'SES-1',stationId:'PS5-02',startedAt:now-3600000,rate:5000,discount:0};
ctx.transferStation('PS5-02');confirm();assert.equal(active['PS5-02'],undefined);assert.ok(active['PS4-11']);assert.equal(active['PS4-11'].segments[0].rate,5000);
now+=3600000;assert.equal(Math.round(ctx.sessionRaw(active['PS4-11'],now)),8000);
ctx.confirmFinishSession('PS4-11');assert.equal(data.bills[0].amount,8000);assert.equal(data.sessions[0].startedAt,6400000);assert.equal(data.sessions[0].segments.length,2);
active['PS5-04']={id:'SES-2',stationId:'PS5-04',startedAt:now-3600000,rate:5000,discount:0};
active['PS4-10']={id:'SES-3',stationId:'PS4-10',startedAt:now-3600000,rate:3000,discount:0};
ctx.combineSessions('PS5-04');confirm();assert.equal(active['PS5-04'].groupId,active['PS4-10'].groupId);
ctx.confirmFinishSession('PS5-04');assert.equal(data.bills[0].amount,8000);assert.equal(data.bills[0].items.length,2);assert.equal(Object.keys(active).length,0);assert.equal(data.bills[0].items.reduce((n,x)=>n+x.amount,0),8000);
console.log('PASS station transfer preserves rates/start and grouped receipt totals');
