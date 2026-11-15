# Frontend AWS EC2

El runbook completo esta en el repositorio backend: `docs/AWS_EC2_DEPLOYMENT.md`.

Combinar `docker-compose.yml` con `compose.prod.yaml` usando Compose >=2.24.4.
Copiar `.env.prod.example` a `.env.prod`, usar PUBLIC_ORIGIN=http://3.16.169.243 y RELEASE_TAG con la entrega revisada. Las tres bases VITE reciben ese origen durante build; no son secretos. El runtime publica unicamente 127.0.0.1:8080 para Nginx host.

```bash
docker compose -p eon-fe --env-file .env.prod -f docker-compose.yml -f compose.prod.yaml config --quiet
docker compose -p eon-fe --env-file .env.prod -f docker-compose.yml -f compose.prod.yaml build frontend
docker compose -p eon-fe --env-file .env.prod -f docker-compose.yml -f compose.prod.yaml up -d --no-build frontend
```

Sin variables, el build de produccion utiliza window.location.origin; desarrollo mantiene sus fallbacks localhost. No se cambio el calendario ni las funciones cientificas. Recompilar al cambiar origen. HTTPS es opcional futuro: cambiar PUBLIC_ORIGIN al dominio HTTPS y configurar TLS en Nginx. Validacion pendiente en Node 22/pnpm 10.28.0: `pnpm install --frozen-lockfile`, `pnpm exec tsc -b`, `node --test scripts/*.test.mjs`, `pnpm build` y navegador con backend real. En este entorno Node/pnpm no estaban disponibles y el motor Docker denego acceso: no se afirma build exitoso.

Rollback: mantener imagen anterior, restaurar RELEASE_TAG y ejecutar up --no-build; conservar proyecto/volumenes backend. Apagado con stop; retiro y backups segun runbook BE. Nunca down -v.
