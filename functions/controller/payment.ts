import { Request, Response } from 'express';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_KEY, {
  apiVersion: '2022-08-01',
});

export const initiatePaymentIntent = async (req: Request, res: Response) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 1000, // initial amount,
      currency: 'USD',
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.send(400).send(error);
  }
};
