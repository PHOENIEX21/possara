import test from 'node:test';
import assert from 'node:assert/strict';
import { validateJobForm } from '../src/lib/jobValidation.ts';

const valid = { title:'Designer', roleType:'Design', location:'Lagos', description:'Design useful products', payMin:'100', payMax:'200', closesAt:'', requiresCbt:true, cbtMinutes:'15', screening:[{questionText:'Available?',answerType:'yes_no',choices:[]}] };
test('valid vacancy and optional salary can be published',()=>{
  assert.doesNotThrow(()=>validateJobForm(valid,true));
  assert.doesNotThrow(()=>validateJobForm({...valid,payMin:'',payMax:''},true));
});
test('invalid pay never silently turns into a misleading range',()=>{
  for(const values of [{payMin:'300'},{payMin:'-1'},{payMax:'NaN'}]) assert.throws(()=>validateJobForm({...valid,...values},true),/pay|Pay/);
});
test('draft may be incomplete but publication requires description and current date',()=>{
  assert.doesNotThrow(()=>validateJobForm({...valid,description:''},false));
  assert.throws(()=>validateJobForm({...valid,description:''},true),/description/);
  assert.throws(()=>validateJobForm({...valid,closesAt:'2000-01-01'},true),/closing date/);
});
test('exam durations are whole minutes within bounds',()=>{
  for(const cbtMinutes of ['0','181','1.5','NaN']) assert.throws(()=>validateJobForm({...valid,cbtMinutes},true),/duration/);
});
test('incomplete or ambiguous screening choices must be fixed explicitly',()=>{
  for(const choices of [['A'],['A','a'],['A','']]) assert.throws(()=>validateJobForm({...valid,screening:[{questionText:'Pick one',answerType:'single_choice',choices}]},true),/choices/);
  assert.throws(()=>validateJobForm({...valid,screening:[{questionText:' ',answerType:'short_text',choices:[]}]},true),/title/);
});
