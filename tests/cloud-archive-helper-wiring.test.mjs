import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cloudCommands} from '../cloud/cloud-commands.mjs';
const source=readFileSync(new URL('../cloud/cloud-commands.mjs',import.meta.url),'utf8');
test('cloud archive imports and uses tested Iraq business-day helper',()=>{
 assert.match(source,/import \{iraqBusinessDay\} from '\.\/business-day\.mjs'/);
 assert.match(source,/const day=iraqBusinessDay\(session\.endedAt\)/);
});
test('cloud archive respects 06:00 Baghdad boundary',()=>{
 const before=Date.parse('2026-10-22T02:59:00Z');
 const after=Date.parse('2026-10-22T03:00:00Z');
 const s={sessions:[{id:'before',endedAt:before},{id:'after',endedAt:after}],archives:{},bills:[]};
 cloudCommands.archive({businessDay:'2026-10-22',at:after+60000})(s);
 assert.equal(s.archives['2026-10-21'][0].id,'before');
 assert.equal(s.sessions[0].id,'after');
});
