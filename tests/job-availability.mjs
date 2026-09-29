import assert from 'node:assert/strict';
import {isJobOpen,jobStatus} from '../src/lib/jobAvailability.ts';
const now=Date.parse('2026-09-29T12:00:00Z');
for(const status of ['draft','closed','filled']) assert.equal(isJobOpen({status,closes_at:null},now),false);
for(const closes_at of ['2026-09-28T12:00:00Z','2026-09-29T12:00:00Z','invalid']) {
 assert.equal(isJobOpen({status:'open',closes_at},now),false);
 assert.equal(jobStatus({status:'open',closes_at},now),'closed');
}
for(const closes_at of [null,'2026-09-30T12:00:00Z']) assert.equal(isJobOpen({status:'open',closes_at},now),true);
console.log('Job status/deadline boundary checks passed');
