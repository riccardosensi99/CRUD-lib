# GitHub self-hosted runner

Questa configurazione sposta il calcolo delle pipeline da `ubuntu-latest` al server registrato come runner GitHub Actions.

Il runner non elimina GitHub Actions: GitHub resta l'orchestratore, ma i job vengono eseguiti su questa macchina.

## Strategia consigliata

Per usare lo stesso server su piu progetti, registra il runner a livello di organizzazione GitHub e assegna il label custom `local-ci`.

Poi in ogni workflow usa:

```yaml
runs-on: [self-hosted, linux, x64, local-ci]
```

Se i repository sono sotto un account personale e non sotto un'organizzazione, GitHub non offre un runner unico per tutto l'account: va registrato un runner per ogni repository, oppure conviene spostare i progetti dentro una organizzazione.

## Registrazione da interfaccia GitHub

Organizzazione:

1. Vai su `Organization settings > Actions > Runners`.
2. Crea un nuovo self-hosted runner Linux x64.
3. Aggiungi il label `local-ci`.
4. Se usi runner group, limita l'accesso ai repository che devono usare questo server.

Repository singolo:

1. Vai su `Repository settings > Actions > Runners`.
2. Crea un nuovo self-hosted runner Linux x64.
3. Aggiungi il label `local-ci`.

## Installazione sul server

Genera il token temporaneo dalla pagina GitHub del runner e poi esegui:

```bash
GITHUB_URL="https://github.com/OWNER_OR_ORG" \
RUNNER_TOKEN="TOKEN_GENERATO_DA_GITHUB" \
RUNNER_NAME="server-ci-01" \
scripts/setup-github-runner.sh
```

Per un repository singolo:

```bash
GITHUB_URL="https://github.com/OWNER/REPOSITORY" \
RUNNER_TOKEN="TOKEN_GENERATO_DA_GITHUB" \
RUNNER_NAME="server-ci-01" \
scripts/setup-github-runner.sh
```

Variabili utili:

- `RUNNER_LABELS`: label custom, default `local-ci`.
- `RUNNER_VERSION`: versione del runner, default `2.334.0`.
- `RUNNER_USER`: utente Linux del servizio, default `actions-runner`.
- `INSTALL_DIR`: directory di installazione, default `/opt/actions-runner/$RUNNER_NAME`.
- `RUNNER_GROUP`: runner group GitHub opzionale, utile nelle organizzazioni.

## Requisiti del server

Per questo progetto servono Node.js e npm. Il server corrente ha Docker installato; se altri progetti usano container, assicurati che l'utente del runner abbia i permessi necessari.

Installa sul server cio che usano le pipeline dei vari repository, ad esempio:

```bash
node --version
npm --version
docker --version
```

## Sicurezza

Evita self-hosted runner su repository pubblici che eseguono workflow da pull request non fidate: codice esterno potrebbe girare sul server. Per repo pubblici, usa approvazione manuale dei workflow, runner group ristretti e segreti con scope minimo.
