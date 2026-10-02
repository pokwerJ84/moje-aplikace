# Technický slovník

Czech / English / Japanese romanized vocabulary for fan measurement training.

Live private app: https://jarduv-technicky-slovnik.pokwer1984.chatgpt.site

Includes 10 starter terms, entry details, adding and deleting entries, photo upload/camera selection, and Jisho English–Japanese lookup with WanaKana romanization. Czech translations of search results are entered manually.

## Stack
React + Vinext, Cloudflare Workers, D1 (DB), R2 (BUCKET). Source is backed up in this folder; live vocabulary and photos are stored in the app database and object storage, not GitHub. This is a server application, so GitHub Pages alone cannot run it.

## Development
Install with pnpm install. Use pnpm dev and pnpm build. Database schema lives in db/schema.ts; migrations in drizzle/. Configure DB and BUCKET bindings when deploying elsewhere. .openai/hosting.json identifies the existing private Site; preserve its identity when updating.

## Dictionary attribution
Search data: Jisho / JMdict, EDRDG (https://www.edrdg.org/edrdg/licence.html), CC BY-SA. API availability depends on Jisho. Kana-to-romaji conversion: WanaKana (MIT).
