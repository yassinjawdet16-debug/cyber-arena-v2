import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('../cloud/cloud-manager-ui.mjs',import.meta.url),'utf8');
test('failed refresh explicitly locks cloud session before showing error',()=>{
 const start=ui.indexOf('async function refresh(){');
 const end=ui.indexOf("el('login').addEventListener",start);
 assert.ok(start>=0&&end>start);
 const block=ui.slice(start,end);
 assert.match(block,/if\(startedEpoch!==connectionEpoch\)\{try\{session\.lock\(\)\}catch\(_\)\{\}throw Error/);
 assert.match(block,/catch\(e\)\{try\{session\.lock\(\)\}catch\(_\)\{\}el\('stations'\)\.replaceChildren/);
 assert.match(block,/Cloud refresh blocked/);
});
