import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { toHiragana, toRomaji } from 'https://esm.sh/wanakana@5.3.1';

// This is a publishable key. Access to every dictionary row and image is
// restricted by the Supabase RLS and Storage policies created for this app.
const LOCAL_KEY = 'technical-dictionary-local-v1';
const SUPABASE_URL = 'https://pornzqperiptczusueso.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable__4347c8h__yHW49VfXmTfw_9XnTC--n';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
});

const initialWords = [
  ['voltage','Napětí','Voltage','den’atsu','Elektrické napětí je rozdíl elektrických potenciálů. Jednotka: volt (V). Při měření ventilátoru sleduješ například napájecí a rozběhové napětí.','Voltage is the difference in electric potential. Unit: volt (V). Fan tests include supply voltage and starting voltage.'],
  ['current','Proud','Current','denryū','Elektrický proud vyjadřuje tok elektrického náboje. Jednotka: ampér (A), často miliampér (mA). U ventilátoru sleduješ proud, který odebírá.','Electric current is the flow of electric charge. Unit: ampere (A), often milliampere (mA). For a fan, this is the current it draws.'],
  ['speed','Otáčky / rychlost otáčení','Speed (rotational speed)','kaiten sokudo','Rychlost otáčení rotoru. Běžně se uvádí v otáčkách za minutu: rpm nebo r/min. Obecná rychlost se japonsky řekne sokudo.','The rotational speed of the rotor, usually given in revolutions per minute: rpm or r/min. General speed is sokudo in Japanese.'],
  ['measurement','Měření','Measurement','sokutei','Zjištění hodnoty veličiny pomocí měřicího přístroje. U ventilátoru měříš například napětí, proud, otáčky nebo hluk.','Determining the value of a quantity using a measuring instrument. Fan measurements include voltage, current, rotational speed and noise.'],
  ['power-supply','Napájecí zdroj','Power supply','dengen','Zdroj elektrického napájení. Laboratorní zdroj umožňuje nastavit napětí a obvykle také omezit proud.','A source of electrical power. A laboratory power supply allows you to set the voltage and usually limit the current.'],
  ['tachometer','Otáčkoměr','Tachometer','kaitenkei','Přístroj pro měření otáček. Optický otáčkoměr obvykle snímá odraz od značky na rotujícím dílu. Používá se také název takomētā.','An instrument for measuring rotational speed. An optical tachometer typically detects a reflection from a mark on the rotating part. Another Japanese term is takomētā.'],
  ['multimeter','Multimetr','Multimeter','maruchimētā','Přístroj s více měřicími funkcemi, například pro napětí, proud a odpor. Podle měření se volí funkce a správné zdířky pro měřicí kabely.','An instrument with several measurement functions, such as voltage, current and resistance. Select the correct function and lead sockets for each measurement.'],
  ['connection','Zapojení / připojení','Connection','setsuzoku','Spojení vodičů, přístrojů nebo součástek. V elektrickém měření jde například o připojení ventilátoru ke zdroji.','Joining wires, instruments or components. In electrical testing, this includes connecting a fan to a power supply.'],
  ['pq','Průtokově-tlaková charakteristika','P–Q characteristic','fūryō–seiatsu tokusei','Křivka vztahu mezi průtokem vzduchu Q a statickým tlakem P ventilátoru. Ukazuje, jak se mění průtok při různém odporu proudění.','A curve showing the relationship between fan airflow Q and static pressure P. It shows how airflow changes as resistance to airflow varies.'],
  ['noise','Hluk','Noise (acoustic)','sōon','Zvuk vydávaný ventilátorem. Jeho hladina se často uvádí v dB(A). Elektrický šum je jiný význam anglického noise a japonsky se označuje noizu.','Sound produced by a fan. Its level is often stated in dB(A). Electrical noise is a different meaning of noise and is called noizu in Japanese.'],
].map(([id,cs,en,ja,description_cs,description_en]) => ({id,cs,en,ja,description_cs,description_en}));

