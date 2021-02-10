exports.handler = (_, __, cb) => {
  setTimeout(() => {
    cb(null, { message: 'success' });
  }, 10000);
};
