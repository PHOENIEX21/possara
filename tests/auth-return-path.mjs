import assert from 'node:assert/strict';
import {authReturnPath} from '../src/lib/authReturnPath.ts';
for(const unsafe of ['//evil.example','/\\evil.example','https://evil.example','javascript:alert(1)','/\n/evil.example',null])assert.equal(authReturnPath(unsafe),'/profile/me');
assert.equal(authReturnPath('/groups?invite=abc'),'/groups?invite=abc');
assert.equal(authReturnPath('/groups/123?message=456'),'/groups/123?message=456');
console.log('PASS: authentication return paths preserve invitations and reject external redirects.');
