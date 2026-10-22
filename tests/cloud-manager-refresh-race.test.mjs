import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('../cloud/cloud-manager-ui.mjs',import.meta.url),'utf8');
test('network invalidation increments epoch and prevents stale refresh unlock',()=>{
 assert.match(ui,/connectionEpoch=0/);
 assert.match(ui,/connectionEpoch\+\+;\s*needsRefresh=true/);
 assert.match(ui,/const startedEpoch=connectionEpoch;\s*busy=true;buttons\(\);\s*try\{const snapshot=await session\.refresh\(\);if\(startedEpoch!==connectionEpoch\)throw Error/);
 assert.match(ui,/Connection changed during refresh; refresh again/);
});
test('owner sign-in cannot succeed using a stale mid-connection response',()=>{
 assert.match(ui,/if\(busy\|\|client\)return;const startedEpoch=connectionEpoch/);
 assert.match(ui,/Connection changed during sign-in; sign in again/);
});
