/* eslint-disable new-cap */
import apicache from 'apicache';
import express from 'express';
import * as controller from '../controller/store.js';
import { verifyPublicToken } from '../middleware/auth.js';
import { verifyContactUs } from '../middleware/contact.js';

const store = express.Router();

const cache = apicache.middleware;

store.get('/', verifyPublicToken, cache('5 minutes'), controller.getStoreInfo);

store.post(
  '/contactus',
  verifyPublicToken,
  verifyContactUs,
  controller.contactUs,
);

// just for simulation purpose
store.get('/simulate/orders', verifyPublicToken, controller.getOrders);
store.get(
  '/simulate/contactus',
  verifyPublicToken,
  controller.getContactUsMessage,
);

store.put(
  '/simulate/contactus/status',
  verifyPublicToken,
  controller.updateContactUsMessageStatus,
);
export default store;