const words = {
  cs: {title:'Technický slovník',subtitle:'Moje slovíčka z praxe',signInTitle:'Přihlášení do slovníku',signInHelp:'Slovník můžeš používat bez účtu. Přihlášení později synchronizuje tvoje slovíčka.',email:'E-mail',sendLink:'Poslat odkaz',linkSent:'Odkaz je na cestě. Otevři e-mail na tomto zařízení a klikni na odkaz.',signOut:'Odhlásit',guestSignIn:'Přihlásit a synchronizovat',myWords:'Můj slovník',hint:'Japonsky · anglicky · česky. Klikni na slovíčko pro popis nebo fotku.',searchLabel:'Hledat ve slovníku',searchPlaceholder:'Hledej japonsky, anglicky nebo česky…',addWord:'Přidat slovíčko',japanese:'Japonsky · rómadži',english:'Anglicky',czech:'Česky',actions:'Akce',empty:'Slovník je prázdný. Přidej své první slovíčko.',noResults:'Nic jsem nenašel. Zkus jiné slovo.',lookupTitle:'Najít nové slovíčko',lookupSubtitle:'Anglicko-japonský slovník Jisho',lookupLabel:'Anglický nebo japonský výraz',lookupPlaceholder:'Např. voltage, bearing, fan…',search:'Vyhledat',searching:'Hledám…',noJisho:'Žádný výsledek. Zkus jiné slovo nebo otevři Jisho.',jishoError:'Jisho teď neodpovídá. Můžeš hledat přímo na Jisho.',openJisho:'Otevřít Jisho',details:'Detail na Jisho',use:'Použít',newWord:'Nové slovíčko',allLanguages:'Vyplň názvy ve všech třech jazycích.',japaneseRomaji:'Japonsky v rómadži',descriptionCs:'Popis česky (volitelné)',descriptionEn:'Popis anglicky (volitelné)',saveWord:'Uložit slovíčko',saving:'Ukládám…',listen:'Poslechnout',noDescription:'K tomuto slovíčku zatím není popis.',noDescriptionEn:'K tomuto slovíčku zatím není anglický popis.',noDescriptionCs:'K tomuto slovíčku zatím není český popis.',photoPrompt:'Přidej fotku z práce nebo vlastní obrázek.',addPhoto:'Přidat obrázek',takePhoto:'Vyfotit',photoLimit:'JPG, PNG, WebP nebo GIF · do 8 MB.',delete:'Smazat',confirmDelete:'Opravdu smazat toto slovíčko?',cancel:'Zrušit',close:'Zavřít',longVowels:'Dlouhá samohláska: ū = uu, ō = ou, ē = ee.',loading:'Načítám slovník…',loadError:'Slovník se nepodařilo načíst. Zkus to znovu.',saveError:'Slovíčko se nepodařilo uložit.',photoError:'Fotku se nepodařilo uložit.',emailError:'Přihlašovací odkaz se nepodařilo poslat.',speechError:'Japonská výslovnost není v tomto prohlížeči dostupná.',saved:'Uloženo.',deleted:'Slovíčko smazáno.',photoSaved:'Fotka uložena.',romaji:'Rómadži'},
  en: {title:'Technical vocabulary',subtitle:'My work vocabulary',signInTitle:'Sign in to your dictionary',signInHelp:'You can use the dictionary without an account. Signing in later will sync your words.',email:'Email',sendLink:'Send sign-in link',linkSent:'The link is on its way. Open your email on this device and follow it.',signOut:'Sign out',guestSignIn:'Sign in & sync',myWords:'My vocabulary',hint:'Japanese · English · Czech. Select a word to view its description or photo.',searchLabel:'Search vocabulary',searchPlaceholder:'Search Japanese, English or Czech…',addWord:'Add a word',japanese:'Japanese · romaji',english:'English',czech:'Czech',actions:'Actions',empty:'Your dictionary is empty. Add your first word.',noResults:'No matches. Try another word.',lookupTitle:'Find a new word',lookupSubtitle:'English–Japanese dictionary · Jisho',lookupLabel:'English or Japanese term',lookupPlaceholder:'For example: voltage, bearing, fan…',search:'Search',searching:'Searching…',noJisho:'No results. Try another word or open Jisho.',jishoError:'Jisho is not responding. You can search directly on Jisho.',openJisho:'Open Jisho',details:'Jisho details',use:'Use',newWord:'New word',allLanguages:'Enter the word in all three languages.',japaneseRomaji:'Japanese in romaji',descriptionCs:'Description in Czech (optional)',descriptionEn:'Description in English (optional)',saveWord:'Save word',saving:'Saving…',listen:'Listen',noDescription:'There is no description for this word yet.',noDescriptionEn:'There is no English description for this word yet.',noDescriptionCs:'There is no Czech description for this word yet.',photoPrompt:'Add a work photo or your own image.',addPhoto:'Add image',takePhoto:'Take photo',photoLimit:'JPG, PNG, WebP or GIF · up to 8 MB.',delete:'Delete',confirmDelete:'Delete this word?',cancel:'Cancel',close:'Close',longVowels:'Long vowels: ū = uu, ō = ou, ē = ee.',loading:'Loading vocabulary…',loadError:'Could not load your vocabulary. Please try again.',saveError:'Could not save the word.',photoError:'Could not save the photo.',emailError:'Could not send the sign-in link.',speechError:'Japanese speech is not available in this browser.',saved:'Saved.',deleted:'Word deleted.',photoSaved:'Photo saved.',romaji:'Romaji'},
};
const $ = (selector) => document.querySelector(selector);
const state = {language:localStorage.getItem('vocabulary-language') === 'en' ? 'en' : 'cs', user:null, list:[], query:'', selected:null, jisho:[]};
function readLocalWords() {
  try { const saved=JSON.parse(localStorage.getItem(LOCAL_KEY)); if(Array.isArray(saved)) return saved; } catch(error) { console.warn('Could not read local dictionary',error); }
  return initialWords.map(word=>({...word,id:`guest:${word.id}`}));
}
function saveLocalWords(list=state.list) {
  try { localStorage.setItem(LOCAL_KEY,JSON.stringify(list)); return true; }
  catch(error) { console.error(error); showToast(t('saveError')); return false; }
}
state.list=readLocalWords();
const t = (key) => words[state.language][key] || words.cs[key] || key;
const escapes = (value='') => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const pronunciation = {voltage:'でんあつ',current:'でんりゅう',speed:'かいてんそくど',measurement:'そくてい','power-supply':'でんげん',tachometer:'かいてんけい',multimeter:'まるちめーたー',connection:'せつぞく',pq:'ふうりょうせいあつとくせい',noise:'そうおん'};

