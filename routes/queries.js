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
        console.log("****")
        console.log(req.body.date)
        console.log(query)
        db.cypher({
            query: query,
            params: params,
        }, function (err, results) {
            //if (isConstraintViolation(err)) {
            //    // TODO: This assumes username is the only relevant constraint.
            //    // We could parse the constraint property out of the error message,
            //    // but it'd be nicer if Neo4j returned this data semantically.
            //    // Alternately, we could tweak our query to explicitly check first
            //    // whether the username is taken or not.
            //    err = new errors.ValidationError(
            //        'The username ‘' + props.username + '’ is taken.');
            //}
            if (err) return callback(err);

            //if (!results.length) {
            //    err = new Error('User has been deleted! Username: ' + self.username);
            //    return callback(err);
            //}
            console.log(results);
            console.log('11111')
            console.log(results[0].name)
            console.log(results[0].counter)
            //res.send(results[0]);
            res.render('getData', {
                date: req.body.date,
                name: results[0].name,
                count: results[0].counter,
            });
        });
};


