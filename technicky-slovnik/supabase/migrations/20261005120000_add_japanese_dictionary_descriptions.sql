ALTER TABLE public.dictionary_words
  ADD COLUMN IF NOT EXISTS description_ja text NOT NULL DEFAULT '';
