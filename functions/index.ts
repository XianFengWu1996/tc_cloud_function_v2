/* eslint-disable max-len */
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import * as dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import admin from 'firebase-admin';
import { initializeApp } from 'firebase-admin/app';
import { region } from 'firebase-functions';
import helmet from 'helmet';
import { createNewUserData } from './helper/auth.js';

import authRoute from './routes/auth.js';
import checkoutRoute from './routes/checkout.js';
import customerRoute from './routes/customer.js';
import storeRoute from './routes/store.js';

initializeApp();
const { firestore } = admin;

dotenv.config();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (request) => request.ip,
});

const app = express();

app.use(cookieParser());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Apply the rate limiting middleware to all requests
app.use(limiter);
app.use(helmet());

app.use(
  cors({
    origin: process.env.ALLOW_ORIGINS.split(','),
    credentials: true,
  }),
);

app.enable('trust proxy');

app.use('/auth', authRoute);
app.use('/checkout', checkoutRoute);
app.use('/customer', customerRoute);
app.use('/store', storeRoute);

export const v2 = region('us-east4').https.onRequest(app);

export const createUser = region('us-east4')
  .auth.user()
  .onCreate(async (user) => {
    try {
      await createNewUserData(
        user.email ?? user.providerData[0].email,
        user.uid,
      );
    } catch (err) {
      console.error(err);
    }
  });

export const removeUser = region('us-east4')
  .auth.user()
  .onDelete((user) => {
    try {
      // when the user is deleted, we will also delete the information in the
      // database regarding the user
      firestore().collection('/users_v2').doc(user.uid).delete();
    } catch (err) {
      console.error(err);
    }
  });
