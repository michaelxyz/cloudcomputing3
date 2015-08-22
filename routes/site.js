var Customer = require('../models/customer');
var Product = require('../models/product');
var Category = require('../models/category');

/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index');
};

exports.getData = function(req, res){
  Customer.getAll(function (err, customers) {
    res.render('getData', {
      q1date: "",
      q1category: "",
      q1count: "",
      q2fname: "",
      q2lname: "",
      q2uuid: "",
      q2counter: "",
      customers : customers,
    });
  });
};

exports.about = function(req, res){
  res.render('about');
};

exports.refreshAll = function(req, res){
  Customer.getAll(function (err, customers){
    Product.getAll(function (err, products) {
      Category.getAll(function (err, categories) {
        res.render('users', {
          categories: categories,
          products: products,
          customers : customers,
          error: req.query.error,
        });
      });
    });
  });
};

