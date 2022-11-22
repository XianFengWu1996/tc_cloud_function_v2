/* eslint-disable max-len */
/* eslint-disable new-cap */
import express from 'express';
import * as controller from '../controller/checkout.js';
import { verifyFirebaseToken } from '../middleware/auth.js';
import {
  verifyCheckoutClient,
  verifyPaymentMethod,
} from '../middleware/checkout.js';

const checkout = express.Router();

checkout.post(
  '/delivery/calculate',
  verifyFirebaseToken,
  controller.calculateDistanceAndFee,
);

checkout.post(
  '/payment/in_person',
  verifyCheckoutClient,
  verifyFirebaseToken,
  controller.placeInPersonOrder,
);

checkout.post(
  '/payment/saved_card',
  verifyCheckoutClient,
  verifyPaymentMethod,
  verifyFirebaseToken,
  controller.saveCardPayment,
);

checkout.post(
  '/payment/new_card',
  verifyCheckoutClient,
  verifyFirebaseToken,
  controller.newCardPayment,
);

checkout.put(
  '/payment/intent',
  verifyFirebaseToken,
  controller.updatePaymentIntent,
);

export default checkout;
