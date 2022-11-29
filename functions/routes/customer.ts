import express from 'express';
import * as controller from '../controller/customer.js';
import { verifyFirebaseToken } from '../middleware/auth.js';

const customer = express.Router();

customer.get('/', verifyFirebaseToken, controller.getCustomerData);

customer.put('/name', verifyFirebaseToken, controller.updateNameForUser);

customer.put('/address', verifyFirebaseToken, controller.updateAddress);

customer.post(
  '/phone/otp/send',
  verifyFirebaseToken,
  controller.sendOTPSMSForPhone,
);

customer.post(
  '/phone/otp/verify',
  verifyFirebaseToken,
  controller.verifyOTPSMSForPhone,
);

customer.get('/wallet', verifyFirebaseToken, controller.getAllPaymentMethod);

customer.delete('/wallet', verifyFirebaseToken, controller.removePaymentMethod);

export default customer;
