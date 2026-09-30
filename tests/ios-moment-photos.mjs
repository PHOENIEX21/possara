import assert from 'node:assert/strict';
import {copyMomentPhoto} from '../src/lib/momentPhotoDraft.ts';
let failDecode=false,canvas,lastType,revoked=0;
globalThis.Image=class {
 naturalWidth=4032;naturalHeight=3024;
 set src(value){if(value)queueMicrotask(()=>failDecode?this.onerror?.():this.onload?.());}
};
globalThis.document={createElement:()=>canvas={width:0,height:0,getContext:()=>({drawImage(){assert.equal(canvas.width,2048);assert.equal(canvas.height,1536);}}),toBlob:callback=>callback(new Blob([Uint8Array.from([255,216,255,224])],{type:'image/jpeg'}))}};
URL.createObjectURL=file=>{lastType=file.type;return 'blob:test';};URL.revokeObjectURL=()=>revoked++;
const header=new Uint8Array(24);header.set([0,0,0,24]);header.set(new TextEncoder().encode('ftypheic'),4);header.set(new TextEncoder().encode('mif1'),16);
const converted=await copyMomentPhoto(new File([header],'IMG_1234.HEIC',{type:''}));
assert.equal(lastType,'image/heic');assert.equal(converted.type,'image/jpeg');assert.equal(converted.name,'IMG_1234.jpg');assert.equal(canvas.width,0);assert.equal(revoked,1);
failDecode=true;await assert.rejects(copyMomentPhoto(new File([header],'older-device.heic')),/JPEG copy/);assert.equal(revoked,2);
console.log('HEIC detection, JPEG conversion pipeline, bounded dimensions, cleanup and unsupported-browser error passed (decoder mocked)');
