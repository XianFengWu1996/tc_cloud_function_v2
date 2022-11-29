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

export const generatePublicPaymentMethods = (cards: Stripe.PaymentMethod[]) => {
  const publicPaymentMethods: Payment.PublicPaymentMethod[] = [];

  cards.map((card) => {
    // if the card field exist
    if (card.card) {
      publicPaymentMethods.push({
        id: card.id,
        customer: card.customer?.toString() ?? '',
        card: {
          brand: card.card.brand,
          expMonth: card.card.exp_month,
          expYear: card.card.exp_year,
          last4: card.card.last4,
        },
      });
    }
  });

  return publicPaymentMethods;
};
