import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { corsOptionsWhiteList, morganConfig } from './config/config';
import logger from './config/logger.config';
import connectMongo from './config/mongodb.config';
import { handleError, notFound } from './middleware/errorHandler';
import baseRoutes from './routes';

const app = express();

// Basic middlewares
app.use(morgan(morganConfig));
app.use(helmet());
app.use(cors(corsOptionsWhiteList));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// base routes
app.use('/api/v1', baseRoutes);

// Error handler
app.use(notFound);
app.use(handleError);

const port = process.env.PORT || 3000;

connectMongo()
  .then(() => {
    app.listen(port, () => {
      logger.info(`connected to port ${port}`);
    });
  })
  .catch((err) => {
    console.error(err);
    logger.error(String(err));
    process.exit(1);
  });
