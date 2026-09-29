import assert from 'node:assert/strict';
import {searchPattern,searchFilter,searchTerm} from '../src/lib/search.ts';
assert.equal(searchPattern('100%_ready'),' %100\\%\\_ready%'.trim());
assert.equal(searchFilter(['name'], 'A,B (team)'), 'name.ilike."%A,B (team)%"');
assert.equal(searchFilter(['name','body'], '"hi"'), 'name.ilike."%\\"hi\\"%",body.ilike."%\\"hi\\"%"');
assert.equal(searchTerm('  friend  '),'friend');assert.equal(searchTerm('x'.repeat(500)).length,120);
console.log('PASS: search punctuation, wildcard escaping, quoted filters and length limits.');
