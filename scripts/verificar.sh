#!/usr/bin/env bash
#
# Revisa los invariantes del sistema operativo contra la base real.
# Sale con 1 si encuentra algo, para poder encadenarlo.
#
set -euo pipefail

CLUB="${HSC_REPO:-$HOME/healthyspaceclub}"
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

[[ -d "$CLUB/supabase" ]] || {
  echo "No encuentro el repo del Club en $CLUB (es el enlazado al CLI)." >&2
  exit 1
}

salida="$( cd "$CLUB" && supabase db query --linked -f "$AQUI/scripts/verificar.sql" 2>&1 )" || true

if [[ "$salida" == *"Failed to run sql query"* || "$salida" == *"ERROR:"* ]]; then
  echo "$salida" >&2
  exit 1
fi

# `"rows": []` es exactamente lo que se busca: ningún invariante roto.
if [[ "$salida" == *'"rows": []'* ]]; then
  echo "Todo en orden: ningún invariante roto."
  exit 0
fi

echo "Problemas encontrados:"
echo
python3 - "$salida" <<'PY'
import json, sys
d = sys.argv[1]
d = d[d.index('{'):d.rindex('}')+1]
for r in json.loads(d)['rows']:
    print(f"  [{r['problema']}]  {r['detalle']}")
    print(f"      {r['porque']}")
PY
exit 1
