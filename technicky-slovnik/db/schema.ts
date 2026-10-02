import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const words=sqliteTable('words',{id:text('id').primaryKey(),cs:text('cs').notNull(),en:text('en').notNull(),ja:text('ja').notNull(),description:text('description').notNull().default(''),imageKey:text('image_key')});
export const settings=sqliteTable('settings',{key:text('key').primaryKey(),value:text('value').notNull()});
