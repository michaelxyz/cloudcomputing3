
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index');
};

exports.getData = function(req, res){
  res.render('getData');
};

exports.DBstats = function(req, res){
  res.render('dbstatistics');
};

exports.about = function(req, res){
  res.render('about');
};


