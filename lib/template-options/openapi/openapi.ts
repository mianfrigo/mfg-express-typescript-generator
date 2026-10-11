import { z } from 'zod';
//{{auth}} import { loginSchema, registerSchema } from './validation/auth.validation';
import { createUserSchema } from './validation/user.validation';
import { updateUserSchema } from './validation/user.validation';

// The spec is assembled from the same zod schemas the routes validate with, so
// request bodies cannot drift from what the API accepts.
const body = (schema: z.ZodType) => ({
  required: true,
  content: { 'application/json': { schema: z.toJSONSchema(schema) } },
});

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
    '/user': {
      get: {
        summary: 'List users',
        responses: { 200: { description: 'Users' } },
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
//{{auth}}     '/auth': {
//{{auth}}       post: {
//{{auth}}         summary: 'Log in and receive a JWT',
//{{auth}}         security: [],
//{{auth}}         requestBody: body(loginSchema),
//{{auth}}         responses: { 200: { description: 'Token' }, 401: { description: 'Invalid credentials' } },
//{{auth}}       },
//{{auth}}     },
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
