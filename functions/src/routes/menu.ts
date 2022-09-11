/* eslint-disable new-cap */
import express from 'express';
import * as controller from '../controller/menu';

const menu = express.Router();

menu.get('/', controller.getAllMenu);

export default menu;
