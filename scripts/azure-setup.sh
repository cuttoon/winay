#!/usr/bin/env bash
# ============================================================================
# Wiñay - crea todos los recursos de Azure con Azure CLI
#
# Uso (desde la RAÍZ del proyecto, en Git Bash o cualquier terminal bash):
#     az login
#     bash scripts/azure-setup.sh
#
# Se puede ejecutar de nuevo si algo falla: los nombres se guardan en .azure-env
# y los pasos que ya existen se reutilizan.
#
# Recursos que crea:
#   Grupo de recursos  ->  contenedor lógico de todo lo demás
#   Log Analytics + Application Insights  ->  monitoreo
#   Storage Account + contenedor "content" ->  guarda resources.json (catálogo)
#   Key Vault  ->  guarda el secreto admin-api-key
#   App Service Plan + Web App (Node 20)  ->  aloja la aplicación
#   Identidad administrada + roles RBAC   ->  la app lee Blob y Key Vault sin claves
# ============================================================================
set -euo pipefail
export MSYS_NO_PATHCONV=1   # Git Bash (Windows) no debe alterar rutas que empiezan con "/"

cd "$(dirname "$0")/.."

# --- Configuración (puedes cambiarla: LOCATION=brazilsouth SKU=F1 bash scripts/azure-setup.sh) ---
LOCATION="${LOCATION:-eastus2}"   # si falla por cuota/región prueba: brazilsouth, centralus, westus2
SKU="${SKU:-B1}"                  # B1 (de pago, más confiable) o F1 (gratis, a veces sin cuota)
RG="${RG:-rg-winay-dev}"

# Sufijo aleatorio para que los nombres sean únicos en todo Azure; se guarda para reutilizarlo
if [ -f .azure-env ]; then
  # shellcheck disable=SC1091
  source .azure-env
else
  SUFFIX="$RANDOM"
  printf 'SUFFIX=%s\n' "$SUFFIX" > .azure-env
fi

PLAN="plan-winay-dev"
APP="app-winay-$SUFFIX"
ST="stwinay$SUFFIX"           # solo minúsculas y números, máximo 24 caracteres
KV="kv-winay-$SUFFIX"         # máximo 24 caracteres
LAW="log-winay-dev"
AI="appi-winay-dev"

# --- Utilidades ---
step() { echo; echo "==> $*"; }
# Devuelve solo el valor, sin saltos de línea de Windows (\r)
azv() { az "$@" --output tsv | tr -d '\r'; }
# Asigna un rol solo si todavía no existe (parámetros: id-del-principal tipo rol alcance)
ensure_role() {
  local count
  count=$(azv role assignment list --assignee "$1" --role "$3" --scope "$4" --query "length(@)")
  if [ "$count" = "0" ]; then
    az role assignment create --assignee-object-id "$1" --assignee-principal-type "$2" \
      --role "$3" --scope "$4" --output none
    echo "   rol '$3' asignado"
  else
    echo "   rol '$3' ya estaba asignado"
  fi
}

# ----------------------------------------------------------------------------
step "0/9  Verificando tu sesión de Azure"
if ! az account show >/dev/null 2>&1; then
  echo "No hay sesión iniciada. Ejecuta primero:  az login"
  exit 1
fi
az account show --query "{suscripcion:name, id:id}" --output table
echo "Región: $LOCATION | Plan: $SKU | Grupo de recursos: $RG"
read -r -p "¿Es la suscripción correcta? (s/n) " answer
[ "$answer" = "s" ] || { echo "Cancelado. Cambia de suscripción con: az account set --subscription \"<nombre>\""; exit 1; }
az config set extension.use_dynamic_install=yes_without_prompt extension.dynamic_install_allow_preview=true >/dev/null

# ----------------------------------------------------------------------------
step "1/9  Registrando los proveedores de Azure (la primera vez puede tardar 1-3 min)"
for ns in Microsoft.Web Microsoft.Storage Microsoft.KeyVault Microsoft.Insights Microsoft.OperationalInsights; do
  az provider register --namespace "$ns" --wait
  echo "   $ns listo"
done

# ----------------------------------------------------------------------------
step "2/9  Grupo de recursos"
az group create --name "$RG" --location "$LOCATION" --output none
echo "   $RG listo"

# ----------------------------------------------------------------------------
step "3/9  Monitoreo: Log Analytics + Application Insights"
az monitor log-analytics workspace create --resource-group "$RG" --workspace-name "$LAW" \
  --location "$LOCATION" --output none
LAW_ID=$(azv monitor log-analytics workspace show --resource-group "$RG" --workspace-name "$LAW" --query id)
az monitor app-insights component create --app "$AI" --location "$LOCATION" --resource-group "$RG" \
  --workspace "$LAW_ID" --kind web --application-type web --output none
AI_CONN=$(azv monitor app-insights component show --app "$AI" --resource-group "$RG" --query connectionString)
echo "   monitoreo listo"

# ----------------------------------------------------------------------------
step "4/9  Storage Account (contenedor privado) y catálogo de contenido"
az storage account create --name "$ST" --resource-group "$RG" --location "$LOCATION" \
  --sku Standard_LRS --kind StorageV2 --allow-blob-public-access false \
  --min-tls-version TLS1_2 --https-only true --output none
