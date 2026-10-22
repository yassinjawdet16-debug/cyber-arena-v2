const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
function source(name,next){const start=html.indexOf('function '+name+'(');const end=html.indexOf('\nfunction '+next+'(',start);assert.ok(start>=0&&end>start,name+' missing');return html.slice(start,end)}
const src=source('localDateKey','localParts')+'\n'+source('localParts','baghdadDayStart')+'\n'+source('baghdadDayStart','dayForTimestamp')+'\n'+source('dayForTimestamp','businessDayForTimestamp')+'\n'+source('businessDayForTimestamp','recordBusinessDay')+'\n'+source('recordBusinessDay','defaultData');
const ctx={Intl,Date,Number,Object};vm.runInNewContext(src,ctx);
const t=(iso)=>Date.parse(iso);
assert.equal(ctx.businessDayForTimestamp(t('2026-10-22T02:59:00Z')),'2026-10-21');
assert.equal(ctx.businessDayForTimestamp(t('2026-10-22T03:00:00Z')),'2026-10-22');
assert.equal(ctx.businessDayForTimestamp(t('2026-10-22T04:00:00Z')),'2026-10-22');
assert.equal(ctx.recordBusinessDay({createdAt:t('2026-10-22T02:59:00Z'),date:'2026-10-22'}),'2026-10-21');
assert.equal(ctx.recordBusinessDay({date:'2026-10-21'}),'2026-10-21');
console.log('PASS Baghdad 6 AM business-day boundary and legacy records');
