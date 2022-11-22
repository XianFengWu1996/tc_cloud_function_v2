import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_KEY, {
  apiVersion: '2022-08-01',
});

// // intialize the client secret
export const createPaymentIntent = async (customerId: string) => {
  return await stripe.paymentIntents.create({
    amount: 1000, // initial amount, also the minimum for credit card charge
    currency: 'USD',
    automatic_payment_methods: {
      enabled: true,
    },
    capture_method: 'manual',
    customer: customerId,
  });
};

export const getIntentFromSecret = (clientSecret: string) => {
  const secretIndex = clientSecret.indexOf('_secret_');
  return clientSecret.slice(0, secretIndex);
};
