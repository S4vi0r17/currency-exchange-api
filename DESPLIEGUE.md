# Despliegue en la nube

Destino: un **VPS con Docker**, con **nginx** por delante como reverse proxy y TLS.

**Supuestos** (los del enunciado): ya existe una base de datos MongoDB con un string
de conexión válido, es pública y no filtra por IP. La aplicación es un prototipo.

Por eso en el servidor solo corre el contenedor de la API: Mongo es externo y Mailhog
es una herramienta de desarrollo que no viaja a producción.

---

## 1. Preparar el servidor

Sobre un Ubuntu limpio:

```bash
curl -fsSL https://get.docker.com | sh
sudo apt install -y nginx git
```

## 2. Traer el código

```bash
git clone https://github.com/S4vi0r17/currency-exchange-api.git
cd currency-exchange-api
```

## 3. Configurar el entorno

```bash
cp .env.example .env
```

Editar `.env` con los valores reales:

| Variable                                   | Valor en producción                        |
| ------------------------------------------ | ------------------------------------------ |
| `NODE_ENV`                                 | `production`                               |
| `MONGO_URI`                                | el string de conexión de la base existente |
| `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`       | generadas una vez (ver abajo)              |
| `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` | credenciales del admin inicial             |
| `RESEND_API_KEY`                           | activa el envío real de correo             |
| `EXTERNAL_RATES_URL`                       | la API de tasas del enunciado              |

Las llaves JWT se generan una sola vez, sin instalar Bun en el servidor:

```bash
docker run --rm -v "$PWD":/app -w /app oven/bun:1-alpine \
  bun run scripts/generate-jwt-keys.ts
```

> `.env` no está versionado y no debe estarlo. Permisos recomendados: `chmod 600 .env`.

## 4. Levantar la API

```bash
docker compose -f compose.prod.yaml up -d --build
```

Este compose levanta únicamente la API, sin Mongo ni Mailhog, y la publica solo en
`127.0.0.1:3000` para que no sea alcanzable desde internet salvo a través de nginx.

Comprobación local en el servidor:

```bash
curl localhost:3000/health
# → {"status":"ok","db":"connected",...}
```

El contenedor lleva `restart: unless-stopped`, así que vuelve a arrancar solo si el
proceso muere o si se reinicia el servidor. No hace falta un supervisor externo.

## 5. Nginx como reverse proxy

Requiere un registro `A` de `exchange-api.s4vi0r.dev` apuntando a la IP del VPS.

`/etc/nginx/sites-available/currency-exchange`:

```nginx
server {
    listen 80;
    server_name exchange-api.s4vi0r.dev;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host            $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/currency-exchange /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 6. HTTPS

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d exchange-api.s4vi0r.dev
```

Certbot edita el `server` block y deja la renovación automática programada.

## 7. Verificar

```bash
curl https://exchange-api.s4vi0r.dev/health
# → {"status":"ok","db":"connected",...}
```
