# Currency Exchange API

API REST para una casa de cambio digital. El administrador publica tasas de compra y venta,
y los clientes autenticados crean solicitudes de cambio contra la tasa vigente.

**Stack** · Bun · Hono · MongoDB (Mongoose) · JWT EdDSA (jose) · Zod · Biome

---

## Levantar desde cero

Requisito único: Docker.

**1. Variables de entorno**

```bash
cp .env.example .env
```

**2. Llaves JWT**

Se generan en un contenedor temporal, sin instalar Bun en la máquina:

```bash
docker run --rm -v "$PWD":/app -w /app oven/bun:1-alpine \
  bun run scripts/generate-jwt-keys.ts
```

Pega las dos líneas que imprime en `JWT_PRIVATE_KEY` y `JWT_PUBLIC_KEY` de tu `.env`.

**3. Arrancar**

```bash
docker compose up -d --build
```

| Servicio          | URL                        |
| ----------------- | -------------------------- |
| API               | http://localhost:3000      |
| Documentación     | http://localhost:3000/docs |
| Mailhog (correos) | http://localhost:8025      |
| MongoDB           | mongodb://localhost:27017  |

```bash
curl localhost:3000/health
```

El usuario administrador se siembra al arrancar con las credenciales de
`ADMIN_SEED_EMAIL` y `ADMIN_SEED_PASSWORD`.

---

## Reglas de negocio

Solo puede haber una tasa activa por tipo: al crear una nueva, la anterior se desactiva.

La tasa se consulta al proveedor externo en el momento de crear la solicitud y se
guarda como snapshot, para que el histórico no cambie si la tasa se mueve después.

- `compra` → `monto_recibir = monto_enviar * purchase_price`
- `venta` → `monto_recibir = monto_enviar / sale_price`

Cada usuario solo ve y elimina sus propias solicitudes; pedir la de otro devuelve
`404` en lugar de `403`, para no revelar que existe.

---

## Arquitectura

Hexagonal (puertos y adaptadores).

```
src/
├── domain/          entidades, reglas de negocio y puertos
├── application/     casos de uso, reciben los puertos por constructor
└── infrastructure/  adaptadores: Mongo, JWT, SMTP, HTTP, rutas Hono
```

- Puertos: `PasswordHasher`, `EmailSender`, `RateProvider` y los repositorios.
- El cableado vive en un único composition root, sin librería de inyección.
- El vocabulario del enunciado (`tipo_de_cambio`, `monto_enviar`) es contrato público:
  se traduce en la capa web y el dominio se mantiene en inglés.

---

## Desarrollo

```bash
bun install
bun run dev          # servidor con watch
bun test             # 27 pruebas unitarias
bun run typecheck
bun run lint
```

Las pruebas cubren dominio y aplicación con fakes de los puertos, sin mocks ni
base de datos: el cálculo compra/venta, el redondeo, la regla de una sola tasa
activa, la pertenencia de las solicitudes y los errores de credenciales.
