'use script';

module.exports.handler = (event, context, cb) => {
    console.log('Received event', event);
    console.log('Blah')
    cb(new Error('This is an error!'));
}