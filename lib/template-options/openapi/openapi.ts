import { z } from 'zod';
//{{auth}} import { loginSchema, registerSchema } from './validation/auth.validation';
import { createUserSchema } from './validation/user.validation';
import { updateUserSchema } from './validation/user.validation';
//{{refresh}} import { refreshSchema } from './validation/auth.validation';
//{{roles}} import { roleSchema } from './validation/role.validation';

// The spec is assembled from the same zod schemas the routes validate with, so
// request bodies cannot drift from what the API accepts.
const body = (schema: z.ZodType) => ({
  required: true,
  content: { 'application/json': { schema: z.toJSONSchema(schema) } },
});

const paging = [
  {
    name: 'page',
    in: 'query',
    schema: { type: 'integer', minimum: 1, default: 1 },
  },
  {
    name: 'limit',
    in: 'query',
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
  },
];

const id = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string' },
};

export const openapiDocument = {
  openapi: '3.1.0',
  info: { title: 'API', version: '1.0.0' },
  servers: [{ url: '/api/v1' }],
//{{auth}}   components: {
//{{auth}}     securitySchemes: {
//{{auth}}       bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
//{{auth}}     },
//{{auth}}   },
//{{auth}}   security: [{ bearerAuth: [] }],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        security: [],
        responses: { 200: { description: 'Service is up' } },
      },
    },
    '/ready': {
      get: {
        summary: 'Readiness check (database reachable)',
        security: [],
        responses: {
          200: { description: 'Ready' },
          503: { description: 'Not ready' },
        },
      },
    },
    '/user': {
      get: {
        summary: 'List users (paginated)',
        parameters: paging,
        responses: {
          200: { description: 'Page of users: { data, meta: { page, limit, total, totalPages } }' },
        },
      },
      post: {
        summary: 'Create a user',
        requestBody: body(createUserSchema),
        responses: {
          201: { description: 'Created' },
          400: { description: 'Invalid body' },
        },
      },
    },
    '/user/{id}': {
      get: {
        summary: 'Get a user',
        parameters: [id],
        responses: { 200: { description: 'User' }, 404: { description: 'Not found' } },
      },
      put: {
        summary: 'Update a user',
        parameters: [id],
        requestBody: body(updateUserSchema),
        responses: {
          200: { description: 'Updated' },
          400: { description: 'Invalid body' },
          404: { description: 'Not found' },
        },
      },
      delete: {
        summary: 'Delete a user',
        parameters: [id],
        responses: { 200: { description: 'Deleted' }, 404: { description: 'Not found' } },
      },
    },
//{{roles}}     '/user/{id}/role': {
//{{roles}}       patch: {
//{{roles}}         summary: 'Promote or demote a user (admin only)',
//{{roles}}         parameters: [id],
//{{roles}}         requestBody: body(roleSchema),
//{{roles}}         responses: {
//{{roles}}           200: { description: 'Updated' },
//{{roles}}           400: { description: 'Invalid role' },
//{{roles}}           403: { description: 'Caller is not an admin' },
//{{roles}}           404: { description: 'Not found' },
//{{roles}}         },
//{{roles}}       },
//{{roles}}     },
//{{auth}}     '/auth': {
//{{auth}}       post: {
//{{auth}}         summary: 'Log in and receive a JWT',
//{{auth}}         security: [],
//{{auth}}         requestBody: body(loginSchema),
//{{auth}}         responses: { 200: { description: 'Token' }, 401: { description: 'Invalid credentials' } },
//{{auth}}       },
//{{auth}}     },
//{{refresh}}     '/auth/refresh': {
//{{refresh}}       post: {
//{{refresh}}         summary: 'Exchange a refresh token for a new access token and refresh token',
//{{refresh}}         security: [],
//{{refresh}}         requestBody: body(refreshSchema),
//{{refresh}}         responses: {
//{{refresh}}           200: { description: 'New authToken and refreshToken' },
//{{refresh}}           401: { description: 'Invalid, expired or already used refresh token' },
//{{refresh}}         },
//{{refresh}}       },
//{{refresh}}     },
//{{refresh}}     '/auth/logout': {
//{{refresh}}       post: {
//{{refresh}}         summary: 'End the session of a refresh token',
//{{refresh}}         security: [],
//{{refresh}}         requestBody: body(refreshSchema),
//{{refresh}}         responses: { 204: { description: 'Logged out' } },
//{{refresh}}       },
//{{refresh}}     },
//{{auth}}     '/auth/register': {
//{{auth}}       post: {
//{{auth}}         summary: 'Register a user',
//{{auth}}         security: [],
//{{auth}}         requestBody: body(registerSchema),
//{{auth}}         responses: { 201: { description: 'Created' }, 400: { description: 'Invalid body' } },
//{{auth}}       },
//{{auth}}     },
  },
};
