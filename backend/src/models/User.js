const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

const userSchema = new mongoose.Schema({
  username: {type: String, unique: true},
  firstName: String,
  lastName: String,
  password: String,
  email: {type: String, unique: true},
  oauth: String,
  emailVerification: String,
  profilePicture: String,

  watched: Array,
  myList: Array,
});

userSchema.plugin(uniqueValidator);

const User = mongoose.model('User', userSchema)

module.exports = User;