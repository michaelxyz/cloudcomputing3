/**
 * Created by czeizm on 8/20/2015.
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

var Category = module.exports = function Category(_node) {
    // All we'll really store is the node; the rest of our properties will be
    // derivable or just pass-through properties (see below).
    this._node = _node;
}

// Public constants:

Category.VALIDATION_INFO = {
    'username': {
        required: true,
        minLength: 2,
        maxLength: 16,
        pattern: /^[A-Za-z0-9_]+$/,
        message: '2-16 characters; letters, numbers, and underscores only.'
    },
};

// Public instance properties:

// The user's username, e.g. 'aseemk'.
Object.defineProperty(Category.prototype, 'name', {
    get: function () { return this._node.properties['name']; }
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
Category.prototype.patch = function (props, callback) {
    //var safeProps = validate(props);

    var query = [
        'MATCH (cat:Category {name: {name}})',
        'SET cat += {props}',
        'RETURN cat',
    ].join('\n');

    var params = {
        name: this.name,
        props: props,
    };

    //var self = this;

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
        self._node = results[0]['name'];

        callback(null);
    });
};

Category.prototype.del = function (callback) {
    // Use a Cypher query to delete both this user and his/her following
    // relationships in one query and one network request:
    // (Note that this'll still fail if there are any relationships attached
    // of any other types, which is good because we don't expect any.)
    var query = [
        'MATCH (category:Category {name: {name}})',
        'OPTIONAL MATCH (product) -[rel:Is]- (category)',
        'DELETE category, rel',
    ].join('\n')

    var params = {
        name: this.name,
    };

    db.cypher({
        query: query,
        params: params,
    }, function (err) {
        callback(err);
    });
};

//User.prototype.follow = function (other, callback) {
//    var query = [
//        'MATCH (user:User {username: {thisUsername}})',
//        'MATCH (other:User {username: {otherUsername}})',
//        'MERGE (user) -[rel:follows]-> (other)',
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
//Product.prototype.getFollowingAndOthers = function (callback) {
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

Category.get = function (name, callback) {
    var query = [
        'MATCH (cat:Caetgory {name: {name}})',
        'RETURN cat',
    ].join('\n')

    var params = {
        name: name,
    };

    db.cypher({
        query: query,
        params: params,
    }, function (err, results) {
        if (err) return callback(err);
        if (!results.length) {
            err = new Error('No such user with username: ' + username);
            return callback(err);
        }
        var category = new Category(results[0]['name']);
        callback(null, category);
    });
};

Category.getAll = function (callback) {
    var query = [
        'MATCH (cat:Category)',
        'RETURN cat',
    ].join('\n');

    db.cypher({
        query: query,
    }, function (err, results) {
        if (err) return callback(err);
        var categories = results.map(function (result) {
            return new Category(result['cat']);
        });
        callback(null, categories);
    });
};

// Creates the user and persists (saves) it to the db, incl. indexing it:
Category.create = function (props, callback) {
    var query = [
        'CREATE (cat:Category {props})',
        'RETURN cat',
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
        var category = new Category(results[0]['cat']);
        callback(null, category);
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
