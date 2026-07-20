#!/usr/bin/env bash
#
# Aplica las migraciones pendientes de este repo, en orden, y las registra.
#
# Este repo no está enlazado al CLI de Supabase: el CLI corre desde el repo del
# Club, que sí lo está, contra la misma base. Por eso no se usa `db push` sino
# `db query`, y por eso la cuenta de lo aplicado vive en `truck_migraciones`
# (ver 0024) en vez de en el historial del CLI, que le pertenece al Club.
#
#   ./scripts/migrar.sh          → aplica lo pendiente
#   ./scripts/migrar.sh --ver    → solo dice qué falta, sin tocar nada
#
set -euo pipefail

CLUB="${HSC_REPO:-$HOME/healthyspaceclub}"
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGS="$AQUI/supabase/migrations"
SOLO_VER=false
[[ "${1:-}" == "--ver" || "${1:-}" == "--dry-run" ]] && SOLO_VER=true

[[ -d "$CLUB/supabase" ]] || {
  echo "No encuentro el repo del Club en $CLUB." >&2
  echo "Es el que está enlazado al CLI. Ponlo en HSC_REPO si vive en otro lado." >&2
  exit 1
}

consulta() {  # corre SQL y devuelve la salida cruda
  ( cd "$CLUB" && supabase db query --linked -f "$1" 2>&1 )
}

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo 'select archivo from public.truck_migraciones;' > "$tmp/q.sql"
# La salida se captura UNA vez y se inspecciona en memoria. Antes esto era
# `consulta | grep -q`, y con `pipefail` eso siempre fallaba: grep -q corta al
# primer match, el proceso de arriba recibe SIGPIPE y la tubería cuenta como
# error. El script concluía que la tabla no existía y reportaba las 24 como
# pendientes estando todas aplicadas.
salida_reg="$(consulta "$tmp/q.sql")"
: > "$tmp/aplicadas.txt"
if [[ "$salida_reg" == *'"archivo"'* ]]; then
  grep -o '"archivo": "[^"]*"' <<< "$salida_reg" | cut -d'"' -f4 | sort > "$tmp/aplicadas.txt"
elif [[ "$salida_reg" != *'"rows"'* ]]; then
  # Ni filas ni tabla: algo más se rompió y no conviene seguir a ciegas.
  echo "$salida_reg" >&2
  echo "No pude leer public.truck_migraciones. Se detiene." >&2
  exit 1
fi

pendientes=()
for f in "$MIGS"/*.sql; do
  n="$(basename "$f")"
  grep -qxF "$n" "$tmp/aplicadas.txt" || pendientes+=("$n")
done

if [[ ${#pendientes[@]} -eq 0 ]]; then
  echo "Todo al día: $(wc -l < "$tmp/aplicadas.txt" | tr -d ' ') migraciones aplicadas, ninguna pendiente."
  exit 0
fi

echo "Pendientes (${#pendientes[@]}):"
printf '  %s\n' "${pendientes[@]}"
$SOLO_VER && exit 0

for n in "${pendientes[@]}"; do
  echo
  echo "── aplicando $n ──"
  # El `|| true` es necesario: con `set -e`, una asignación cuyo comando falla
  # mata el script en esa línea, antes de llegar al mensaje de error de abajo.
  # Sin esto el script moría en silencio y no se veía POR QUÉ falló la migración.
  salida="$(consulta "$MIGS/$n")" || true
  if [[ "$salida" == *"Failed to run sql query"* || "$salida" == *"ERROR:"* ]]; then
    echo >&2
    echo "FALLÓ en $n:" >&2
    echo "$salida" >&2
    echo >&2
    echo "Se detiene aquí: las siguientes NO se aplicaron y ésta no quedó registrada." >&2
    exit 1
  fi
  # Se registra solo si de verdad corrió.
  printf "insert into public.truck_migraciones (archivo) values ('%s') on conflict do nothing;\n" "$n" > "$tmp/reg.sql"
  consulta "$tmp/reg.sql" > /dev/null
  echo "   ok"
done

echo
echo "Listo: ${#pendientes[@]} migración(es) aplicada(s)."
