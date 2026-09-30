import assert from 'node:assert/strict';
import {copyMomentPhoto} from '../src/lib/momentPhotoDraft.ts';
const png=Uint8Array.from([137,80,78,71,13,10,26,10]);
for(const type of ['', 'application/octet-stream', 'image/png']){
 const original=new File([png],'android-photo.png',{type});
 const copied=await copyMomentPhoto(original);
 assert.notEqual(copied,original);
 assert.equal(copied.type,'image/png');
 assert.deepEqual(new Uint8Array(await copied.arrayBuffer()),png);
}
assert.equal((await copyMomentPhoto(new File([Uint8Array.from([255,216,255,224])],'phone.jpg',{type:'image/jpg'}))).type,'image/jpeg');
assert.equal((await copyMomentPhoto(new File(['RIFF0000WEBP'],'phone.webp'))).type,'image/webp');
await assert.rejects(copyMomentPhoto(new File(['not an image'],'fake.png',{type:'image/png'})),/not a readable/);
await assert.rejects(copyMomentPhoto(new File([],'empty.jpg')),/empty/);
await assert.rejects(copyMomentPhoto(new File([new Uint8Array(8*1024*1024+1)],'large.jpg')),/larger than 8 MB/);
await assert.rejects(copyMomentPhoto({name:'cloud.jpg',size:1,arrayBuffer:async()=>{throw Error('Provider unavailable');}}),/Download it to your phone/);
console.log('Android empty/generic MIME, owned file copies, supported signatures and readable errors passed');
