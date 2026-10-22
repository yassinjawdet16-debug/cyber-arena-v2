import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('../cloud/cloud-manager-ui.mjs',import.meta.url),'utf8');
test('connectivity invalidation hides unverified cloud station and income views',()=>{
 assert.match(ui,/function hideUnverifiedCloudView\(\)\{\s*el\('stations'\)\.replaceChildren\(\)/);
 assert.match(ui,/Cloud totals unavailable until a successful refresh/);
 const section=ui.slice(ui.indexOf('function invalidateCloudView('));
 assert.match(section,/needsRefresh=true;\s*hideUnverifiedCloudView\(\)/);
 assert.match(section,/window\.addEventListener\('offline'/);
 assert.match(section,/visibilitychange/);
});
test('pending cloud actions hide unverified views after invalidation',()=>{
 const section=ui.slice(ui.indexOf("document.addEventListener('click',async event=>"),ui.indexOf('buttons();\nsetInterval'));
 assert.match(section,/finally\{busy=false;if\(needsRefresh&&session\)\{try\{session\.lock\(\)\}catch\(_\)\{\}hideUnverifiedCloudView\(\)\}buttons\(\)\}/);
});
