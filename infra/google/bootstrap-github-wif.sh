#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="cloudsales-507715"
PROJECT_NUMBER="1039655793672"
REPO="crmcloudsales/CLOUDSALES"
POOL_ID="github-actions"
PROVIDER_ID="cloudsales-repo"
SA_ID="cloudsales-github-automation"

printf '\n== CloudSales Google Cloud bootstrap ==\n'
printf 'Project: %s (%s)\n' "$PROJECT_ID" "$PROJECT_NUMBER"
printf 'Repository: %s\n\n' "$REPO"

gcloud config set project "$PROJECT_ID" >/dev/null

# Minimum APIs required for keyless GitHub -> Google Cloud federation.
gcloud services enable \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  serviceusage.googleapis.com \
  --project="$PROJECT_ID"

SA_EMAIL="${SA_ID}@${PROJECT_ID}.iam.gserviceaccount.com"

if ! gcloud iam service-accounts describe "$SA_EMAIL" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$SA_ID" \
    --project="$PROJECT_ID" \
    --display-name="CloudSales GitHub Automation"
fi

if ! gcloud iam workload-identity-pools describe "$POOL_ID" --project="$PROJECT_ID" --location="global" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "$POOL_ID" \
    --project="$PROJECT_ID" \
    --location="global" \
    --display-name="CloudSales GitHub Actions"
fi

if ! gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
  --project="$PROJECT_ID" \
  --location="global" \
  --workload-identity-pool="$POOL_ID" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
    --project="$PROJECT_ID" \
    --location="global" \
    --workload-identity-pool="$POOL_ID" \
    --display-name="CloudSales GitHub Repository" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner,attribute.actor=assertion.actor,attribute.ref=assertion.ref" \
    --attribute-condition="assertion.repository=='${REPO}'"
fi

POOL_NAME="$(gcloud iam workload-identity-pools describe "$POOL_ID" \
  --project="$PROJECT_ID" \
  --location="global" \
  --format='value(name)')"

# Permit only the canonical CloudSales repository to impersonate this service account.
gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
  --project="$PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${POOL_NAME}/attribute.repository/${REPO}" >/dev/null

# Initial least-privilege role: lets automation enable/inspect APIs, not own the project.
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/serviceusage.serviceUsageAdmin" >/dev/null

PROVIDER_NAME="$(gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
  --project="$PROJECT_ID" \
  --location="global" \
  --workload-identity-pool="$POOL_ID" \
  --format='value(name)')"

printf '\n== READY ==\n'
printf 'PROJECT_ID=%s\n' "$PROJECT_ID"
printf 'PROJECT_NUMBER=%s\n' "$PROJECT_NUMBER"
printf 'SERVICE_ACCOUNT=%s\n' "$SA_EMAIL"
printf 'WORKLOAD_IDENTITY_PROVIDER=%s\n' "$PROVIDER_NAME"
printf '\nNo service-account JSON key was created.\n'
