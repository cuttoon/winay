# Guía de despliegue en Azure

Tiempo estimado: 40 a 60 minutos. Usa **Git Bash** (Windows) dentro de la terminal de VS Code.

## 0. Requisitos

- Azure CLI instalado: `az --version`
- Node LTS o superior: `node -v`
- Git y una cuenta de GitHub
- La cuenta de estudiante de Azure con crédito disponible

## 1. Iniciar sesión en Azure

```bash
az login
az account show --query "{nombre:name, id:id}" -o table
```

Se abre el navegador para que inicies sesión con tu cuenta de estudiante. Si tienes varias suscripciones, elige la correcta con `az account set --subscription "<nombre o id>"`.

## 2. Crear los recursos (un solo script)

Desde la **raíz del proyecto**:

```bash
bash scripts/azure-setup.sh
```

El script te pregunta si la suscripción es la correcta y luego crea todo en 9 pasos. Cada paso muestra un mensaje de progreso:

| Paso | Qué crea | Para qué sirve |
|---|---|---|
| 1-2 | Proveedores y grupo de recursos (`rg-winay-dev`) | Contenedor lógico de todo |
| 3 | Log Analytics y Application Insights | Monitoreo y logs |
| 4 | Storage Account, contenedor `content` y `resources.json` | Guarda el catálogo de recursos |
| 5 | Key Vault y el secreto `admin-api-key` | Guarda el secreto fuera del código |
| 6 | App Service Plan y Web App (Node LTS) | Aloja la aplicación |
| 7 | Identidad administrada y roles RBAC | La app lee Blob y Key Vault sin contraseñas |
| 8 | App Settings | Conecta la app con Storage, Key Vault y monitoreo |
| 9 | Credenciales de publicación | Las usa GitHub Actions |

Al final imprime el nombre de la Web App, la URL y la API key de administración. **Anótalos.**

Por defecto usa el plan **B1** (de pago, consume tu crédito). Si tu cuenta permite el gratuito:

```bash
SKU=F1 bash scripts/azure-setup.sh
```

Si falla por región o cuota: `LOCATION=brazilsouth bash scripts/azure-setup.sh`.

Si el script se corta, puedes volver a ejecutarlo: reutiliza los nombres guardados en `.azure-env` y los pasos que ya existen.

## 3. Configurar GitHub Actions

1. Crea un repositorio **vacío** en GitHub y sube el proyecto (todavía sin hacer `push`):

   ```bash
   git init
   git add .
   git commit -m "feat: Wiñay - proyecto final Azure Bootcamp"
   git branch -M main
   git remote add origin https://github.com/<TU_USUARIO>/winay.git
   ```

2. Obtén el publish profile (XML) de la Web App. Reemplaza `<WEB_APP>` por el nombre que imprimió el script (empieza con `app-winay-`):

   ```bash
   az webapp deployment list-publishing-profiles --name <WEB_APP> --resource-group rg-winay-dev --xml
   ```

3. En GitHub: **Settings → Secrets and variables → Actions**
   - Pestaña **Secrets** → *New repository secret*: nombre `AZURE_WEBAPP_PUBLISH_PROFILE`, valor: todo el XML.
   - Pestaña **Variables** → *New repository variable*: nombre `AZURE_WEBAPP_NAME`, valor: el nombre de la Web App.

4. Publica:

   ```bash
   git push -u origin main
   ```

5. En la pestaña **Actions** del repositorio, el workflow *Deploy to Azure App Service* debe terminar en verde. Si falla, abre el paso que falló y revisa el mensaje.

## 4. Verificar

```bash
curl https://<TU-APP>.azurewebsites.net/api/v1/health
```

Debe responder `"status":"ok"` y `"content":{"source":"azure-blob","degraded":false,...}`.

Abre la URL en el navegador, usa **Cargar ejemplo → Analizar mis gastos** y revisa la pestaña **Biblioteca**: al pie debe decir *Fuente del contenido: Azure Blob Storage*.

Prueba la API de administración con la clave que imprimió el script:

```bash
curl -X POST https://<TU-APP>.azurewebsites.net/api/v1/admin/content/refresh -H "x-api-key: <ADMIN_API_KEY>"
```

## 5. Capturas para la entrega

Toma capturas de: el grupo de recursos, la Web App, el contenedor con `resources.json`, el Key Vault, **Access control (IAM)** de Storage y Key Vault mostrando la identidad de la Web App, el workflow en verde y la aplicación funcionando.

## Solución de problemas

| Síntoma | Causa probable y solución |
|---|---|
| `SkuNotAvailable` o error de cuota al crear el plan | Cambia la región (`LOCATION=brazilsouth`) o el plan (`SKU=F1`). |
| Error `MissingSubscriptionRegistration` | El paso 1 registra los proveedores; vuelve a ejecutar el script. |
| La Biblioteca dice *archivo local (modo respaldo)* | La Web App aún no lee el blob. Espera 2 a 5 minutos a que se apliquen los roles y reinicia: `az webapp restart -g rg-winay-dev -n <WEB_APP>`. |
| `/admin/content/refresh` responde 503 | La referencia a Key Vault no se resolvió. En el portal: Web App → Environment variables → `ADMIN_API_KEY` debe mostrar un check verde. Espera unos minutos y reinicia. |
| El paso 8 falla al guardar las App Settings | Agrégalas en el portal (Web App → Environment variables) con los mismos nombres y valores que figuran en `scripts/azure-setup.sh`. |
| El paso 5 no puede leer tu usuario | El script te pide tu *Object ID*: Portal → Microsoft Entra ID → Usuarios → tu usuario. |
| El deploy de GitHub falla con 401 | Revisa que el secreto tenga el XML completo, sin recortes. |
| El health check falla tras desplegar | Revisa los logs: `az webapp log tail -g rg-winay-dev -n <WEB_APP>`. |
| Error al volver a crear el Key Vault con el mismo nombre | Un vault borrado queda en *soft delete*. Purga con `az keyvault purge --name <nombre>`. |

## 6. Limpieza (después de entregar)

Elimina todo para no consumir el crédito de la suscripción:

```bash
az group delete --name rg-winay-dev --yes --no-wait
az keyvault purge --name <nombre-del-key-vault>   # opcional, libera el nombre
```

Hazlo solo cuando ya tengas las capturas y tu proyecto haya sido evaluado, si piden la URL funcionando.
