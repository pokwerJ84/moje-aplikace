import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../site/word-photo.js',import.meta.url),'utf8');
const {saveWordWithPhoto,initWordPhoto}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const image='data:image/jpeg;base64,AAAA';
const base={id:'word',ja:'',en:'Bearing',cs:''};
function cloud({dbError=false,uploadError=false}={}){
  const calls=[];let payload;
  const api={storage:{from:()=>({
    upload:async(path,blob,options)=>{calls.push(['upload',path,options]);assert.equal(blob.type,'image/jpeg');return {error:uploadError?new Error('upload failed'):null};},
    remove:async paths=>{calls.push(['remove',paths]);return {};}
  })},from:()=>({
    insert(row){payload=row;calls.push(['insert',row]);return this;},
    update(row){payload=row;calls.push(['update',row]);return this;},
    eq(){return this;},select(){return this;},
    async single(){return {data:{...base,image_path:'old.jpg',...payload},error:dbError?new Error('database failed'):null};}
  })};
  return {api,calls};
}
test('guest: photo and word are stored together, failed storage does not mutate list',async()=>{
  let persisted;const list=[];
  const next=await saveWordWithPhoto({row:base,photo:{changed:true,data:image},list,saveLocalWords:rows=>{persisted=rows;return true;}});
  assert.equal(next[0].image_data,image);assert.deepEqual(next,persisted);assert.equal(list.length,0);
  await assert.rejects(saveWordWithPhoto({row:base,photo:{changed:true,data:image},list,saveLocalWords:()=>false}),/local-save-failed/);
  assert.equal(list.length,0);
});
test('guest edit preserves the image unless explicitly changed or removed',async()=>{
  const previous={...base,image_data:image};
  const args={row:{...base,ja:'jikuuke'},previous,list:[previous],saveLocalWords:()=>true};
  const next=await saveWordWithPhoto({...args,photo:{changed:false,data:null}});
  assert.equal(next.length,1);assert.equal(next[0].image_data,image);
  const removed=await saveWordWithPhoto({...args,photo:{changed:true,data:null}});
  assert.equal(removed[0].image_data,null);
});
test('cloud: upload then insert word with a private owner-prefixed path',async()=>{
  const {api,calls}=cloud();
  const next=await saveWordWithPhoto({supabase:api,user:{id:'owner'},row:base,photo:{changed:true,data:image},list:[]});
  assert.deepEqual(calls.map(c=>c[0]),['upload','insert']);assert.match(next[0].image_path,/^owner\/word-.+\.jpg$/);
  assert.equal(next[0].image_data,image);assert.equal(calls[1][1].image_data,undefined);
  assert.equal(calls[0][2].upsert,false);
});
test('cloud: database failure cleans only the new upload, preserves original',async()=>{
  const {api,calls}=cloud({dbError:true});const previous={...base,image_path:'owner/old.jpg'};
  await assert.rejects(saveWordWithPhoto({supabase:api,user:{id:'owner'},row:base,previous,photo:{changed:true,data:image},list:[previous]}),/database failed/);
  assert.deepEqual(calls.map(c=>c[0]),['upload','update','remove']);
  assert.notEqual(calls[2][1][0],previous.image_path);assert.equal(previous.image_path,'owner/old.jpg');
});
test('cloud: upload failure does not save word or remove previous photo',async()=>{
  const {api,calls}=cloud({uploadError:true});const previous={...base,image_path:'owner/old.jpg'};
  await assert.rejects(saveWordWithPhoto({supabase:api,user:{id:'owner'},row:base,previous,photo:{changed:true,data:image},list:[previous]}),/upload failed/);
  assert(!calls.some(c=>c[0]==='update'||c[0]==='insert'));
  assert(!calls.some(c=>c[0]==='remove'&&c[1].includes(previous.image_path)));
});
test('cloud: replacement and removal clean old photo only after successful update',async()=>{
  for(const data of [image,null]){
    const {api,calls}=cloud();const previous={...base,image_path:'owner/old.jpg'};
    const next=await saveWordWithPhoto({supabase:api,user:{id:'owner'},row:base,previous,photo:{changed:true,data},list:[previous]});
    assert.equal(next.length,1);assert.equal(calls.at(-1)[0],'remove');assert.deepEqual(calls.at(-1)[1],[previous.image_path]);
    assert(calls.findIndex(c=>c[0]==='update')<calls.findIndex(c=>c[0]==='remove'));
    if(data===null)assert.equal(next[0].image_path,null);
  }
});
test('cloud: unchanged edit neither uploads nor removes any photo',async()=>{
  const {api,calls}=cloud();const previous={...base,image_path:'old.jpg',image_data:image};
  const next=await saveWordWithPhoto({supabase:api,user:{id:'owner'},row:base,previous,photo:{changed:false,data:null},list:[previous]});
  assert.deepEqual(calls.map(c=>c[0]),['update']);assert.equal(next[0].image_data,image);
});
test('cloud: replacing a word photo keeps photos archived from a moved instrument',async()=>{
  const {api,calls}=cloud();const previous={...base,image_path:'owner/cover.jpg',manual_data:{photos:[{path:'owner/cover.jpg',cover:true},{path:'owner/step.jpg',stepId:'s1'}]}};
  await saveWordWithPhoto({supabase:api,user:{id:'owner'},row:base,previous,photo:{changed:true,data:image},list:[previous]});
  assert(!calls.some(c=>c[0]==='remove'));
});
test('draft controls: camera, preview, removal, reset, file validation and stale preview',async()=>{
  const elements=new Map();
  function $(selector){
    if(!elements.has(selector))elements.set(selector,{handlers:{},disabled:false,clicks:0,click(){this.clicks++;},
      classList:{hidden:true,toggle(_name,value){this.hidden=value;}},removeAttribute(name){delete this[name];},
      addEventListener(name,handler){this.handlers[name]=handler;}});
    return elements.get(selector);
  }
  const messages=[];let finish;
  const supabase={storage:{from:()=>({createSignedUrl:()=>new Promise(resolve=>finish=resolve)})}};
  const originalDocument=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>({drawImage(){}}),toDataURL:()=>image})};
  try {
    const draft=initWordPhoto({supabase,$,t:k=>k,decodePhoto:async()=>({width:3200,height:1600}),setMessage:(_el,message)=>messages.push(message)});
    await draft.reset();$('#word-take-photo').handlers.click();assert.equal($('#word-camera-input').clicks,1);
    $('#word-pick-photo').handlers.click();assert.equal($('#word-photo-input').clicks,1);
    const file={size:100,type:'image/jpeg'};await draft.select(file);
    assert.deepEqual(draft.value(),{changed:true,data:image});assert.equal($('#word-photo-image').src,image);
    assert.equal($('#word-photo-preview').classList.hidden,false);
    draft.setBusy(true);let cancelled=false;$('#word-dialog').handlers.cancel({preventDefault(){cancelled=true;}});assert(cancelled);
    assert.equal($('#word-form [type=submit]').disabled,true);draft.setBusy(false);
    await draft.select({size:10,type:'application/pdf'});assert.equal(messages.at(-1),'photoError');assert.equal(draft.value().data,image);
    $('#word-remove-photo').handlers.click();assert.deepEqual(draft.value(),{changed:true,data:null});
    const pending=draft.reset({image_path:'old.jpg'});await draft.select(file);finish({data:{signedUrl:'https://example.com/old.jpg'}});await pending;
    assert.equal($('#word-photo-image').src,image);
    await draft.reset();assert.deepEqual(draft.value(),{changed:false,data:null});assert.equal($('#word-photo-preview').classList.hidden,true);
  } finally {globalThis.document=originalDocument;}
});
