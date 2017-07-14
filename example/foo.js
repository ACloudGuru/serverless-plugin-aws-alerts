'use script';

module.exports.handler = (event, context, cb) => {
    console.log('Received event', event);

    cb(null, { message: 'success' });
};
