# Technický slovník — Supabase edition

Static GitHub Pages front end with Supabase Auth, a private Postgres dictionary, and private image storage.

## Publish

GitHub Actions deploys `site/` to the repository's GitHub Pages URL. In the repository settings, select **Settings → Pages → Build and deployment → Source → GitHub Actions**. The workflow publishes the files at `https://pokwerj84.github.io/moje-aplikace/`.

## Supabase sign-in redirect

In the `poky-reader` Supabase project, open **Authentication → URL Configuration** and add this exact address to **Redirect URLs**:

`https://pokwerj84.github.io/moje-aplikace/`

The app sends email sign-in links to the currently open app URL. No secret key is included in the page. The publishable key is intended for browser use; the dictionary and its image bucket are protected by row-level security policies tied to the signed-in user.

## Data

- `public.dictionary_words`: Japanese, English, Czech, descriptions in both Czech and English, and a private image path.
- `public.dictionary_profiles`: records whether the starter vocabulary has already been added for that user.
- `dictionary-images`: private image bucket (8 MB per image).
- SQL migrations are in `supabase/migrations/`.

## Features

Japanese → English → Czech word order, Czech/English interface switch, search across saved words and descriptions, Japanese speech, Jisho lookup, separate Czech and English descriptions, and private photo upload/camera capture.