az storage container create --account-name "$ST" --name content --public-access off \
  --auth-mode key --output none
az storage blob upload --account-name "$ST" --container-name content --name resources.json \
  --file data/content/resources.json --auth-mode key --overwrite --output none
ST_ID=$(azv storage account show --name "$ST" --resource-group "$RG" --query id)
echo "   $ST listo y resources.json subido"

# ----------------------------------------------------------------------------
step "5/9  Key Vault y secreto admin-api-key"
if ! az keyvault show --name "$KV" --resource-group "$RG" --output none 2>/dev/null; then
  az keyvault create --name "$KV" --resource-group "$RG" --location "$LOCATION" \
    --enable-rbac-authorization true --output none
fi
KV_ID=$(azv keyvault show --name "$KV" --resource-group "$RG" --query id)

# Tu usuario necesita permiso para crear secretos en el vault
ME=$(azv ad signed-in-user show --query id 2>/dev/null || true)
if [ -z "$ME" ]; then
  echo "   No pude leer tu usuario automáticamente."
  read -r -p "   Pega tu Object ID (Portal > Microsoft Entra ID > Usuarios > tu usuario): " ME
fi
ensure_role "$ME" User "Key Vault Secrets Officer" "$KV_ID"

ADMIN_KEY=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")
for attempt in 1 2 3 4 5; do
  if az keyvault secret set --vault-name "$KV" --name admin-api-key --value "$ADMIN_KEY" --output none 2>/dev/null; then
    break
  fi
  if [ "$attempt" = "5" ]; then
    echo "No se pudo crear el secreto. Espera unos minutos y vuelve a ejecutar el script."
    exit 1
  fi
  echo "   los permisos siguen propagándose, reintento en 30 s ($attempt/5)..."
  sleep 30
done
echo "   $KV listo"

# ----------------------------------------------------------------------------
step "6/9  App Service (plan Linux + Web App con Node 20)"
az appservice plan create --name "$PLAN" --resource-group "$RG" --location "$LOCATION" \
  --sku "$SKU" --is-linux --output none
RUNTIME="${RUNTIME:-NODE:22-lts}"
echo "   runtime: $RUNTIME"
az webapp create --name "$APP" --resource-group "$RG" --plan "$PLAN" --runtime "$RUNTIME" --output none
az webapp update --name "$APP" --resource-group "$RG" --https-only true --output none

ALWAYS_ON=true
[ "$SKU" = "F1" ] && ALWAYS_ON=false   # el plan gratuito no admite "Always On"
az webapp config set --name "$APP" --resource-group "$RG" --startup-file "npm start" \
  --min-tls-version 1.2 --http20-enabled true --ftps-state Disabled --always-on "$ALWAYS_ON" --output none
az webapp config set --name "$APP" --resource-group "$RG" \
  --generic-configurations healthCheckPath=/api/v1/health --output none \
  || echo "   (no se pudo fijar el health check; hazlo en el portal: Web App > Health check > /api/v1/health)"
echo "   $APP listo"

# ----------------------------------------------------------------------------
step "7/9  Identidad administrada y permisos mínimos (RBAC)"
PID=$(azv webapp identity assign --name "$APP" --resource-group "$RG" --query principalId)
ensure_role "$PID" ServicePrincipal "Storage Blob Data Reader" "$ST_ID"
ensure_role "$PID" ServicePrincipal "Key Vault Secrets User" "$KV_ID"

# ----------------------------------------------------------------------------
step "8/9  Configuración de la aplicación (App Settings)"
az webapp config appsettings set --name "$APP" --resource-group "$RG" --output none --settings \
  NODE_ENV=production \
  STORAGE_ACCOUNT_NAME="$ST" \
  CONTENT_CONTAINER=content \
  ADMIN_API_KEY="@Microsoft.KeyVault(VaultName=$KV;SecretName=admin-api-key)" \
  APPLICATIONINSIGHTS_CONNECTION_STRING="$AI_CONN" \
  ApplicationInsightsAgent_EXTENSION_VERSION='~3' \
  SCM_DO_BUILD_DURING_DEPLOYMENT=false
echo "   settings listos"

# ----------------------------------------------------------------------------
step "9/9  Credenciales de publicación (las usa GitHub Actions)"
az resource update --resource-group "$RG" --name scm --namespace Microsoft.Web \
  --resource-type basicPublishingCredentialsPolicies --parent "sites/$APP" \
  --set properties.allow=true --output none
echo "   listo"

HOST=$(azv webapp show --name "$APP" --resource-group "$RG" --query defaultHostName)
echo
echo "=============================================================="
echo " LISTO. Guarda estos datos:"
echo "   Web App ........ $APP"
echo "   URL ............ https://$HOST"
echo "   Storage ........ $ST"
echo "   Key Vault ...... $KV"
echo "   Grupo .......... $RG"
echo "   Admin API key .. $ADMIN_KEY   (también está en Key Vault)"
echo "=============================================================="
echo "Siguiente paso: configurar GitHub Actions (ver docs/DEPLOY.md, paso 3)."
