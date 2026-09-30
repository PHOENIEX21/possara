const DATABASE='possara-moment-drafts';
const STORE='photos';
const memory=new Map<string,File[]>();

async function database():Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DATABASE,1);
    request.onupgradeneeded=()=>request.result.createObjectStore(STORE);
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
    request.onblocked=()=>reject(new Error('Photo draft storage is busy.'));
  });
}

export async function saveMomentPhotos(key:string,files:File[]) {
  memory.set(key,files);
  const db=await database();
  try {
    await new Promise<void>((resolve,reject)=>{
      const transaction=db.transaction(STORE,'readwrite');
      const store=transaction.objectStore(STORE);
      if(files.length)store.put({files,expiresAt:Date.now()+86400000},key);
      else store.delete(key);
      transaction.oncomplete=()=>resolve();
      transaction.onabort=()=>reject(transaction.error);
      transaction.onerror=()=>reject(transaction.error);
    });
  } finally { db.close(); }
}

export async function readMomentPhotos(key:string):Promise<File[]> {
  if(memory.has(key))return memory.get(key)!;
  const db=await database();
  try {
    const saved=await new Promise<{files:File[];expiresAt:number}|undefined>((resolve,reject)=>{
      const request=db.transaction(STORE).objectStore(STORE).get(key);
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
    if(!saved)return [];
    if(saved.expiresAt<=Date.now()){void saveMomentPhotos(key,[]).catch(()=>{});return [];}
    const files=saved.files.filter(file=>file instanceof Blob).slice(0,10);
    memory.set(key,files);
    return files;
  } finally { db.close(); }
}

// Android providers sometimes report an empty or generic MIME type. Inspect
// bytes and own a copy before clearing the native input's selected files.
export async function copyMomentPhoto(file:File):Promise<File> {
  if(!file.size)throw new Error(`${file.name} is empty. Download the photo to your phone and select it again.`);
  if(file.size>8*1024*1024)throw new Error(`${file.name} is larger than 8 MB. Choose a smaller photo.`);
  let bytes:ArrayBuffer;
  try { bytes=await file.arrayBuffer(); }
  catch { throw new Error(`Cannot read ${file.name}. Download it to your phone and select it again.`); }
  const head=new Uint8Array(bytes);
  const ascii=(start:number,end:number)=>String.fromCharCode(...head.slice(start,end));
  const type=head[0]===255&&head[1]===216&&head[2]===255?'image/jpeg':
    head[0]===137&&ascii(1,4)==='PNG'?'image/png':
    ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP'?'image/webp':null;
  if(!type)throw new Error(`${file.name} is not a readable JPG, PNG or WebP photo. Choose one of those formats.`);
  return new File([bytes],file.name,{type,lastModified:file.lastModified});
}
