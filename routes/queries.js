/**
 * Created by czeizm on 8/22/2015.
 */

var URL = require('url');
var neo4j = require('neo4j');

var db = new neo4j.GraphDatabase({
    // Support specifying database info via environment variables,
    // but assume Neo4j installation defaults.
    url: process.env['NEO4J_URL'] || process.env['GRAPHENEDB_URL'] ||
    'http://neo4j:neo4j@localhost:7474',
    auth: process.env['NEO4J_AUTH'],
});



exports.DBstats  = function (req, res, next) {
    var query1 = [
        'MATCH (n:Customer)',
        'Return COUNT(*)'
    ].join('\n');

    var query2 = [
        'MATCH (c:Customer)',
        'RETURN c.country, COUNT(*) ORDER BY COUNT(*) DESC LIMIT 3'
    ].join('\n');

    var query3 = ["match (n:Customer) with count(n) as tot'," +
    'match (n:Customer) where n.gender="female" with count(*) as toF',
    'tot match (n:Customer)  where n.gender="male" with count(*) as toM, tot, toF',
    'return toF*100/tot as toF , toM*100/tot as toM'
    ].join('\n');


    console.log("called : DBstats  **** called : DBstats  ****")
    db.cypher({
        query: query1,

    }, function (err, results) {
        if (err) return callback(err);
        console.log("results query1  "+ results);

        console.log(results[0].counter)
        console.log(results[0].name)
        //res.send(results[0]);
        res.render('dbstatistics', {
            q11: req.body.date,
            q12: results[0].name,
            q13: results[0].counter,
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
            if (err) return callback(err);
            res.render('getData', {
                q1date: req.body.date,
                q1category: results[0].name,
                q1count: results[0].counter,
            });
        });
};

exports.queryTwo = function (req, res, next) {
    var query = [
        'MATCH (c:Customer) where c.uuid={uuid}',
        'MATCH purchases = (c)-[:Purchase]->(x)<-[:Purchase]-(other)',
        'RETURN other.firstname AS name, other.lastname AS lastname,other.uuid AS uuid, count(x) AS counter',
        'ORDER BY counter DESC LIMIT 1',
    ].join('\n');

    var params = {
        uuid: req.body.uuid,
    };
    db.cypher({
        query: query,
        params: params,
    }, function (err, results) {
        if (err) return callback(err);
        res.render('getData', {
            q2fname: results[0].firstname,
            q2lname: results[0].lastname,
            q2uuid: results[0].uuid,
        });
    });
};

