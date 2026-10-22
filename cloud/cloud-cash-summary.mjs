/* Pure cash-register reporting. Do not count both a sale and its ledger movement. */
import {iraqBusinessDay} from './business-day.mjs';
const amount=(n,label)=>{
 if(!Number.isSafeInteger(n))throw Error('Invalid '+label+' amount');
 return n;
};
export function cloudDailyCashSummary(state,at){
 if(!state||!Array.isArray(state.bills)||!Array.isArray(state.sales)||!Array.isArray(state.adjustments))throw Error('Invalid cloud financial state');
 const day=iraqBusinessDay(at);
 const bills=state.bills.filter(x=>x.kind==='session'&&x.businessDay===day);
 const sales=state.sales.filter(x=>x.businessDay===day);
 const cash=state.adjustments.filter(x=>x.businessDay===day);
 const sum=(rows,get,label)=>rows.reduce((total,row)=>amount(total+amount(get(row),label),label),0);
 const sessionIncome=sum(bills,x=>x.amount,'session');
 const salesIncome=sum(sales,x=>x.total,'sale');
 const otherAdjustments=sum(cash.filter(x=>x.kind==='adjustment'),x=>x.amount,'adjustment');
 const movementSession=sum(cash.filter(x=>x.kind==='session'&&x.sessionId),x=>x.amount,'session movement');
 const movementSales=sum(cash.filter(x=>x.kind==='sale'),x=>x.amount,'sale movement');
 // Legacy imported records may lack linked cash movements; do not infer cash paid.
 const unlinkedSessionMovements=cash.filter(x=>x.kind==='session'&&!x.sessionId);
 const net=amount(sessionIncome+salesIncome+otherAdjustments,'net');
 const recordedCashMovements=amount(movementSession+movementSales+otherAdjustments,'recorded cash');
 const cashDifference=amount(net-recordedCashMovements,'cash difference');
 return Object.freeze({day,sessionIncome,salesIncome,otherAdjustments,net,
  recordedCashMovements,cashDifference,requiresReconciliation:cashDifference!==0||unlinkedSessionMovements.length>0,
  unlinkedSessionMovements:unlinkedSessionMovements.length,
  sessionBills:bills.length,salesCount:sales.length});
}
