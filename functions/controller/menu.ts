import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { generateCategoryFromDoc } from '../helper/menu.js';

const { firestore } = admin;

export const getAllMenu = async (req: Request, res: Response) => {
  try {
    const dishes: IDish[] = [];

    // initialize the fullday and lunch object
    const fullday: IMenu = {
      id: process.env.FULLDAY_MENUID,
      en_name: 'Fullday',
      ch_name: '全天',
      document_name: 'fullday',
      category: [],
    };

    const lunch: IMenu = {
      id: process.env.LUNCH_MENUID,
      en_name: 'Lunch',
      ch_name: '午餐',
      document_name: 'lunch',
      category: [],
    };

    // retrieve both fullday and lunch doc from firestore
    const fulldayDoc = await firestore()
      .collection('menus')
      .doc(process.env.STORE_ID)
      .collection('fullday')
      .get();

    const lunchDoc = await firestore()
      .collection('menus')
      .doc(process.env.STORE_ID)
      .collection('lunch')
      .get();

    // push the category into the menu
    generateCategoryFromDoc({
      doc: fulldayDoc.docs,
      dishes,
      category: fullday.category,
    });

    generateCategoryFromDoc({
      doc: lunchDoc.docs,
      dishes,
      category: lunch.category,
    });

    res.status(200).send({
      fullday,
      lunch,
      dishes,
    });
  } catch (error) {
    console.error(error);
  }
};
