/* eslint-disable max-len */
import { Request, Response } from 'express';
import admin from 'firebase-admin';
import lodash from 'lodash';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { generateResetPasswordEmail } from '../email/resetPasswordEmail.js';

const { firestore, auth } = admin;
const { isEmpty, isEqual } = lodash;

interface IOobToken {
  action: 'reset_password' | 'email_verification';
  token: string;
  email: string;
  uid: string;
}

interface ResetPassDecodePayload {
  email: string;
  exp: number;
}

export const generateResetPasswordLink = async (
  req: Request,
  res: Response,
) => {
  try {
    const { email } = req.body;

    if (isEmpty(email)) {
      throw new Error('Email is required');
    }

    const user = await auth().getUserByEmail(email);

    // dont need it, but just incase if firebase failed to throw the error
    if (!user) {
      throw new Error('Email is not associate with any exist user');
    }

    const token = jwt.sign({ email: email }, process.env.RESET_PASS_SECRET, {
      expiresIn: '30m',
    });

    const oobToken: IOobToken = {
      action: 'reset_password',
      token: token,
      email: email,
      uid: user.uid,
    };

    await firestore().collection('/oob').doc(token).set(oobToken);

    const link = `${process.env.TAIPEI_FRONTEND_URL}/auth/reset_password?token=${token}`;

    // create reusable transporter object using the default SMTP transport
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // use SSL
      auth: {
        user: process.env.NODEMAILER_USER,
        pass: process.env.NODEMAILER_PASS,
      },
    });

    // send mail with defined transport object
    await transporter.sendMail({
      from: '"Taipei Cuisine" <taipeicuisine68@gmail.com>', // sender address
      to: email, // list of receivers
      subject: 'Reset your password for Taipei Cuisine', // Subject line
      html: generateResetPasswordEmail({ link }), // html body
    });

    res.status(200).json({ link });
  } catch (error) {
    res.status(500).json({
      error: (error as Error).message ?? 'Failed to send reset password link',
    });
  }
};

export const verifyResetPasswordToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (isEmpty(token)) {
      throw new Error('Invalid or missing token');
    }

    const decodedToken = jwt.verify(
      token,
      process.env.RESET_PASS_SECRET,
    ) as ResetPassDecodePayload;

    const result = (
      await firestore().collection('oob').doc(token).get()
    ).data() as IOobToken;

    if (decodedToken.email !== result.email) {
      throw new Error('Please request another link, the token is invalid');
    }

    res.status(200).json();
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: (error as Error).message ?? 'Failed to verify token' });
  }
};

export const confirmResetPassword = async (req: Request, res: Response) => {
  try {
    console.log(req.body);
    const { token, password, confirmPassword } = req.body;

    // check if the new and confirm password is empty
    if (isEmpty(password) || isEmpty(confirmPassword)) {
      throw new Error('Missing either password or confirm password field');
    }

    // verify the token
    const decoded = jwt.verify(
      token,
      process.env.RESET_PASS_SECRET,
    ) as ResetPassDecodePayload;

    // check if the email in the decoded token is the same as the one in the db
    const result = (
      await firestore().collection('oob').doc(token).get()
    ).data() as IOobToken;

    // check if the link was intent for reseting password
    if (result.action !== 'reset_password') {
      throw new Error(
        'Invalid link type, please request a new password reset link',
      );
    }

    // check if the email is the same
    if (result.email !== decoded.email) {
      throw new Error('Invalid link, please request a new password reset link');
    }

    // should be check in the frontend as well
    if (!isEqual(password, confirmPassword)) {
      throw new Error('New and confirm password does not match');
    }

    // update the user password
    await auth().updateUser(result.uid, {
      password,
    });

    res.status(200).json();
  } catch (error) {
    res
      .status(500)
      .json({ error: (error as Error).message ?? 'Failed to reset password' });
  }
};
