import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePDF,uploadDocuments,openDocument,removedDocumentPaths,PDF_LIMIT} from '../site/manual-documents.js';
import {wordToManual,manualToWord} from '../site/entry-transfer.js';
const data='data:application/pdf;base64,'+Buffer.from('%PDF-1.7\n%%EOF').toString('base64');
const document={id:'pdf1',name:'Manual 日本語.pdf',size:14,data};
test('validates PDF contents and size, rejects renamed non-PDF or oversized files',async()=>{
  const pdf=Object.assign(new Blob(['%PDF-1.7\n%%EOF'],{type:'application/pdf'}),{name:'manual.pdf'});
  await validatePDF(pdf);
  for(const file of [Object.assign(new Blob(['not a PDF']),{name:'manual.pdf'}),{size:PDF_LIMIT+1,name:'large.pdf'},{size:0,name:'empty.pdf'}])await assert.rejects(validatePDF(file),/pdfInvalid/);
});
test('upload creates a private owner path, keeps filename and strips local file data',async()=>{
  const uploaded=[];
  const supabase={storage:{from:bucket=>({upload:async(path,blob,options)=>{
    assert.equal(bucket,'dictionary-documents');assert.match(path,/^owner\/.+\.pdf$/);
    assert.equal(blob.type,'application/pdf');assert.equal(options.contentType,'application/pdf');assert.equal(options.upsert,false);return {};
  }})}};
  const result=await uploadDocuments(supabase,{id:'owner'},[document],uploaded);
  assert.equal(result[0].name,document.name);assert(!result[0].data);assert.equal(uploaded[0].path,result[0].path);
  assert.equal(document.data,data);
});
test('upload failure leaves source and previous attachments untouched',async()=>{
  const saved={id:'old',path:'owner/old.pdf',name:'old.pdf'},uploaded=[];
  const supabase={storage:{from:()=>({upload:async()=>({error:new Error('upload failed')})})}};
  await assert.rejects(uploadDocuments(supabase,{id:'owner'},[saved,document],uploaded),/upload failed/);
  assert.equal(saved.path,'owner/old.pdf');assert.equal(document.data,data);assert.deepEqual(uploaded,[]);
  assert.deepEqual(removedDocumentPaths([saved],[saved]),[]);
});
test('only removed attachments are selected for deletion',()=>{
  assert.deepEqual(removedDocumentPaths([{path:'owner/old.pdf'},{path:'owner/keep.pdf'},document],[{path:'owner/keep.pdf'}]),['owner/old.pdf']);
});
test('cloud PDF opens signed URL in the reserved tab and closes it on failure',async()=>{
  let opened,closed=false;const tab={opener:'parent',location:{replace:url=>opened=url},close:()=>closed=true};
  const supabase={storage:{from:bucket=>({createSignedUrl:async(path)=>{
    assert.equal(bucket,'dictionary-documents');assert.equal(path,'owner/manual.pdf');return {data:{signedUrl:'https://example.com/private.pdf?token=secret'}};
  }})}};
  await openDocument(supabase,{path:'owner/manual.pdf'},{open:()=>tab});
  assert.equal(tab.opener,null);assert.equal(opened,'https://example.com/private.pdf?token=secret');assert.equal(closed,false);
  await assert.rejects(openDocument(null,{data:'data:text/html,unsafe'},{open:()=>tab}),/pdfInvalid/);assert.equal(closed,true);
  await assert.rejects(openDocument(supabase,document,{open:()=>null}),/pdfPopup/);
});
test('local PDF opens a blob URL rather than an inline data navigation',async()=>{
  let target;const tab={location:{replace:url=>target=url},close(){}};
  await openDocument(null,document,{open:()=>tab,createURL:blob=>{assert.equal(blob.type,'application/pdf');return 'blob:test';},revokeURL(){}});
  assert.equal(target,'blob:test');
});
test('manual PDF references and local files survive both transfer directions',()=>{
  const manual={id:'device',ja:'sukana',en:'Scanner',model:'VR3000',kind:'instrument',description:'',photos:[],steps:[],documents:[document,{id:'pdf2',name:'cloud.pdf',path:'owner/cloud.pdf'}]};
  const word=manualToWord(manual);const restored=wordToManual(word);
  assert.deepEqual(restored.documents,manual.documents);assert.deepEqual(word.manual_data.documents,manual.documents);
});
