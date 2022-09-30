import * as dotenv from 'dotenv';
import * as functions from 'firebase-functions';
import express from 'express';
import admin from 'firebase-admin';
import { initializeApp } from 'firebase-admin/app';
import helmet from 'helmet';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';

import menuRoute from './routes/menu.js';
import authRoute from './routes/auth.js';
import paymentRoute from './routes/payment.js';
import checkoutRoute from './routes/checkout.js';

initializeApp();
dotenv.config();

const app = express();
app.use(
  cors({
    origin: ['https://tc-demo-v1.vercel.app', 'http://localhost:3000'],
    credentials: true,
  }),
);
app.use(helmet());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

app.enable('trust proxy');

app.use('/menu', menuRoute);
app.use('/payment', paymentRoute);
app.use('/auth', authRoute);
app.use('/checkout', checkoutRoute);

export const v2 = functions.region('us-east4').https.onRequest(app);

const { firestore } = admin;

export const createUser = functions
  .region('us-east4')
  .auth.user()
  .onCreate((user) => {
    try {
      // when the user is created, insert some basic information

      firestore()
        .collection('/usersTest')
        .doc(user.uid)
        .set({
          address: {
            address: '',
            city: '',
            state: '',
            street: '',
            zipcode: '',
            delivery_fee: 0,
            place_id: '',
          },
          billings: {
            cards: [],
            stripe_customer_id: '',
          },
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

export const removeUser = functions
  .region('us-east4')
  .auth.user()
  .onDelete((user) => {
    try {
      // when the user is deleted, we will also delete the information in the
      // database regarding the user
      firestore().collection('usersTest').doc(user.uid).delete();
    } catch (err) {
      console.error(err);
    }
  });
