import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudDailyCashSummary} from '../cloud/cloud-cash-summary.mjs';
const at=Date.parse('2026-10-22T08:00:00Z');
test('daily totals count sale once despite matching cash ledger entry',()=>{
 const state={bills:[{kind:'session',businessDay:'2026-10-22',amount:10000}],sales:[{businessDay:'2026-10-22',total:1000}],adjustments:[
 {kind:'session',sessionId:'S1',businessDay:'2026-10-22',amount:10000},
 {kind:'sale',businessDay:'2026-10-22',amount:1000},
 {kind:'adjustment',businessDay:'2026-10-22',amount:-250}]};
 const r=cloudDailyCashSummary(state,at);
 assert.equal(r.sessionIncome,10000);assert.equal(r.salesIncome,1000);assert.equal(r.otherAdjustments,-250);
 assert.equal(r.net,10750);assert.equal(r.recordedCashMovements,10750);
});
test('Baghdad 06:00 cutoff excludes previous-day records',()=>{
 const state={bills:[{kind:'session',businessDay:'2026-10-21',amount:5000}],sales:[{businessDay:'2026-10-22',total:500}],adjustments:[]};
 const r=cloudDailyCashSummary(state,Date.parse('2026-10-22T02:59:00Z'));
 assert.equal(r.day,'2026-10-21');assert.equal(r.net,5000);
});
test('unsafe noninteger income fails instead of silently rounding',()=>{
 assert.throws(()=>cloudDailyCashSummary({bills:[{kind:'session',businessDay:'2026-10-22',amount:1.5}],sales:[],adjustments:[]},at),/Invalid session amount/);
});
