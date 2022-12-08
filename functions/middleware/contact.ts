import { NextFunction, Request, Response } from 'express';
import lodash from 'lodash';
import validator from 'validator';

const { isEmpty } = lodash;

export const verifyContactUs = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, email, subject, message } = req.body as ContactUs.Request;

    if (isEmpty(name)) {
      throw new Error('Name can not be empty');
    }

    if (isEmpty(email)) {
      throw new Error('Email can not be empty');
    }

    if (!validator.default.isEmail(email)) {
      throw new Error('Email is invalid or malformatted');
    }

    if (isEmpty(subject)) {
      throw new Error('Subject can not be empty');
    }

    if (isEmpty(message)) {
      throw new Error('Message can not be empty');
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
};
