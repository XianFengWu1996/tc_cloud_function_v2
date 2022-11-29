/* eslint-disable max-len */
import { Request, Response } from 'express';
import admin from 'firebase-admin';
import jwt from 'jsonwebtoken';
import lodash from 'lodash';
import Stripe from 'stripe';
import isValidPhone from 'validator/lib/isMobilePhone.js';
import { verifyAddress } from '../helper/address.js';
import {
  createPaymentIntent,
  generatePublicPaymentMethods,
} from '../helper/payment.js';

const { firestore } = admin;
const { isString } = lodash;

const stripe = new Stripe(process.env.STRIPE_KEY, {
  apiVersion: '2022-08-01',
});

export const sendOTPSMSForPhone = async (req: Request, res: Response) => {
  try {
    const phone = req.body.phone;

    if (!phone) {
      throw new Error('Phone is required');
    }

    if (!isValidPhone.default(phone, 'en-US')) {
      throw new Error('Enter a valid phone number');
    }

    // throw new Error('this is an error');
    // generate 6-digit otp code
    const code = Math.floor(Math.random() * 899999 + 100000); // generate 6 digit code

    const token = jwt.sign(
      { action: 'sms_verify' as SMS_VERIFY_ACTION, phone },
      process.env.SMS_TOKEN_SECRET,
      {
        expiresIn: '30m',
      },
    );

    const smsToken: ISMSToken = {
      code: code.toString(),
      phone,
      email: req.user.email ?? '',
      token,
      uid: req.user.uid,
    };

    console.log(code);

    await firestore().collection('sms').doc(token).set(smsToken);

    res.status(200).json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: (error as Error).message ?? 'Failed to send one time passcode',
    });
  }
};

export const verifyOTPSMSForPhone = async (req: Request, res: Response) => {
  try {
    const { phone, code, token } = req.body;

    // check if variables are passed in
    if (!phone && !isString(phone)) {
      throw new Error('Phone is invalid or not provided');
    }
    if (!code && !isString(code)) {
      throw new Error('One time passcode is invalid or not provided');
    }
    if (!token && !isString(token)) {
      throw new Error('Token is invalid or not provided');
    }

    // verify the token
    const decode = jwt.verify(
      token,
      process.env.SMS_TOKEN_SECRET,
    ) as IVerifyDecodeResult;

    if (decode.action !== 'sms_verify') {
      throw new Error('Wrong action type');
    }

    firestore().runTransaction(async (transaction) => {
      // grab the data from the database and verify the code
      const smsRef = firestore().collection('/sms').doc(token);
      const userRef = firestore().collection('/users_v2').doc(req.user.uid);

      const smsToken = (await transaction.get(smsRef)).data() as ISMSToken;

      if (decode.phone !== smsToken.phone) {
        throw new Error('Phone does not match');
      }

      if (code !== smsToken.code) {
        throw new Error('The code provided is incorrect');
      }

      // remove from the database once its verified
      transaction.delete(smsRef);

      // update the phone number for the user
      transaction.update(userRef, {
        phone: smsToken.phone,
      });

      res.status(200).json();
    });
  } catch (error) {
    res.status(500).json({
      error: (error as Error).message ?? 'Failed to send one time passcode',
    });
  }
};

export const getCustomerData = async (req: Request, res: Response) => {
  try {
    const userRef = firestore().collection('/users_v2').doc(req.user.uid);
    const user = (await userRef.get()).data();

    if (!user) {
      throw new Error('No user found');
    }

    // retrieve and check the intent
    let intent = await stripe.paymentIntents.retrieve(user.paymentIntent);
    const customer = await stripe.customers.retrieve(user.customer_id);
    const cards = await stripe.paymentMethods.list({
      customer: customer.id,
      type: 'card',
    });

    const publicMethods = generatePublicPaymentMethods(cards.data);

    // if the intent is already used, create a new intent
    if (intent.status === 'succeeded') {
      // reassign a new intent
      intent = await createPaymentIntent(user.customer_id);

      // update the new intent
      await userRef.update({
        paymentIntent: intent.id,
      });
    }

    // remove the private property
    delete user?.customer_id;
    delete user?.paymentIntent;

    res.status(200).json({
      user,
      clientSecret: intent.client_secret,
      cards: publicMethods,
    });
  } catch (error) {
    res.status(500).json({
      error: (error as Error).message ?? 'Failed to send one time passcode',
    });
  }
};

export const updateNameForUser = async (req: Request, res: Response) => {
  try {
    const name: string = req.body.name;

    if (!name && !isString(name)) {
      throw new Error('Name is not valid or not provided');
    }

    const userRef = firestore().collection('/users_v2').doc(req.user.uid);

    await userRef.update({ name });

    res.status(200).json();
  } catch (error) {
    res
      .status(500)
      .json({ error: (error as Error).message ?? 'Failed to update name' });
  }
};

export const updateAddress = async (req: Request, res: Response) => {
  try {
    const address: Address = req.body.address;

    // verify all the address fields
    verifyAddress(address);

    const userRef = firestore().collection('/users_v2').doc(req.user.uid);

    await userRef.update({
      address: {
        formattedAddress: address.formattedAddress,
        details: address.details,
      } as Address,
    });

    res.status(200).json();
  } catch (error) {
    res
      .status(500)
      .json({ error: (error as Error).message ?? 'Failed to update address' });
  }
};

export const getAllPaymentMethod = async (req: Request, res: Response) => {
  try {
    // get customer id from the database
    const userRef = firestore().collection('/users_v2').doc(req.user.uid);
    const user = (await userRef.get()).data() as User;

    // list out all saved card payment methods
    const cards = await stripe.paymentMethods.list({
      customer: user.customer_id,
      type: 'card',
    });

    const publicMethods = generatePublicPaymentMethods(cards.data);

    res.status(200).json({ cards: publicMethods });
  } catch (error) {
    res.status(500).json({
      error: (error as Error).message ?? 'Failed to get payment methods',
    });
  }
};

export const removePaymentMethod = async (req: Request, res: Response) => {
  try {
    const card = req.body.card as Payment.PublicPaymentMethod;

    if (!card) {
      throw new Error('Please provide card info');
    }

    await stripe.paymentMethods.detach(card.id);

    const cards = await stripe.paymentMethods.list({
      customer: card.customer,
      type: 'card',
    });

    const paymentMethods = generatePublicPaymentMethods(cards.data);

    res.status(200).json({
      cards: paymentMethods,
    });
  } catch (error) {
    res.status(500).json({
      error: (error as Error).message ?? 'Failed to get payment methods',
    });
  }
};
