import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('../cloud/cloud-manager-ui.mjs',import.meta.url),'utf8');
test('all backup export failures lock cloud editing and hide unverified data',()=>{
 const start=ui.indexOf("el('backup').addEventListener");
 const end=ui.indexOf("el('logout').addEventListener",start);
 assert.ok(start>=0&&end>start);
 const block=ui.slice(start,end);
 assert.match(block,/catch\(e\)\{try\{session\?\.lock\(\)\}catch\(_\)\{\}hideUnverifiedCloudView\(\)/);
 assert.match(block,/Cloud editing locked until refresh/);
 assert.match(block,/if\(needsRefresh&&session\)\{try\{session\.lock\(\)\}/);
});
