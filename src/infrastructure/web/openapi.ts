const bearer = [{ bearerAuth: [] }];

const exchangeRequest = {
  type: 'object',
  properties: {
    id: { type: 'string', example: '6a77c986a3c188a1206ef04b' },
    tipo_de_cambio: { type: 'string', enum: ['compra', 'venta'] },
    monto_enviar: { type: 'number', example: 100 },
    monto_recibir: { type: 'number', example: 380.34 },
    creada_en: { type: 'string', format: 'date-time' },
  },
} as const;

const rate = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    tipo_de_cambio: { type: 'string', enum: ['compra', 'venta'] },
    tasa: { type: 'number', example: 3.8034 },
    activa: { type: 'boolean' },
  },
} as const;

function json(schema: unknown) {
  return { content: { 'application/json': { schema } } };
}

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Currency Exchange API',
    version: '1.0.0',
    description:
      'API REST para una casa de cambio digital. El administrador publica tasas de compra y ' +
      'venta, y los clientes autenticados crean solicitudes contra la tasa vigente.',
  },
  tags: [
    { name: 'Auth', description: 'Registro y autenticación' },
    { name: 'Tasas', description: 'Gestión de tasas de cambio (solo admin)' },
    { name: 'Solicitudes', description: 'Solicitudes de cambio del usuario autenticado' },
    { name: 'Sistema', description: 'Estado del servicio' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: { error: { type: 'string' } },
      },
    },
  },
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Registrar una cuenta',
        description: 'Crea el usuario, envía un correo de bienvenida y devuelve un JWT.',
        requestBody: {
          required: true,
          ...json({
            type: 'object',
            required: ['email', 'password'],
            properties: {
              email: { type: 'string', format: 'email', example: 'cliente@example.com' },
              password: { type: 'string', minLength: 8, example: 'Password123!' },
            },
          }),
        },
        responses: {
          201: {
            description: 'Usuario creado',
            ...json({
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                token: { type: 'string' },
              },
            }),
          },
          400: { description: 'Error de validación' },
          409: { description: 'El email ya está registrado' },
        },
      },
    },

    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Iniciar sesión',
        requestBody: {
          required: true,
          ...json({
            type: 'object',
            required: ['email', 'password'],
            properties: {
              email: { type: 'string', format: 'email' },
              password: { type: 'string' },
            },
          }),
        },
        responses: {
          200: {
            description: 'Token emitido',
            ...json({ type: 'object', properties: { token: { type: 'string' } } }),
          },
          401: {
            description: 'Credenciales inválidas. El mensaje es idéntico si el email no existe.',
          },
        },
      },
    },

    '/rates': {
      post: {
        tags: ['Tasas'],
        summary: 'Crear una tasa de cambio',
        description: 'Solo admin. Al crear una tasa se desactiva la anterior del mismo tipo.',
        security: bearer,
        requestBody: {
          required: true,
          ...json({
            type: 'object',
            required: ['tipo_de_cambio', 'tasa'],
            properties: {
              tipo_de_cambio: { type: 'string', enum: ['compra', 'venta'] },
              tasa: { type: 'number', example: 3.8034 },
            },
          }),
        },
        responses: {
          201: { description: 'Tasa creada', ...json(rate) },
          401: { description: 'Sin token' },
          403: { description: 'El usuario no es admin' },
        },
      },
      get: {
        tags: ['Tasas'],
        summary: 'Listar las tasas',
        description: 'Solo admin.',
        security: bearer,
        responses: {
          200: { description: 'Listado', ...json({ type: 'array', items: rate }) },
          403: { description: 'El usuario no es admin' },
        },
      },
    },

    '/exchange-requests': {
      post: {
        tags: ['Solicitudes'],
        summary: 'Crear una solicitud de cambio',
        description:
          'La tasa se consulta al proveedor externo en ese momento y se guarda como snapshot. ' +
          'compra → monto_enviar × purchase_price · venta → monto_enviar ÷ sale_price',
        security: bearer,
        requestBody: {
          required: true,
          ...json({
            type: 'object',
            required: ['tipo_de_cambio', 'monto_enviar'],
            properties: {
              tipo_de_cambio: { type: 'string', enum: ['compra', 'venta'] },
              monto_enviar: { type: 'number', example: 100 },
            },
          }),
        },
        responses: {
          201: { description: 'Solicitud creada', ...json(exchangeRequest) },
          400: { description: 'Error de validación' },
          502: { description: 'El proveedor externo de tasas no responde' },
        },
      },
      get: {
        tags: ['Solicitudes'],
        summary: 'Listar las solicitudes propias, paginadas',
        security: bearer,
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          {
            name: 'perPage',
            in: 'query',
            schema: { type: 'integer', default: 10, maximum: 50 },
          },
        ],
        responses: {
          200: {
            description: 'Listado paginado',
            ...json({
              type: 'object',
              properties: {
                data: { type: 'array', items: exchangeRequest },
                pagination: {
                  type: 'object',
                  properties: {
                    page: { type: 'integer' },
                    perPage: { type: 'integer' },
                    total: { type: 'integer' },
                    total_paginas: { type: 'integer' },
                  },
                },
              },
            }),
          },
        },
      },
    },

    '/exchange-requests/{id}': {
      get: {
        tags: ['Solicitudes'],
        summary: 'Ver el detalle de una solicitud propia',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Solicitud', ...json(exchangeRequest) },
          404: {
            description:
              'No existe o pertenece a otro usuario. Se responde 404 y no 403 ' +
              'para no revelar que el recurso existe.',
          },
        },
      },
      delete: {
        tags: ['Solicitudes'],
        summary: 'Eliminar una solicitud propia',
        security: bearer,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          204: { description: 'Eliminada' },
          404: { description: 'No existe o pertenece a otro usuario' },
        },
      },
    },

    '/health': {
      get: {
        tags: ['Sistema'],
        summary: 'Estado del servicio y de la conexión a Mongo',
        responses: {
          200: {
            description: 'Operativo',
            ...json({
              type: 'object',
              properties: {
                status: { type: 'string', example: 'ok' },
                db: { type: 'string', example: 'connected' },
                timestamp: { type: 'string', format: 'date-time' },
              },
            }),
          },
          503: { description: 'Sin conexión a la base de datos' },
        },
      },
    },
  },
};
