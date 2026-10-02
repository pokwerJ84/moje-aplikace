import {env} from 'cloudflare:workers';
import {initialWords} from './words';
export function database(){if(!env.DB)throw Error('Storage unavailable');return env.DB;}
export function bucket(){if(!env.BUCKET)throw Error('Images unavailable');return env.BUCKET;}
export async function ensureWords(){const db=database();await db.batch([...initialWords.map(w=>db.prepare("INSERT OR IGNORE INTO words(id,cs,en,ja,description) SELECT ?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM settings WHERE key='seeded')").bind(w.id,w.cs,w.en,w.ja,w.description)),db.prepare("INSERT OR IGNORE INTO settings(key,value) VALUES ('seeded','1')")]);}
