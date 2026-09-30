const DATABASE='possara-moment-drafts';
const STORE='photos';
const memory=new Map<string,File[]>();

async function database():Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    let settled=false;
    const fail=(error:unknown)=>{if(settled)return;settled=true;clearTimeout(timer);reject(error);};
    const timer=setTimeout(()=>fail(new Error('Photo draft storage did not respond.')),5000);
    const request=indexedDB.open(DATABASE,1);
    request.onupgradeneeded=()=>request.result.createObjectStore(STORE);
    request.onsuccess=()=>{if(settled){request.result.close();return;}settled=true;clearTimeout(timer);resolve(request.result);};
    request.onerror=()=>fail(request.error);
    request.onblocked=()=>fail(new Error('Photo draft storage is busy.'));
  });
}

export async function saveMomentPhotos(key:string,files:File[]) {
  memory.set(key,files);
  const db=await database();
  try {
    await new Promise<void>((resolve,reject)=>{
      const transaction=db.transaction(STORE,'readwrite');
      const timer=setTimeout(()=>{transaction.abort();reject(new Error('Photo draft could not be saved.'));},5000);
      const store=transaction.objectStore(STORE);
      if(files.length)store.put({files,expiresAt:Date.now()+86400000},key);
      else store.delete(key);
      transaction.oncomplete=()=>{clearTimeout(timer);resolve();};
      transaction.onabort=()=>{clearTimeout(timer);reject(transaction.error);};
      transaction.onerror=()=>{clearTimeout(timer);reject(transaction.error);};
    });
  } finally { db.close(); }
}

export async function readMomentPhotos(key:string):Promise<File[]> {
  if(memory.has(key))return memory.get(key)!;
  const db=await database();
  try {
    const saved=await new Promise<{files:File[];expiresAt:number}|undefined>((resolve,reject)=>{
      const request=db.transaction(STORE).objectStore(STORE).get(key);
      const timer=setTimeout(()=>reject(new Error('Photo draft could not be restored.')),5000);
      request.onsuccess=()=>{clearTimeout(timer);resolve(request.result);};
      request.onerror=()=>{clearTimeout(timer);reject(request.error);};
    });
    if(!saved)return [];
    if(saved.expiresAt<=Date.now()){void saveMomentPhotos(key,[]).catch(()=>{});return [];}
    // Rebuild File metadata even when storage returns a plain Blob, keeping
    // upload validation and filenames available after a reload.
    const files=saved.files.filter(file=>file instanceof Blob).slice(0,10).map((file,index)=>
      new File([file],file.name||`moment-${index+1}.${file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg'}`,{type:file.type,lastModified:file.lastModified||Date.now()}));
    memory.set(key,files);
    return files;
  } finally { db.close(); }
}

// Mobile providers sometimes report an empty or generic MIME type. Inspect
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
  if(!type&&ascii(4,8)==='ftyp'){
    const brands=[];
    for(let offset=8;offset<Math.min(head.length,64);offset+=4)if(offset!==12)brands.push(ascii(offset,offset+4));
    if(!brands.includes('avif')&&brands.some(brand=>['heic','heix','hevc','hevx','mif1','msf1'].includes(brand)))
      return convertIphonePhoto(new File([bytes],file.name,{type:'image/heic',lastModified:file.lastModified}));
  }
  if(!type)throw new Error(`${file.name} is not a readable photo. Choose JPG, PNG, WebP or an iPhone HEIC photo.`);
  return new File([bytes],file.name,{type,lastModified:file.lastModified});
}

export async function convertIphonePhoto(file:File):Promise<File> {
  const url=URL.createObjectURL(file);
  const photo=new Image();
  const canvas=document.createElement('canvas');
  try {
    await new Promise<void>((resolve,reject)=>{
      const timer=setTimeout(()=>{photo.src='';reject(new Error('The iPhone photo took too long to open. Save a JPEG copy and select it again.'));},15000);
      photo.onload=()=>{clearTimeout(timer);resolve();};
      photo.onerror=()=>{clearTimeout(timer);reject(new Error('This browser cannot open HEIC photos. Select a JPEG copy from Photos or use an updated Safari.'));};
      photo.src=url;
    });
    if(!photo.naturalWidth||!photo.naturalHeight)throw new Error('This iPhone photo could not be read. Choose another photo.');
    const scale=Math.min(1,2048/Math.max(photo.naturalWidth,photo.naturalHeight));
    canvas.width=Math.max(1,Math.round(photo.naturalWidth*scale));
    canvas.height=Math.max(1,Math.round(photo.naturalHeight*scale));
    const context=canvas.getContext('2d');
    if(!context)throw new Error('Photo conversion is unavailable. Select a JPEG copy.');
    context.drawImage(photo,0,0,canvas.width,canvas.height);
    const jpeg=await new Promise<Blob>((resolve,reject)=>{
      canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not convert this iPhone photo. Select a JPEG copy.')),'image/jpeg',0.88);
    });
    if(jpeg.size>8*1024*1024)throw new Error('The converted photo is larger than 8 MB. Select a smaller photo.');
    return new File([jpeg],file.name.replace(/\.[^.]+$/,'')+'.jpg',{type:'image/jpeg',lastModified:file.lastModified});
  } finally { photo.onload=null;photo.onerror=null;URL.revokeObjectURL(url);canvas.width=0;canvas.height=0; }
}
