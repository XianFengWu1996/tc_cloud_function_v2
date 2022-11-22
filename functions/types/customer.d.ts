type SMS_VERIFY_ACTION = 'sms_verify';

interface ISMSToken {
  code: string; // the 6 digit code
  phone: string;
  email: string;
  uid: string;
  token: string;
}

interface IVerifyDecodeResult {
  action: SMS_VERIFY_ACTION;
  phone: string;
  iat: number;
  exp: number;
}

interface User {
  address: Address;
  name: string;
  phone: string;
  customer_id: string;
  paymentIntent: string;
  reward: Reward;
}

// =========================
// ADDRESS
// =========================
interface Address {
  formattedAddress: FormattedAddress | null;
  details: AddressDetails | null;
}

interface FormattedAddress {
  complete: string;
  streetName: string;
  cityStateZip: string;
}

interface AddressDetails {
  streetNumber: string;
  streetName: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  lat: number;
  lng: number;
  placeId: string;
  deliveryFee: number;
  estimateTime: string;
  apartmentNumber: string;
}

interface Reward {
  points: number;
  transactions: RewardTransaction[];
}

interface RewardTransaction {
  type: RewardType;
  amount: number;
  createdAt: number;
  updatedAt: number;
  orderId: string;
}
