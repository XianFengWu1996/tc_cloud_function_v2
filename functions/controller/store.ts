/* eslint-disable max-len */
import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { v4 } from 'uuid';

const { firestore } = admin;

export const getStoreInfo = async (req: Request, res: Response) => {
  try {
    const storeRef = firestore().collection('store');
    const dishesRef = firestore().collection('dishes');

    const storeDocs = (await storeRef.get()).docs;

    let menus: Menu[] = [];
    let hours = {};
    let messages = {};
    let status = {};
    const dishes: Dish[] = [];

    storeDocs.map((item) => {
      if (item.id === 'menu') menus = item.data().menu as Menu[];
      if (item.id === 'hours') hours = item.data();
      if (item.id === 'message') messages = item.data();
      if (item.id === 'status') status = item.data();
    });

    const dishesDocs = (await dishesRef.get()).docs;
    dishesDocs.map((dish) => {
      dishes.push(dish.data() as Dish);
    });

    res.status(200).json({
      menus,
      hours,
      messages,
      status,
      dishes,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: (error as Error).message ?? 'Failed to get store data' });
  }
};

export const contactUs = async (req: Request, res: Response) => {
  try {
    const { name, email, subject, message } = req.body as ContactUs.Request;
    const id = v4();

    await firestore()
      .collection('contactUs')
      .doc(id)
      .set({
        id,
        name,
        email,
        subject,
        message,
        createdAt: Date.now(),
        status: 'requested',
      } as ContactUs.Data);

    res.status(200).json();
  } catch (error) {
    res.status(500).json({
      error: (error as Error).message ?? 'Failed to get sent message',
    });
  }
};

export const getOrders = async (req: Request, res: Response) => {
  try {
    const snapshot = await firestore().collection('order_v2').get();
    const orders: Checkout.Server[] = [];

    snapshot.docs.map((data) => {
      const order = data.data() as Checkout.Server;
      orders.push(order);
    });

    res.status(200).json({ orders });
  } catch (error) {
    res.status(500).json({
      error:
        (error as Error).message ?? 'Failed to get order for simulate orders',
    });
  }
};

export const getContactUsMessage = async (req: Request, res: Response) => {
  try {
    const snapshot = await firestore().collection('contactUs').get();
    const contactUs: ContactUs.Data[] = [];

    snapshot.docs.map((data) => {
      const message = data.data() as ContactUs.Data;
      contactUs.push(message);
    });

    res.status(200).json({ contactUs });
  } catch (error) {
    res.status(500).json({
      error:
        (error as Error).message ?? 'Failed to get simulate contact us message',
    });
  }
};

export const updateContactUsMessageStatus = async (
  req: Request,
  res: Response,
) => {
  try {
    const id: string = req.body.id;
    const status: ContactUs.Status = req.body.status;

    await firestore().collection('contactUs').doc(id).update({
      status,
    });

    res.status(200).json();
  } catch (error) {
    res.status(500).json({
      error:
        (error as Error).message ??
        'Failed to update simulate contact us message',
    });
  }
};
