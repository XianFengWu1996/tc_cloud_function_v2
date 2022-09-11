import { firestore } from 'firebase-admin';

interface IGenerateCategoryFromDoc {
  doc: firestore.QueryDocumentSnapshot<firestore.DocumentData>[];
  dishes: IDish[];
  category: ICategory[];
}

export const generateCategoryFromDoc = (_: IGenerateCategoryFromDoc) => {
  _.doc.map((val) => {
    const data = val.data();

    const dishes = data.dishes as IDish[];

    dishes.map((dish) => {
      _.dishes.push(dish);
    });

    _.category.push({
      id: data.id,
      ch_name: data.ch_name,
      en_name: data.en_name,
      dishes: data.dishes,
      document_name: data.document_name,
      order: data.order,
    });

    _.category.sort((a, b) => {
      return a.order - b.order;
    });
  });
};
