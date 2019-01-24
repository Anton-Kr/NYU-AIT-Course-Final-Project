
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
require('./db');
const Users = mongoose.model('Users');




function register(username, email, password, publicity, errorCallback, successCallback) {
   
   if(username.length <= 8 || password.length <=8){
      errorCallback({message: "USERNAME PASSWORD TOO SHORT"});
   }
   
   else{
      Users.findOne({username:username}, function(err, result){
         console.log("RESULT IS EQUAL TO ~~~~~~~~", result);
         if(result) { 
            errorCallback({message: "USERNAME ALREADY EXISTS"});
         }
         else{
            let userhash;
            bcrypt.hash(password, 10, function(err, hash) {
               console.log("Hash is equal to", hash);
               userhash = hash;
      
               const newuser = {};
               newuser.username = username;
               newuser.email = email;
               newuser.password = userhash;
               if(publicity) newuser.publicity = true;
               else newuser.publicity = false;
               console.log(newuser);
               const dbuser = new Users(newuser);
               dbuser.save( function(err){
                  console.log(err);
                  if(err){ errorCallback({message: "DOCUMENT SAVE ERROR"});}
                  else{
                     console.log("newuser is" , newuser);
                     successCallback(newuser);
                  }
               });
            });
         }
         });
   }
}



function login(username, password, errorCallback, successCallback) {
   Users.findOne({username: username}, (err, user) => {
      if (!err && user) {
         bcrypt.compare(password, user.password, (err, passwordMatch) => {
            if(!err && passwordMatch){ successCallback(user); }
            else {errorCallback({message: "PASSWORDS DO NOT MATCH"});}
         });
      }
      else if(!user){
         errorCallback({message: "USER NOT FOUND"});
      }
      else{
         errorCallback({message: "unspecified error"});
         
      }
   });
}

function startAuthenticatedSession(req, user, cb) {
   req.session.regenerate((err) => {
      if (!err) {
         req.session.username = user;
         console.log("session started", user);
         cb();
      } 
      else {
         cb(err);
      }
   });
}

module.exports = {
  startAuthenticatedSession: startAuthenticatedSession,
  register: register,
  login: login
};
