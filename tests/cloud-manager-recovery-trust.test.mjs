import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync(new URL('../cloud/cloud-manager-ui.mjs',import.meta.url),'utf8');
test('recovery inspection never claims to authenticate backup origin',()=>{
 assert.match(ui,/STRUCTURE VALID \(authenticity not verified\)/);
 assert.doesNotMatch(ui,/textContent='VALID BACKUP/);
 assert.match(ui,/Inspection only: NO cloud records changed/);
});
