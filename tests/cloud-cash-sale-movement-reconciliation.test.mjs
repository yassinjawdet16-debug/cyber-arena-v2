import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudDailyCashSummary} from '../cloud/cloud-cash-summary.mjs';
import {iraqBusinessDay} from '../cloud/business-day.mjs';
const at=Date.parse('2026-10-22T12:00:00Z'),day=iraqBusinessDay(at);
const state=()=>({bills:[],sales:[{id:'s1',businessDay:day,total:1000},{id:'s2',businessDay:day,total:2000}],adjustments:[{id:'m1',businessDay:day,kind:'sale',amount:1000},{id:'m2',businessDay:day,kind:'sale',amount:2000}]});
test('matching sale and ledger amounts do not require reconciliation',()=>{
 const report=cloudDailyCashSummary(state(),at);
 assert.equal(report.saleMovementsMismatch,false);
 assert.equal(report.requiresReconciliation,false);
});
test('offsetting sale ledger errors are detected despite zero cash difference',()=>{
 const s=state();s.adjustments[0].amount=500;s.adjustments[1].amount=2500;
 const report=cloudDailyCashSummary(s,at);
 assert.equal(report.cashDifference,0);
 assert.equal(report.saleMovementsMismatch,true);
 assert.equal(report.requiresReconciliation,true);
});
test('missing sale movement is flagged even if remaining totals are adjusted',()=>{
 const s=state();s.adjustments=[{id:'m1',businessDay:day,kind:'sale',amount:3000}];
 const report=cloudDailyCashSummary(s,at);
 assert.equal(report.cashDifference,0);
 assert.equal(report.saleMovementsMismatch,true);
 assert.equal(report.requiresReconciliation,true);
});
