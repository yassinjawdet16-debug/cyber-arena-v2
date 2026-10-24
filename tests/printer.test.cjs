const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('async function printBill(');
const end=html.indexOf('\nfunction reprintBill(',start);
assert.ok(start>=0&&end>start,'Printer function missing');
async function scenario(response,ok=true){
 const bill={id:'BILL-TEST',amount:2500,status:'unprinted',printedAt:null,jobStatus:'not-sent'};
 const messages=[];
 let request;
 let saved=0;
 const ctx={data:{bills:[bill],settings:{bridgeUrl:'http://127.0.0.1:8787/print',bridgeToken:'test-token'}},fetch:async(url,options)=>{request={url,options};return {ok,status:ok?200:503,json:async()=>response}},billText:()=> 'receipt',Date,JSON,Error,save:()=>saved++,closeModal:()=>{},renderAll:()=>{},renderBills:()=>{},setStatus:s=>messages.push(s),window:{print:()=>{throw Error('Browser dialog should not open')}}};
 vm.runInNewContext(html.slice(start,end),ctx);
 await ctx.printBill('BILL-TEST');
 return {bill,messages,saved,request};
}
(async()=>{
 let x=await scenario({accepted:true});
 assert.equal(x.bill.status,'printed');
 assert.equal(x.bill.jobStatus,'accepted');
 assert.ok(x.bill.printedAt>0);
 assert.equal(x.request.options.method,'POST');
 assert.equal(x.request.options.headers.Authorization,'Bearer test-token');
 assert.equal(JSON.parse(x.request.options.body).printerIp,'192.168.1.41');
 assert.equal(JSON.parse(x.request.options.body).port,9100);
 x=await scenario({accepted:false,message:'Printer offline'});
 assert.equal(x.bill.status,'unprinted');
 assert.equal(x.bill.jobStatus,'failed');
 assert.match(x.messages.at(-1),/Printing failed/);
 x=await scenario({accepted:true},false);
 assert.equal(x.bill.status,'unprinted');
 assert.equal(x.bill.jobStatus,'failed');
 console.log('PASS printer bridge acceptance, rejection, and HTTP failure');
})().catch(e=>{console.error(e);process.exitCode=1});
