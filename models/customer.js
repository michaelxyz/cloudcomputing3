/**
 * Created by czeizm on 8/14/2015.
 */
// user.js
// User model logic.

var neo4j = require('neo4j');
var errors = require('./errors');

var db = new neo4j.GraphDatabase({
    // Support specifying database info via environment variables,
    // but assume Neo4j installation defaults.
    url: process.env['NEO4J_URL'] || process.env['GRAPHENEDB_URL'] ||
    'http://neo4j:neo4j@localhost:7474',
    auth: process.env['NEO4J_AUTH'],
});

// Private constructor:

var Customer = module.exports = function Customer(_node) {
    // All we'll really store is the node; the rest of our properties will be
    // derivable or just pass-through properties (see below).
    this._node = _node;
}

// Public constants:

Customer.VALIDATION_INFO = {
    'firstname': {
        required: true,
        minLength: 2,
        maxLength: 16,
        pattern: /^[A-Za-z0-9_]+$/,
        message: '2-16 characters; letters, numbers, and underscores only.'
    },
    'lastname': {
        required: true,
        minLength: 2,
        maxLength: 16,
        pattern: /^[A-Za-z0-9_]+$/,
        message: '2-16 characters; letters, numbers, and underscores only.'
    }
};

// Public instance properties:

// The user's username, e.g. 'aseemk'.
Object.defineProperty(Customer.prototype, 'uuid', {
    get: function () { return this._node.properties['uuid']; }
});

// Private helpers:

// Takes the given caller-provided properties, selects only known ones,
// validates them, and returns the known subset.
// By default, only validates properties that are present.
// (This allows `User.prototype.patch` to not require any.)
// You can pass `true` for `required` to validate that all required properties
// are present too. (Useful for `User.create`.)
function validate(props, required) {
    var safeProps = {};

    for (var prop in User.VALIDATION_INFO) {
        var val = props[prop];
        validateProp(prop, val, required);
        safeProps[prop] = val;
    }

    return safeProps;
}

// Validates the given property based on the validation info above.
// By default, ignores null/undefined/empty values, but you can pass `true` for
// the `required` param to enforce that any required properties are present.
function validateProp(prop, val, required) {
    var info = User.VALIDATION_INFO[prop];
    var message = info.message;

    if (!val) {
        if (info.required && required) {
            throw new errors.ValidationError(
                'Missing ' + prop + ' (required).');
        } else {
            return;
        }
    }

    if (info.minLength && val.length < info.minLength) {
        throw new errors.ValidationError(
            'Invalid ' + prop + ' (too short). Requirements: ' + message);
    }

    if (info.maxLength && val.length > info.maxLength) {
        throw new errors.ValidationError(
            'Invalid ' + prop + ' (too long). Requirements: ' + message);
    }

    if (info.pattern && !info.pattern.test(val)) {
        throw new errors.ValidationError(
            'Invalid ' + prop + ' (format). Requirements: ' + message);
    }
}

function isConstraintViolation(err) {
    return err instanceof neo4j.ClientError &&
        err.neo4j.code === 'Neo.ClientError.Schema.ConstraintViolation';
}

// Public instance methods:

// Atomically updates this user, both locally and remotely in the db, with the
// given property updates.
Customer.prototype.patch = function (props, callback) {
    //var safeProps = validate(props);

    var query = [
        'MATCH (cus:User {firstname: {firstname}, {lastname: {lastname}})',
        'SET cus += {props}',
        'RETURN cus',
    ].join('\n');

    var params = {
        firstname: this.firstname,
        lastname: this.lastname,
        props: props,
    };

    var self = this;

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
        //        'The username �' + props.username + '� is taken.');
        //}
        if (err) return callback(err);

        //if (!results.length) {
        //    err = new Error('User has been deleted! Username: ' + self.username);
        //    return callback(err);
        //}

        // Update our node with this updated+latest data from the server:
        self._node = results[0]['cus'];

        callback(null);
    });
};

Customer.prototype.del = function (callback) {
    // Use a Cypher query to delete both this user and his/her following
    // relationships in one query and one network request:
    // (Note that this'll still fail if there are any relationships attached
    // of any other types, which is good because we don't expect any.)
    var query = [
        'MATCH (cus:Customer {uuid: {uuid}})',
        'OPTIONAL MATCH (cus) -[rel:Purchase]- (product)',
        'DELETE cus, rel',
    ].join('\n')

    var params = {
        uuid: this.uuid
    };

    db.cypher({
        query: query,
        params: params,
    }, function (err) {
        callback(err);
    });
};

