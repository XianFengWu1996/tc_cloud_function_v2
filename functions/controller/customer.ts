/* eslint-disable max-len */
import { Request, Response } from 'express';
import admin from 'firebase-admin';
import jwt from 'jsonwebtoken';
import lodash from 'lodash';
import Stripe from 'stripe';
import isValidPhone from 'validator/lib/isMobilePhone.js';
import { verifyAddress } from '../helper/address.js';
import { createNewUserData } from '../helper/auth.js';
import {
  createPaymentIntent,
  generatePublicPaymentMethods,
} from '../helper/payment.js';

const { firestore, auth } = admin;
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

    // code to send sms using telnyx, but since we no longer going live, use twillio test account instead
    // let response = await axios.post('https://api.telnyx.com/v2/messages', {
    //     "from": "+15732241462", // phone number from the api
    //     "to": "+19175787352",  // phone number which you want to send to
    //     "text": "Your verfication code for Taipei Cuisine is {the verification code}. Please do not share this code."
    // },{
    //     headers: {
    //         "Content-Type": "application/json",
    //         "Accept": "application/json",
    //         "Authorization": `Bearer ${process.env.SMS_KEY}`
    //     }
    // })

    // twillio
    // set the sid and token in the environment variable
    // install the package: npm i twilio
    // let client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

    // client.messages.create({
    //   body: `Your verfication code for Taipei Cuisine is ${code}. Please do not share this code.`,
    //   from: "+13342928198",
    //   to: `+1${phone_num}`,
    // });

    await firestore().collection('sms').doc(token).set(smsToken);

    res.status(200).json({ token, codeForTestingPurpose: code });
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

    let paymentIntent = '';
    let customerId = '';

    const firebaseUser = await auth().getUser(req.user.uid);
    if (!user) {
      const result = await createNewUserData(
        req.user.email ?? firebaseUser.providerData[0].email,
        req.user.uid,
      );

      paymentIntent = result.paymentIntent.id;
      customerId = result.customer.id;
    } else {
      paymentIntent = user.paymentIntent;
      customerId = user.customer_id;
    }

    // retrieve and check the intent
    let intent = await stripe.paymentIntents.retrieve(paymentIntent);
    const customer = await stripe.customers.retrieve(customerId);
    const cards = await stripe.paymentMethods.list({
      customer: customer.id,
      type: 'card',
    });

    const publicMethods = generatePublicPaymentMethods(cards.data);

    // if the intent is already used, create a new intent
    if (intent.status === 'succeeded') {
      // reassign a new intent
      intent = await createPaymentIntent(customerId);

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

export const getOrderHistory = async (req: Request, res: Response) => {
  try {
    const orderRef = firestore().collection('order_v2');

    const orderDoc = (
      await orderRef
        .where('uid', '==', req.user.uid)
        .orderBy('createdAt', 'desc')
        .get()
    ).docs;

    const orders: Checkout.ClientRes[] = [];
    orderDoc.map((order) => {
      const temp = order.data() as Checkout.Server;

      delete temp.payment.stripe?.private;

      orders.push(temp);
    });

    res.status(200).json({
      orders,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: (error as Error).message ?? 'Failed to get payment methods',
    });
  }
};
