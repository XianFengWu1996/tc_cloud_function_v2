/* eslint-disable operator-linebreak */
/* eslint-disable camelcase */
/* eslint-disable max-len */
import map from '@googlemaps/google-maps-services-js';
import { Request, Response } from 'express';
import admin from 'firebase-admin';
import lodash from 'lodash';
import Stripe from 'stripe';
import { v4 } from 'uuid';
import { generateCheckoutObject } from '../helper/checkout.js';
import { getIntentFromSecret } from '../helper/payment.js';

export const defaultStorePlaceId = 'ChIJu6M8a15744kRIAABq6V-2Ew';

export const defaultStoreGeolocation = {
  lat: 42.27434345850252,
  lng: -71.02434194440872,
};

const { firestore } = admin;
const { isNumber, isString, isBoolean } = lodash;

const stripe = new Stripe(process.env.STRIPE_KEY, {
  apiVersion: '2022-08-01',
});

export const calculateDistanceAndFee = async (req: Request, res: Response) => {
  try {
    // calculation can be done with geolocation
    const lat: number = req.body.lat;
    const lng: number = req.body.lng;

    if (!lat || !lng) {
      throw new Error('Please provide both lat and lng');
    }

    const { Client, UnitSystem } = map;

    const client = new Client({});
    const result = await client.distancematrix({
      params: {
        origins: [
          {
            lat: defaultStoreGeolocation.lat,
            lng: defaultStoreGeolocation.lng,
          },
        ],
        destinations: [{ lat, lng }],
        key: process.env.MAP_KEY,
        units: UnitSystem.imperial,
      },
    });

    const distanceResult = result.data.rows[0].elements[0];

    // distance.text will return a string version of distance, ex: 1.2 mi
    // const distance = distanceResult.distance.text.replace(' mi', '');

    // 1 meter = 0.0006213709999975145 mi
    const distance = Number(
      (distanceResult.distance.value * 0.0006213709999975145).toFixed(2),
    );
    let fee = 0;

    if (distance < 1.8) {
      fee = 2;
    } else if (distance >= 1.8 && distance < 4) {
      fee = Math.round(distance);
    } else if (distance >= 4 && distance < 6) {
      fee = Math.round(distance) + 1.5;
    } else {
      throw new Error('Undeliverable, out of boundary');
    }

    // calculate the time for the order
    // duration is express in second
    const lowerBoundPreparationTime = 20 * 60;
    const upperBoundPreparationTime = 40 * 60;

    const duration = distanceResult.duration.value;
    const lower = Math.round((lowerBoundPreparationTime + duration) / 60);
    const upper = Math.round((upperBoundPreparationTime + duration) / 60);

    res.status(200).json({
      fee,
      preparationTime: {
        lower: Math.round(lower / 5) * 5,
        upper: Math.round(upper / 5) * 5,
      },
    });
  } catch (error) {
    res.status(500).json({
      error:
        (error as Error).message ?? 'Failed to calculate distance and fees',
    });
  }
};

export const placeInPersonOrder = async (req: Request, res: Response) => {
  try {
    // for a large business, we will check if the order id is taken
    const checkout: Checkout.Server = {
      ...generateCheckoutObject(req.checkout),
      payment: {
        paymentType: 'in_person',
        stripe: null,
      },
      orderStatus: {
        status: 'in_progress',
        refund: null,
        cancel: null,
      },
      uid: req.user.uid,
      id: req.checkout.cartId,
      createdAt: Date.now(),
      version: 2,
    };

    await firestore().runTransaction(async (transaction) => {
      const userRef = firestore().collection('/users_v2').doc(req.user.uid);
      const orderRef = firestore().collection('/order_v2');
      const userResult = await transaction.get(userRef);

      const user = userResult.data() as User;

      user.reward.points =
        user.reward.points +
        checkout.reward -
        checkout.summary.discount.redemption * 100;

      // for reward
      user.reward.transactions.unshift({
        type: 'reward',
        amount: checkout.reward,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        orderId: req.checkout.cartId,
      });

      // for deduction
      if (checkout.summary.discount.redemption > 0) {
        user.reward.transactions.unshift({
          type: 'redemption',
          amount: Number(checkout.summary.discount.redemption * 100),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          orderId: req.checkout.cartId,
        });
      }

      transaction.update(userRef, { reward: user.reward });

      if ((await orderRef.doc(req.checkout.cartId).get()).exists) {
        transaction.set(orderRef.doc(v4()), checkout);
      } else {
        transaction.set(orderRef.doc(req.checkout.cartId), checkout);
      }
    });

    res.status(200).json({
      orderId: req.checkout.cartId,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: (error as Error).message ?? 'Failed to place order' });
  }
};

