/* eslint-disable max-len */
import { NextFunction, Request, Response } from 'express';
import admin from 'firebase-admin';
import jwt from 'jsonwebtoken';

const { auth } = admin;

export const verifyFirebaseToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authorization = req.headers.authorization?.replace('Bearer ', '');

    if (!authorization) {
      throw new Error('Not Authorized');
    }

    const user = await auth()
      .verifyIdToken(authorization)
      .catch(() => {
        throw new Error('Failed to authorize');
      });

    if (!user) {
      throw new Error('Not authorized');
    }

    req.user = user;

    next();
  } catch (error) {
    res
      .status(500)
      .json({ error: (error as Error).message ?? 'Not Authorized' });
  }
};

export const verifyPublicToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.headers.authorization) {
      throw new Error('Not authorize');
    }

    // remove the bearer from the token
    const authorization = req.headers.authorization.replace('Bearer ', '');

    // verify the jwt
    jwt.verify(authorization, process.env.PUB_TOKEN_SECRET, (err) => {
      if (err) {
        throw new Error('Failed to authorize');
      }
    });
    next();
  } catch (error) {
    res.status(500).json({ error: 'Not authenicated' });
  }
};
