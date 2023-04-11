const mongoose = require('mongoose');
const bcrypt = require("bcryptjs");
const Schema = mongoose.Schema;

const loginHistorySchema = new Schema({
  dateTime: { type: Date, default: Date.now },
  userAgent: { type: String }
});

const userSchema = new Schema({
  userName: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true },
  loginHistory: [loginHistorySchema]
});

let User = mongoose.model('User', userSchema);

module.exports = User;

module.exports.initialize = function() {
  return new Promise(function(resolve, reject) {
    const pass1 = "joemama1";
    const uri = `mongodb+srv://maham1:${pass1}@mahamcluster.baklegy.mongodb.net/data?retryWrites=true&w=majority`
    let db = mongoose.createConnection(uri);
    db.on('error', function(err) {
      reject(err); // reject the promise with the provided error
    });

    db.once('open', function() {
      User = db.model('users', userSchema);
      resolve();
    });
  });
};

module.exports.RegisterUser = function(userData) {
  return new Promise((resolve, reject) => {
    if (userData.password !== userData.password2) {
      reject("Passwords do not match");
      return;
    }
    bcrypt
      .hash(userData.password, 10)
      .then((hash) => {
        let newUser = new User({
          userName: userData.userName,
          email: userData.email,
          password: hash,
          loginHistory: [],
        });
        return newUser.save();
      })
      .then(() => {
        resolve();
      })
      .catch((err) => {
        reject("There was an error encrypting the password: " + err);
      });
  });
}

module.exports.CheckUser = function(userData) {
  let user;
  return User.findOne({ userName: userData.userName })
    .exec()
    .then((foundUser) => {
      if (!foundUser) {
        throw `Unable to find user: ${userData.userName}`;
      }
      user = foundUser;
      return bcrypt.compare(userData.password, user.password);
    })
    .then((result) => {
      if (!result) {
        throw `Incorrect Password for user: ${userData.userName}`;
      }
      user.loginHistory.push({
        dateTime: new Date().toString(),
        userAgent: userData.userAgent,
      });

      return User.updateOne(
        { userName: user.userName },
        { $set: { loginHistory: user.loginHistory } }
      ).exec();
    })
    .then(() => {
      return User.findOne({ userName: userData.userName }).exec();
    });
}

