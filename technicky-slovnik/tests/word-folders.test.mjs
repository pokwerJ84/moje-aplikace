import test from 'node:test';
import assert from 'node:assert/strict';
import {wordFolder,wordKey,folderWords} from '../site/word-folders.js';
import {wordToManual,manualToWord} from '../site/entry-transfer.js';
import {saveWordWithPhoto} from '../site/word-photo.js';
const word={id:'1',ja:'denatsu',en:'Voltage',cs:'Napětí'};
test('existing words stay in Words and personal words have separate search and identity',()=>{
  const personal={...word,id:'2',folder:'personal'};
  assert.equal(wordFolder(word),'words');assert.notEqual(wordKey(word),wordKey(personal));
  assert.deepEqual(folderWords([word,personal],'personal','VOLT'),[personal]);
  assert.deepEqual(folderWords([word,personal],'words','denatsu'),[word]);
  assert.deepEqual(folderWords([personal],'words'),[]);
});
test('personal folder saves locally and survives instrument transfer',async()=>{
  const personal={...word,folder:'personal'};
  const saved=await saveWordWithPhoto({row:personal,photo:{changed:false},list:[],saveLocalWords:()=>true});
  assert.equal(saved[0].folder,'personal');
  assert.equal(manualToWord(wordToManual(personal)).folder,'personal');
});
