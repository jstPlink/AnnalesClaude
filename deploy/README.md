# Deploy sul NAS (immagine pre-buildata)

Flusso: **GitHub Actions builda e pubblica l'immagine su GHCR**, il **NAS la scarica ed esegue**.
Il NAS non ha bisogno del codice sorgente, solo di [`docker-compose.yaml`](docker-compose.yaml).

## 1. Una volta sola — abilitare la pubblicazione dell'immagine

1. Il workflow [`.github/workflows/docker-publish.yml`](../.github/workflows/docker-publish.yml)
   parte a ogni push su `main` (o su un tag `vX.Y.Z`, o manualmente da
   *Actions → Publish Docker image → Run workflow*).
2. Dopo il primo run, su GitHub compare il package
   **`ghcr.io/jstplink/annalesclaude`** (sezione *Packages* del profilo/repo).
3. Scegliere come farlo scaricare dal NAS:
   - **Package pubblico** (più semplice): *Package settings → Change visibility → Public*.
     Il NAS scarica senza autenticazione.
   - **Package privato**: creare un GitHub **Personal Access Token (classic)** con
     scope `read:packages` e fare login sul NAS:
     ```bash
     echo <TOKEN> | docker login ghcr.io -u jstPlink --password-stdin
     ```

## 2. Sul NAS

### Synology (Container Manager) / QNAP (Container Station)

1. Copiare `docker-compose.yaml` sul NAS (o incollarne il contenuto).
2. Container Manager → **Progetto** → *Crea* → sorgente: il file compose.
3. Avviare. L'app risponde su `http://<ip-nas>:8080`.

### Da riga di comando (SSH)

```bash
mkdir -p /volume1/docker/annales && cd /volume1/docker/annales
# copiare qui docker-compose.yaml
docker compose up -d
```

## 3. Aggiornare

Dopo un nuovo push su `main`, Actions ricostruisce `:latest`. Sul NAS:

```bash
docker compose pull && docker compose up -d
docker image prune -f          # opzionale, libera le vecchie immagini
```

Su Synology: *Container Manager → Progetto → Azione → Ricostruisci* (fa pull + restart).

## Note

- **Backend PocketBase**: l'URL (`https://pocketbase.fplinio.it`) è compilato
  dentro il bundle a build time dal workflow. Per cambiarlo si modifica
  `VITE_PB_URL` in `.github/workflows/docker-publish.yml` e si fa un nuovo push.
- **HTTPS**: il container espone solo HTTP:80. Metterlo dietro il reverse proxy
  del NAS o un Cloudflare Tunnel.
- **Architettura**: l'immagine è multi-arch (`amd64` + `arm64`), funziona sia sui
  NAS Intel sia su quelli ARM.
