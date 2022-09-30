/* eslint-disable new-cap */
import express from 'express';
import * as controller from '../controller/auth.js';

const auth = express.Router();

auth.post('/forgot_password', controller.generateResetPasswordLink);

auth.post('/verify_reset_token', controller.verifyResetPasswordToken);

auth.post('/confirm_reset_password', controller.confirmResetPassword);

export default auth;
