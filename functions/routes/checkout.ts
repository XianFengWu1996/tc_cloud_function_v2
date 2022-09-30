/* eslint-disable max-len */
/* eslint-disable new-cap */
import express from 'express';
import * as controller from '../controller/checkout.js';

const checkout = express.Router();

checkout.post('/delivery/calculate', controller.calculateDistanceAndFee);

export default checkout;