export const newCardPayment = async (req: Request, res: Response) => {
  try {
    const { clientSecret } = req.body;

    if (!isString(clientSecret)) {
      throw new Error('Please provide client secret');
    }

    const intentId = getIntentFromSecret(clientSecret);

    const as = await stripe.paymentIntents.capture(intentId);

    if (as.status !== 'succeeded') {
      throw new Error('Payment has not been confirmed');
    }

    const card = as.charges?.data[0].payment_method_details?.card;

    const checkout: Checkout.Server = {
      ...generateCheckoutObject(req.checkout),
      payment: {
        paymentType: 'online',
        stripe: {
          public: {
            type: as.payment_method_types[0],
            card: card
              ? {
                  last4: card.last4 ?? '',
                  expMonth: card.exp_month ?? 0,
                  expYear: card.exp_year ?? 0,
                  brand: card.brand ?? '',
                }
              : null,
            created: Date.now(),
            clientSecret: as.client_secret ?? '',
          },
          private: {
            id: as.id,
            customerId: as.customer?.toString() ?? '',
          },
        },
      },
      orderStatus: {
        status: 'in_progress',
        refund: null,
        cancel: null,
      },
      uid: req.user.uid,
      id: req.checkout.cartId,
      createdAt: Date.now(),
      version: 2,
    };

    await firestore().runTransaction(async (transaction) => {
      const userRef = firestore().collection('/users_v2').doc(req.user.uid);
      const orderRef = firestore().collection('/order_v2');
      const userResult = await transaction.get(userRef);
      const user = userResult.data() as User;
      user.reward.points =
        user.reward.points +
        checkout.reward -
        checkout.summary.discount.redemption * 100;
      // for reward
      user.reward.transactions.unshift({
        type: 'reward',
        amount: checkout.reward,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        orderId: req.checkout.cartId,
      });
      // for deduction
      if (checkout.summary.discount.redemption > 0) {
        user.reward.transactions.unshift({
          type: 'redemption',
          amount: Number(checkout.summary.discount.redemption * 100),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          orderId: req.checkout.cartId,
        });
      }
      transaction.update(userRef, { reward: user.reward });

      if ((await orderRef.doc(req.checkout.cartId).get()).exists) {
        transaction.set(orderRef.doc(v4()), checkout);
      } else {
        transaction.set(orderRef.doc(req.checkout.cartId), checkout);
      }
    });
    res.status(200).json({
      orderId: req.checkout.cartId,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: (error as Error).message ?? 'Failed to place order' });
  }
};

export const saveCardPayment = async (req: Request, res: Response) => {
  try {
    const paymentResult = await stripe.paymentIntents.create({
      amount: req.checkout.summary.total * 100,
      currency: 'usd',
      payment_method_types: ['card'],
      customer: req.paymentCard.customer,
      payment_method: req.paymentCard.id,
      confirm: true,
    });

    const checkout: Checkout.Server = {
      ...generateCheckoutObject(req.checkout),
      payment: {
        paymentType: 'online',
        stripe: {
          public: {
            type: paymentResult.payment_method_types[0],
            card: req.paymentCard.card,
            created: Date.now(),
            clientSecret: paymentResult.client_secret ?? '',
          },
          private: {
            id: paymentResult.id,
            customerId: req.paymentCard.customer,
          },
        },
      },
      orderStatus: {
        status: 'in_progress',
        refund: null,
        cancel: null,
      },
      uid: req.user.uid,
      id: req.checkout.cartId,
      createdAt: Date.now(),
      version: 2,
    };

    await firestore().runTransaction(async (transaction) => {
      const userRef = firestore().collection('/users_v2').doc(req.user.uid);

      const orderRef = firestore().collection('/order_v2');

      const userResult = await transaction.get(userRef);
      const user = userResult.data() as User;
      user.reward.points =
        user.reward.points +
        checkout.reward -
        checkout.summary.discount.redemption * 100;
      // for reward
      user.reward.transactions.unshift({
        type: 'reward',
        amount: checkout.reward,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        orderId: req.checkout.cartId,
      });
      // for deduction
      if (checkout.summary.discount.redemption > 0) {
        user.reward.transactions.unshift({
          type: 'redemption',
          amount: Number(checkout.summary.discount.redemption * 100),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          orderId: req.checkout.cartId,
        });
      }
      transaction.update(userRef, { reward: user.reward });

      if ((await orderRef.doc(req.checkout.cartId).get()).exists) {
        transaction.set(orderRef.doc(v4()), checkout);
      } else {
        transaction.set(orderRef.doc(req.checkout.cartId), checkout);
      }
    });
    res.status(200).json({
      orderId: req.checkout.cartId,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: (error as Error).message ?? 'Failed to place order' });
  }
};

export const updatePaymentIntent = async (req: Request, res: Response) => {
  try {
    const { amount, clientSecret, save } = req.body;

    if (!isNumber(amount) || amount <= 10) {
      throw new Error('Please provide a valid amount');
    }

    if (!isBoolean(save)) {
      throw new Error('Please provide a valid amount');
    }

    if (!isString(clientSecret)) {
      throw new Error('Please provide client secret');
    }

    const intent = getIntentFromSecret(clientSecret);

    const stripeAmount = amount * 100;

    await stripe.paymentIntents.update(
      intent,
      save
        ? {
            amount: stripeAmount,
            setup_future_usage: 'off_session',
          }
        : {
            amount: stripeAmount,
            setup_future_usage: null,
          },
    );

    res.status(200).json();
  } catch (error) {
    res
      .status(500)
      .json({ error: (error as Error).message ?? 'Failed to update intent' });
  }
};
