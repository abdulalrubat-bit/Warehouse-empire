#!/bin/sh
# Measure the store description instead of quoting a number from memory. The previous
# listing claimed 2,311 characters against an actual 2,318, and nobody noticed until the
# copy was rewritten -- a wrong number in a doc about a 4,000 character limit is exactly
# the kind of thing that stays wrong.
D=$(cd "$(dirname "$0")" && pwd)
python3 - "$D/store-listing.md" <<'PY'
import re, sys
s = open(sys.argv[1]).read()
m = re.search(r"## Full description \(4000 char limit\)(.*)", s, re.S)
block = re.search(r"```\n(.*?)\n```", m.group(1), re.S).group(1)
n = len(block)
print(block)
print("=" * 60)
print(f"{n:,} characters of 4,000  ({4000 - n:,} spare)")
print(f"{len(block.splitlines()):,} lines, {len(block.split()):,} words")
sys.exit(0 if n <= 4000 else 1)
PY
