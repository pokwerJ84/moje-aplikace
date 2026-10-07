import { initManuals } from './manuals.js?v=14';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { toHiragana, toRomaji } from 'https://esm.sh/wanakana@5.3.1';

// This is a publishable key. Access to every dictionary row and image is
// restricted by the Supabase RLS and Storage policies created for this app.
const LOCAL_KEY = 'technical-dictionary-local-v1';
const SUPABASE_URL = 'https://pornzqperiptczusueso.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable__4347c8h__yHW49VfXmTfw_9XnTC--n';
let passwordRecovery = new URLSearchParams(location.search).get('recovery') === '1' || new URLSearchParams(location.hash.slice(1)).get('type') === 'recovery';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, storage: window.localStorage, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
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
].map(([id,cs,en,ja,description_cs,description_en]) => ({id,cs,en,ja,description_cs,description_en,description_ja:''}));

const words = {
  cs: {title:'Technický slovník',subtitle:'Moje slovíčka z praxe',signInTitle:'Přihlášení do slovníku',signInHelp:'Přihlas se e-mailem a heslem. Přihlášení si aplikace na tomto zařízení zapamatuje.',email:'E-mail',sendLink:'Poslat odkaz',linkSent:'Odkaz je na cestě. Otevři e-mail na tomto zařízení a klikni na odkaz.',signOut:'Odhlásit',guestSignIn:'Přihlásit se',password:'Heslo',signIn:'Přihlásit se',register:'Vytvořit účet',forgotPassword:'Zapomenuté heslo',newPassword:'Nové heslo (alespoň 8 znaků)',savePassword:'Uložit heslo',passwordSaved:'Heslo je uložené. Příště se přihlas e-mailem a heslem.',signedIn:'Přihlášen:',guestStatus:'Nepřihlášen · slovíčka a fotky jsou jen v tomto zařízení',syncing:'Načítám slovníček z účtu…',synced:'Uloženo v účtu',localOnly:'Uloženo jen v tomto zařízení',authFailed:'Přihlášení se nepodařilo. Zkontroluj e-mail a heslo.',resetSent:'Poslal jsem odkaz pro nastavení nového hesla. Pak se budeš přihlašovat e-mailem a heslem.',confirmEmail:'Pokud se vytváří nový účet, potvrď e-mail z doručené zprávy. Pokud už účet máš, přihlas se nebo použij Zapomenuté heslo; opakovaná registrace heslo nezmění.',myWords:'Můj slovník',hint:'Japonsky · anglicky · česky. Klikni na slovíčko pro popis nebo fotku.',searchLabel:'Hledat japonsky, anglicky nebo česky',searchOnline:'Jisho',searchPlaceholder:'Hledej mezi svými slovíčky…',addWord:'Přidat slovíčko',japanese:'Japonsky',english:'Anglicky',czech:'Česky',actions:'Akce',empty:'Slovník je prázdný. Přidej své první slovíčko.',noResults:'Nic jsem nenašel. Zkus jiné slovo.',lookupTitle:'Najít nové slovíčko',lookupSubtitle:'Anglicko-japonský slovník Jisho',lookupLabel:'Anglický nebo japonský výraz',lookupPlaceholder:'Např. voltage, bearing, fan…',search:'Vyhledat',searching:'Hledám…',noJisho:'Žádný výsledek. Zkus jiné slovo nebo otevři Jisho.',jishoError:'Jisho teď neodpovídá. Můžeš hledat přímo na Jisho.',openJisho:'Otevřít Jisho',details:'Detail na Jisho',use:'Použít',newWord:'Nové slovíčko',allLanguages:'Vyplň výraz a případně popis jen v jednom jazyce.',japaneseRomaji:'Japonsky',descriptionJa:'Popis japonsky (volitelné)',descriptionCs:'Popis česky (volitelné)',descriptionEn:'Popis anglicky (volitelné)',dictationLanguage:'Jazyk diktování',dictateWord:'🎙 Nadiktovat slovo',dictateDescription:'🎙 Nadiktovat popis',dictationUnsupported:'Diktování tento prohlížeč nepodporuje.',dictationListening:'Poslouchám… Mluv teď.',dictationError:'Diktování se nepodařilo. Zkontroluj oprávnění mikrofonu.',saveWord:'Uložit slovíčko',saving:'Ukládám…',listen:'Poslechnout',translationNote:'Výraz a popis se automaticky přeloží do dalších jazyků. Text odešleme překladové službě; překlad si před uložením zkontroluj.',enterOne:'Vyplň výraz alespoň v jednom jazyce.',translationError:'Překlad se nepodařilo získat. Zkontroluj připojení nebo zkus kratší text.',noDescription:'K tomuto slovíčku zatím není popis v tomto jazyce.',noDescriptionEn:'K tomuto slovíčku zatím není anglický popis.',noDescriptionCs:'K tomuto slovíčku zatím není český popis.',photoPrompt:'Přidej fotku z práce nebo vlastní obrázek.',addPhoto:'Přidat obrázek',takePhoto:'Vyfotit',photoLimit:'JPG, PNG, WebP nebo GIF · do 8 MB.',delete:'Smazat',confirmDelete:'Opravdu smazat toto slovíčko?',cancel:'Zrušit',close:'Zavřít',longVowels:'Dlouhá samohláska: ū = uu, ō = ou, ē = ee.',loading:'Načítám slovník…',loadError:'Slovník se nepodařilo načíst. Zkus to znovu.',saveError:'Slovíčko se nepodařilo uložit.',photoError:'Fotku se nepodařilo uložit.',emailError:'Přihlašovací odkaz se nepodařilo poslat.',speechError:'Japonská výslovnost není v tomto prohlížeči dostupná.',saved:'Uloženo.',deleted:'Slovíčko smazáno.',photoSaved:'Fotka uložena.',romaji:'Rómadži'},
  en: {title:'Technical vocabulary',subtitle:'My work vocabulary',signInTitle:'Sign in to your dictionary',signInHelp:'Sign in with your email and password. Your session will be remembered on this device.',email:'Email',sendLink:'Send sign-in link',linkSent:'The link is on its way. Open your email on this device and follow it.',signOut:'Sign out',guestSignIn:'Sign in',password:'Password',signIn:'Sign in',register:'Create account',forgotPassword:'Forgot password',newPassword:'New password (at least 8 characters)',savePassword:'Save password',passwordSaved:'Password saved. Next time, sign in with email and password.',signedIn:'Signed in:',guestStatus:'Not signed in · words and photos are stored on this device only',syncing:'Loading your account vocabulary…',synced:'Saved to your account',localOnly:'Stored on this device only',authFailed:'Could not sign in. Check your email and password.',resetSent:'A password reset link has been sent. After setting a password, use email and password to sign in.',confirmEmail:'If a new account is being created, confirm the email in your inbox. If you already have an account, sign in or use Forgot password; registering again does not change your password.',myWords:'My vocabulary',hint:'Japanese · English · Czech. Select a word to view its description or photo.',searchLabel:'Search Japanese, English or Czech',searchOnline:'Jisho',searchPlaceholder:'Search your vocabulary…',addWord:'Add a word',japanese:'Japanese',english:'English',czech:'Czech',actions:'Actions',empty:'Your dictionary is empty. Add your first word.',noResults:'No matches. Try another word.',lookupTitle:'Find a new word',lookupSubtitle:'English–Japanese dictionary · Jisho',lookupLabel:'English or Japanese term',lookupPlaceholder:'For example: voltage, bearing, fan…',search:'Search',searching:'Searching…',noJisho:'No results. Try another word or open Jisho.',jishoError:'Jisho is not responding. You can search directly on Jisho.',openJisho:'Open Jisho',details:'Jisho details',use:'Use',newWord:'New word',allLanguages:'Enter the word and, if you like, its description in just one language.',japaneseRomaji:'Japanese',descriptionJa:'Description in Japanese (optional)',descriptionCs:'Description in Czech (optional)',descriptionEn:'Description in English (optional)',dictationLanguage:'Dictation language',dictateWord:'🎙 Dictate word',dictateDescription:'🎙 Dictate description',dictationUnsupported:'Dictation is not supported by this browser.',dictationListening:'Listening… Speak now.',dictationError:'Dictation failed. Check microphone permission.',saveWord:'Save word',saving:'Saving…',listen:'Listen',translationNote:'The term and description will be translated into the other languages. Text is sent to a translation service; review the result before saving.',enterOne:'Enter the term in at least one language.',translationError:'Could not get a translation. Check your connection or try shorter text.',noDescription:'There is no description in this language yet.',noDescriptionEn:'There is no English description for this word yet.',noDescriptionCs:'There is no Czech description for this word yet.',photoPrompt:'Add a work photo or your own image.',addPhoto:'Add image',takePhoto:'Take photo',photoLimit:'JPG, PNG, WebP or GIF · up to 8 MB.',delete:'Delete',confirmDelete:'Delete this word?',cancel:'Cancel',close:'Close',longVowels:'Long vowels: ū = uu, ō = ou, ē = ee.',loading:'Loading vocabulary…',loadError:'Could not load your vocabulary. Please try again.',saveError:'Could not save the word.',photoError:'Could not save the photo.',emailError:'Could not send the sign-in link.',speechError:'Japanese speech is not available in this browser.',saved:'Saved.',deleted:'Word deleted.',photoSaved:'Photo saved.',romaji:'Romaji'},
};
Object.assign(words.cs,{autoTranslate:'Automaticky doplnit překlady',translationNote:'Překlad je volitelný. Bez něj se chybějící japonský nebo anglický název označí červeně a můžeš ho později doplnit přes Upravit.',editWord:'Upravit slovíčko',incomplete:'Chybí japonský nebo anglický název',completionHint:'Červené slovíčko = chybí japonský nebo anglický název. Doplň ho přes ✎ Upravit.'});
Object.assign(words.en,{autoTranslate:'Automatically fill missing translations',translationNote:'Translation is optional. Missing Japanese or English names are marked red; complete them later using Edit.',editWord:'Edit word',incomplete:'Japanese or English name missing',completionHint:'Red word = Japanese or English name missing. Use ✎ Edit to complete it.'});
const $ = (selector) => document.querySelector(selector);
const state = {language:localStorage.getItem('vocabulary-language') === 'en' ? 'en' : 'cs', user:null, list:[], query:'', selected:null, detailLanguage:'cs', jisho:[], sync:'', authMode:'login', loadingUser:null};
function readLocalWords() {
  try { const saved=JSON.parse(localStorage.getItem(LOCAL_KEY)); if(Array.isArray(saved)) return saved; } catch(error) { console.warn('Could not read local dictionary',error); }
  return initialWords.map(word=>({...word,id:`guest:${word.id}`}));
}
function saveLocalWords(list=state.list) {
  try { localStorage.setItem(state.user ? `${LOCAL_KEY}:${state.user.id}` : LOCAL_KEY,JSON.stringify(list)); return true; }
  catch(error) { console.error(error); showToast(t('saveError')); return false; }
}
state.list=readLocalWords();
const t = (key) => words[state.language][key] || words.cs[key] || key;
const escapes = (value='') => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const pronunciation = {voltage:'でんあつ',current:'でんりゅう',speed:'かいてんそくど',measurement:'そくてい','power-supply':'でんげん',tachometer:'かいてんけい',multimeter:'まるちめーたー',connection:'せつぞく',pq:'ふうりょうせいあつとくせい',noise:'そうおん'};
const starterJa = {
  voltage:'電圧は電位の差です。単位はボルト（V）です。ファンの試験では、電源電圧や起動電圧を測定します。',
  current:'電流は電荷の流れです。単位はアンペア（A）です。ファンが消費する電流を測定します。',
  speed:'回転体が回る速さです。通常、1分あたりの回転数（rpmまたはr/min）で表します。',
  measurement:'測定器を使って物理量の値を調べることです。ファンでは電圧、電流、回転速度、騒音などを測定します。',
  'power-supply':'電力を供給する装置です。実験用電源では電圧を設定し、通常は電流も制限できます。',
  tachometer:'回転速度を測定する装置です。光学式回転計は、回転部のマークからの反射を検出します。',
  multimeter:'電圧、電流、抵抗など複数の測定機能を備えた計器です。測定機能とリード線の端子を正しく選びます。',
  connection:'電線、計器、部品などをつなぐことです。電気試験では、ファンを電源に接続することを指します。',
  pq:'ファンの風量Qと静圧Pの関係を示す曲線です。流れの抵抗が変化したときの風量を表します。',
  noise:'ファンが発生する音です。音圧レベルはdB(A)で表すことがよくあります。電気的なノイズとは意味が異なります。'
};
initialWords.forEach(word=>word.description_ja=starterJa[word.id]);
state.list=state.list.map(word=>({...word,description_ja:word.description_ja||starterJa[String(word.id).split(':').at(-1)]||''}));
saveLocalWords(state.list);
async function translateText(text, from, to) {
  const response=await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`);
  if(!response.ok) throw new Error(t('translationError'));
  const data=await response.json();
  if(data.responseStatus!==200||!data.responseData?.translatedText) throw new Error(data.responseDetails||t('translationError'));
  return data.responseData.translatedText;
}

function translatePage() {
  document.documentElement.lang = state.language;
  document.title = t('title');
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  $('#email').placeholder = t('email');
  $('#account-action').textContent = state.user ? t('signOut') : t('guestSignIn');
  $('#filter').placeholder = t('searchPlaceholder');
  document.querySelectorAll('[data-language]').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.language === state.language)));
  updateAccountStatus();
  renderWords();
  renderJisho();
  manuals.render();
  if (state.selected && $('#detail-dialog').open) showDetails(state.selected,state.detailLanguage);
}

function updateAccountStatus(){
  $('#account-status').textContent=state.user ? `${t('signedIn')} ${state.user.email || ''}` : t('guestStatus');
  $('#account-status').classList.toggle('is-signed-in',!!state.user);
  $('#auth-submit').textContent=t(state.authMode==='register'?'register':'signIn');
  $('#auth-register').textContent=t(state.authMode==='register'?'signIn':'register');
  const photos=state.list.filter(w=>w.image_data||w.image_path).length;
  $('#sync-status').textContent=state.sync==='loading'?t('syncing'):state.sync==='error'?t('loadError'):`${t(state.user?'synced':'localOnly')} · ${photos} ${state.language==='en'?'photos':'fotek'}`;
}

function showToast(message) {
  const toast = $('#toast'); toast.textContent = message; toast.classList.add('visible');
  clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('visible'), 2200);
}
function setMessage(el, message, error=false) { el.textContent = message; el.classList.toggle('error', error); }
function renderWords() {
  const term = state.query.trim().toLocaleLowerCase();
  const filtered = state.list.filter(w => [w.ja,w.en,w.cs].some(value => String(value || '').toLocaleLowerCase().includes(term)));
  $('#word-count').textContent = `${filtered.length} ${state.language === 'en' ? (filtered.length === 1 ? 'word' : 'words') : 'slovíček'}`;
  updateAccountStatus();
  $('#words').innerHTML = filtered.map((w,i) => `<tr class="${!w.ja.trim()||!w.en.trim()?'incomplete':''}" title="${!w.ja.trim()||!w.en.trim()?escapes(t('incomplete')):''}"><td><div class="jp-cell"><button class="word-name ja" data-open="${escapes(w.id)}" data-detail-lang="ja">${escapes(w.ja||'—')}</button><button class="speak" data-speak="${escapes(w.id)}" title="${escapes(t('listen'))}" aria-label="${escapes(t('listen'))}: ${escapes(w.ja)}">🔊</button></div></td><td><button class="word-name" data-open="${escapes(w.id)}" data-detail-lang="en">${escapes(w.en||'—')}${w.image_data||w.image_path ? ' <span aria-label="Photo">▧</span>' : ''}</button></td><td class="czech-column"><button class="word-name" data-open="${escapes(w.id)}" data-detail-lang="cs">${escapes(w.cs)}</button></td><td><button class="icon-button" data-edit="${escapes(w.id)}" title="${escapes(t('editWord'))}" aria-label="${escapes(t('editWord'))}">✎</button><button class="delete" data-delete="${escapes(w.id)}" title="${escapes(t('delete'))}" aria-label="${escapes(t('delete'))} ${escapes(w.ja)}">⌫</button></td></tr>`).join('');
  $('#empty').classList.toggle('hidden', !!state.list.length);
  $('#no-results').classList.toggle('hidden', !state.list.length || !!filtered.length);
}
let activeUtterance = null;
let speechVoices = window.speechSynthesis?.getVoices() || [];
window.speechSynthesis?.addEventListener('voiceschanged',()=>{speechVoices=window.speechSynthesis.getVoices();});
function speak(word) {
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return showToast(t('speechError'));
  const shortId=String(word.id).split(':').at(-1);
  const text = pronunciation[word.id] || pronunciation[shortId] || toHiragana(word.ja) || word.ja;
  const engine=window.speechSynthesis;
  engine.cancel();
  activeUtterance = new SpeechSynthesisUtterance(text);
  activeUtterance.lang='ja-JP'; activeUtterance.rate=.86;
  const voice=(speechVoices.length?speechVoices:engine.getVoices()).find(v=>/^ja(?:-|$)/i.test(v.lang));
  if(voice) activeUtterance.voice=voice;
  activeUtterance.onend=()=>{activeUtterance=null;};
  activeUtterance.onerror=event=>{activeUtterance=null;if(!['canceled','interrupted'].includes(event.error))showToast(t('speechError'));};
  engine.resume();
  engine.speak(activeUtterance);
}
async function syncGuestWords(user) {
  const localWords = readLocalWords();
  const result = await supabase.from('dictionary_words').select('id,ja,en,cs,description_ja,description_cs,description_en,image_path').order('created_at',{ascending:true});
  if (result.error) throw result.error;
  const cloudWords = result.data || [];
  const cloudByTerm = new Map(cloudWords.map(w=>[[w.ja,w.en,w.cs].map(v=>String(v||'').trim().toLocaleLowerCase()).join('|'),w]));
  for (const word of localWords) {
    const key=[word.ja,word.en,word.cs].map(v=>String(v||'').trim().toLocaleLowerCase()).join('|');
    const existing=cloudByTerm.get(key);
    if(existing&&(!word.image_data||existing.image_path))continue;
    let image_path=null;
    if (word.image_data) {
      const response=await fetch(word.image_data); const blob=await response.blob();
      const ext=(blob.type.split('/')[1]||'jpg').replace('jpeg','jpg');
      image_path=`${user.id}/${crypto.randomUUID()}.${ext}`;
      const uploaded=await supabase.storage.from('dictionary-images').upload(image_path,blob,{upsert:false,contentType:blob.type||'image/jpeg'});
      if(uploaded.error) throw uploaded.error;
    }
    const row={id:`${user.id}:${crypto.randomUUID()}`,ja:word.ja,en:word.en,cs:word.cs,description_ja:word.description_ja||'',description_cs:word.description_cs||'',description_en:word.description_en||'',image_path};
    const {error}=existing ? await supabase.from('dictionary_words').update({image_path}).eq('id',existing.id) : await supabase.from('dictionary_words').insert(row);
    if(error) throw error;
  }
  const refreshed=await supabase.from('dictionary_words').select('id,ja,en,cs,description_ja,description_cs,description_en,image_path').order('created_at',{ascending:true});
  if(refreshed.error) throw refreshed.error;
  const imageByTerm=new Map(localWords.filter(w=>w.image_data).map(w=>[[w.ja,w.en,w.cs].map(v=>String(v||'').trim().toLocaleLowerCase()).join('|'),w.image_data]));
  const merged=(refreshed.data||[]).map(w=>({...w,description_ja:w.description_ja||starterJa[String(w.id).split(':').at(-1)]||'',image_data:imageByTerm.get([w.ja,w.en,w.cs].map(v=>String(v||'').trim().toLocaleLowerCase()).join('|'))||null}));
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
    const rows = initialWords.map(w => ({id:`${state.user.id}:${w.id}`,ja:w.ja,en:w.en,cs:w.cs,description_ja:w.description_ja,description_cs:w.description_cs,description_en:w.description_en}));
    const inserted = await supabase.from('dictionary_words').upsert(rows,{onConflict:'id',ignoreDuplicates:true});
    if (inserted.error) throw inserted.error;
    const marked = await supabase.from('dictionary_profiles').update({seeded:true}).eq('owner_id',state.user.id);
    if (marked.error) throw marked.error;
  }
  state.list=await syncGuestWords(state.user);
  renderWords();
}
async function enterApp(user) {
  if(state.loadingUser===user.id)return;
  state.loadingUser=user.id;state.user=user;state.sync='loading';
  if(passwordRecovery)showPasswordRecovery();else $('#auth-panel').classList.add('hidden');$('#app-panel').classList.remove('hidden');translatePage();
  try { await loadWords();state.sync='ready'; }
  catch(error){console.error(error);state.sync='error';showToast(t('loadError'));}
  finally{state.loadingUser=null;updateAccountStatus();}
  await manuals.setUser();
}
async function showDetails(word, language=state.language) {
  state.selected=word;
  state.detailLanguage=language;
  const description = word[`description_${language}`];
  const emptyDescription = t('noDescription');
  const term=word[language]||word.ja;
  const otherTerms=[['ja',word.ja],['en',word.en],['cs',word.cs]].filter(([lang])=>lang!==language).map(([lang,value])=>`<button class="detail-term" type="button" data-description-lang="${lang}"><small>${escapes(t(lang==='ja'?'japanese':lang==='en'?'english':'czech'))}</small><strong>${escapes(value)}</strong></button>`).join('');
  $('#detail-content').innerHTML = `<div class="dialog-heading"><div><h2 class="detail-title">${escapes(term)}</h2><div class="detail-subtitle detail-terms">${otherTerms}</div></div><button class="icon-button" data-close-detail aria-label="${escapes(t('close'))}">×</button></div><div class="detail-pronunciation"><strong>${escapes(word.ja)}</strong><button class="button outline" data-detail-speak>🔊 ${escapes(t('listen'))}</button></div><p class="definition">${escapes(description || emptyDescription)}</p><div id="detail-photo" class="photo-placeholder">${escapes(t('photoPrompt'))}</div><div class="detail-actions"><button class="button primary" data-edit="${escapes(word.id)}">${escapes(t('editWord'))}</button><button class="button outline" data-upload="photo">▧ ${escapes(t('addPhoto'))}</button><button class="button outline" data-upload="camera">◉ ${escapes(t('takePhoto'))}</button><button class="button outline" data-delete="${escapes(word.id)}">${escapes(t('delete'))}</button></div><p class="hint">${escapes(t('photoLimit'))}</p>`;
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
$('#sign-in-form').addEventListener('submit',async event=>{
  event.preventDefault();const button=event.submitter;button.disabled=true;setMessage($('#auth-message'),'');
  try{
    const email=$('#email').value.trim(),password=$('#password').value;
    const result=state.authMode==='register' ? await supabase.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}}) : await supabase.auth.signInWithPassword({email,password});
    if(result.error)throw result.error;
    $('#password').value='';
    if(result.data.session?.user)await enterApp(result.data.session.user);
    else {
      setMessage($('#auth-message'),t('confirmEmail'));
      state.authMode='login';
      $('#password').autocomplete='current-password';
      updateAccountStatus();
    }
  }catch(error){setMessage($('#auth-message'),error.code==='invalid_credentials'?t('authFailed'):error.message||t('authFailed'),true);}
  finally{button.disabled=false;}
});
$('#auth-register').addEventListener('click',()=>{state.authMode=state.authMode==='login'?'register':'login';$('#password').autocomplete=state.authMode==='register'?'new-password':'current-password';updateAccountStatus();});
$('#auth-reset').addEventListener('click',async()=>{
  if(!$('#email').reportValidity())return;
  const button=$('#auth-reset');button.disabled=true;
  try{const {error}=await supabase.auth.resetPasswordForEmail($('#email').value.trim(),{redirectTo:location.origin+location.pathname+'?recovery=1'});if(error)throw error;setMessage($('#auth-message'),t('resetSent'));}
  catch(error){setMessage($('#auth-message'),error.message,true);}finally{button.disabled=false;}
});
$('#password-form').addEventListener('submit',async event=>{
  event.preventDefault();event.submitter.disabled=true;
  try{const {error}=await supabase.auth.updateUser({password:$('#new-password').value});if(error)throw error;passwordRecovery=false;$('#new-password').value='';$('#auth-panel').classList.add('hidden');$('#sign-in-form').classList.remove('hidden');$('.auth-links').classList.remove('hidden');$('#password-form').classList.add('hidden');history.replaceState({},'',location.pathname);showToast(t('passwordSaved'));}
  catch(error){setMessage($('#auth-message'),error.message,true);}finally{event.submitter.disabled=false;}
});
$('#account-action').addEventListener('click',async()=>{
  if(state.user){const {error}=await supabase.auth.signOut();if(error)showToast(error.message);return;}
  $('#auth-panel').classList.toggle('hidden');
  if(!$('#auth-panel').classList.contains('hidden')){$('#auth-panel').scrollIntoView({behavior:'smooth',block:'center'});$('#email').focus();}
});
$('#words').addEventListener('click',event=>{
  const edit=event.target.closest('[data-edit]');if(edit){editWord(edit.dataset.edit);return;}
  const open=event.target.closest('[data-open]'); if(open){const word=state.list.find(w=>w.id===open.dataset.open);if(word)void showDetails(word,open.dataset.detailLang);return;}
  const listen=event.target.closest('[data-speak]');if(listen){const word=state.list.find(w=>w.id===listen.dataset.speak);if(word)speak(word);return;}
  const del=event.target.closest('[data-delete]');if(del)void deleteWord(del.dataset.delete);
});
$('#add-open').addEventListener('click',()=>{$('#word-form').reset();delete $('#word-form').dataset.editId;setMessage($('#form-message'),'');$('#dialog-title').textContent=t('newWord');$('#word-dialog').showModal();});
$('#word-close').addEventListener('click',()=>$('#word-dialog').close());
$('#word-form').addEventListener('submit',async event=>{
  event.preventDefault(); const form=event.currentTarget; const values=Object.fromEntries(new FormData(form)); const submit=form.querySelector('[type=submit]');submit.disabled=true;submit.textContent=t('saving');
  const editingId=form.dataset.editId;
  const row={id:editingId||crypto.randomUUID(),ja:String(values.ja).trim(),en:String(values.en).trim(),cs:String(values.cs).trim(),description_ja:String(values.description_ja||'').trim(),description_cs:String(values.description_cs||'').trim(),description_en:String(values.description_en||'').trim()};
  try {
    const source=['ja','en','cs'].find(lang=>row[lang]);
    if(!source) throw new Error(t('enterOne'));
    const langs=values.autoTranslate?['ja','en','cs']:[];
    for(const target of langs) if(target!==source && !row[target]) row[target]=await translateText(row[source],source,target);
    const descriptionSource=langs.find(lang=>row[`description_${lang}`]);
    if(descriptionSource) for(const target of langs) if(target!==descriptionSource&&!row[`description_${target}`]) row[`description_${target}`]=await translateText(row[`description_${descriptionSource}`],descriptionSource,target);
  } catch(error) { console.error(error); submit.disabled=false;submit.textContent=t('saveWord');setMessage($('#form-message'),error.message||t('translationError'),true);return; }
  submit.disabled=false;submit.textContent=t('saveWord');
  if(state.user){
    const result=await (editingId?supabase.from('dictionary_words').update(row).eq('id',editingId):supabase.from('dictionary_words').insert(row)).select('id,ja,en,cs,description_ja,description_cs,description_en,image_path').single();
    if(result.error){console.error(result.error);setMessage($('#form-message'),t('saveError'),true);return;}
    state.list=editingId?state.list.map(w=>w.id===editingId?result.data:w):[...state.list,result.data];
  } else {
    const next=editingId?state.list.map(w=>w.id===editingId?{...w,...row}:w):[...state.list,row]; if(!saveLocalWords(next))return;state.list=next;
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
function editWord(id){
  const word=state.list.find(w=>w.id===id);if(!word)return;
  $('#detail-dialog').close();$('#word-form').reset();$('#word-form').dataset.editId=id;
  for(const name of ['ja','en','cs','description_ja','description_en','description_cs'])$('#word-form').elements[name].value=word[name]||'';
  setMessage($('#form-message'),'');$('#dialog-title').textContent=t('editWord');$('#word-dialog').showModal();
}
$('#detail-content').addEventListener('click',event=>{
  const edit=event.target.closest('[data-edit]');if(edit){editWord(edit.dataset.edit);return;}

  const term=event.target.closest('[data-description-lang]');if(term&&state.selected){void showDetails(state.selected,term.dataset.descriptionLang);return;}
  if(event.target.closest('[data-close-detail]'))$('#detail-dialog').close();
  if(event.target.closest('[data-detail-speak]')&&state.selected)speak(state.selected);
  if(event.target.closest('[data-upload="photo"]'))$('#photo-file').click();
  if(event.target.closest('[data-upload="camera"]'))$('#camera-file').click();
  const del=event.target.closest('[data-delete]');if(del)void deleteWord(del.dataset.delete);
});
async function decodePhoto(file){
  if(typeof createImageBitmap==='function'){try{return await createImageBitmap(file);}catch(error){}}
  const url=URL.createObjectURL(file);
  try{return await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=url;});}
  finally{URL.revokeObjectURL(url);}
}
async function uploadPhoto(file){
  const word=state.selected;if(!file||!word)return;
  if(file.size>8*1024*1024||!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)){showToast(t('photoError'));return;}
  if(!state.user){
    try {
      const bitmap=await decodePhoto(file); const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
      const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
      canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();
      const image_data=canvas.toDataURL('image/jpeg',.82);
      state.list=state.list.map(w=>w.id===word.id?{...w,image_data}:w);
      if(!saveLocalWords())return;
      state.selected=state.list.find(w=>w.id===word.id);renderWords();await showDetails(state.selected,state.detailLanguage);showToast(t('photoSaved'));
    } catch(error) { console.error(error);showToast(t('photoError')); }
    return;
  }
  const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'}[file.type];const path=`${state.user.id}/${word.id}-${crypto.randomUUID()}.${ext}`;
  const uploaded=await supabase.storage.from('dictionary-images').upload(path,file,{upsert:false,contentType:file.type});
  if(uploaded.error){console.error(uploaded.error);showToast(t('photoError'));return;}
  const updated=await supabase.from('dictionary_words').update({image_path:path}).eq('id',word.id).select('id,ja,en,cs,description_ja,description_cs,description_en,image_path').single();
  if(updated.error){console.error(updated.error);await supabase.storage.from('dictionary-images').remove([path]);showToast(t('photoError'));return;}
  if(word.image_path)await supabase.storage.from('dictionary-images').remove([word.image_path]);
  state.list=state.list.map(w=>w.id===word.id?updated.data:w);saveLocalWords();renderWords();await showDetails(updated.data);showToast(t('photoSaved'));
}
$('#photo-file').addEventListener('change',event=>{void uploadPhoto(event.target.files?.[0]);event.target.value='';});
$('#camera-file').addEventListener('change',event=>{void uploadPhoto(event.target.files?.[0]);event.target.value='';});
async function searchJisho(query) {
  query=String(query||'').trim(); if(!query)return;
  state.jisho=[];renderJisho();setMessage($('#jisho-message'),t('searching'));
  try{
    const response=await fetch(`https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent(query)}`);if(!response.ok)throw new Error('Jisho');
    const data=await response.json();state.jisho=(data.data||[]).slice(0,5).map(item=>{const jp=item.japanese?.[0]||{};const reading=jp.reading||jp.word||query;const meanings=[...new Set((item.senses||[]).flatMap(s=>s.english_definitions||[]))].slice(0,4);return {word:jp.word||reading,reading,romaji:toRomaji(reading),meanings,url:`https://jisho.org${item.slug||'/search/'+encodeURIComponent(query)}`};});
    renderJisho();setMessage($('#jisho-message'),state.jisho.length?'':t('noJisho'));
  }catch(error){console.error(error);setMessage($('#jisho-message'),`${t('jishoError')} `);$('#jisho-message').insertAdjacentHTML('beforeend',`<a href="https://jisho.org/search/${encodeURIComponent(query)}" target="_blank" rel="noreferrer">${escapes(t('openJisho'))}</a>`);}
}
$('#jisho-search').addEventListener('click',()=>void searchJisho($('#filter').value));
function startDictation(kind,button) {
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Recognition){showToast(t('dictationUnsupported'));return;}
  const lang=$('#dictation-language').value;
  const target=kind==='word'?({ 'ja-JP':'ja','en-US':'en','cs-CZ':'cs'}[lang]):({ 'ja-JP':'description_ja','en-US':'description_en','cs-CZ':'description_cs'}[lang]);
  const input=$(`#word-form [name="${target}"]`);
  const recognition=new Recognition(); recognition.lang=lang; recognition.interimResults=false; recognition.maxAlternatives=1;
  button.disabled=true;showToast(t('dictationListening'));
  recognition.onresult=event=>{const transcript=event.results?.[0]?.[0]?.transcript?.trim();if(transcript){input.value=[input.value.trim(),transcript].filter(Boolean).join(input.tagName==='TEXTAREA'?' ':' ');input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();}};
  recognition.onerror=()=>showToast(t('dictationError'));
  recognition.onend=()=>{button.disabled=false;};
  try{recognition.start();}catch(error){button.disabled=false;showToast(t('dictationError'));}
}
$('#dictate-word').addEventListener('click',event=>startDictation('word',event.currentTarget));
$('#dictate-description').addEventListener('click',event=>startDictation('description',event.currentTarget));
$('#jisho-results').addEventListener('click',event=>{
  const button=event.target.closest('[data-use-jisho]');if(!button)return;const r=state.jisho[Number(button.dataset.useJisho)];if(!r)return;
  $('#word-form').reset();delete $('#word-form').dataset.editId;$('#word-form [name=ja]').value=r.word||r.reading;$('#word-form [name=en]').value=r.meanings[0]||$('#filter').value;$('#word-form [name=description_en]').value=r.meanings.join('; ');$('#dialog-title').textContent=t('newWord');$('#word-dialog').showModal();
});
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target===dialog&&dialog.id!=='manual-editor')dialog.close();}));

