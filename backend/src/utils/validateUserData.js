const validateUsername = username => 
  /^\w{4,16}$/.test(username);

const validatePassword = password => {
  if (password.length < 7)
    return false;

  const strengthTests = [
    /[a-z]/,
    /[A-Z]/,
    /[0-9]/,
    /\W/
  ];

  const passwordStrength = strengthTests.reduce((total, current) => 
    total + current.test(password)
  , 0);

  return passwordStrength > 2;
};

const validateName = name => 
  /^[a-zA-ZáàâäãåçéèêëíìîïñóòôöõúùûüýÿæœÁÀÂÄÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝŸÆŒ\-]{1,32}$/.test(name);

const validateEmail = email =>
  /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    .test(email);

const validateRegistrationData = data => {
  console.log(data);
  console.log(validateName(data.firstName))
  if (data.username && data.password && data.firstName && data.lastName && data.email)
    return validateUsername(data.username) &&
      validatePassword(data.password) &&
      validateName(data.firstName) &&
      validateName(data.lastName) &&
      validateEmail(data.email);
  else
    return false;
};

module.exports = {
  validateRegistrationData
};