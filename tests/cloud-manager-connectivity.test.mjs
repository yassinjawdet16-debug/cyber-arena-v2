import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../cloud/cloud-manager-ui.mjs',import.meta.url),'utf8');
test('cloud edits disabled when browser reports offline',()=>{
 assert.match(source,/navigator\.onLine!==false/);
 assert.match(source,/addEventListener\('offline'/);
 assert.match(source,/session\.lock\(\)/);
});
test('reconnection and iPhone app resume require cloud refresh',()=>{
 assert.match(source,/addEventListener\('online'/);
 assert.match(source,/addEventListener\('visibilitychange'/);
 assert.match(source,/Refresh cloud before editing/);
 assert.match(source,/Connection restored\. Refresh cloud/);
});

test('connectivity change during pending write invalidates next edit',()=>{
 assert.match(source,/let client=null,session=null,busy=false,needsRefresh=false/);
 assert.match(source,/needsRefresh=true/);
 assert.match(source,/!needsRefresh&&navigator\.onLine/);
 assert.match(source,/finally\{busy=false;if\(needsRefresh&&session\)/);
 assert.match(source,/needsRefresh=false;message\('Cloud refreshed/);
});
