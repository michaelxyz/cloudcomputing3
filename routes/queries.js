/**
 * Created by czeizm on 8/22/2015.
 */

var URL = require('url');
var neo4j = require('neo4j');
var Customer = require('../models/customer');
var Product = require('../models/product');
var Category = require('../models/category');

var resDict = {
    q1date: "",
    q1category: "",
    q1count: "",
    q2fname: "",
    q2lname: "",
    q2uuid: "",
    q2counter: "",
    q3clients: "",
    q4product: "",
}

var db = new neo4j.GraphDatabase({
    // Support specifying database info via environment variables,
    // but assume Neo4j installation defaults.
    url: process.env['NEO4J_URL'] || process.env['GRAPHENEDB_URL'] ||
    'http://neo4j:neo4j@localhost:7474',
    auth: process.env['NEO4J_AUTH'],
});

// Number of users query
var q1 = function (callback) {
    var query = [
        'MATCH (cus:Customer)',
        'RETURN count(cus) AS counter',
    ].join('\n');

    db.cypher({
        query: query,
    }, function (err, cusCounter) {
        if (err) return callback(err);
        callback(null, cusCounter[0]);
    });
};

// Most popular countries
var q2 = function (callback) {
    var query = [
        'MATCH (c:Customer)',
        'RETURN c.country AS country, COUNT(*) AS counter',
        'ORDER BY counter DESC LIMIT 3'
    ].join('\n');

    db.cypher({
        query: query,
    }, function (err, popCountries) {
        if (err) return callback(err);
        callback(null, popCountries);
    });
};

// Most popular countries
var q3 = function (callback) {
    var query = [
        'MATCH (n:Customer) WITH count(n) AS tot',
        'MATCH (n:Customer) WHERE n.gender="Female" WITH count(*) AS toF',
        'tot MATCH (n:Customer) WHERE n.gender="Male" with count(*) as toM, tot, toF',
        'RETURN toF*100/tot AS toF , toM*100/tot AS toM',
    ].join('\n');

    db.cypher({
        query: query,
    }, function (err, popCountries) {
        if (err) return callback(err);
    });
    callback(null, popCountries[0]);
};

// Number of products
var q4 = function (callback) {
    var query = [
        'MATCH (p:Product)',
        'RETURN count(p) AS counter',
    ].join('\n');

    db.cypher({
        query: query,
    }, function (err, numOfProducts) {
        if (err) return callback(err);
        callback(null, numOfProducts[0]);
    });
};

// Top 3 sold products
var q5 = function (callback) {
    var query = [
        'MATCH ()-[x:Purchase]->(p)',
        'RETURN p AS product ,count(x) AS purchases',
        'ORDER BY purchases DESC LIMIT 3',
    ].join('\n');

    db.cypher({
        query: query,
    }, function (err, topSoldProducts) {
        if (err) return callback(err);
        callback(null, topSoldProducts);
    });
};

exports.DBstats  = function (req, res) {
    q1(function (err, customerCounter) {
        q2(function (err, popularCountires) {
            q4(function (err, numberOfProducts) {
                q5(function (err, topSoldProducts) {
                    res.render('dbstatistics', {
                        customerCounter: customerCounter,
                        popularCountires: popularCountires,
                        numberOfProducts : numberOfProducts,
                        topSoldProducts: topSoldProducts,
                    });
                });
            });
        });
    });
};

exports.queryOne = function (req, res, next) {
        //var safeProps = validate(props);
        var query = [
            'MATCH (m:Customer)-[x:Purchase]->(p:Product)-[y:Is]-(c)',
            'WHERE x.date={date}',
            'RETURN c.name AS name, count(*) AS counter',
            'ORDER BY counter DESC LIMIT 1',
        ].join('\n');

        var params = {
            date: req.body.date,
        };
        db.cypher({
            query: query,
            params: params,
        }, function (err, results) {
            if (results[0] == undefined) {
                Customer.getAll(function (err, customers){
                    resDict.customers= customers;
                    res.render('getData', resDict);})
            } else {
                if (err) return callback(err);
                resDict.q1date = req.body.date;
                resDict.q1category = results[0].name;
                resDict.q1count = results[0].counter;
                Customer.getAll(function (err, customers) {
                    resDict.customers = customers;
                    res.render('getData', resDict);
                });
            };
        });

};

exports.queryTwo = function (req, res, next) {
    var query = [
        'MATCH (c:Customer) where c.uuid={uuid}',
        'MATCH purchases = (c)-[:Purchase]->(x)<-[:Purchase]-(other)',
        'RETURN other.firstname AS firstname, other.lastname AS lastname,other.uuid AS uuid, count(x) AS counter',
        'ORDER BY counter DESC LIMIT 1',
    ].join('\n');

    var params = {
        uuid: req.body.uuid,
    };
    db.cypher({
        query: query,
        params: params,
    }, function (err, results) {
        if (results[0] == undefined) {
            Customer.getAll(function (err, customers){
                resDict.customers= customers;
                res.render('getData', resDict);})
        } else {
            if (err) return callback(err);
            console.log(results[0]);
            resDict.q2fname = results[0].firstname;
            resDict.q2lname = results[0].lastname;
            resDict.q2uuid = results[0].uuid;
            resDict.q2counter = results[0].counter;
            Customer.getAll(function (err, customers) {
                resDict.customers = customers;
                res.render('getData', resDict);
            })
        }
    });
};

exports.queryThree = function (req, res, next) {
    var query = [
        'MATCH (c:Customer) where c.uuid={uuid}',
        'OPTIONAL MATCH purchases = (c)-[:Purchase]->(x)<-[:Purchase]-(other)',
        'RETURN other.firstname AS firstname,other.lastname AS lastname,other.uuid AS uuid,x.name AS itemName, ' +
        'x.uuid AS itemUuid, x.model AS itemModel, x.producer AS itemProducer',
    ].join('\n');

    var params = {
        uuid: req.body.uuid,
    };
    db.cypher({
        query: query,
        params: params,
    }, function (err, results) {
        if (results[0] == undefined) {
            Customer.getAll(function (err, customers){
                resDict.customers= customers;
                res.render('getData', resDict);})
        } else {
            if (err) return callback(err);
            resDict.q3clients = results;
            Customer.getAll(function (err, customers) {
                resDict.customers = customers;
                res.render('getData', resDict);
            })
        }
    });
};

exports.queryFour = function (req, res, next) {
    var query = [
        'MATCH purchases = ()-[:Is]->(x)',
        'RETURN x.name AS name, count(x) AS counter',
        'ORDER BY counter DESC LIMIT 1',
    ].join('\n');

    var params = {
    };
    db.cypher({
        query: query,
        params: params,
    }, function (err, results) {
        if (results[0] == undefined) {
            Customer.getAll(function (err, customers){
                resDict.customers= customers;
                res.render('getData', resDict);})
        } else {
            if (err) return callback(err);
            resDict.q4product = results[0];
            Customer.getAll(function (err, customers) {
                resDict.customers = customers;
                res.render('getData', resDict);
            })
        }
    });
};