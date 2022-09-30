/* eslint-disable max-len */
import { Request, Response } from 'express';
import map from '@googlemaps/google-maps-services-js';

export const defaultStorePlaceId = 'ChIJu6M8a15744kRIAABq6V-2Ew';

export const defaultStoreGeolocation = {
  lat: 42.27434345850252,
  lng: -71.02434194440872,
};

export const calculateDistanceAndFee = async (req: Request, res: Response) => {
  try {
    // calculation can be done with geolocation
    const lat: number = req.body.lat;
    const lng: number = req.body.lng;

    if (!lat || !lng) {
      throw new Error('Please provide both lat and lng');
    }

    const { Client, UnitSystem } = map;

    const client = new Client({});
    const result = await client.distancematrix({
      params: {
        origins: [
          {
            lat: defaultStoreGeolocation.lat,
            lng: defaultStoreGeolocation.lng,
          },
        ],
        destinations: [{ lat, lng }],
        key: process.env.MAP_KEY,
        units: UnitSystem.imperial,
      },
    });

    const distanceResult = result.data.rows[0].elements[0];

    // distance.text will return a string version of distance, ex: 1.2 mi
    // const distance = distanceResult.distance.text.replace(' mi', '');

    // 1 meter = 0.0006213709999975145 mi
    const distance = Number(
      (distanceResult.distance.value * 0.0006213709999975145).toFixed(2),
    );
    let fee = 0;

    if (distance < 1.8) {
      fee = 2;
    } else if (distance >= 1.8 && distance < 4) {
      fee = Math.round(distance);
    } else if (distance >= 4 && distance < 6) {
      fee = Math.round(distance) + 1.5;
    } else {
      throw new Error('Undeliverable, out of boundary');
    }

    // calculate the time for the order
    // duration is express in second
    const lowerBoundPreparationTime = 20 * 60;
    const upperBoundPreparationTime = 40 * 60;

    const duration = distanceResult.duration.value;
    const lower = Math.round((lowerBoundPreparationTime + duration) / 60);
    const upper = Math.round((upperBoundPreparationTime + duration) / 60);

    res.status(200).json({
      fee,
      preparationTime: {
        lower: Math.round(lower / 5) * 5,
        upper: Math.round(upper / 5) * 5,
      },
    });
  } catch (error) {
    res.status(500).json({
      error:
        (error as Error).message ?? 'Failed to calculate distance and fees',
    });
  }
};
