# Deploy sul NAS (immagini pre-buildate)

Flusso: **GitHub Actions builda e pubblica le immagini su GHCR** (frontend +
PocketBase bundled), il **NAS le scarica ed esegue**. Il NAS non ha bisogno
del codice sorgente né di Node, solo di [`docker-compose.yaml`](docker-compose.yaml).

## 1. Una volta sola — abilitare la pubblicazione delle immagini

1. Il workflow [`.github/workflows/docker-publish.yml`](../.github/workflows/docker-publish.yml)
   parte a ogni push su `main` (o su un tag `vX.Y.Z`, o manualmente da
   *Actions → Publish Docker image → Run workflow*) e pubblica **due** package.
2. Dopo il primo run, su GitHub compaiono i package
   **`ghcr.io/jstplink/annalesclaude`** e **`ghcr.io/jstplink/annalesclaude-pocketbase`**
   (sezione *Packages* del profilo/repo).
3. Scegliere come farli scaricare dal NAS (stessa scelta per entrambi):
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

Al **primo avvio** il container `annales-pocketbase` parte con un database
vuoto (le collection vengono create da sole dalle migration): per accedere
alla sua admin UI serve creare un superuser una volta sola:

```bash
docker compose exec pocketbase /pb/pocketbase superuser upsert admin@tuodominio.it "una-password-lunga"
```

## 3. Aggiornare

Dopo un nuovo push su `main`, Actions ricostruisce `:latest`. Sul NAS:

```bash
docker compose pull && docker compose up -d
docker image prune -f          # opzionale, libera le vecchie immagini
```

Su Synology: *Container Manager → Progetto → Azione → Ricostruisci* (fa pull + restart).

## 4. Esporre su Internet con Cloudflare

Le porte del compose (`8973:80` per il frontend, `8090:8090` per PocketBase)
restano **sulla LAN**. Cloudflare non si collega mai a quelle porte
direttamente: parla con il NAS su 443/HTTPS, e qualcosa sul NAS inoltra al
container giusto. Vanno esposti **entrambi** i servizi, con hostname diversi:
il frontend (es. `diario.fplinio.it`) e PocketBase (es. `pb-nuovo.fplinio.it`
— l'indirizzo compilato in `VITE_PB_URL` nel workflow, vedi sotto).

**Opzione A — Cloudflare Tunnel** (come già fai per `pocketbase.fplinio.it`):
nello stesso tunnel aggiungi **due** *public hostname*:
- `diario.fplinio.it` → **Service = `http://localhost:8973`** (frontend)
- `pb-nuovo.fplinio.it` → **Service = `http://localhost:8090`** (PocketBase bundled)

(oppure `http://<ip-nas>:PORTA` se preferisci; se `cloudflared` gira come
container sulla stessa rete Docker puoi anche usare i nomi dei container:
`http://annales-diario:80` e `http://annales-pocketbase:8090`).

Il vecchio `pocketbase.fplinio.it` **non va toccato**: resta raggiungibile
com'è finché non avrai migrato tutti i dati sul nuovo database bundled.

**Opzione B — reverse proxy del NAS + DNS proxied**: stesso discorso ma con
due record DNS proxied (arancioni) e due regole del reverse proxy, una per
porta.

In entrambi i casi: **quello che colleghi sono le porte host del NAS**
(`8973` e `8090`), mai le porte interne dei container.

## Note

- **Backend PocketBase**: da questa versione il container gira **bundled sul
  NAS** (`ghcr.io/jstplink/annalesclaude-pocketbase`), non più su un server
  esterno. L'URL pubblico con cui il frontend lo raggiunge
  (`https://pb-nuovo.fplinio.it` di default) è compilato dentro il bundle a
  build time dal workflow: per cambiarlo si modifica `VITE_PB_URL` in
  `.github/workflows/docker-publish.yml` e si fa un nuovo push.
- **Dati**: vivono nel volume Docker `pb_data` (definito in
  `docker-compose.yaml`), non nel container — sopravvivono a
  `pull`/`up`/`restart`. Si perdono solo con `docker compose down -v` o
  cancellando il volume a mano.
- **Architettura**: entrambe le immagini sono multi-arch (`amd64` + `arm64`),
  funzionano sia sui NAS Intel sia su quelli ARM.
