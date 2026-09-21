# Griffith English translation

## Historical work
Ralph T. H. Griffith, *The Hymns of the Rigveda*, 2nd ed., Benares: E. J. Lazarus and Co., 1896.

The printed book is in the public domain (author died 1906; published 1896). That fact is recorded separately from any digital file.

## Digital transcription
Wikisource pages under [The Hymns of the Rigveda](https://en.wikisource.org/wiki/The_Hymns_of_the_Rigveda).

Wikisource hosts Griffith as public domain. Hymn pages retrieved via the MediaWiki API (`query+revisions`) are stored in `pages.jsonl`. Numbered verse text is extracted into `verses.jsonl`.

Hymns that are only ProofreadPage transclusions (`<pages index=... />`) are expanded from the `Page:` namespace via the same API. Only `<section begin="hymn N">` … matching that sukta is kept, so the next hymn and footnotes are not assigned to the previous canonical IDs.


## Licence / status
- Historical work: public domain.
- Digital transcription used here: public-domain verse text as published on Wikisource for this work. Commercial display of that PD verse text is allowed. This is not a claim about every third-party Griffith website.

## Importer
`scripts/fetch-griffith-wikisource.ts` then `scripts/import-griffith-rigveda.ts`.

Database records are split:

- `griffith-1896-work` — historical publication
- `griffith-wikisource` — digital transcription
