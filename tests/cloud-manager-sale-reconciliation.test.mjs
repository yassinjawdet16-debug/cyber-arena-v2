import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('../cloud/cloud-manager-ui.mjs',import.meta.url),'utf8');
test('cloud daily dashboard shows sale movement mismatch warning',()=>{
 assert.match(ui,/saleMovementsMismatch\?' · Sale ledger mismatch'/);
 assert.match(ui,/requiresReconciliation/);
});
test('cloud CSV report explicitly exports sale ledger mismatch',()=>{
 assert.match(ui,/\['Sale ledger mismatch',report\.saleMovementsMismatch\?'YES':'NO',''\]/);
});
