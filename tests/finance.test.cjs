const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const round=html.match(/function round250\(n\)\{[^}]+\}/);
const charge=html.match(/function chargeFor\(station,startedAt,endedAt,discount=0\)\{[^}]+\}/);
assert.ok(round&&charge,'Financial calculation functions must exist');
const context={};vm.runInNewContext(round[0]+';'+charge[0],context);
function equalCharge(rate,minutes,discount,expected){
 const actual=context.chargeFor({rate},0,minutes*60000,discount);
 assert.equal(actual.final,expected,rate+' IQD/h for '+minutes+' minutes');
 assert.ok(actual.discount>=0&&actual.discount<=actual.raw);
}
equalCharge(10000,60,0,10000);
equalCharge(5000,30,0,2500);
equalCharge(3000,15,0,750);
equalCharge(5000,60,500,4500);
equalCharge(5000,60,999999,0);
equalCharge(10000,60,-200,10000);
equalCharge(3000,2.5,0,250);
assert.equal(context.round250(125),250);
assert.equal(context.round250(374),250);
assert.equal(context.round250(375),500);
console.log('PASS financial rate, discounts, rounding and charge tests');
