/* GitHub Pages snapshot adapter: no requests to localhost or company servers. */
(()=>{'use strict';
const base=new URL('.',document.baseURI),nativeFetch=window.fetch.bind(window),memo=new Map(),sources=['egostandard','egofinger0909','abc130k'];
async function json(path){if(!memo.has(path))memo.set(path,(async()=>{const r=await nativeFetch(new URL(path,base));if(!r.ok)throw Error('静态数据读取失败 '+r.status+' '+path);if(path.endsWith('.gz')){if(!window.DecompressionStream)throw Error('请使用支持 gzip 解压的现代浏览器');return new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).json()}return r.json()})().catch(e=>{memo.delete(path);throw e}));return memo.get(path)}
let indexPromise;
async function index(){if(!indexPromise)indexPromise=nativeFetch(new URL('data/unit-index.bin',base)).then(r=>{if(!r.ok)throw Error('记录索引读取失败');return r.arrayBuffer()}).then(b=>new DataView(b)).catch(e=>{indexPromise=null;throw e});return indexPromise}
async function record(id){const bucket='data/records/'+Math.floor(id/10000)+'.json.gz';const shard=await json(bucket),r=shard[id];if(!r)return null;const labels=await json('data/labels.json.gz');return {id,source:sources[r[0]],episode:r[1],annotation:r[2],kind:r[3]?'subtask':'episode',start_s:r[4],end_s:r[5],duration:r[6],text:r[7],tags:labels[r[8]],label_origin:'Existing weak metadata / rules; frozen public snapshot'};}
async function records(q){const [v,labels]=await Promise.all([index(),json('data/labels.json.gz')]);const src=q.get('source')||'all',kind=q.get('kind')||'all',dim=q.get('dimension'),label=q.get('label'),action=q.get('action'),phrase=q.get('phrase');const offset=Number(q.get('offset')||0);let allowed=null,pairs=null;
if(dim||action){allowed=new Set();for(const [sid,tags]of Object.entries(labels))if((!dim||(tags[dim]||[]).includes(label))&&(!action||(tags.actions||[]).includes(action)))allowed.add(Number(sid))}
if(phrase){const all=await json('data/phrase-members.json.gz');pairs=new Set((all[phrase]||[]).map(x=>x[0]+':'+x[1]))}
let matched=0,ids=[];for(let pos=0;pos<v.byteLength;pos+=16){const source=v.getUint8(pos+4),isSub=v.getUint8(pos+5),sid=v.getUint32(pos+8,true),tid=v.getUint32(pos+12,true);if(src!=='all'&&sources[source]!==src)continue;if(kind!=='all'&&(isSub?'subtask':'episode')!==kind)continue;if(allowed&&!allowed.has(sid))continue;if(pairs&&!pairs.has(tid+':'+sid))continue;if(matched++>=offset)ids.push(v.getUint32(pos,true));if(ids.length===50)break;if(pos%1600000===0)await new Promise(resolve=>setTimeout(resolve,0))}
const result=await Promise.all(ids.map(record));for(const key of memo.keys())if(key.startsWith('data/records/')&&memo.size>16)memo.delete(key);return {records:result,offset,limit:50};}
window.staticReviewFrame=id=>new URL('review-images/'+id+'.jpg',base).href;
window.staticFrameURL=id=>window.PUBLIC_FRAME_IDS?.includes(id)?new URL('review-images/'+id+'.jpg',base).href:null;
window.fetch=async(input,options)=>{const raw=typeof input==='string'?input:input.url;const u=new URL(raw,base);if(u.origin!==base.origin)return nativeFetch(input,options);let p=u.pathname.startsWith(base.pathname)?u.pathname.slice(base.pathname.length):u.pathname.replace(/^\//,'');p=p.replace(/^\//,'');const q=u.searchParams;
try{let value;if(p==='api/build')value={ready:true,cache_files:{},build:{stage:'frozen_public_snapshot'}};
else if(p==='api/gemma')value=await json('data/gemma-status.json');
else if(p==='api/words')value=await json(`data/words-${q.get('source')||'all'}-${q.get('kind')||'all'}.json.gz`);
else if(p==='api/summary')value=await json(`data/summary-${q.get('source')}-${q.get('kind')}.json.gz`);
else if(p==='api/record')value=await record(Number(q.get('id')));
else if(p==='api/records')value=await records(q);
else if(p==='data/labels.json')value=await json('data/labels.json.gz');
else if(p==='review-data.json')value=await json('review-data.json.gz');
else return nativeFetch(new URL(p+u.search,base),options);
return new Response(JSON.stringify(value),{status:200,headers:{'Content-Type':'application/json'}});
}catch(e){return new Response(JSON.stringify({error:e.message}),{status:503,headers:{'Content-Type':'application/json'}})}};
})();
