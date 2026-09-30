# Deploying Tamago to a VPS (Dokploy + Cloudflare)

Target: `https://tamago.simonpatterson.dev`, private behind **Cloudflare Access**, invoice PDFs in **Cloudflare R2**, runtime on a VPS managed by **Dokploy**.

What is verified: the production compose file (`docker-compose.prod.yml`) was brought up locally with no published ports, migrations ran, demo data was seeded, the worker generated invoices, and PDFs were stored and served through the same storage code path used with R2. What is **not** verified: the R2 connection itself, Dokploy's UI flow, and Cloudflare Access. Those depend on your accounts; the steps below are from their documented behaviour, and the troubleshooting section covers the likely failure points.

```
Browser → Cloudflare (proxy + Access) → Traefik (Dokploy) → web (nginx) → api → Postgres
                                                                     worker → Postgres, R2
```

## 1. Cloudflare R2 (invoice storage)

1. Cloudflare dashboard → **R2 Object Storage** → **Create bucket**. Name it `tamago-invoices`; leave location on automatic. Keep it private (no public access or custom domain).
2. R2 overview → **Manage API tokens** → **Create API token**.
   - Permission: **Object Read & Write**
   - Scope: **only** the `tamago-invoices` bucket
3. Copy the three values it shows once: **Access Key ID**, **Secret Access Key**, and the S3 endpoint `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.

## 2. DNS

In the `simonpatterson.dev` zone add:

| Type | Name | Content | Proxy |
| --- | --- | --- | --- |
| A | `tamago` | your VPS public IPv4 | Proxied (orange cloud) |

## 3. Dokploy

1. Connect GitHub if you haven't: **Settings → Git** (GitHub provider). Grant it access to `tjpa/tamago` (the repo is private).
2. Create a **Project** (for example `tamago`) → **Create Service → Compose**.
3. Service settings:
   - Provider: **GitHub**, repository `tjpa/tamago`, branch `main`
   - Compose type: **Docker Compose**
   - Compose path: `./docker-compose.prod.yml`
4. **Environment** tab: paste the values from `.env.production.example` and fill them in:

   | Variable | Value |
   | --- | --- |
   | `POSTGRES_PASSWORD` | a long random string (for example `openssl rand -base64 32`) |
   | `S3_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
   | `S3_BUCKET` | `tamago-invoices` |
   | `S3_REGION` | `auto` |
   | `S3_ACCESS_KEY_ID` | from step 1 |
   | `S3_SECRET_ACCESS_KEY` | from step 1 |

5. **Domains** tab → add a domain:
   - Host: `tamago.simonpatterson.dev`
   - Service name: `web`
   - Container port: `80`
   - HTTPS: on, certificate: Let's Encrypt
6. **Deploy**. The first build takes a few minutes (it builds the frontend). Watch the deployment log: `migrate` should exit 0, then `api`, `worker` and `web` start.

If the Let's Encrypt certificate can't be issued while the record is proxied, temporarily switch the DNS record to **DNS only** (grey cloud), let Dokploy get the certificate, then turn the proxy back on.

## 4. Cloudflare SSL mode

Zone → **SSL/TLS → Overview**: set encryption mode to **Full (strict)** once the certificate is issued. (Flexible would send traffic to the origin over plain HTTP and can cause redirect loops.)

## 5. Cloudflare Access (the privacy gate)

The app has no login of its own, so Access is the only thing protecting it.

1. Cloudflare dashboard → **Zero Trust** (first time: pick a team name and the Free plan; it may ask for a payment method at sign-up).
2. **Access → Applications → Add an application → Self-hosted**.
   - Application domain: `tamago.simonpatterson.dev`
   - Session duration: for example 24 hours
3. Add a policy: **Action: Allow**, **Include → Emails** → your email address. The built-in **One-time PIN** login (a code emailed to you) is enough; no identity provider setup needed.
4. To let someone else in (an employer, for example), add their email to the policy. Remove it afterwards.

**Lock the origin.** Access only applies to traffic that passes through Cloudflare. Someone who knows your VPS IP could still send a request straight to it with the right `Host` header. Options, in increasing effort:
- Allow inbound 80/443 only from [Cloudflare's IP ranges](https://www.cloudflare.com/ips/) in the VPS firewall. Only do this if **every** site on that Dokploy instance is proxied through Cloudflare, or the others will break.
- Enable Authenticated Origin Pulls.
- Use a Cloudflare Tunnel instead of exposing ports.

## 6. First run

1. Open `https://tamago.simonpatterson.dev`. You should get the Cloudflare Access prompt, then the (empty) Jobs board.
2. Optional demo data, from the VPS shell:
   ```
   docker exec -it $(docker ps -qf name=api) python scripts/seed.py http://localhost:8390
   ```
3. Check R2 end to end: create a job, dispatch it, start it, mark it completed. Within a few seconds it should become **Invoiced** and the PDF should download. The file will also appear under `invoices/` in the R2 bucket.

## Updating

Push to `main`, then press **Deploy** in Dokploy (or enable auto-deploy / the webhook on the service). Migrations run automatically on every deploy through the `migrate` service.

## Troubleshooting

| Symptom | Likely cause and fix |
| --- | --- |
| Job stays on **Completed** with "Generating invoice…" | Storage problem. Check worker logs: `docker logs $(docker ps -qf name=worker)`. Typical causes: wrong `S3_ENDPOINT`, token not scoped to the bucket, or wrong bucket name. |
| Tasks ended as `failed` after the cause is fixed | Requeue them: `docker exec -it $(docker ps -qf name=db) psql -U tamago -c "UPDATE tasks SET status='pending', attempts=0, run_after=now() WHERE status='failed'"` |
| 502/504 from the domain | `web` or `api` not healthy yet. Check the compose deployment logs; `api` waits for `migrate` to finish. |
| Redirect loop | Cloudflare SSL mode is Flexible. Set **Full (strict)**. |
| Certificate not issued | See the grey-cloud note in step 3. |
| Page loads without the Access prompt | The Access application's domain doesn't match exactly, or DNS isn't proxied. |

## Backups and data

- **Postgres** data lives in the `pgdata` volume. Set up a scheduled backup (Dokploy's volume backups, or a `pg_dump` cron) before relying on it.
- **Invoice PDFs** live in R2, not on the VPS. If the database is restored from an older backup, invoice rows and PDFs may not match exactly; PDFs are regenerated only when a job is completed again.
