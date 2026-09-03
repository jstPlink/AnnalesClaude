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
3. Avviare. L'app risponde su `http://<ip-nas>:8973` (la porta a sinistra in
   `ports:` — cambiala se 8973 è occupata; la `80` a destra è interna al
   container, non toccarla).

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

## 4. Esporre su Internet con Cloudflare

Le porte del compose (`8973:80`) restano **sulla LAN**. Cloudflare non si collega
mai alla 8973 o alla 80 direttamente: parla con il NAS su 443/HTTPS, e qualcosa
sul NAS inoltra a `127.0.0.1:8973`.

**Opzione A — Cloudflare Tunnel** (come già fai per `pocketbase.fplinio.it`):
nel tunnel aggiungi un *public hostname* (es. `diario.fplinio.it`) con
**Service = `http://localhost:8973`** (oppure `http://<ip-nas>:8973`). Fine:
niente porte aperte sul router, HTTPS gestito da Cloudflare.
Se `cloudflared` gira come container sulla stessa rete Docker puoi anche usare
`http://annales-diario:80` (nome del container + porta interna).

**Opzione B — reverse proxy del NAS + DNS proxied**: record DNS `diario` →
proxied (arancione) su Cloudflare; sul NAS un reverse proxy (Synology
*Portale applicazioni web* o Nginx Proxy Manager) che ascolta su 443 con
certificato e inoltra a `127.0.0.1:8973`. Cloudflare raggiunge il NAS sulla 443.

In entrambi i casi: **quello che colleghi è `8973` (porta host del NAS)**, mai la
80 del container.

## Note

- **Backend PocketBase**: l'URL (`https://pocketbase.fplinio.it`) è compilato
  dentro il bundle a build time dal workflow. Per cambiarlo si modifica
  `VITE_PB_URL` in `.github/workflows/docker-publish.yml` e si fa un nuovo push.
- **Architettura**: l'immagine è multi-arch (`amd64` + `arm64`), funziona sia sui
  NAS Intel sia su quelli ARM.
