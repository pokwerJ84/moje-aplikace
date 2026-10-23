export const wordFolder=word=>word?.folder==='personal'?'personal':'words';
export const wordKey=word=>JSON.stringify([wordFolder(word),...[word.ja,word.en,word.cs].map(value=>String(value||'').trim().toLocaleLowerCase())]);
export function folderWords(words,folder,query=''){
  const term=query.trim().toLocaleLowerCase();
  return words.filter(word=>wordFolder(word)===folder&&[word.ja,word.en,word.cs].some(value=>String(value||'').toLocaleLowerCase().includes(term)));
}
