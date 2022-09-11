import * as dotenv from 'dotenv';
import * as functions from 'firebase-functions';
import express from 'express';
import admin from 'firebase-admin';
import helmet from 'helmet';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';

import menuRoute from './routes/menu';

dotenv.config();

const version2 = express();
version2.use(
  cors({
    origin: ['https://tc-demo-v1.vercel.app', 'http://localhost:3000'],
    credentials: true,
  }),
);
version2.use(helmet());
version2.use(bodyParser.urlencoded({ extended: true }));
version2.use(bodyParser.json());
version2.use(cookieParser());

version2.enable('trust proxy');

version2.use('/menu', menuRoute);

exports.v2 = functions.region('us-east4').https.onRequest(version2);

exports.createUser = functions.auth.user().onCreate((user) => {
  try {
    // when the user is created, insert some basic information
    admin
      .firestore()
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

exports.removeUser = functions.auth.user().onDelete((user) => {
  try {
    // when the user is deleted, we will also delete the information in the
    // database regarding the user
    admin.firestore().collection('usersTest').doc(user.uid).delete();
  } catch (err) {
    console.error(err);
  }
});
