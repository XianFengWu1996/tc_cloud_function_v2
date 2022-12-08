/* eslint-disable max-len */
/* eslint-disable camelcase */
import { NextFunction, Request, Response } from 'express';
import admin from 'firebase-admin';
import lodash from 'lodash';
import validator from 'validator';
import { currenTime, timeFormat } from '../helper/time.js';

const { isString, isEmpty, isNumber } = lodash;
const { isMobilePhone } = validator.default;
const { firestore } = admin;

export const verifyCheckoutClient = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const {
    contact,
    deliveryOption,
    delivery,
    timeFrame,
    kitchen,
    cart,
    summary,
  }: Checkout.ClientReq = req.body;

  try {
    if (!isString(contact.name) || isEmpty(contact.name)) {
      throw new Error('Please include contact name');
    }

    if (
      !isString(contact.phone) ||
      isEmpty(contact.phone) ||
      !isMobilePhone(contact.phone, 'en-US')
    ) {
      throw new Error('Please include a valid contact phone');
    }

    if (!isString(deliveryOption) || isEmpty(deliveryOption)) {
      throw new Error('Please include delivery option');
    }

    if (deliveryOption !== 'delivery' && deliveryOption !== 'pickup') {
      throw new Error(`Delivery option should be either 'delivery' or 'pickup`);
    }

    if (deliveryOption === 'delivery') {
      if (!delivery) {
        throw new Error('Please provide delivery object');
      }

      if (!delivery.address) {
        throw new Error('Please provide complete address');
      }

      if (isEmpty(delivery.address.details)) {
        throw new Error('Please provide complete address (details)');
      }

      if (isEmpty(delivery.address.formattedAddress)) {
        throw new Error('Please provide complete address (format)');
      }

      if (
        delivery.dropoffOption !== 'hand_off' &&
        delivery.dropoffOption !== 'leave_at_door'
      ) {
        throw new Error(
          `Drop off option must be either be 'hand_off' or 'leave_at_door'`,
        );
      }
    }

    if (!timeFrame) {
      throw new Error('Timeframe must be provided');
    }

    if (timeFrame.type !== 'asap' && timeFrame.type !== 'later') {
      throw new Error(`Time frame must be either 'asap' or 'later'`);
    }

    if (timeFrame.type === 'later') {
      if (isEmpty(timeFrame.selected)) {
        throw new Error('Time frame selected must be provided');
      }

      if (
        !isString(timeFrame.selected.displayTime) ||
        isEmpty(timeFrame.selected.displayTime)
      ) {
        throw new Error('Please provide a valid display time');
      }

      if (!isNumber(timeFrame.selected.numeric)) {
        throw new Error('Please provide a valid numeric time');
      }
    }

    if (!kitchen) {
      throw new Error('Kitchen must be provided');
    }

    if (
      kitchen.utensilOption !== 'do not include' &&
      kitchen.utensilOption !== 'include'
    ) {
      throw new Error(`Utensil option must be 'do not include' or 'include'`);
    }

    if (isEmpty(cart)) {
      throw new Error('The cart is empty, try adding some items');
    }

    if (isEmpty(summary)) {
      throw new Error('Cart summary must be provided');
    }

    if (
      deliveryOption === 'delivery' &&
      !isNumber(summary.deliveryFee) &&
      summary.deliveryFee < 0
    ) {
      throw new Error('Delivery fee can not be less than 0');
    }

    if (!isNumber(summary.subtotal)) {
      throw new Error('Subtotal must be a number');
    }

    if (!isNumber(summary.originalSubtotal)) {
      throw new Error('Subtotal must be a number');
    }

    if (!isNumber(summary.tax)) {
      throw new Error('Tax must be a number');
    }

    if (!isNumber(summary.total)) {
      throw new Error('Total must be a number');
    }

    if (!isNumber(summary.cartQuantity)) {
      throw new Error('Cart quantity must be a number');
    }

    req.checkout = req.body;

    next();
  } catch (error) {
    res.status(500).json({
      error: (error as Error).message ?? 'Some error has occurred',
    });
  }
};

export const verifyPaymentMethod = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id, customer, card }: Payment.PublicPaymentMethod = req.body.card;

    console.log(req.body.card);

    if (!isString(id) || isEmpty(id)) {
      throw new Error('Payment method id is missing or malformat');
    }

    if (!isString(customer) || isEmpty(customer)) {
      throw new Error('Customer id is missing or malformat');
    }

    if (!isString(card.brand) || isEmpty(card.brand)) {
      throw new Error('Card brand is missing or malformat');
    }

    if (!isNumber(card.expMonth)) {
      throw new Error('Card expiration month is missing or malformat');
    }

    if (!isNumber(card.expYear)) {
      throw new Error('Card expiration year missing or malformat');
    }

    if (!isString(card.last4) || isEmpty(card.last4)) {
      throw new Error('Card last 4 digit is missing or malformat');
    }

    req.paymentCard = req.body.card;
    next();
  } catch (error) {
    res.status(500).json({
      error: (error as Error).message ?? 'Some error has occurred',
    });
  }
};

export const verifyStoreOpenStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const snapshot = await firestore().collection('store').doc('hours').get();

    const hoursData = snapshot.data() as Hours;

    const foundHour = hoursData.regular_hour.find((hr) => {
      return hr.dayOfWeek === currenTime().dayOfWeek;
    });

    if (!foundHour) {
      throw new Error('No store hour is found');
    }

    const { isOpenForBusiness, hours } = foundHour;
    const { operating } = hours;

    if (!isOpenForBusiness) {
      throw new Error('The store is not open for business today');
    }

    const time = currenTime().currentTime;

    if (!(operating.open < time && operating.close > time)) {
      throw new Error(
        `The kitchen is close, the store hour is ${timeFormat(
          operating.open,
        )}-${timeFormat(operating.close)}`,
      );
    }

    next();
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: (error as Error).message ?? 'Failed to create order' });
  }
};
