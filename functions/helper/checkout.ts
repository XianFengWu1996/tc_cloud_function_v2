/* eslint-disable max-len */
/* eslint-disable operator-linebreak */
export const generateCheckoutObject = (checkout: Checkout.ClientReq) => {
  const reward = Math.round(
    Number(checkout.summary.subtotal * Number(process.env.REWARD_PERCENTAGE)),
  );
  return {
    contact: checkout.contact,
    deliveryOption: checkout.deliveryOption,
    timeFrame: checkout.timeFrame,
    delivery: checkout.delivery
      ? {
          address: checkout.delivery.address,
          deliveryNotes: checkout.delivery.deliveryNotes ?? '',
          dropoffOption: checkout.delivery.dropoffOption,
        }
      : null,
    kitchen: {
      kitchenNotes: checkout.kitchen.kitchenNotes ?? '',
      utensilOption: checkout.kitchen.utensilOption,
    },
    cart: checkout.cart,
    summary: {
      originalSubtotal: checkout.summary.originalSubtotal ?? 0,
      subtotal: checkout.summary.subtotal ?? 0,
      tax: checkout.summary.tax ?? 0,
      tip: checkout.summary.tip ?? 0,
      total: checkout.summary.total ?? 0,
      cartQuantity: checkout.summary.cartQuantity ?? 0,
      deliveryFee: checkout.summary.deliveryFee ?? 0,
      discount: {
        redemption: checkout.summary.discount.redemption ?? 0,
        lunch: checkout.summary.discount.lunch ?? 0,
      },
    },
    reward: reward,
  };
};
