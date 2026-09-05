# ZeroDriveX Academy portable Mach-O lab tools

These scripts are intentionally small enough to read and modify.

- `macho_header.py` — identifies Mach-O/universal magic values and parses a thin Mach-O header.
- `fat_parser.py` — parses classic and 64-bit universal wrappers, validates slice bounds, and emits a normalized architecture map.

The goal is not to replace mature tools. The goal is to make the file-format mechanics visible and then cross-check your implementation against another parser.

Use course fixtures, binaries you built yourself, or software you are authorized to inspect.
