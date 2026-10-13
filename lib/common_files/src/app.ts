import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
//{{openapi}} import swaggerUi from 'swagger-ui-express';
import { corsOptionsWhiteList, morganConfig } from './config/config';
import { env } from './config/env';
import { handleError, notFound } from './middleware/errorHandler';
//{{openapi}} import { openapiDocument } from './openapi';
import baseRoutes from './routes';

// The Express app only. index.ts loads .env and starts listening, so tests can
// import this without opening a port.
const app = express();

// Behind a load balancer, TRUST_PROXY=<hops> makes req.ip (and the rate
// limiter) use the client address instead of the proxy's.
if (env.trustProxy > 0) app.set('trust proxy', env.trustProxy);

// Basic middlewares
app.use(morgan(morganConfig));
app.use(helmet());
app.use(cors(corsOptionsWhiteList));
app.use(express.json());

// API docs (public)
//{{openapi}} app.get('/api/v1/openapi.json', (_req, res) => {
//{{openapi}}   res.status(200).json(openapiDocument);
//{{openapi}} });
//{{openapi}} app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));

// base routes
app.use('/api/v1', baseRoutes);

// Error handler
app.use(notFound);
app.use(handleError);

export default app;