Customer.purchase = function (prod, callback) {
    var query = [
        'MATCH (cus:Customer) WHERE cus.uuid={thisUuid}',
        'MATCH (product:Product) WHERE product.name={productUuid}',
        'MERGE (cus)-[rel:Purchase]->(product) SET rel.price={price} SET rel.date={date} SET rel.currency={currency}',
    ].join('\n')
    var params = {
        thisUuid: prod.uuidcus,
        productUuid: prod.uuidprod,
        price: prod.price,
        date: prod.date,
        currency: prod.currency,
    };

    db.cypher({
        query: query,
        params: params,
    }, function (err) {
        callback(err);
    });
};

//User.prototype.unfollow = function (other, callback) {
//    var query = [
//        'MATCH (user:User {username: {thisUsername}})',
//        'MATCH (other:User {username: {otherUsername}})',
//        'MATCH (user) -[rel:follows]-> (other)',
//        'DELETE rel',
//    ].join('\n')
//
//    var params = {
//        thisUsername: this.username,
//        otherUsername: other.username,
//    };
//
//    db.cypher({
//        query: query,
//        params: params,
//    }, function (err) {
//        callback(err);
//    });
//};

//// Calls callback w/ (err, following, others), where following is an array of
//// users this user follows, and others is all other users minus him/herself.
//User.prototype.getFollowingAndOthers = function (callback) {
//    // Query all users and whether we follow each one or not:
//    var query = [
//        'MATCH (user:User {username: {thisUsername}})',
//        'MATCH (other:User)',
//        'OPTIONAL MATCH (user) -[rel:follows]-> (other)',
//        'RETURN other, COUNT(rel)', // COUNT(rel) is a hack for 1 or 0
//    ].join('\n')
//
//    var params = {
//        thisUsername: this.username,
//    };
//
//    var user = this;
//    db.cypher({
//        query: query,
//        params: params,
//    }, function (err, results) {
//        if (err) return callback(err);
//
//        var following = [];
//        var others = [];
//
//        for (var i = 0; i < results.length; i++) {
//            var other = new User(results[i]['other']);
//            var follows = results[i]['COUNT(rel)'];
//
//            if (user.username === other.username) {
//                continue;
//            } else if (follows) {
//                following.push(other);
//            } else {
//                others.push(other);
//            }
//        }
//
//        callback(null, following, others);
//    });
//};

// Static methods:

Customer.get = function (uuid, callback) {
    var query = [
        'MATCH (cus:Customer {uuid: {uuid}})',
        'RETURN cus',
    ].join('\n')

    var params = {
        uuid: uuid,
    };

    db.cypher({
        query: query,
        params: params,
    }, function (err, results) {
        if (err) return callback(err);
        //if (!results.length) {
        //    err = new Error('No such user with username: ' + username);
        //    return callback(err);
        //}
        var customer = new Customer(results[0]['uuid']);
        callback(null, customer);
    });
};

Customer.getAll = function (callback) {
    var query = [
        'MATCH (cus:Customer)',
        'RETURN cus',
    ].join('\n');

    db.cypher({
        query: query,
    }, function (err, results) {
        if (err) return callback(err);
        var customers = results.map(function (result) {
            return new Customer(result['cus']);
        });
        callback(null, customers);
    });
};



Customer.countAll = function (callback) {
    var query = [
        'MATCH (cus:Customer)',
        'RETURN COUNT(cus)',
    ].join('\n');

    db.cypher({
        query: query,
    }, function (err, results) {
        if (err) return callback(err);
        console.log("results: " + results);
        callback(null, results);
    });
};

// Creates the customer and persists (saves) it to the db, incl. indexing it:
Customer.create = function (props, callback) {
    console.log('Inside customer.create')
    var query = [
        'CREATE (cus:Customer {props})',
        'RETURN cus',
    ].join('\n');

    var params = {
        props: props
        //props: validate(props)
    };

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
        //        'The username �' + props.username + '� is taken.');
        //}
        if (err) return callback(err);
        //var user = new User(results[0]['cus']);
        //callback(null, user);
    });
};

// Static initialization:

// Register our unique username constraint.
// TODO: This is done async'ly (fire and forget) here for simplicity,
// but this would be better as a formal schema migration script or similar.
db.createConstraint({
    label: 'User',
    property: 'username',
}, function (err, constraint) {
    if (err) throw err;     // Failing fast for now, by crash the application.
    if (constraint) {
        console.log('(Registered unique usernames constraint.)');
    } else {
        // Constraint already present; no need to log anything.
    }
})
