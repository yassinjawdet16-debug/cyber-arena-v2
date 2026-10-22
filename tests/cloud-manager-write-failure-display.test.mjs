import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('../cloud/cloud-manager-ui.mjs',import.meta.url),'utf8');
test('failed financial mutation hides stale financial and session views',()=>{
 const start=ui.indexOf("document.addEventListener('click',async event=>");
 const end=ui.indexOf("buttons();\nsetInterval",start);
 assert.ok(start>=0&&end>start);
 const block=ui.slice(start,end);
 assert.match(block,/catch\(e\)\{\s*try\{session\?\.lock\(\)\}catch\(_\)\{\}\s*hideUnverifiedCloudView\(\)/);
 assert.match(block,/OUTCOME MAY BE UNCERTAIN/);
});
test('logout clears verified session history alongside financial data',()=>{
 const start=ui.indexOf("el('logout').addEventListener");
 const end=ui.indexOf('function argsFor(',start);
 assert.ok(start>=0&&end>start);
 const block=ui.slice(start,end);
 assert.match(block,/sessionHistory'\)\.textContent='Sign in to view completed sessions.'/);
 assert.match(block,/financialSummary'\)\.textContent='Sign in to view verified cloud totals.'/);
});
