import lodash from 'lodash';

const { isNull, isNumber, isString } = lodash;

export const verifyAddress = (address: Address) => {
  if (!address) {
    throw new Error('No address is provided');
  }

  if (!address.details) {
    throw new Error('Missing address details');
  }

  if (!address.formattedAddress) {
    throw new Error('Missing formatted address');
  }

  if (!isString(address.formattedAddress.complete)) {
    throw new Error('Missing complete address');
  }

  if (!isString(address.formattedAddress.streetName)) {
    throw new Error('Missing formatted street name');
  }

  if (!isString(address.formattedAddress.cityStateZip)) {
    throw new Error('Missing formatted city, state, and zip');
  }

  if (!isString(address.details.streetName)) {
    throw new Error('Missing street name');
  }
  if (!isString(address.details.streetNumber)) {
    throw new Error('Missing street number');
  }
  if (!isString(address.details.city)) {
    throw new Error('Missing city');
  }
  if (!isString(address.details.state)) {
    throw new Error('Missing state');
  }
  if (!isString(address.details.country)) {
    throw new Error('Missing country');
  }

  if (!isString(address.details.postalCode)) {
    throw new Error('Missing postal code');
  }

  if (!isNumber(address.details.lat)) {
    throw new Error('Missing latitude');
  }

  if (!isNumber(address.details.lng)) {
    throw new Error('Missing longitude');
  }

  if (!isString(address.details.placeId)) {
    throw new Error('Missing place id');
  }
  if (
    !isNumber(address.details.deliveryFee) ||
    address.details.deliveryFee <= 0
  ) {
    throw new Error('Missing delivery fee');
  }

  if (!isString(address.details.estimateTime)) {
    throw new Error('Missing estimate time');
  }

  if (isNull(address.details.apartmentNumber)) {
    throw new Error('Apartment number can not be null');
  }
};
