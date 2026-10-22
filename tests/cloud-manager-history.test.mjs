import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('../cloud/cloud-manager-ui.mjs',import.meta.url),'utf8');
const html=readFileSync(new URL('../cloud-manager.html',import.meta.url),'utf8');
test('cloud manager provides verified read-only session history',()=>{
 assert.match(html,/id="sessionHistory"/);
 assert.match(ui,/function showSessionHistory\(snapshot\)/);
 assert.match(ui,/snapshot\.state\.sessions,\.\.\.Object\.values\(snapshot\.state\.archives\)\.flat\(\)/);
 assert.match(ui,/snapshot\.state\.bills\.find\(x=>x\.sessionId===record\.id\)/);
 assert.match(ui,/showSessionHistory\(snapshot\)/);
 assert.match(ui,/timeZone:'Asia\/Baghdad'/);
});
test('session history clears when cloud data is no longer verified',()=>{
 assert.match(ui,/function hideUnverifiedCloudView\(\)\{[\s\S]*?sessionHistory'\)\.textContent='Session history locked/);
 assert.match(ui,/Cloud refresh failed[\s\S]*?Cloud totals unavailable/);
 assert.match(ui,/sessionHistory'\)\.textContent='Sign in to view completed sessions/);
});