function translatePage() {
  document.documentElement.lang = state.language;
  document.title = t('title');
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  $('#email').placeholder = t('email');
  $('#account-action').textContent = state.user ? t('signOut') : t('guestSignIn');
  $('#filter').placeholder = t('searchPlaceholder');
  $('#jisho-query').placeholder = t('lookupPlaceholder');
  document.querySelectorAll('[data-language]').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.language === state.language)));
  renderWords();
  renderJisho();
  if (state.selected && $('#detail-dialog').open) showDetails(state.selected);
}
function showToast(message) {
  const toast = $('#toast'); toast.textContent = message; toast.classList.add('visible');
  clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('visible'), 2200);
}
function setMessage(el, message, error=false) { el.textContent = message; el.classList.toggle('error', error); }
function renderWords() {
  const term = state.query.trim().toLocaleLowerCase();
  const filtered = state.list.filter(w => [w.ja,w.en,w.cs,w.description_cs,w.description_en].some(value => String(value || '').toLocaleLowerCase().includes(term)));
  $('#word-count').textContent = `${filtered.length} ${state.language === 'en' ? (filtered.length === 1 ? 'word' : 'words') : 'slovíček'}`;
  $('#words').innerHTML = filtered.map((w,i) => `<tr><td><div class="jp-cell"><button class="word-name ja" data-open="${escapes(w.id)}">${escapes(w.ja)}</button><button class="speak" data-speak="${escapes(w.id)}" title="${escapes(t('listen'))}" aria-label="${escapes(t('listen'))}: ${escapes(w.ja)}">🔊</button></div></td><td><button class="word-name" data-open="${escapes(w.id)}">${escapes(w.en)}</button></td><td><button class="word-name" data-open="${escapes(w.id)}">${escapes(w.cs)}</button></td><td><button class="delete" data-delete="${escapes(w.id)}" title="${escapes(t('delete'))}" aria-label="${escapes(t('delete'))} ${escapes(w.ja)}">⌫</button></td></tr>`).join('');
  $('#empty').classList.toggle('hidden', !!state.list.length);
  $('#no-results').classList.toggle('hidden', !state.list.length || !!filtered.length);
}
function speak(word) {
  if (!('speechSynthesis' in window)) return showToast(t('speechError'));
  const shortId=String(word.id).split(':').at(-1);
  const text = pronunciation[word.id] || pronunciation[shortId] || toHiragana(word.ja) || word.ja;
  speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang='ja-JP'; utterance.rate=.86;
  const voice = speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith('ja')); if (voice) utterance.voice=voice;
  speechSynthesis.speak(utterance);
}
async function syncGuestWords(user) {
  const localWords = readLocalWords();
  const result = await supabase.from('dictionary_words').select('id,ja,en,cs,description_cs,description_en,image_path').order('created_at',{ascending:true});
  if (result.error) throw result.error;
  const cloudWords = result.data || [];
  const cloudTerms = new Set(cloudWords.map(w=>[w.ja,w.en,w.cs].map(v=>String(v||'').trim().toLocaleLowerCase()).join('|')));
  for (const word of localWords) {
    const key=[word.ja,word.en,word.cs].map(v=>String(v||'').trim().toLocaleLowerCase()).join('|');
    if (cloudTerms.has(key)) continue;
    let image_path=null;
    if (word.image_data) {
      const response=await fetch(word.image_data); const blob=await response.blob();
      const ext=(blob.type.split('/')[1]||'jpg').replace('jpeg','jpg');
      image_path=`${user.id}/${crypto.randomUUID()}.${ext}`;
      const uploaded=await supabase.storage.from('dictionary-images').upload(image_path,blob,{upsert:false,contentType:blob.type||'image/jpeg'});
      if(uploaded.error) throw uploaded.error;
    }
    const {error}=await supabase.from('dictionary_words').insert({id:`${user.id}:${crypto.randomUUID()}`,ja:word.ja,en:word.en,cs:word.cs,description_cs:word.description_cs||'',description_en:word.description_en||'',image_path});
    if(error) throw error;
  }
  const refreshed=await supabase.from('dictionary_words').select('id,ja,en,cs,description_cs,description_en,image_path').order('created_at',{ascending:true});
  if(refreshed.error) throw refreshed.error;
  const imageByTerm=new Map(localWords.filter(w=>w.image_data).map(w=>[[w.ja,w.en,w.cs].map(v=>String(v||'').trim().toLocaleLowerCase()).join('|'),w.image_data]));
  const merged=(refreshed.data||[]).map(w=>({...w,image_data:imageByTerm.get([w.ja,w.en,w.cs].map(v=>String(v||'').trim().toLocaleLowerCase()).join('|'))||null}));
  saveLocalWords(merged);
  return merged;
}
async function loadWords() {
  const profile = await supabase.from('dictionary_profiles').select('seeded').maybeSingle();
  if (profile.error) throw profile.error;
  const seeded = profile.data?.seeded ?? false;
  if (!profile.data) {
    const created = await supabase.from('dictionary_profiles').insert({seeded:false});
    if (created.error && created.error.code !== '23505') throw created.error;
  }
  if (!seeded) {
    const rows = initialWords.map(w => ({id:`${state.user.id}:${w.id}`,ja:w.ja,en:w.en,cs:w.cs,description_cs:w.description_cs,description_en:w.description_en}));
    const inserted = await supabase.from('dictionary_words').upsert(rows,{onConflict:'id',ignoreDuplicates:true});
    if (inserted.error) throw inserted.error;
    const marked = await supabase.from('dictionary_profiles').update({seeded:true}).eq('owner_id',state.user.id);
    if (marked.error) throw marked.error;
  }
  state.list=await syncGuestWords(state.user);
  renderWords();
}
async function enterApp(user) {
  state.user=user; $('#auth-panel').classList.add('hidden'); $('#app-panel').classList.remove('hidden');
  $('#word-count').textContent = t('loading'); translatePage();
  try { await loadWords(); } catch (error) { console.error(error); showToast(t('loadError')); }
}
async function showDetails(word) {
  state.selected=word;
  const description = state.language === 'en' ? word.description_en : word.description_cs;
  const emptyDescription = state.language === 'en' ? t('noDescriptionEn') : t('noDescriptionCs');
  $('#detail-content').innerHTML = `<div class="dialog-heading"><div><h2 class="detail-title">${escapes(word.ja)}</h2><p class="detail-subtitle">${escapes(word.en)} · ${escapes(word.cs)}</p></div><button class="icon-button" data-close-detail aria-label="${escapes(t('close'))}">×</button></div><div class="detail-pronunciation"><strong>${escapes(word.ja)}</strong><button class="button outline" data-detail-speak>🔊 ${escapes(t('listen'))}</button></div><p class="definition">${escapes(description || emptyDescription)}</p><div id="detail-photo" class="photo-placeholder">${escapes(t('photoPrompt'))}</div><div class="detail-actions"><button class="button outline" data-upload="photo">▧ ${escapes(t('addPhoto'))}</button><button class="button outline" data-upload="camera">◉ ${escapes(t('takePhoto'))}</button><button class="button outline" data-delete="${escapes(word.id)}">${escapes(t('delete'))}</button></div><p class="hint">${escapes(t('photoLimit'))}</p>`;
  $('#detail-dialog').showModal();
  if (word.image_data) {
    $('#detail-photo').outerHTML = `<img class="photo" src="${escapes(word.image_data)}" alt="${escapes(t('addPhoto'))}: ${escapes(word.ja)}" />`;
  } else if (state.user && word.image_path) {
    const {data,error} = await supabase.storage.from('dictionary-images').createSignedUrl(word.image_path,3600);
    if (!error && data?.signedUrl && state.selected?.id === word.id) $('#detail-photo').outerHTML = `<img class="photo" src="${escapes(data.signedUrl)}" alt="${escapes(t('addPhoto'))}: ${escapes(word.ja)}" />`;
  }
}
function renderJisho() {
  $('#jisho-results').innerHTML = state.jisho.map((r,i) => `<article class="result"><div class="result-main"><strong>${escapes(r.romaji)}</strong><span class="kana" lang="ja">${escapes(r.word)} · ${escapes(r.reading)}</span><p>${escapes(r.meanings.join('; '))}</p><a href="${escapes(r.url)}" target="_blank" rel="noreferrer">${escapes(t('details'))}</a></div><button class="button outline" data-use-jisho="${i}">${escapes(t('use'))}</button></article>`).join('');
}

