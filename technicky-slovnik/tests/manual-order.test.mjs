import test from 'node:test';
import assert from 'node:assert/strict';
import {orderedManuals,reorderManuals,saveManualOrder} from '../site/manual-order.js';
const rows=[{id:'a',steps:[{text:'step'}],photos:[{path:'private/photo.jpg'}],documents:[{path:'private/manual.pdf'}]},{id:'b',word_data:{audio_path:'private/audio.m4a'}}];
test('saved order loads with unranked new instruments appended and old cards stable',()=>{
  assert.deepEqual(orderedManuals(rows),rows);
  assert.deepEqual(orderedManuals([{id:'new'}, {id:'a',sort_order:1},{id:'b',sort_order:0}]).map(r=>r.id),['b','a','new']);
});
test('reordering changes only order and retains steps, photos, PDF and audio',()=>{
  const reordered=reorderManuals(rows,['b','a']);
  assert.deepEqual(reordered.map(r=>r.id),['b','a']);assert.equal(reordered[0].sort_order,0);
  assert.deepEqual(reordered[1].documents,rows[0].documents);assert.deepEqual(reordered[1].photos,rows[0].photos);assert.deepEqual(reordered[1].steps,rows[0].steps);
  assert.deepEqual(reordered[0].word_data,rows[1].word_data);assert.equal(rows[0].sort_order,undefined);
});
test('missing, duplicate or foreign IDs cannot overwrite the collection',()=>{
  for(const ids of [['a'],['a','a'],['a','foreign']])assert.throws(()=>reorderManuals(rows,ids),/Invalid manual order/);
});
test('local persistence failure leaves original order and records untouched',async()=>{
  await assert.rejects(saveManualOrder({rows,ids:['b','a'],store:()=>{throw new Error('quota');}}),/quota/);
  assert.deepEqual(rows.map(r=>r.id),['a','b']);assert.equal(rows[0].sort_order,undefined);
});
test('cloud saves with one RPC and does not mutate source on failure',async()=>{
  const calls=[];const supabase={rpc:async(name,args)=>{calls.push({name,args});return {error:new Error('offline')};}};
  await assert.rejects(saveManualOrder({supabase,user:{id:'owner'},rows,ids:['b','a']}),/offline/);
  assert.deepEqual(calls,[{name:'dictionary_reorder_manuals',args:{p_ids:['b','a']}}]);assert.equal(rows[0].sort_order,undefined);
  supabase.rpc=async()=>({error:null});const result=await saveManualOrder({supabase,user:{id:'owner'},rows,ids:['b','a']});assert.equal(result[0].id,'b');
});
