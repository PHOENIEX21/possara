import assert from 'node:assert/strict';
const day=86400000;const originalNow=Date.now;let clock=1900000000000;Date.now=()=>clock;
let run=0;
async function environment({stored={},standalone=false,ios=false,blockedStorage=false}={}){
 const values=new Map(Object.entries(stored));const media=new Map();const timers=[];const win=new EventTarget();
 win.matchMedia=query=>{if(!media.has(query)){const eventTarget=new EventTarget();eventTarget.matches=standalone&&query.includes('standalone');media.set(query,eventTarget);}return media.get(query);};
 win.setTimeout=callback=>{timers.push(callback);return timers.length;};
 Object.defineProperty(globalThis,'window',{configurable:true,value:win});
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{userAgent:ios?'iPhone Safari':'Chrome',platform:ios?'iPhone':'Linux',maxTouchPoints:0}});
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>{if(blockedStorage)throw Error('Disabled');return values.get(key)??null;},setItem:(key,value)=>{if(blockedStorage)throw Error('Disabled');values.set(key,value);}}});
 const module=await import(`../src/store/install.ts?scenario=${++run}`);module.initializeInstall();
 function offer(outcome='dismissed'){const event=new Event('beforeinstallprompt',{cancelable:true});event.prompt=async()=>{};event.userChoice=Promise.resolve({outcome});win.dispatchEvent(event);return event;}
 return {...module,values,win,media,timers,offer};
}
try{
 let e=await environment();e.offer();assert.equal(e.useInstall.getState().visible,true);e.dismissInstall();assert.equal(Number(e.values.get('possara-install-dismissed-until')),clock+21*day);e.offer();assert.equal(e.useInstall.getState().visible,false);
 clock+=20*day;e.offer();assert.equal(e.useInstall.getState().visible,false);clock+=day+1;e.offer();assert.equal(e.useInstall.getState().visible,true);
 e=await environment();e.offer('accepted');await e.installApp();assert.equal(e.useInstall.getState().installed,false,'acceptance is not proof of installation');assert.equal(e.useInstall.getState().visible,false);assert.equal(e.useInstall.getState().event,null);assert.equal(Number(e.values.get('possara-install-dismissed-until')),clock+21*day);
 e.win.dispatchEvent(new Event('appinstalled'));assert.equal(e.useInstall.getState().installed,true);assert.equal(e.values.get('possara-installed'),'yes');e.offer();assert.equal(e.useInstall.getState().visible,false);
 clock+=22*day;assert.equal(e.useInstall.getState().installed,true,'time alone never forgets a confirmed install');e.offer();assert.equal(e.useInstall.getState().visible,true,'new native eligibility permits reinstall after cooldown');
 e=await environment({standalone:true});e.offer();assert.equal(e.useInstall.getState().installed,true);assert.equal(e.useInstall.getState().visible,false);
 e=await environment({stored:{'possara-installed':'yes'}});e.offer();assert.equal(e.useInstall.getState().visible,false);assert.equal(Number(e.values.get('possara-installed-at')),clock,'legacy records receive a quiet migration');
 e=await environment({ios:true});e.timers.forEach(callback=>callback());assert.equal(e.useInstall.getState().visible,true);e.markInstalled();clock+=22*day;e.timers.forEach(callback=>callback());assert.equal(e.useInstall.getState().visible,false,'iOS confirmed installation is not forgotten by a timer');
 e=await environment({blockedStorage:true});e.offer();e.dismissInstall();e.offer();assert.equal(e.useInstall.getState().visible,false,'in-memory suppression still works');
 e=await environment();e.offer();const storage=new Event('storage');storage.key='possara-installed';storage.newValue='yes';e.win.dispatchEvent(storage);assert.equal(e.useInstall.getState().installed,true);assert.equal(e.useInstall.getState().visible,false);assert.equal(e.values.size,0,'storage synchronization never writes back');
 console.log('PASS: 21-day dismissal, acceptance versus confirmed installation, installed-app suppression, legacy records, reinstall eligibility, iOS, blocked storage and cross-tab synchronization.');
}finally{Date.now=originalNow;}
