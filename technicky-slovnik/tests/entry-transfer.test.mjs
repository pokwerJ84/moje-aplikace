import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../site/entry-transfer.js',import.meta.url),'utf8');
const {wordToManual,manualToWord,transferLocal,hydrateTransferredWord}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const word={id:'entry',ja:'denatsu',en:'Voltage',cs:'Napětí',description_ja:'JP',description_en:'EN',description_cs:'CZ',image_data:'data:image/jpeg;base64,AAAA'};
const manual={id:'instrument',ja:'sukana',en:'Scanner',model:'KEYENCE VR3000',kind:'instrument',description:'How to use it',steps:[{id:'s1',title:'Start',text:'Instructions'},{id:'s2',title:'Measure',text:'More instructions'}],photos:[{id:'cover',path:'owner/cover.jpg',caption:'Main',cover:true},{id:'step',path:'owner/step.jpg',caption:'Step photo',stepId:'s1'}]};
test('word round-trip retains three languages, all descriptions and photo',()=>{
  const moved=wordToManual(word),back=manualToWord(moved);
  for(const key of ['id','ja','en','cs','description_ja','description_en','description_cs','image_data'])assert.equal(back[key],word[key]);
  assert.equal(moved.photos[0].cover,true);assert.equal(moved.photos[0].data,word.image_data);
});
test('instrument round-trip retains model, every step and every photo',()=>{
  const moved=manualToWord(manual),back=wordToManual(moved);
  for(const key of ['id','ja','en','model','kind','description','steps'])assert.deepEqual(back[key],manual[key]);
  assert.deepEqual(back.photos,manual.photos.map(p=>({...p,cover:!!p.cover})));
  assert.equal(moved.image_path,'owner/cover.jpg');assert.equal(back.word_data.manual_data,undefined);
});
test('photo changed in vocabulary becomes new cover without losing archived step photos',()=>{
  const moved=manualToWord(manual);moved.image_path='owner/new.jpg';
  const back=wordToManual(moved);assert.equal(back.photos.length,3);
  assert.equal(back.photos.find(p=>p.cover).path,'owner/new.jpg');assert(back.photos.some(p=>p.path==='owner/step.jpg'));
});
test('model-only manual and Czech-only word can be moved',()=>{
  assert.equal(manualToWord({...manual,ja:'',en:''}).en,'KEYENCE VR3000');
  assert.equal(wordToManual({...word,ja:'',en:''}).en,'Napětí');
});
test('a locally archived photo is restored when loading a transferred word',()=>{
  const w=manualToWord({...manual,photos:[{id:'p',data:word.image_data,cover:true}]});
  delete w.image_data;assert.equal(hydrateTransferredWord(w).image_data,word.image_data);
});
function storage(){const data=new Map([['words',JSON.stringify([word])],['manuals','[]']]);return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}
test('local move in both directions removes the source, never duplicates',()=>{
  const s=storage();const args={storage:s,wordKey:'words',manualKey:'manuals'};
  const first=transferLocal({...args,source:'word',entry:word,words:[word],manuals:[]});
  assert.equal(first.words.length,0);assert.equal(first.manuals.length,1);
  const back=transferLocal({...args,source:'manual',entry:first.entry,words:first.words,manuals:first.manuals});
  assert.equal(back.words.length,1);assert.equal(back.manuals.length,0);assert.equal(back.words[0].image_data,word.image_data);
});
test('local destination or source write failures retain source data',()=>{
  for(const failingKey of ['manuals','words']){
    const s=storage(),write=s.setItem;let failed=false;
    s.setItem=(key,value)=>{if(key===failingKey&&!failed){failed=true;throw new Error('quota');}write(key,value);};
    assert.throws(()=>transferLocal({storage:s,wordKey:'words',manualKey:'manuals',source:'word',entry:word,words:[word],manuals:[]}),/quota/);
    assert.deepEqual(JSON.parse(s.getItem('words')),[word]);assert.deepEqual(JSON.parse(s.getItem('manuals')),[]);
  }
});
test('ID collision is not overwritten and does not delete source',()=>{
  const s=storage();assert.throws(()=>transferLocal({storage:s,wordKey:'words',manualKey:'manuals',source:'word',entry:word,words:[word],manuals:[{id:word.id}]}),/already exists/);
  assert.deepEqual(JSON.parse(s.getItem('words')),[word]);
});
