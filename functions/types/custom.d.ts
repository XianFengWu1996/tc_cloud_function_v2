import { DecodedIdToken } from 'firebase-admin/auth';

export {};

declare global {
  namespace Express {
    interface Request {
      user: DecodedIdToken;
      checkout: Checkout.ClientReq;
      paymentCard: Payment.PublicPaymentMethod;
    }
  }
}
