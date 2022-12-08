import admin from 'firebase-admin';
import Stripe from 'stripe';
import { createPaymentIntent } from './payment.js';

const { firestore, auth } = admin;

const stripe = new Stripe(process.env.STRIPE_KEY, {
  apiVersion: '2022-08-01',
});

export const createNewUserData = async (email: string, uid: string) => {
  const customer = await stripe.customers.create({
    email,
  });

  const paymentIntent = await createPaymentIntent(customer.id);

  await auth().updateUser(uid, { email });

  // when the user is created, insert some basic information
  await firestore()
    .collection('/users_v2') // normally call /users
    .doc(uid)
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

  return {
    paymentIntent,
    customer,
  };
};
