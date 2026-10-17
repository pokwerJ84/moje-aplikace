import test from 'node:test';
import assert from 'node:assert/strict';
import {audioFormat, recordingURL} from '../site/word-audio.js';
import {saveWordWithPhoto} from '../site/word-photo.js';
import {wordToManual,manualToWord} from '../site/entry-transfer.js';

const data='data:audio/mp4;base64,AAAA';
const previous={id:'word',ja:'denatsu',en:'Voltage',audio_path:'owner/old.m4a'};
function cloud(dbError=false,uploadError=false){
  const calls=[];let payload;
  return {calls,api:{storage:{from:bucket=>({
    upload:async(path,blob,options)=>{calls.push(['upload',bucket,path]);assert.equal(blob.type,'audio/mp4');assert.equal(options.upsert,false);return {error:uploadError?new Error('upload failed'):null};},
    remove:async paths=>{calls.push(['remove',bucket,paths]);return {};}
  })},from:()=>({update(row){payload=row;calls.push(['update']);return this;},eq(){return this;},select(){return this;},async single(){return {data:{...previous,...payload},error:dbError?new Error('database failed'):null};}})}};
}
test('audio accepts iPhone M4A and rejects empty, oversized or non-audio files',()=>{
  assert.deepEqual(audioFormat({name:'voice.m4a',type:'',size:10}),{mime:'audio/mp4',ext:'m4a'});
  for(const file of [{type:'audio/mp4',size:0},{type:'audio/mp4',size:10485761},{type:'image/jpeg',size:10}])assert.throws(()=>audioFormat(file),/audioInvalid/);
});
test('audio replacement cleans old recording only after successful database save',async()=>{
  const {api,calls}=cloud();
  const next=await saveWordWithPhoto({supabase:api,user:{id:'owner'},row:{id:'word',ja:'denatsu',en:'Voltage'},previous,photo:{changed:false},audio:{changed:true,data,mime:'audio/mp4',ext:'m4a'},list:[previous]});
  assert.deepEqual(calls.map(c=>c[0]),['upload','update','remove']);
  assert.match(next[0].audio_path,/^owner\/word-.+\.m4a$/);
  assert.deepEqual(calls.at(-1)[2],['owner/old.m4a']);
});
test('failed audio save preserves original and cleans only the new upload',async()=>{
  for(const uploadError of [false,true]){
    const {api,calls}=cloud(true,uploadError);
    await assert.rejects(saveWordWithPhoto({supabase:api,user:{id:'owner'},row:{id:'word'},previous,photo:{changed:false},audio:{changed:true,data,mime:'audio/mp4',ext:'m4a'},list:[previous]}),/failed/);
    assert(!calls.some(c=>c[0]==='remove'&&c[2].includes(previous.audio_path)));
    assert.equal(previous.audio_path,'owner/old.m4a');
  }
});
test('guest recordings save with word and survive moves in both directions',async()=>{
  let stored;
  const next=await saveWordWithPhoto({row:{id:'local',en:'Voltage'},photo:{changed:false},audio:{changed:true,data},list:[],saveLocalWords:rows=>{stored=rows;return true;}});
  assert.equal(stored[0].audio_data,data);
  assert.equal(manualToWord(wordToManual(next[0])).audio_data,data);
  assert.equal(manualToWord(wordToManual(previous)).audio_path,previous.audio_path);
});
test('playback uses local data or a signed private URL',async()=>{
  assert.equal(await recordingURL(null,{audio_data:data}),data);
  const api={storage:{from:bucket=>({createSignedUrl:async(path,ttl)=>{assert.equal(bucket,'dictionary-audio');assert.equal(path,previous.audio_path);assert.equal(ttl,3600);return {data:{signedUrl:'https://example.com/signed'}};}})}};
  assert.equal(await recordingURL(api,previous),'https://example.com/signed');
});
