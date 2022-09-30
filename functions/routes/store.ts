/* eslint-disable new-cap */
import express from 'express';
import * as controller from '../controller/store.js';

const store = express.Router();

store.get('/', controller.getStoreInfo);

export default store;
