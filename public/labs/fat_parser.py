#!/usr/bin/env python3
"""Defensive classic/64-bit universal Mach-O wrapper parser."""

from __future__ import annotations

import argparse
import hashlib
import json
import struct
from pathlib import Path

FAT_MAGIC = 0xCAFEBABE
FAT_MAGIC_64 = 0xCAFEBABF


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def parse(path: Path) -> dict:
    data = path.read_bytes()
    if len(data) < 8:
        raise ValueError("file too short for fat_header")

    raw = data[:4]
    if raw == b"\xca\xfe\xba\xbe":
        endian, is64 = ">", False
    elif raw == b"\xbe\xba\xfe\xca":
        endian, is64 = "<", False
    elif raw == b"\xca\xfe\xba\xbf":
        endian, is64 = ">", True
    elif raw == b"\xbf\xba\xfe\xca":
        endian, is64 = "<", True
    else:
        raise ValueError("not a recognized universal Mach-O wrapper")

    magic, count = struct.unpack_from(endian + "II", data, 0)
    record_fmt = endian + ("iiQQII" if is64 else "iiIII")
    record_size = struct.calcsize(record_fmt)
    table_end = 8 + count * record_size
    if table_end > len(data):
        raise ValueError("architecture table extends beyond file bounds")

    archs = []
    for i in range(count):
        off = 8 + i * record_size
        values = struct.unpack_from(record_fmt, data, off)
        if is64:
            cputype, cpusubtype, slice_off, slice_size, align, reserved = values
        else:
            cputype, cpusubtype, slice_off, slice_size, align = values
            reserved = None

        if slice_off > len(data) or slice_size > len(data) - slice_off:
            raise ValueError(f"slice {i} extends beyond file bounds")

        slice_magic = data[slice_off:slice_off + 4]
        row = {
            "index": i,
            "cputype": cputype,
            "cpusubtype": cpusubtype,
            "offset": slice_off,
            "size": slice_size,
            "align_power": align,
            "slice_magic_bytes": slice_magic.hex(),
            "slice_sha256": digest(data[slice_off:slice_off + slice_size]),
        }
        if reserved is not None:
            row["reserved"] = reserved
        archs.append(row)

    return {
        "file": path.name,
        "sha256": digest(data),
        "kind": "fat-64" if is64 else "fat-32",
        "magic_hex": f"0x{magic:08x}",
        "architecture_count": count,
        "architecture_table_end": table_end,
        "architectures": archs,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("file", type=Path)
    args = ap.parse_args()
    print(json.dumps(parse(args.file), indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
