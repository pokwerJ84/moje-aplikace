const types={mp3:'audio/mpeg',m4a:'audio/mp4',mp4:'audio/mp4',wav:'audio/wav',webm:'audio/webm',ogg:'audio/ogg',aac:'audio/aac'};
export function audioFormat(file){
  const ext=(file.name||'').split('.').pop().toLowerCase();
  const mime=(file.type||types[ext]||'').split(';')[0].toLowerCase();
  const extension={'audio/mpeg':'mp3','audio/mp3':'mp3','audio/mp4':'m4a','audio/x-m4a':'m4a','audio/webm':'webm','audio/ogg':'ogg','audio/wav':'wav','audio/x-wav':'wav','audio/aac':'aac'}[mime];
  if(!extension||file.size>10*1024*1024||file.size===0)throw new Error('audioInvalid');
  return {mime,ext:extension};
}
const asDataURL=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
export async function recordingURL(supabase,word){
  if(word.audio_data)return word.audio_data;
  const {data,error}=await supabase.storage.from('dictionary-audio').createSignedUrl(word.audio_path,3600);
  if(error)throw error;return data.signedUrl;
}
export function initWordAudio({supabase,$,t,setMessage}){
  let draft={changed:false,data:null,mime:null,ext:null},generation=0;
  let recorder=null,stream=null,timer=null,starting=false,processing=false,saving=false;
  const isBusy=()=>starting||processing||saving||recorder?.state==='recording';
  function controls(){
    const recording=recorder?.state==='recording';
    $('#word-record-audio').hidden=recording;$('#word-stop-audio').hidden=!recording;
    $('#word-record-audio').disabled=starting||processing||saving;
    $('#word-stop-audio').disabled=processing||saving;
    $('#word-upload-audio').disabled=isBusy();$('#word-remove-audio').disabled=isBusy();
    $('#word-form [type=submit]').disabled=isBusy();$('#word-close').disabled=isBusy();
  }
  function preview(url){
    const player=$('#word-audio-player');player.pause();
    if(url)player.src=url;else{player.removeAttribute('src');player.load();}
    $('#word-audio-preview').classList.toggle('hidden',!url);
  }
  function release(){clearTimeout(timer);timer=null;stream?.getTracks().forEach(track=>track.stop());stream=null;}
  async function reset(word){
    const current=++generation;
    if(recorder?.state==='recording')recorder.stop();release();recorder=null;starting=false;processing=false;saving=false;
    draft={changed:false,data:null,mime:null,ext:null};preview(word?.audio_data||null);controls();$('#word-audio-status').textContent='';
    if(word?.audio_path&&!word.audio_data)try{const url=await recordingURL(supabase,word);if(current===generation&&!draft.changed)preview(url);}catch(error){console.warn(error);}
  }
  async function select(file){
    if(!file||isBusy())return;
    processing=true;controls();
    try{const format=audioFormat(file);const data=await asDataURL(file);generation++;draft={changed:true,data,...format};preview(data);setMessage($('#form-message'),'');}
    catch(error){setMessage($('#form-message'),t(error.message==='audioInvalid'?'audioInvalid':'audioFailed'),true);}
    finally{processing=false;controls();}
  }
  async function record(){
    if(isBusy())return;
    if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){setMessage($('#form-message'),t('audioUnsupported'),true);return;}
    starting=true;controls();let failed=false;const current=generation;
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:true});
      if(current!==generation){release();return;}
      const mime=['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'].find(type=>MediaRecorder.isTypeSupported(type));
      recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);const chunks=[];const active=recorder;
      recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
      recorder.onerror=()=>{failed=true;release();if(recorder?.state==='recording')recorder.stop();setMessage($('#form-message'),t('audioFailed'),true);};
      recorder.onstop=async()=>{
        release();if(current!==generation)return;
        processing=true;recorder=null;controls();
        try{
          if(failed)throw new Error('recording-failed');
          const blob=new Blob(chunks,{type:active.mimeType||chunks[0]?.type||'audio/mp4'});
          const format=audioFormat(blob);const data=await asDataURL(blob);
          if(current!==generation)return;generation++;draft={changed:true,data,...format};preview(data);$('#word-audio-status').textContent=t('audioReady');
        }catch(error){setMessage($('#form-message'),t('audioFailed'),true);}
        finally{processing=false;controls();}
      };
      recorder.start();timer=setTimeout(()=>{if(recorder?.state==='recording')recorder.stop();},60000);
      $('#word-audio-status').textContent=t('audioRecording');setMessage($('#form-message'),'');
    }catch(error){release();recorder=null;setMessage($('#form-message'),t('audioMicError'),true);}
    finally{starting=false;controls();}
  }
  $('#word-record-audio').addEventListener('click',()=>void record());
  $('#word-stop-audio').addEventListener('click',()=>{if(recorder?.state==='recording')recorder.stop();});
  $('#word-upload-audio').addEventListener('click',()=>$('#word-audio-input').click());
  $('#word-audio-input').addEventListener('change',event=>{void select(event.target.files?.[0]);event.target.value='';});
  $('#word-remove-audio').addEventListener('click',()=>{if(!isBusy()){generation++;draft={changed:true,data:null,mime:null,ext:null};preview(null);$('#word-audio-status').textContent='';}});
  $('#word-dialog').addEventListener('cancel',event=>{if(isBusy())event.preventDefault();});
  $('#word-dialog').addEventListener('close',()=>$('#word-audio-player').pause());
  globalThis.addEventListener?.('pagehide',()=>{generation++;if(recorder?.state==='recording')recorder.stop();release();});
  return {reset,select,isBusy,value:()=>draft,setBusy:value=>{saving=value;controls();}};
}
