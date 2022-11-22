/* eslint-disable max-len */
import { Request, Response } from 'express';
import admin from 'firebase-admin';

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

export const getDishes = async (req: Request, res: Response) => {
  try {
    // const choices: Choice[] = [];

    // choices.push({
    //   id: v4(),
    //   en_name: 'choose a flavor',
    //   ch_name: '选择口味',
    //   minimum: 1,
    //   maxiumum: 1,
    //   type: 'required',
    //   options: [
    //     {
    //       id: v4(),
    //       en_name: 'original',
    //       ch_name: '原味',
    //       price: 0,
    //       is_spicy: false,
    //     },
    //     {
    //       id: v4(),
    //       en_name: 'salt and pepper',
    //       ch_name: '椒盐',
    //       price: 1,
    //       is_spicy: true,
    //     },
    //     {
    //       id: v4(),
    //       en_name: 'long horn pepper',
    //       ch_name: '小辣椒',
    //       price: 2,
    //       is_spicy: true,
    //     },
    //   ],
    // });

    // choices.push({
    //   id: v4(),
    //   en_name: 'choose additional protein',
    //   ch_name: '选择额外肉类',
    //   minimum: 0,
    //   maxiumum: 5,
    //   type: 'optional',
    //   options: [
    //     {
    //       id: v4(),
    //       en_name: 'chicken',
    //       ch_name: '鸡肉',
    //       price: 3,
    //       is_spicy: false,
    //     },
    //     {
    //       id: v4(),
    //       en_name: 'fish',
    //       ch_name: '鱼片',
    //       price: 3,
    //       is_spicy: false,
    //     },
    //     {
    //       id: v4(),
    //       en_name: 'beef',
    //       ch_name: '牛肉',
    //       price: 3,
    //       is_spicy: false,
    //     },
    //     {
    //       id: v4(),
    //       en_name: 'Fried tofu',
    //       ch_name: '炸豆腐',
    //       price: 3,
    //       is_spicy: false,
    //     },
    //     {
    //       id: v4(),
    //       en_name: 'fatty beef',
    //       ch_name: '肥牛',
    //       price: 6,
    //       is_spicy: false,
    //     },
    //   ],
    // });

    // await firestore()
    //   .collection('dishes')
    //   .doc('c997e318-d171-4b12-87a9-7e16984c014b')
    //   .update({
    //     choices: choices,
    //   });

    // const dishDocs = (await firestore().collection('dishes').where('is_spicy', '==', true).get()).docs;

    res.status(200).json();
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ error: (error as Error).message ?? 'Failed to get dishes' });
  }
};
