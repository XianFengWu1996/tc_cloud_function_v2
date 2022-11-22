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

import Stripe from 'stripe';
import { createPaymentIntent } from './helper/payment.js';
import authRoute from './routes/auth.js';
import checkoutRoute from './routes/checkout.js';
import customerRoute from './routes/customer.js';
import storeRoute from './routes/store.js';

initializeApp();
const { firestore, auth } = admin;

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_KEY, {
  apiVersion: '2022-08-01',
});

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
    origin: ['https://tc-demo-v1.vercel.app', 'http://localhost:3000'],
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
      const customer = await stripe.customers.create({
        email: user.email ?? user.providerData[0].email,
      });

      const paymentIntent = await createPaymentIntent(customer.id);

      await auth().updateUser(user.uid, {
        email: user.email ?? user.providerData[0].email,
      });

      // when the user is created, insert some basic information
      await firestore()
        .collection('/users_v2') // normally call /users
        .doc(user.uid)
        .set({
          address: {
            formatted_address: {
              complete: '',
              street_name: '',
              city_state_zip: '',
            },
            details: {
              street_number: '',
              street_name: '',
              city: '',
              state: '',
              country: '',
              postal_code: '',
              lat: 0,
              lng: 0,
              place_id: '',
              delivery_fee: 0,
              estimate_time: '',
              apartment_number: '',
            },
          },
          customer_id: customer.id,
          paymentIntent: paymentIntent.id,
          name: '',
          phone: '',
          reward: {
            points: 0,
            transactions: [],
          },
        });
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
