'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../config');
const { User } = require('../models');
const logger = require('../logger');
const { Op } = require('sequelize');
const Notes = require('../models').Note; 

async function queryNotes() {
  try {
    return await Notes.findAll({
      attributes: ['shortid', 'title'], 
      where: {
        content: {
          [Op.like]: '%---%tags%:%public%---%',
        },
      },
    });
  } catch (error) {
    logger.error('Error executing queryNotes:', error);
    return [];
  }
}

/**
 * 顯示首頁
 */
exports.showIndex = async (req, res) => {
  const isLogin = req.isAuthenticated();
  const data = {
    signin: isLogin,
    infoMessage: req.flash('info'),
    errorMessage: req.flash('error'),
    privacyStatement: fs.existsSync(path.join(config.docsPath, 'privacy.md')),
    termsOfUse: fs.existsSync(path.join(config.docsPath, 'terms-of-use.md')),
    deleteToken: '',
    csrfToken: req.csrfToken(),
    publicNotes: [],
  };

  if (!isLogin) {
    return res.render('index.ejs', data);
  }

  try {
    data.publicNotes = await queryNotes();
    const user = await User.findOne({
      where: { id: req.user.id },
    });

    if (user) {
      data.deleteToken = user.deleteToken;
      return res.render('public.ejs', {data: data.publicNotes});
    }

    logger.error(`Error: User not found with id ${req.user.id}`);
    return res.render('index.ejs', data);
  } catch (error) {
    logger.error(`Error fetching user data: ${error}`);
    return res.status(500).render('error.ejs', { message: 'Internal server error' });
  }
};