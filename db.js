const mongoose = require('mongoose') 
const URLSlugs = require('mongoose-url-slugs');

let dbconf;
if (process.env.NODE_ENV === 'PRODUCTION') {
   // if we're in PRODUCTION mode, then read the configration from a file
   // use blocking file io to do this...
   const fs = require('fs');
   const path = require('path');
   const fn = path.join(__dirname, 'config.json');
   const data = fs.readFileSync(fn);

   // our configuration file will be in json, so parse it and set the
   // conenction string appropriately!
   const conf = JSON.parse(data);
   dbconf = conf.dbconf;
} else {
   // if we're not in PRODUCTION mode, then use
   dbconf = 'mongodb://localhost/final';
}

mongoose.connect(dbconf);


var Users = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  skills: [String],
  hackerrank: String,
  github: String,
  linkedin: String,
  publicity: String
  });
  
var Publications = new mongoose.Schema({
  name: String,
  author: String,
  authorfull: String,
  filename: String,
  publicity: String
  
});

var CodeSnippets = new mongoose.Schema({
  author: String,
  authorfull: String,
  code: String,
  output: String
});

Users.plugin(URLSlugs('username'));

mongoose.model('Users', Users);
mongoose.model('Publications', Publications);  
mongoose.model('CodeSnippets', CodeSnippets);
