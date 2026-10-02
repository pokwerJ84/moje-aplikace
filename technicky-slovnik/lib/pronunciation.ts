import { toHiragana } from 'wanakana';
const readings:Record<string,string>={voltage:'でんあつ',current:'でんりゅう',speed:'かいてんそくど',measurement:'そくてい','power-supply':'でんげん',tachometer:'かいてんけい',multimeter:'マルチメーター',connection:'せつぞく',pq:'ふうりょう せいあつ とくせい',noise:'そうおん'};
export function pronunciationText(romaji:string,id?:string){
 if(id&&readings[id])return readings[id];
 const normalized=romaji.toLowerCase().replace(/[’‘]/g,"'").replace(/ā/g,'aa').replace(/ī/g,'ii').replace(/ū/g,'uu').replace(/ē/g,'ee').replace(/ō/g,'ou').replace(/[–—-]/g,' ');
 return toHiragana(normalized);
}
export function normalizeSearch(text:string){return text.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[’‘']/g,'').replace(/[–—-]/g,' ').replace(/ou/g,'o').replace(/([aeiou])\1+/g,'$1').replace(/\s+/g,' ').trim();}
