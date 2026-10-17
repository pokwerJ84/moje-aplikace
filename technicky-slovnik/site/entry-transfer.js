// The same ID follows an entry between sections. Backup fields are never nested.
export function wordToManual(word){
  const backup=word.manual_data||{};
  const photos=structuredClone(backup.photos||[]);
  const matching=p=>(word.image_path&&p.path===word.image_path)||(word.image_data&&p.data===word.image_data);
  if(word.image_path||word.image_data){
    photos.forEach(p=>p.cover=!!matching(p));
    if(!photos.some(matching))photos.push({id:'cover-'+word.id,path:word.image_path||null,data:word.image_path?null:word.image_data,caption:'',cover:true,stepId:null});
  }
  const description=[word.description_en,word.description_ja?'日本語: '+word.description_ja:'',word.description_cs?'Česky: '+word.description_cs:''].filter(Boolean).join('\n\n');
  const word_data={};for(const name of ['id','ja','en','cs','description_ja','description_en','description_cs','audio_path','audio_data'])word_data[name]=word[name]||'';
  return {id:word.id,kind:backup.kind||'instrument',ja:word.ja||'',en:word.en||(!word.ja?word.cs:'')||'',model:backup.model||'',description:backup.description??description,steps:structuredClone(backup.steps||[]),photos,word_data};
}
export function manualToWord(manual){
  const original=manual.word_data||{};
  const cover=manual.photos.find(p=>p.cover)||manual.photos.find(p=>!p.stepId)||manual.photos[0];
  const manual_data={};for(const name of ['id','kind','ja','en','model','description','steps','photos'])manual_data[name]=structuredClone(manual[name]);
  return {id:manual.id,ja:manual.ja||'',en:manual.en||(!manual.ja?manual.model:''),cs:original.cs||'',description_ja:original.description_ja||'',description_en:original.description_en??manual.description,description_cs:original.description_cs||'',image_path:cover?.path||null,image_data:cover?.data||null,audio_path:original.audio_path||null,audio_data:original.audio_data||null,manual_data};
}
export function hydrateTransferredWord(word){
  if(word.image_path||word.image_data||!word.manual_data)return word;
  const photos=word.manual_data.photos||[];const cover=photos.find(p=>p.cover)||photos.find(p=>!p.stepId)||photos[0];
  return {...word,image_data:cover?.data||null};
}
export function transferLocal({source,entry,words,manuals,storage,wordKey,manualKey}){
  const toManual=source==='word';
  const sourceRows=toManual?words:manuals,targetRows=toManual?manuals:words;
  if(!sourceRows.some(r=>r.id===entry.id))throw new Error('Entry not found');
  if(targetRows.some(r=>r.id===entry.id))throw new Error('Entry already exists in destination');
  const converted=toManual?wordToManual(entry):manualToWord(entry);
  const remaining=sourceRows.filter(r=>r.id!==entry.id),destination=[...targetRows,converted];
  const destinationKey=toManual?manualKey:wordKey,sourceKey=toManual?wordKey:manualKey;
  const previousDestination=storage.getItem(destinationKey);
  // Destination first: failure must never leave the source missing.
  storage.setItem(destinationKey,JSON.stringify(destination));
  try{storage.setItem(sourceKey,JSON.stringify(remaining));}
  catch(error){try{previousDestination===null?storage.removeItem(destinationKey):storage.setItem(destinationKey,previousDestination);}catch(rollbackError){console.warn('Source remains safe; duplicate destination may need reloading',rollbackError);}throw error;}
  return {entry:converted,words:toManual?remaining:destination,manuals:toManual?destination:remaining};
}
