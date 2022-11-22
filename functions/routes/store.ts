/* eslint-disable new-cap */
import apicache from 'apicache';
import express from 'express';
import * as controller from '../controller/store.js';
import { verifyPublicToken } from '../middleware/auth.js';

const store = express.Router();

const cache = apicache.middleware;

store.get('/', verifyPublicToken, cache('5 minutes'), controller.getStoreInfo);

store.get('/dish', controller.getDishes);
export default store;
