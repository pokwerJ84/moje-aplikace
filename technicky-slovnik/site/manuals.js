// Personal measurement notebook. All cloud rows and photos use owner-only RLS.
export function initManuals({supabase,getUser,getLanguage,toast,decodePhoto}) {
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels={cs:{title:'Přístroje a postupy',help:'Vlastní poznámky z měření, návody krok za krokem a fotky.',add:'Přidat přístroj / postup',example:'Začít s KEYENCE VR3000',search:'Hledat přístroj nebo postup…',instrument:'Přístroj',procedure:'Postup měření',model:'Výrobce / model',ja:'Japonský název (rómadži nebo znaky)',en:'Anglický název',description:'Co to je / k čemu to slouží',steps:'Postup krok za krokem',step:'Krok',stepTitle:'Název kroku',instructions:'Jak postupovat',addStep:'Přidat krok',photos:'Fotky a jejich popisky',addPhotos:'Přidat fotky',camera:'Vyfotit',caption:'Popisek / číslo kroku',save:'Uložit návod',edit:'Upravit',remove:'Smazat',close:'Zavřít',empty:'Zatím žádné návody. Přidej první přístroj nebo postup.',noResults:'Žádný výsledek.',saved:'Návod uložen.',error:'Návod se nepodařilo uložit. Zkus to znovu; u místních fotek může být plné úložiště. Přihlášení umožní ukládat fotky do účtu.',loadError:'Návody se nepodařilo načíst. Zkus Načíst znovu.',retry:'Načíst znovu',local:'Uloženo jen v tomto zařízení',cloud:'Uloženo v účtu',required:'Vyplň alespoň název nebo model.',confirm:'Opravdu smazat tento návod?',photoError:'Použij obrázek JPG, PNG nebo WebP do 8 MB.',missing:'Chybí japonský nebo anglický název',up:'Nahoru',down:'Dolů',saving:'Ukládám…',notes:'Vlastní návod — ověř postup podle školení a dokumentace přístroje.'},en:{title:'Instruments & procedures',help:'Your measurement notes, step-by-step guides and photos.',add:'Add instrument / procedure',example:'Start with KEYENCE VR3000',search:'Search instruments or procedures…',instrument:'Instrument',procedure:'Measurement procedure',model:'Manufacturer / model',ja:'Japanese name (romaji or characters)',en:'English name',description:'What it is / what it is used for',steps:'Step-by-step procedure',step:'Step',stepTitle:'Step title',instructions:'Instructions',addStep:'Add step',photos:'Photos and captions',addPhotos:'Add photos',camera:'Take photo',caption:'Caption / step number',save:'Save guide',edit:'Edit',remove:'Delete',close:'Close',empty:'No guides yet. Add your first instrument or procedure.',noResults:'No matches.',saved:'Guide saved.',error:'Could not save the guide. Please retry; local photo storage may be full. Sign in to save photos to your account.',loadError:'Could not load guides. Try Reload.',retry:'Reload',local:'Stored on this device only',cloud:'Saved to your account',required:'Enter a name or model.',confirm:'Delete this guide?',photoError:'Use JPG, PNG or WebP images up to 8 MB.',missing:'Japanese or English name missing',up:'Move up',down:'Move down',saving:'Saving…',notes:'Personal guide — check your procedure against training and instrument documentation.'}};
  const t=k=>labels[getLanguage()][k];
  const key=()=> 'technical-manuals-v1'+(getUser()?':'+getUser().id:'');
  let list=[],draft=null,busy=false,loadedUser=null,loadFailed=false;
  function read(k=key()){try{return JSON.parse(localStorage.getItem(k)||'[]')}catch{return []}}
  function store(rows,k=key()){localStorage.setItem(k,JSON.stringify(rows))}
  function render(){
    document.querySelectorAll('[data-manual-label]').forEach(e=>e.textContent=t(e.dataset.manualLabel));
    $('#manual-search').placeholder=t('search');
    $('#manual-status').textContent=loadFailed?t('loadError'):getUser()?t('cloud'):t('local');
    const q=$('#manual-search').value.trim().toLocaleLowerCase();
    const filtered=list.filter(r=>[r.ja,r.en,r.model,r.description,...r.steps.map(s=>s.title+' '+s.text)].join(' ').toLocaleLowerCase().includes(q));
    $('#manual-list').innerHTML=filtered.map(r=>`<button type="button" class="manual-card ${!r.ja.trim()||!r.en.trim()?'incomplete':''}" data-manual-open="${esc(r.id)}"><small>${t(r.kind)} · ${esc(r.model)}</small><strong>${esc(r.ja||'—')}</strong><strong>${esc(r.en||'—')}</strong><p>${esc(r.description.slice(0,160))}</p><span>${r.steps.length} ${t('steps')} · ${r.photos.length} ${t('photos')}</span>${!r.ja.trim()||!r.en.trim()?`<small class="missing-label">${t('missing')}</small>`:''}</button>`).join('')||`<p class="hint">${t(list.length?'noResults':'empty')}</p>`;
  }
  async function uploadPending(row,uploaded){
    const photos=[];
    for(const photo of row.photos){
      if(!photo.data){photos.push(photo);continue}
      const blob=await(await fetch(photo.data)).blob();const path=`${getUser().id}/manual-${crypto.randomUUID()}.jpg`;
      const {error}=await supabase.storage.from('dictionary-images').upload(path,blob,{contentType:'image/jpeg'});if(error)throw error;
      uploaded.push(path);photos.push({id:photo.id,path,caption:photo.caption});
    }
    return {...row,photos};
  }
  async function setUser(){
    const user=getUser();loadedUser=user?.id||null;loadFailed=false;
    list=read();render();
    if(!user)return;
    try{
      const result=await supabase.from('dictionary_manuals').select('*').order('created_at');if(result.error)throw result.error;
      if(loadedUser!==user.id)return;
      const cloud=result.data||[];
      // Stable imported IDs make retry safe. Never overwrite an already imported guide.
      for(const local of read('technical-manuals-v1')){
        const id=`${user.id}:${local.id}`;
        if(cloud.some(r=>r.id===id))continue;
        const uploaded=[];
        try{const row=await uploadPending({...local,id},uploaded);const {error}=await supabase.from('dictionary_manuals').insert(row);if(error)throw error;cloud.push(row)}
        catch(error){if(uploaded.length)await supabase.storage.from('dictionary-images').remove(uploaded);throw error}
      }
      if(loadedUser!==user.id)return;
      list=cloud;store(list);localStorage.removeItem('technical-manuals-v1');render();
    }catch(error){console.error(error);loadFailed=true;render()}
  }
  async function signedPhoto(photo){if(photo.data)return photo.data;if(!photo.path)return '';const {data,error}=await supabase.storage.from('dictionary-images').createSignedUrl(photo.path,3600);if(error)throw error;return data.signedUrl}
  async function show(row){
    const root=$('#manual-detail-content');
    root.innerHTML=`<div class="dialog-heading"><div><small>${t(row.kind)} · ${esc(row.model)}</small><h2>${esc(row.ja||'—')}</h2><h3>${esc(row.en||'—')}</h3></div><button type="button" class="icon-button" data-manual-close="manual-detail" aria-label="${t('close')}">×</button></div><p class="manual-text">${esc(row.description)}</p><h3>${t('steps')}</h3><ol class="manual-view-steps">${row.steps.map(s=>`<li><strong>${esc(s.title)}</strong><p class="manual-text">${esc(s.text)}</p></li>`).join('')}</ol><div class="manual-gallery">${row.photos.map(p=>`<figure><div data-manual-photo="${esc(p.id)}"></div><figcaption>${esc(p.caption)}</figcaption></figure>`).join('')}</div><div class="manual-actions"><button type="button" class="button primary" data-manual-edit="${esc(row.id)}">${t('edit')}</button><button type="button" class="button outline" data-manual-delete="${esc(row.id)}">${t('remove')}</button></div>`;
    $('#manual-detail').showModal();
    for(const photo of row.photos){try{const url=await signedPhoto(photo);const target=[...root.querySelectorAll('[data-manual-photo]')].find(e=>e.dataset.manualPhoto===photo.id);if(target)target.innerHTML=`<a href="${esc(url)}" target="_blank" rel="noopener"><img src="${esc(url)}" alt="${esc(photo.caption)}" /></a>`}catch{toast(t('photoError'))}}
  }
  function collect(){
    const form=$('#manual-form');for(const k of ['kind','ja','en','model','description'])draft[k]=form.elements[k].value.trim();
    draft.steps=[...$('#manual-steps').children].map(e=>({title:e.querySelector('[data-step-title]').value,text:e.querySelector('[data-step-text]').value}));
    $('#manual-photos').querySelectorAll('[data-photo-caption]').forEach(e=>{draft.photos.find(p=>p.id===e.dataset.photoCaption).caption=e.value});
  }
  function renderDraft(){
    $('#manual-steps').innerHTML=draft.steps.map((s,i)=>`<div class="manual-step"><strong>${t('step')} ${i+1}</strong><input data-step-title maxlength="200" placeholder="${t('stepTitle')}" value="${esc(s.title)}" /><textarea data-step-text rows="3" maxlength="10000" placeholder="${t('instructions')}">${esc(s.text)}</textarea><div class="manual-actions"><button type="button" class="button outline" data-step-up="${i}" ${i===0?'disabled':''}>↑ ${t('up')}</button><button type="button" class="button outline" data-step-down="${i}" ${i===draft.steps.length-1?'disabled':''}>↓ ${t('down')}</button><button type="button" class="button outline" data-step-remove="${i}">${t('remove')}</button></div></div>`).join('');
    $('#manual-photos').innerHTML=draft.photos.map(p=>`<figure><div data-draft-photo="${esc(p.id)}">${p.data?`<img src="${esc(p.data)}" alt="" />`:''}</div><input data-photo-caption="${esc(p.id)}" maxlength="500" placeholder="${t('caption')}" value="${esc(p.caption)}" /><button type="button" class="button outline" data-photo-remove="${esc(p.id)}">${t('remove')}</button></figure>`).join('');
    for(const p of draft.photos.filter(p=>p.path))signedPhoto(p).then(url=>{const el=[...$('#manual-photos').querySelectorAll('[data-draft-photo]')].find(e=>e.dataset.draftPhoto===p.id);if(el)el.innerHTML=`<img src="${esc(url)}" alt="" />`}).catch(()=>toast(t('photoError')));
  }
  function edit(row){
    draft=structuredClone(row||{id:crypto.randomUUID(),kind:'instrument',ja:'',en:'',model:'',description:'',steps:[],photos:[]});
    $('#manual-form').reset();for(const k of ['kind','ja','en','model','description'])$('#manual-form').elements[k].value=draft[k];
    $('#manual-message').textContent='';render();renderDraft();$('#manual-editor').showModal();
  }
  async function addPhotos(files){
    if(busy)return;busy=true;$('#manual-save').disabled=true;
    try{
      collect();for(const file of files){
        if(file.size>8*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error(t('photoError'));
        const image=await decodePhoto(file);const scale=Math.min(1,1400/Math.max(image.width,image.height));const canvas=document.createElement('canvas');canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);image.close?.();
        draft.photos.push({id:crypto.randomUUID(),data:canvas.toDataURL('image/jpeg',.8),caption:''});
      }
    }catch(error){toast(error.message)}finally{renderDraft();busy=false;$('#manual-save').disabled=false}
  }
  $('#manual-add').onclick=()=>edit();$('#manual-example').onclick=()=>{edit();$('#manual-form').elements.en.value='3D scanner';$('#manual-form').elements.model.value='KEYENCE VR3000'};
  $('#manual-search').oninput=render;$('#manual-retry').onclick=()=>void setUser();
  $('#manual-list').onclick=e=>{const b=e.target.closest('[data-manual-open]');if(b)void show(list.find(r=>r.id===b.dataset.manualOpen))};
  $('#manual-add-step').onclick=()=>{collect();draft.steps.push({title:'',text:''});renderDraft()};
  $('#manual-add-photos').onclick=()=>$('#manual-photo-files').click();$('#manual-camera').onclick=()=>$('#manual-camera-file').click();
  for(const id of ['manual-photo-files','manual-camera-file'])$('#'+id).onchange=e=>{void addPhotos([...e.target.files]);e.target.value=''};
  $('#manual-editor').addEventListener('cancel',e=>{if(busy)e.preventDefault()});
  document.addEventListener('click',e=>{
    const close=e.target.closest('[data-manual-close]');if(close&&!busy)$('#'+close.dataset.manualClose).close();
    const editButton=e.target.closest('[data-manual-edit]');if(editButton){$('#manual-detail').close();edit(list.find(r=>r.id===editButton.dataset.manualEdit))}
    for(const action of ['up','down','remove']){const b=e.target.closest(`[data-step-${action}]`);if(b&&!busy){collect();const i=Number(b.dataset['step'+action[0].toUpperCase()+action.slice(1)]);if(action==='remove')draft.steps.splice(i,1);else{const j=i+(action==='up'?-1:1);if(j>=0&&j<draft.steps.length)[draft.steps[i],draft.steps[j]]=[draft.steps[j],draft.steps[i]]}renderDraft()}}
    const remove=e.target.closest('[data-photo-remove]');if(remove&&!busy){collect();draft.photos=draft.photos.filter(p=>p.id!==remove.dataset.photoRemove);renderDraft()}
    const del=e.target.closest('[data-manual-delete]');if(del)void deleteGuide(del.dataset.manualDelete);
  });
  async function deleteGuide(id){
    if(busy||!confirm(t('confirm')))return;busy=true;
    try{const row=list.find(r=>r.id===id);const next=list.filter(r=>r.id!==id);
      if(getUser()){const {error}=await supabase.from('dictionary_manuals').delete().eq('id',id);if(error)throw error;const paths=row.photos.map(p=>p.path).filter(Boolean);if(paths.length)await supabase.storage.from('dictionary-images').remove(paths)}else store(next);
      list=next;if(getUser())try{store(list)}catch{}render();$('#manual-detail').close();
    }catch(error){toast(t('error'))}finally{busy=false}
  }
  $('#manual-form').onsubmit=async e=>{
    e.preventDefault();if(busy)return;collect();if(![draft.ja,draft.en,draft.model].some(Boolean)){$('#manual-message').textContent=t('required');return}
    busy=true;$('#manual-save').disabled=true;$('#manual-save').textContent=t('saving');const uploaded=[];
    try{
      const previous=list.find(r=>r.id===draft.id);let row=structuredClone(draft);
      if(getUser()){
        row=await uploadPending(row,uploaded);
        const {error}=previous?await supabase.from('dictionary_manuals').update({kind:row.kind,ja:row.ja,en:row.en,model:row.model,description:row.description,steps:row.steps,photos:row.photos}).eq('id',row.id):await supabase.from('dictionary_manuals').insert(row);if(error)throw error;
      }
      const next=previous?list.map(r=>r.id===row.id?row:r):[...list,row];
      if(!getUser())store(next);list=next;if(getUser())try{store(list)}catch{}
      if(getUser()&&previous){const paths=previous.photos.map(p=>p.path).filter(p=>p&&!row.photos.some(n=>n.path===p));if(paths.length)await supabase.storage.from('dictionary-images').remove(paths)}
      render();$('#manual-editor').close();toast(t('saved'));
    }catch(error){console.error(error);if(uploaded.length)await supabase.storage.from('dictionary-images').remove(uploaded);$('#manual-message').textContent=t('error')}
    finally{busy=false;$('#manual-save').disabled=false;$('#manual-save').textContent=t('save')}
  };
  list=read();render();return {setUser,render};
}
