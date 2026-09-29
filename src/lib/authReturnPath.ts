// Accept only local routes; never allow an authentication link to redirect off-site.
export function authReturnPath(value:string|null, fallback="/profile/me") {
 if(!value?.startsWith('/')||value.startsWith('//')||value.includes('\\')||[...value].some(char=>char.charCodeAt(0)<32))return fallback;
 try{const url=new URL(value,'https://possara.invalid');return url.origin==='https://possara.invalid'?url.pathname+url.search+url.hash:fallback;}catch{return fallback;}
}
