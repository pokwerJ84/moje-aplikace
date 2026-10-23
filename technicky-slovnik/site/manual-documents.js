export const PDF_LIMIT=20*1024*1024;
export async function validatePDF(file){
  if(!file.size||file.size>PDF_LIMIT||(!/\.pdf$/i.test(file.name||'')&&file.type!=='application/pdf'))throw new Error('pdfInvalid');
  const header=new Uint8Array(await file.slice(0,5).arrayBuffer());
  if(String.fromCharCode(...header)!=='%PDF-')throw new Error('pdfInvalid');
}
export async function pdfDraft(file){
  await validatePDF(file);
  const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(new Blob([file],{type:'application/pdf'}));});
  return {id:crypto.randomUUID(),name:file.name||'manual.pdf',size:file.size,data};
}
export async function uploadDocuments(supabase,user,documents,uploaded){
  const saved=[];
  for(const document of documents||[]){
    if(!document.data){saved.push(document);continue;}
    if(!document.data.startsWith('data:application/pdf;base64,'))throw new Error('pdfInvalid');
    const blob=await(await fetch(document.data)).blob();
    await validatePDF(Object.assign(blob,{name:document.name}));
    const path=`${user.id}/${crypto.randomUUID()}.pdf`;
    const {error}=await supabase.storage.from('dictionary-documents').upload(path,blob,{contentType:'application/pdf',upsert:false});
    if(error)throw error;
    uploaded.push({bucket:'dictionary-documents',path});
    saved.push({id:document.id,name:document.name,size:blob.size,path});
  }
  return saved;
}
export async function openDocument(supabase,document,{open=()=>window.open('about:blank','_blank'),createURL=blob=>URL.createObjectURL(blob),revokeURL=url=>URL.revokeObjectURL(url)}={}){
  const tab=open();if(!tab)throw new Error('pdfPopup');
  tab.opener=null;
  try{
    let url;
    if(document.data){
      if(!document.data.startsWith('data:application/pdf;base64,'))throw new Error('pdfInvalid');
      url=createURL(await(await fetch(document.data)).blob());
      setTimeout(()=>revokeURL(url),60000)?.unref?.();
    }else{
      const {data,error}=await supabase.storage.from('dictionary-documents').createSignedUrl(document.path,3600);
      if(error)throw error;url=data.signedUrl;
    }
    tab.location.replace(url);
  }catch(error){tab.close();throw error;}
}
export function removedDocumentPaths(previous,next){
  return (previous||[]).map(d=>d.path).filter(path=>path&&!(next||[]).some(d=>d.path===path));
}
