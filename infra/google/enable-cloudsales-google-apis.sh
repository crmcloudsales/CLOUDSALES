#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="cloudsales-507715"

# Core CloudSales/Cloudy Google capabilities. These should be enabled now.
CORE_SERVICES=(
  drive.googleapis.com
  gmail.googleapis.com
  calendar-json.googleapis.com
  people.googleapis.com
  docs.googleapis.com
  sheets.googleapis.com
  slides.googleapis.com
  tasks.googleapis.com
  pubsub.googleapis.com
  chat.googleapis.com
  youtube.googleapis.com
  youtubeanalytics.googleapis.com
  youtubereporting.googleapis.com
  analyticsadmin.googleapis.com
  analyticsdata.googleapis.com
  tagmanager.googleapis.com
  searchconsole.googleapis.com
  googleads.googleapis.com
  photospicker.googleapis.com
  merchantapi.googleapis.com
)

# Google may require separate product approval/access for some Business Profile APIs.
SPECIAL_ACCESS_SERVICES=(
  mybusinessaccountmanagement.googleapis.com
  mybusinessbusinessinformation.googleapis.com
  businessprofileperformance.googleapis.com
  mybusinessnotifications.googleapis.com
)

# These APIs can be enabled now, but actual use generally requires billing and restricted keys.
MAPS_SERVICES=(
  places.googleapis.com
  geocoding-backend.googleapis.com
  maps-backend.googleapis.com
  routes.googleapis.com
)

SUCCESS=()
FAILED_CORE=()
DEFERRED=()

is_enabled() {
  local svc="$1"
  gcloud services list --enabled --project="$PROJECT_ID" \
    --filter="config.name=${svc}" --format='value(config.name)' | grep -Fxq "$svc"
}

enable_one() {
  local svc="$1" class="$2"
  if is_enabled "$svc"; then
    echo "ALREADY ENABLED  $svc"
    SUCCESS+=("$svc")
    return 0
  fi

  echo "ENABLING         $svc"
  if gcloud services enable "$svc" --project="$PROJECT_ID" --quiet; then
    echo "ENABLED          $svc"
    SUCCESS+=("$svc")
    return 0
  fi

  if [[ "$class" == "core" ]]; then
    FAILED_CORE+=("$svc")
  else
    DEFERRED+=("$svc")
  fi
  echo "DEFERRED/FAILED  $svc"
  return 0
}

printf '\n== CloudSales Google API bootstrap ==\nProject: %s\n\n' "$PROJECT_ID"

gcloud config set project "$PROJECT_ID" >/dev/null

for svc in "${CORE_SERVICES[@]}"; do enable_one "$svc" core; done
for svc in "${SPECIAL_ACCESS_SERVICES[@]}"; do enable_one "$svc" special; done
for svc in "${MAPS_SERVICES[@]}"; do enable_one "$svc" maps; done

printf '\n== RESULT ==\n'
printf 'Enabled/already enabled: %s\n' "${#SUCCESS[@]}"
printf 'Core failures: %s\n' "${#FAILED_CORE[@]}"
printf 'Special/billing deferred: %s\n' "${#DEFERRED[@]}"

if ((${#FAILED_CORE[@]})); then
  printf '\nCORE FAILURES:\n'
  printf ' - %s\n' "${FAILED_CORE[@]}"
fi

if ((${#DEFERRED[@]})); then
  printf '\nDEFERRED (approval/billing/product access may be required):\n'
  printf ' - %s\n' "${DEFERRED[@]}"
fi

printf '\nENABLED SERVICES (CloudSales relevant):\n'
gcloud services list --enabled --project="$PROJECT_ID" \
  --format='table(config.name,title)' \
  --filter='config.name:(drive.googleapis.com gmail.googleapis.com calendar-json.googleapis.com people.googleapis.com docs.googleapis.com sheets.googleapis.com slides.googleapis.com tasks.googleapis.com pubsub.googleapis.com chat.googleapis.com youtube.googleapis.com youtubeanalytics.googleapis.com youtubereporting.googleapis.com analyticsadmin.googleapis.com analyticsdata.googleapis.com tagmanager.googleapis.com searchconsole.googleapis.com googleads.googleapis.com photospicker.googleapis.com merchantapi.googleapis.com mybusinessaccountmanagement.googleapis.com mybusinessbusinessinformation.googleapis.com businessprofileperformance.googleapis.com mybusinessnotifications.googleapis.com places.googleapis.com geocoding-backend.googleapis.com maps-backend.googleapis.com routes.googleapis.com)'

if ((${#FAILED_CORE[@]})); then
  exit 2
fi
