import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { corsOptions, morganConfig } from './config/config';
import logger from './config/logger.config';
import MongoDb from './config/mongodb.config';
import { handleError, notFound } from './middleware/errorHandler';
import baseRoutes from './routes';

// dotenv config
dotenv.config();

// MongoDb Connection
const mongoDb = new MongoDb();
mongoDb.connect();

// express app
const app = express();

// Basic middlewares
app.use(morgan(morganConfig));
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// base routes
app.use('/api/v1', baseRoutes);

// Error handler
app.use(notFound);
app.use(handleError);

// connection to server
const port = process.env.PORT || 3000;

app.listen(port, () => {
  logger.info(`connected to port ${port}`);
});