const manuals=initManuals({supabase,getUser:()=>state.user,getLanguage:()=>state.language,toast:showToast,decodePhoto});
for(const section of ['words','manuals'])$('#tab-'+section).addEventListener('click',()=>{
  $('#dictionary-section').classList.toggle('hidden',section!=='words');$('#manual-section').classList.toggle('hidden',section!=='manuals');
  for(const tab of ['words','manuals'])$('#tab-'+tab).setAttribute('aria-pressed',String(tab===section));
});
function showPasswordRecovery() {
  passwordRecovery=true;
  $('#auth-panel').classList.remove('hidden');
  $('#sign-in-form').classList.add('hidden');
  $('.auth-links').classList.add('hidden');
  $('#password-form').classList.remove('hidden');
  $('#auth-panel').scrollIntoView({behavior:'smooth',block:'center'});
  $('#new-password').focus({preventScroll:true});
}
translatePage();
// Subscribe before getSession: the initial PKCE exchange can emit recovery immediately.
supabase.auth.onAuthStateChange((_event,session)=>{
  if(_event==='PASSWORD_RECOVERY'){
    state.user=session?.user||null;showPasswordRecovery();updateAccountStatus();
    if(session?.user)setTimeout(()=>void enterApp(session.user),0);
    return;
  }
  if(session?.user&&state.user?.id!==session.user.id){setTimeout(()=>void enterApp(session.user),0);}
  else if(!session?.user&&state.user){
    state.user=null;state.sync='';state.list=readLocalWords();void manuals.setUser();renderWords();
    $('#app-panel').classList.remove('hidden');$('#auth-panel').classList.add('hidden');translatePage();
  }
});
const {data:{session}}=await supabase.auth.getSession();
if(session?.user)await enterApp(session.user);
else {$('#app-panel').classList.remove('hidden');state.list=readLocalWords();renderWords();}
