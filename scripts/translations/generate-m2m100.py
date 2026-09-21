#!/usr/bin/env python3
"""Generate review-pending Indic translations from Griffith English.

Runtime dependencies are intentionally not part of the web app. Run in a
temporary Python environment with torch, transformers<5, and sentencepiece.
The output is resumable: completed ref/language pairs are retained.
"""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
from pathlib import Path

import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

MODEL_NAME = "facebook/nllb-200-distilled-600M"
LANGUAGES = ("hi", "or", "bn")
NLLB_CODES = {"hi": "hin_Deva", "or": "ory_Orya", "bn": "ben_Beng"}


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--database", default="prisma/dev.db")
    parser.add_argument("--output", default="data/translations/oldways-editorial.jsonl")
    parser.add_argument("--batch-size", type=int, default=24)
    parser.add_argument("--max-input-tokens", type=int, default=256)
    parser.add_argument("--max-new-tokens", type=int, default=96)
    parser.add_argument("--language", choices=LANGUAGES)
    parser.add_argument("--limit", type=int)
    return parser.parse_args()


def english_rows(database: Path) -> list[tuple[str, str]]:
    connection = sqlite3.connect(database)
    try:
        return connection.execute(
            """
            SELECT p.canonicalReference, t.text
            FROM Translation t
            JOIN Passage p ON p.id = t.passageId
            JOIN Translator tr ON tr.id = t.translatorId
            WHERE tr.slug = 'griffith' AND t.language = 'en'
            ORDER BY p.corpusId, p.orderIndex, p.canonicalReference
            """
        ).fetchall()
    finally:
        connection.close()


def existing_rows(output: Path) -> tuple[list[dict], set[tuple[str, str]]]:
    rows: list[dict] = []
    completed: set[tuple[str, str]] = set()
    if not output.exists():
        return rows, completed
    for number, line in enumerate(output.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        row = json.loads(line)
        key = (row["ref"], row["language"])
        if key in completed:
            raise ValueError(f"duplicate existing row on line {number}: {key}")
        rows.append(row)
        completed.add(key)
    return rows, completed


def main() -> None:
    args = arguments()
    database = Path(args.database).resolve()
    output = Path(args.output).resolve()
    source = english_rows(database)
    existing, completed = existing_rows(output)
    languages = (args.language,) if args.language else LANGUAGES
    work = {
        language: sorted(
            [row for row in source if (row[0], language) not in completed],
            key=lambda row: len(row[1]),
        )
        for language in languages
    }
    if args.limit:
        work = {language: rows[: args.limit] for language, rows in work.items()}
    pending = sum(len(rows) for rows in work.values())
    print(
        f"Griffith source rows: {len(source)}; existing: {len(existing)}; "
        f"pending: {pending}",
        flush=True,
    )
    if not pending:
        return

    device = "mps" if torch.backends.mps.is_available() else "cpu"
    print(f"Loading {MODEL_NAME} on {device}", flush=True)
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, src_lang="eng_Latn")
    model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME)
    model.eval().to(device)

    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("a", encoding="utf-8") as target:
        completed_now = 0
        for language, rows in work.items():
            target_id = tokenizer.convert_tokens_to_ids(NLLB_CODES[language])
            for offset in range(0, len(rows), args.batch_size):
                batch = rows[offset : offset + args.batch_size]
                refs = [row[0] for row in batch]
                texts = [row[1] for row in batch]
                encoded = tokenizer(
                    texts,
                    return_tensors="pt",
                    padding=True,
                    truncation=True,
                    max_length=args.max_input_tokens,
                ).to(device)
                with torch.inference_mode():
                    tokens = model.generate(
                        **encoded,
                        forced_bos_token_id=target_id,
                        max_new_tokens=args.max_new_tokens,
                        num_beams=1,
                    )
                translations = tokenizer.batch_decode(
                    tokens,
                    skip_special_tokens=True,
                    clean_up_tokenization_spaces=True,
                )
                for ref, text in zip(refs, translations, strict=True):
                    target.write(
                        json.dumps(
                            {
                                "ref": ref,
                                "language": language,
                                "text": text.strip(),
                                "status": "MACHINE_ASSISTED",
                                "sourceTranslation": "Ralph T. H. Griffith (1896)",
                                "model": MODEL_NAME,
                            },
                            ensure_ascii=False,
                        )
                        + "\n"
                    )
                target.flush()
                os.fsync(target.fileno())
                completed_now += len(batch)
                print(
                    f"{language}: {min(offset + len(batch), len(rows))}/{len(rows)}; "
                    f"session {completed_now}/{pending}",
                    flush=True,
                )


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("Interrupted; completed batches are safe and the run can resume.", file=sys.stderr)
        raise
