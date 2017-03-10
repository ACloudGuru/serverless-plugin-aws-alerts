'use script';

module.exports.handler = (event, context, cb) => {
    console.log('Received event', event);
    console.log('Sleeping');

    setTimeout(() => {
        console.log('Awake');
        cb(null, { message: 'success' });
    }, 10000);
}