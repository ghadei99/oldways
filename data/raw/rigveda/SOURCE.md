# Rigveda primary text

## Role
DEVELOPMENT / RESEARCH SOURCE. Displayed Sanskrit until a commercially compatible encoding is available. Do not treat this file as a production-safe commercial corpus.

## Where GRETIL-derived data enters
- Raw source: `data/raw/rigveda/sa_Rgveda-edAufrecht.xml` (TEI). Companion plaintext is not used for ingest.
- Normalized: `data/normalized/rigveda/passages.jsonl` (generated, gitignored).
- Database: `Source.slug=gretil-aufrecht-2019`; `Passage` display fields copied from the preferred witness; `PassageWitness` stores the GRETIL transcription per canonical ID (`RV.m.s.v`).
- Sanskrit display: Devanagari generated at ingest (`Passage.originalText` / witness `originalText`).
- Transliteration: IAST with orig accents (`Transliteration` + witness `sourceText` / `normalizedText`).
- Source metadata: licence CC BY-NC-SA 4.0, commercial use not allowed, visibility DEVELOPMENT.

## Source
GRETIL Ṛgveda-Saṃhitā (`sa_Rgveda-edAufrecht.xml`)

- Dataset: Göttingen Register of Electronic Texts in Indian Languages (GRETIL), SUB Göttingen
- Printed edition represented: Theodor Aufrecht, *Die Hymnen des Rigveda*, Bonn 1877 (2 vols.)
- Digital data entry: Barend A. Van Nooten and Gary B. Holland
- Conversion/revision: Detlef Eichler
- TEI conversion: Maximilian Mehner
- GRETIL version date: 2019-10-03
- Encoding: TEI XML, `xml:lang="sa-Latn"` (IAST). Vedic accent marks are stored in `<orig>` (U+030D vertical line, U+0331 macron below).

## Licence
Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0), as stated in the TEI `<licence>`.

The 1877 printed Aufrecht edition is in the public domain. The GRETIL digital encoding is **not** treated as public domain. Attribution of the digital file is required. Commercial use of this encoding is not permitted under the stated licence.

## Download location
- TEI XML (ingest source): https://gretil.sub.uni-goettingen.de/gretil/corpustei/sa_Rgveda-edAufrecht.xml
- GRETIL plaintext transformation (accents stripped; not used for ingest): https://gretil.sub.uni-goettingen.de/gretil/corpustei/transformations/plaintext/sa_Rgveda-edAufrecht.txt

## Retrieved date
2026-09-15

## Numbering
References in the file are `RV_{mandala}.{sukta zero-padded 3}.{verse zero-padded 2}`, e.g. `RV_10.129.01`.

Application canonical IDs drop padding: `RV.10.129.1`.

`sourceReference` stores the GRETIL identifier without changing it.

Vālakhilya hymns are numbered continuously as maṇḍala 8, sūktas 49–59 (Aufrecht-style).

## Known limitations
- This is a digital encoding of Aufrecht, not a new critical edition.
- CC BY-NC-SA 4.0 is incompatible with a commercial product without a separate licence.
- No replacement Sanskrit corpus was imported because no equally complete machine-readable source with an explicit commercial-compatible licence was verified.
- In production without `ALLOW_RESEARCH_SANSKRIT=1`, and always when `COMMERCIAL_BUILD=true`, this encoding is not displayed as commercially safe Sanskrit.

## Transformation notes
Raw XML is not edited. Ingest parses `<lg xml:id>` / `<l>`, keeps `<orig>` text in `sourceText`, generates IAST for search/display, and generates Devanagari for the reader via Sanscript.
