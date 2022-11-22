/* eslint-disable max-len */
/* eslint-disable new-cap */
import express from 'express';
import * as controller from '../controller/auth.js';
import { verifyPublicToken } from '../middleware/auth.js';

const auth = express.Router();

auth.post(
  '/forgot_password',
  verifyPublicToken,
  controller.generateResetPasswordLink,
);

auth.post(
  '/verify_reset_token',
  verifyPublicToken,
  controller.verifyResetPasswordToken,
);

auth.post(
  '/confirm_reset_password',
  verifyPublicToken,
  controller.confirmResetPassword,
);

export default auth;
