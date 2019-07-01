exports.handler = async (event) => {
  console.log('Received event', event);

  const response = {
    statusCode: 200,
    body: JSON.stringify({ message: `success - ${Date.now()}` })
  };

  return response;
};
