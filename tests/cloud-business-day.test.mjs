import test from 'node:test';
import assert from 'node:assert/strict';
import {iraqBusinessDay} from '../cloud/business-day.mjs';
const time=iso=>Date.parse(iso);
test('Iraq 05:59 belongs to previous business day',()=>assert.equal(iraqBusinessDay(time('2026-10-22T02:59:00Z')),'2026-10-21'));
test('Iraq 06:00 begins new business day',()=>assert.equal(iraqBusinessDay(time('2026-10-22T03:00:00Z')),'2026-10-22'));
test('January first before 06:00 belongs to prior year',()=>assert.equal(iraqBusinessDay(time('2027-01-01T01:00:00Z')),'2026-12-31'));
test('invalid timestamps rejected',()=>assert.throws(()=>iraqBusinessDay(-1),/Invalid timestamp/));
