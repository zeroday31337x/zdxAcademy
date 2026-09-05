#!/usr/bin/env python3
"""Minimal, defensive Mach-O header reader for ZeroDriveX Academy."""

from __future__ import annotations

import argparse
import hashlib
import json
import struct
from pathlib import Path

MAGICS = {
    b"\xce\xfa\xed\xfe": ("mach-o-32", "<"),
    b"\xfe\xed\xfa\xce": ("mach-o-32-swapped", ">"),
    b"\xcf\xfa\xed\xfe": ("mach-o-64", "<"),
    b"\xfe\xed\xfa\xcf": ("mach-o-64-swapped", ">"),
    b"\xca\xfe\xba\xbe": ("fat-32", ">"),
    b"\xbe\xba\xfe\xca": ("fat-32-swapped", "<"),
    b"\xca\xfe\xba\xbf": ("fat-64", ">"),
    b"\xbf\xba\xfe\xca": ("fat-64-swapped", "<"),
}


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def parse(path: Path) -> dict:
    data = path.read_bytes()
    if len(data) < 4:
        raise ValueError("file is shorter than a magic value")

    kind = MAGICS.get(data[:4])
    if not kind:
        raise ValueError("unrecognized Mach-O/fat magic")

    name, endian = kind
    result = {
        "file": path.name,
        "sha256": sha256(path),
        "kind": name,
        "magic_bytes": data[:4].hex(),
    }

    if not name.startswith("mach-o"):
        result["note"] = "Universal wrapper detected; use fat_parser.py for its architecture table."
        return result

    is64 = "64" in name
    fmt = endian + ("IiiIIIII" if is64 else "IiiIIII")
    size = struct.calcsize(fmt)
    if len(data) < size:
        raise ValueError(f"truncated Mach-O header: need {size} bytes")

    values = struct.unpack_from(fmt, data, 0)
    names = ["magic", "cputype", "cpusubtype", "filetype", "ncmds", "sizeofcmds", "flags"]
    if is64:
        names.append("reserved")

    header = dict(zip(names, values))
    header["magic_hex"] = f"0x{header['magic']:08x}"
    header["flags_hex"] = f"0x{header['flags']:08x}"

    command_end = size + header["sizeofcmds"]
    if command_end > len(data):
        raise ValueError("sizeofcmds extends beyond file bounds")

    result["header_size"] = size
    result["load_command_region"] = {"offset": size, "size": header["sizeofcmds"], "end": command_end}
    result["header"] = header
    return result


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("file", type=Path)
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()
    result = parse(args.file)
    if args.json:
        print(json.dumps(result, indent=2, sort_keys=True))
    else:
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
