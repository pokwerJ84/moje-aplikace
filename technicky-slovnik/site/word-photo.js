// Draft photos are kept in memory until the word is explicitly saved.
export function initWordPhoto({supabase, $, t, decodePhoto, setMessage}) {
  let changed=false, data=null, busy=false, generation=0;
  const controls=['#word-take-photo','#word-pick-photo','#word-remove-photo','#word-close','#word-form [type=submit]'];
  function setBusy(value) {
    busy=value;
    controls.forEach(selector=>$(selector).disabled=value);
  }
  function preview(url) {
    const image=$('#word-photo-image');
    if(url){image.src=url;$('#word-photo-link').href=url;}
    else {image.removeAttribute('src');$('#word-photo-link').removeAttribute('href');}
    $('#word-photo-preview').classList.toggle('hidden',!url);
  }
  async function reset(word) {
    const current=++generation;
    changed=false;data=null;setBusy(false);preview(word?.image_data||null);
    if(!word?.image_data&&word?.image_path){
      try {
        const result=await supabase.storage.from('dictionary-images').createSignedUrl(word.image_path,3600);
        if(current===generation&&!changed&&!result.error)preview(result.data?.signedUrl);
      } catch(error) { console.warn('Could not preview saved photo',error); }
    }
  }
  async function select(file) {
    if(!file||busy)return;
    if(file.size>8*1024*1024||!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)){
      setMessage($('#form-message'),t('photoError'),true);return;
    }
    setBusy(true);
    try {
      const image=await decodePhoto(file);
      const scale=Math.min(1,1600/Math.max(image.width,image.height));
      const canvas=document.createElement('canvas');
      canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);
      canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);image.close?.();
      const next=canvas.toDataURL('image/jpeg',.82);
      generation++;data=next;changed=true;preview(data);
      setMessage($('#form-message'),'');
    } catch(error) { console.error(error);setMessage($('#form-message'),t('photoError'),true); }
    finally {setBusy(false);}
  }
  $('#word-take-photo').addEventListener('click',()=>$('#word-camera-input').click());
  $('#word-pick-photo').addEventListener('click',()=>$('#word-photo-input').click());
  $('#word-remove-photo').addEventListener('click',()=>{if(!busy){generation++;changed=true;data=null;preview(null);}});
  for(const selector of ['#word-camera-input','#word-photo-input'])$(selector).addEventListener('change',event=>{
    void select(event.target.files?.[0]);event.target.value='';
  });
  $('#word-dialog').addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  return {reset,select,setBusy,isBusy:()=>busy,value:()=>({changed,data})};
}

// Commit the image reference with the word; remove a replaced image only after success.
export async function saveWordWithPhoto({supabase,user,row,previous,photo,audio={changed:false},list,saveLocalWords}) {
  let uploadedPath=null,uploadedAudioPath=null,saved;
  if(user){
    try {
      if(photo.changed){
        row={...row,image_path:null};
        if(photo.data){
          const blob=await (await fetch(photo.data)).blob();
          uploadedPath=`${user.id}/${row.id}-${crypto.randomUUID()}.jpg`;
          const uploaded=await supabase.storage.from('dictionary-images').upload(uploadedPath,blob,{upsert:false,contentType:'image/jpeg'});
          if(uploaded.error)throw uploaded.error;
          row.image_path=uploadedPath;
        }
      }
      if(audio.changed){
        row={...row,audio_path:null};
        if(audio.data){
          const blob=await(await fetch(audio.data)).blob();
          uploadedAudioPath=`${user.id}/${row.id}-${crypto.randomUUID()}.${audio.ext}`;
          const result=await supabase.storage.from('dictionary-audio').upload(uploadedAudioPath,blob,{upsert:false,contentType:audio.mime});
          if(result.error)throw result.error;row.audio_path=uploadedAudioPath;
        }
      }
      const query=previous?supabase.from('dictionary_words').update(row).eq('id',row.id):supabase.from('dictionary_words').insert(row);
      const result=await query.select('id,ja,en,cs,description_ja,description_cs,description_en,image_path,manual_data,audio_path').single();
      if(result.error)throw result.error;
      saved={...result.data,image_data:photo.changed?photo.data:previous?.image_data||null,audio_data:audio.changed?audio.data:previous?.audio_data||null};
    } catch(error) {
      if(uploadedPath)try{await supabase.storage.from('dictionary-images').remove([uploadedPath]);}catch(cleanupError){console.warn(cleanupError);}
      if(uploadedAudioPath)try{await supabase.storage.from('dictionary-audio').remove([uploadedAudioPath]);}catch(cleanupError){console.warn(cleanupError);}
      throw error;
    }
    if(photo.changed&&previous?.image_path&&previous.image_path!==saved.image_path&&!(previous.manual_data?.photos||[]).some(p=>p.path===previous.image_path)){
      try{await supabase.storage.from('dictionary-images').remove([previous.image_path]);}catch(error){console.warn('Could not remove replaced photo',error);}
    }
    if(audio.changed&&previous?.audio_path&&previous.audio_path!==saved.audio_path){
      try{await supabase.storage.from('dictionary-audio').remove([previous.audio_path]);}catch(error){console.warn(error);}
    }
  } else {
    saved={...previous,...row};
    if(photo.changed){saved.image_data=photo.data;saved.image_path=null;}
    if(audio.changed){saved.audio_data=audio.data;saved.audio_path=null;}
  }
  const next=previous?list.map(word=>word.id===row.id?saved:word):[...list,saved];
  if(!user&&!saveLocalWords(next))throw new Error('local-save-failed');
  return next;
}
