type DeliveryOptionType = 'delivery' | 'pickup';
type TimeFrameType = 'asap' | 'later';
type DropoffOptionType = 'hand_off' | 'leave_at_door';
type UtensilOptionType = 'include' | 'do not include';
type RewardType = 'reward' | 'redemption' | 'refund' | 'cancel';
type StatusType =
  | 'in_progress'
  | 'preparing'
  | 'complete'
  | 'partial_refund'
  | 'fully_refund'
  | 'cancelled';

declare namespace Checkout {
  // the data we will need from the user request
  interface ClientReq {
    contact: Contact;
    deliveryOption: DeliveryOptionType;
    timeFrame: TimeFrame;
    delivery: {
      address: Address;
      deliveryNotes: string;
      dropoffOption: DropoffOptionType;
    } | null;
    kitchen: KitchenOption;
    cartId: string;
    cart: CartItem[];
    summary: CartSummary;
  }

  // the object we will generate with the data
  interface ClientRes {
    id: string;
    createdAt: number;
    contact: Contact;
    deliveryOption: DeliveryOptionType;
    timeFrame: TimeFrame;
    delivery: {
      address: Address;
      deliveryNotes: string;
      dropoffOption: DropoffOptionType;
    } | null;
    kitchen: KitchenOption;
    cart: CartItem[];
    summary: CartSummary;
    reward: number;
    orderStatus: {
      status: StatusType;
      refund: RefundCancel | null;
      cancel: RefundCancel | null;
    };
  }

  // Client res will has data remove prior to sending back
  // Server will have all the data
  interface Server extends ClientRes {
    version?: number;
    uid?: string;
    payment: {
      paymentType: Payment.Type;
      stripe: {
        public: Payment.Public;
        private?: Payment.Private;
      } | null;
    };
  }

  interface RefundCancel {
    amount: number;
    reason: string;
    date: number;
  }
}

declare namespace Payment {
  type Type = 'in_person' | 'online';

  interface Public {
    type: string;
    card: {
      last4: string;
      expMonth: number;
      expYear: number;
      brand: string;
    } | null;
    created: number;
    clientSecret: string;
  }
  interface Private {
    id: string;
    customerId: string;
  }
  interface PublicPaymentMethod {
    id: string;
    customer: string;
    card: {
      brand: string;
      expMonth: number;
      expYear: number;
      last4: string;
    };
  }
}

interface Contact {
  name: string;
  phone: string;
}

interface TimeFrame {
  type: TimeFrameType;
  selected: ScheduleTime | null;
}

interface ScheduleTime {
  displayTime: string;
  numeric: number;
}

interface KitchenOption {
  kitchenNotes: string;
  utensilOption: UtensilOptionType;
}

interface CartItem {
  id: string;
  details: Dish;
  comments: string;
  quantity: number;
  price: number;
  total: number;
  choices: SelectChoice[];
}

interface CartSummary {
  originalSubtotal: number;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  cartQuantity: number;
  deliveryFee: number;
  discount: {
    redemption: number;
    lunch: number;
  };
}

interface Choice {
  id: string;
  en_name: string;
  ch_name: string;
  minimum: number;
  maxiumum: number;
  options: Option[];
  type: ChoiceType;
}

interface SelectChoice extends Choice {
  selectOptions: Option[];
}