document.querySelectorAll('[data-language]').forEach(btn => btn.addEventListener('click', () => { state.language=btn.dataset.language; localStorage.setItem('vocabulary-language',state.language); translatePage(); }));
$('#filter').addEventListener('input', event => { state.query=event.target.value; renderWords(); });
$('#sign-in-form').addEventListener('submit', async event => {
  event.preventDefault(); const email=$('#email').value.trim(); const button=event.submitter; button.disabled=true;
  setMessage($('#auth-message'),'');
  const redirect = `${location.origin}${location.pathname}`;
  const {error} = await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:redirect,shouldCreateUser:true}});
  button.disabled=false;
  if (error) { console.error(error); setMessage($('#auth-message'),error.message || t('emailError'),true); }
  else setMessage($('#auth-message'),t('linkSent'));
});
$('#account-action').addEventListener('click',async()=>{
  if(state.user){await supabase.auth.signOut();return;}
  $('#auth-panel').classList.toggle('hidden');
  if(!$('#auth-panel').classList.contains('hidden')){$('#auth-panel').scrollIntoView({behavior:'smooth',block:'center'});$('#email').focus();}
});
$('#words').addEventListener('click',event=>{
  const open=event.target.closest('[data-open]'); if(open){const word=state.list.find(w=>w.id===open.dataset.open);if(word)void showDetails(word);return;}
  const listen=event.target.closest('[data-speak]');if(listen){const word=state.list.find(w=>w.id===listen.dataset.speak);if(word)speak(word);return;}
  const del=event.target.closest('[data-delete]');if(del)void deleteWord(del.dataset.delete);
});
$('#add-open').addEventListener('click',()=>{$('#word-form').reset();setMessage($('#form-message'),'');$('#dialog-title').textContent=t('newWord');$('#word-dialog').showModal();});
$('#word-form').addEventListener('submit',async event=>{
  event.preventDefault(); const form=event.currentTarget; const values=Object.fromEntries(new FormData(form)); const submit=form.querySelector('[type=submit]');submit.disabled=true;submit.textContent=t('saving');
  const row={id:crypto.randomUUID(),ja:String(values.ja).trim(),en:String(values.en).trim(),cs:String(values.cs).trim(),description_cs:String(values.description_cs||'').trim(),description_en:String(values.description_en||'').trim()};
  submit.disabled=false;submit.textContent=t('saveWord');
  if(state.user){
    const result=await supabase.from('dictionary_words').insert(row).select('id,ja,en,cs,description_cs,description_en,image_path').single();
    if(result.error){console.error(result.error);setMessage($('#form-message'),t('saveError'),true);return;}
    state.list.push(result.data);
  } else {
    state.list.push(row); if(!saveLocalWords())return;
  }
  renderWords();$('#word-dialog').close();showToast(t('saved'));
});
async function deleteWord(id){
  const word=state.list.find(w=>w.id===id);if(!word||!confirm(t('confirmDelete')))return;
  if(state.user){
    if(word.image_path){const removed=await supabase.storage.from('dictionary-images').remove([word.image_path]);if(removed.error)console.error(removed.error);}
    const result=await supabase.from('dictionary_words').delete().eq('id',id);
    if(result.error){console.error(result.error);showToast(t('saveError'));return;}
  }
  state.list=state.list.filter(w=>w.id!==id);
  if(!state.user&&!saveLocalWords())return;
  renderWords();$('#detail-dialog').close();showToast(t('deleted'));
}
$('#detail-content').addEventListener('click',event=>{
  if(event.target.closest('[data-close-detail]'))$('#detail-dialog').close();
  if(event.target.closest('[data-detail-speak]')&&state.selected)speak(state.selected);
  if(event.target.closest('[data-upload="photo"]'))$('#photo-file').click();
  if(event.target.closest('[data-upload="camera"]'))$('#camera-file').click();
  const del=event.target.closest('[data-delete]');if(del)void deleteWord(del.dataset.delete);
});
async function uploadPhoto(file){
  const word=state.selected;if(!file||!word)return;
  if(file.size>8*1024*1024||!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)){showToast(t('photoError'));return;}
  if(!state.user){
    try {
      const bitmap=await createImageBitmap(file); const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
      const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
      canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
      const image_data=canvas.toDataURL('image/jpeg',.82);
      state.list=state.list.map(w=>w.id===word.id?{...w,image_data}:w);
      if(!saveLocalWords())return;
      state.selected=state.list.find(w=>w.id===word.id);await showDetails(state.selected);showToast(t('photoSaved'));
    } catch(error) { console.error(error);showToast(t('photoError')); }
    return;
  }
  const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'}[file.type];const path=`${state.user.id}/${word.id}-${crypto.randomUUID()}.${ext}`;
  const uploaded=await supabase.storage.from('dictionary-images').upload(path,file,{upsert:false,contentType:file.type});
  if(uploaded.error){console.error(uploaded.error);showToast(t('photoError'));return;}
  const updated=await supabase.from('dictionary_words').update({image_path:path}).eq('id',word.id).select('id,ja,en,cs,description_cs,description_en,image_path').single();
  if(updated.error){console.error(updated.error);await supabase.storage.from('dictionary-images').remove([path]);showToast(t('photoError'));return;}
  if(word.image_path)await supabase.storage.from('dictionary-images').remove([word.image_path]);
  state.list=state.list.map(w=>w.id===word.id?updated.data:w);await showDetails(updated.data);showToast(t('photoSaved'));
}
$('#photo-file').addEventListener('change',event=>{void uploadPhoto(event.target.files?.[0]);event.target.value='';});
$('#camera-file').addEventListener('change',event=>{void uploadPhoto(event.target.files?.[0]);event.target.value='';});
$('#jisho-form').addEventListener('submit',async event=>{
  event.preventDefault();const query=$('#jisho-query').value.trim();if(!query)return;
  state.jisho=[];renderJisho();setMessage($('#jisho-message'),t('searching'));
  try{
    const response=await fetch(`https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(query)}`);if(!response.ok)throw new Error('Jisho');
    const data=await response.json();state.jisho=(data.data||[]).slice(0,5).map(item=>{const jp=item.japanese?.[0]||{};const reading=jp.reading||jp.word||query;const meanings=[...new Set((item.senses||[]).flatMap(s=>s.english_definitions||[]))].slice(0,4);return {word:jp.word||reading,reading,romaji:toRomaji(reading),meanings,url:`https://jisho.org${item.slug||'/search/'+encodeURIComponent(query)}`};});
    renderJisho();setMessage($('#jisho-message'),state.jisho.length?'':t('noJisho'));
  }catch(error){console.error(error);setMessage($('#jisho-message'),`${t('jishoError')} `);$('#jisho-message').insertAdjacentHTML('beforeend',`<a href="https://jisho.org/search/${encodeURIComponent(query)}" target="_blank" rel="noreferrer">${escapes(t('openJisho'))}</a>`);}
});
$('#jisho-results').addEventListener('click',event=>{
  const button=event.target.closest('[data-use-jisho]');if(!button)return;const r=state.jisho[Number(button.dataset.useJisho)];if(!r)return;
  $('#word-form').reset();$('#word-form [name=ja]').value=r.romaji;$('#word-form [name=en]').value=r.meanings[0]||$('#jisho-query').value;$('#word-form [name=description_en]').value=r.meanings.join('; ');$('#dialog-title').textContent=t('newWord');$('#word-dialog').showModal();
});
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();}));

translatePage();
const {data:{session}}=await supabase.auth.getSession();
if(session?.user) await enterApp(session.user);
else {$('#app-panel').classList.remove('hidden');state.list=readLocalWords();renderWords();}
supabase.auth.onAuthStateChange((_event,session)=>{
  if(session?.user&&!state.user){setTimeout(()=>void enterApp(session.user),0);}
  else if(!session?.user&&state.user){
    state.user=null;state.list=readLocalWords();saveLocalWords();renderWords();
    $('#app-panel').classList.remove('hidden');$('#auth-panel').classList.add('hidden');translatePage();
  }
});
