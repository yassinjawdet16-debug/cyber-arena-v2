import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../cloud/operations-ui.mjs',import.meta.url),'utf8');
test('cloud operations reuse one tested Iraq business-day helper',()=>{
 assert.match(src,/import \{iraqBusinessDay\} from '\.\/business-day\.mjs'/);
 assert.match(src,/const dateKey=iraqBusinessDay/);
 assert.match(src,/businessDay:dateKey\(at\)/);
 assert.doesNotMatch(src,/new Date\(time-21600000\)/);
});
