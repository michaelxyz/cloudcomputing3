// users.js
// Routes to CRUD users.

var URL = require('url');

var errors = require('../models/errors');
var Customer = require('../models/customer');


function getUserURL(user) {
    return '/users/' + encodeURIComponent(user.username);
}

///**
// * GET /dbstats
// */
//exports.getStats = function (req, res, next) {
//    Customer.countAll(function (err, count) {
//        console.log("Inside Customer: countAll")
//        if (err) return next(err);
//        res.render('dbstatistics', {
//            CustomerCount: count
//        });
//    });
//};

/**
 * GET /dbstats
 */
exports.getStats = function (req, res, next) {
    Customer.getAll(function (err, customers) {
        console.log("Inside Customer.getAll")
        if (err) return next(err);
        res.render('dbstatistics', {
            Customer: Customer,
            users: customers,
            firstname: req.query.firstname,   // Support pre-filling create form
            lastname : req.query.lastname,
            uuid : req.query.uuid,
            age : req.query.age,
            country : req.query.country,
            city: req.query.city,
            state: req.query.state,
            gender: req.query.gender,
            email: req.query.email,
            error: req.query.error,     // Errors creating; see create route
        });
    });
};

/**
 * GET /users
 */
exports.list = function (req, res, next) {
    Customer.getAll(function (err, customers) {
        if (err) return next(err);
        res.render('users', {
            Customer: Customer,
            customers: customers,
            firstname: req.query.firstname,   // Support pre-filling create form
            lastname : req.query.lastname,
            uuid : req.query.uuid,
            age : req.query.age,
            country : req.query.country,
            city: req.query.city,
            state: req.query.state,
            gender: req.query.gender,
            email: req.query.email,
            error: req.query.error,     // Errors creating; see create route
        });
        console.log(customers)
        console.log('****')
        next();
    });
};

///**
// * POST /users {username, ...}
// */
//exports.create = function (req, res, next) {
//    User.create({
//        username: req.body.username
//    }, function (err, user) {
//        if (err) {
//            if (err instanceof errors.ValidationError) {
//                // Return to the create form and show the error message.
//                // TODO: Assuming username is the issue; hardcoding for that
//                // being the only input right now.
//                // TODO: It'd be better to use a cookie to "remember" this info,
//                // e.g. using a flash session.
//                return res.redirect(URL.format({
//                    pathname: '/users',
//                    query: {
//                        username: req.body.username,
//                        error: err.message,
//                    },
//                }));
//            } else {
//                return next(err);
//            }
//        }
//        res.redirect(getUserURL(user));
//    });
//};
/**
 * POST /users {username, ...}
 */
exports.create = function (req, res, next) {
    console.log('Creating new customer');
    for (i in req.body){
        console.log(i)
    }
    //console.log(req.body.name);
    Customer.create({
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        uuid : req.body.uuid,
        age : req.body.age,
        country : req.body.country,
        city: req.body.city,
        state: req.body.state,
        gender: req.body.gender,
        email: req.query.email,
    }, function (err, user) {
        if (err) {
            if (err instanceof errors.ValidationError) {
                // Return to the create form and show the error message.
                // TODO: Assuming username is the issue; hardcoding for that
                // being the only input right now.
                // TODO: It'd be better to use a cookie to "remember" this info,
                // e.g. using a flash session.
                return res.redirect(URL.format({
                    pathname: '/users',
                    query: {
                        username: req.body.username,
                        error: err.message,
                    },
                }));
            } else {
                return next(err);
            }
        }
        console.log('Exiting users.create ( customer.create )')
        //res.redirect(getUserURL(user));
    });
};
/**
 * GET /users/:username
 */
exports.show = function (req, res, next) {
    User.get(req.params.username, function (err, user) {
        // TODO: Gracefully "no such user" error. E.g. 404 page.
        if (err) return next(err);
        // TODO: Also fetch and show followers? (Not just follow*ing*.)
        user.getFollowingAndOthers(function (err, following, others) {
            if (err) return next(err);
            res.render('user', {
                User: User,
                user: user,
                following: following,
                others: others,
                username: req.query.username,   // Support pre-filling edit form
                error: req.query.error,     // Errors editing; see edit route
            });
        });
    });
};

/**
 * POST /users/:username {username, ...}
 */
exports.edit = function (req, res, next) {
    User.get(req.params.username, function (err, user) {
        // TODO: Gracefully "no such user" error. E.g. 404 page.
        if (err) return next(err);
        user.patch(req.body, function (err) {
            if (err) {
                if (err instanceof errors.ValidationError) {
                    // Return to the edit form and show the error message.
                    // TODO: Assuming username is the issue; hardcoding for that
                    // being the only input right now.
                    // TODO: It'd be better to use a cookie to "remember" this
                    // info, e.g. using a flash session.
                    return res.redirect(URL.format({
                        pathname: getUserURL(user),
                        query: {
                            username: req.body.username,
                            error: err.message,
                        },
                    }));
                } else {
                    return next(err);
                }
            }
            res.redirect(getUserURL(user));
        });
    });
};

/**
 * DELETE /users/:username
 */
exports.del = function (req, res, next) {
    Customer.get(req.params.uuid, function (err, customer) {
        // TODO: Gracefully handle "no such user" error somehow.
        // E.g. redirect back to /users with an info message?
        if (err) return next(err);
        customer.del(function (err) {
            if (err) return next(err);
            res.redirect('/users');
        });
    });
};

/**
 * POST /users/:username/follow {otherUsername}
 */
exports.purchase = function (req, res, next) {
    Customer.get(req.params.uuid, function (err, user) {
        // TODO: Gracefully handle "no such user" error somehow.
        // This is the source user, so e.g. 404 page?
        if (err) return next(err);
        Customer.get(req.body.otherUsername, function (err, other) {
            // TODO: Gracefully handle "no such user" error somehow.
            // This is the target user, so redirect back to the source user w/
            // an info message?
            if (err) return next(err);
            user.follow(other, function (err) {
                if (err) return next(err);
                res.redirect(getUserURL(user));
            });
        });
    });
};

/**
 * POST /users/:username/unfollow {otherUsername}
 */
exports.unfollow = function (req, res, next) {
    User.get(req.params.username, function (err, user) {
        // TODO: Gracefully handle "no such user" error somehow.
        // This is the source user, so e.g. 404 page?
        if (err) return next(err);
        User.get(req.body.otherUsername, function (err, other) {
            // TODO: Gracefully handle "no such user" error somehow.
            // This is the target user, so redirect back to the source user w/
            // an info message?
            if (err) return next(err);
            user.unfollow(other, function (err) {
                if (err) return next(err);
                res.redirect(getUserURL(user));
            });
        });
    });
};
