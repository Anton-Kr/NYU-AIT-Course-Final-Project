require('./db');
const mongoose = require('mongoose');
const Users = mongoose.model('Users');
const Publications = mongoose.model('Publications');
const CodeSnippets = mongoose.model('CodeSnippets');


const express = require('express');
const app = express();
const path = require("path");
const publicPath = path.resolve(__dirname, "public");
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');

const request = require('request');

const compiler = require('compilex');
const options = {stats : true}; //prints stats on console 
compiler.init(options);

const session = require('express-session');

const auth = require('./auth.js');



app.use(session({secret:"42", saveUninitialized: false, resave: false}));

app.set('view engine', 'hbs');
app.use(express.static(publicPath));
app.use(fileUpload());
app.use(bodyParser.urlencoded({
    extended: true
}));

/////////////////Authentication///////////////////////////
app.get('/register', (req, res) => {
   res.render('register', {user: req.session.username});
});

app.post('/register', (req, res) => {
   auth.register(req.body.username, req.body.email, req.body.password, req.body.publicity, function(obj){res.render('register',{message:obj.message} );}, function(user){
      auth.startAuthenticatedSession(req, user, function(err){
      if(err){
         res.render('register',{message:err.message});
      }
      else{
         console.log("BODY IS SET TO ", req.body);
         res.redirect('/');
      }
         
    });
   });
});
        
app.get('/login', (req, res) => {
   res.render('login', {user: req.session.username});
});
        
app.post('/login', (req, res) => {
   auth.login(req.body.username, req.body.password, function(obj){res.render('login',{message:obj.message} );}, function(user){
      auth.startAuthenticatedSession(req, user, function(err){
      if(err){
         res.render('login',{message:err.message});
      }
      else{
         res.redirect('/login');
      }
         
    });
   });
});
//////////////////////////////////////////////////

app.get('/', (req, res) => {
   Users.find({}, (err, users) => {
      console.log(users);
      let publicUsers = users.filter(element => element.publicity === "true");
      if(req.session.username) {publicUsers = publicUsers.filter(element => element.username !== req.session.username.username);}
      
      let selfUser;
      if(req.session.username) {selfUser = users.filter(element => element.username === req.session.username.username);}
      console.log("self user is", selfUser);
      if(selfUser) {res.render('home', {user: req.session.username, selfUser:selfUser[0], users: publicUsers});}
      else {res.render('home', {user: req.session.username, users: publicUsers});}
      
   });
});



app.get('/pubs/add', (req, res) => {
   
   if(!req.session.username){
      console.log("user not logged in");
      res.redirect('/login');
   }
   else{
      res.render('pubs-add', {user: req.session.username});
   }
});

app.post('/pubs/add', (req, res) => {
   if(!req.session.username) {res.redirect('/login');}
   else{
      req.files.pdf.mv('public/pdfs/' + req.files.pdf.name, function(err){
         if(err){
            return res.status(500).send(err);
         }
         
         const newarticle = {};
         console.log(req.files.pdf);
         newarticle.name = req.body.name;
         newarticle.author = req.session.username.slug;
         newarticle.authorfull = req.session.username.username;
         newarticle.filename = req.files.pdf.name;
         
         if(req.body.publicity) {newarticle.publicity = true;}
         else {newarticle.publicity = false;}
         //Im gonna try to actually upload the files to MongoDB but may be too much work
         console.log(newarticle);
         const dbarticle = new Publications(newarticle);
         dbarticle.save( function(err){
            console.log(err);
            if(err){ res.render('pubs-add', {user: req.session.username, message: "DOCUMENT SAVE ERROR"});}
            else{
               res.redirect('/');
            }
         });
      });
   }
   });


app.get('/pubs/:author', (req, res) => {
   Publications.find({"author":req.param('author')}, (err, articles) => {
         if( req.session.username && req.param('author') === req.session.username.username) {res.render('pubs-detail', {user: req.session.username, articles: articles});}
			else{
				console.log(articles);
				articles = articles.filter(element => element.publicity === 'true'); //oof
				res.render('pubs-detail', {user: req.session.username, articles: articles});
			}	
				
   });
});



app.get('/code/add', (req, res) => {
   
   if(!req.session.username){
      console.log("user not logged in");
      res.redirect('/login');
   }
   else{
      res.render('code-add', {user: req.session.username});
   }
   
});

app.post('/code/add', (req, res) => {
	
   if(!req.session.username) {res.redirect('/login');}
   else{
		console.log(req.body.compiler, " is the value of compiler");
		if(req.body.compiler === 0){
			console.log("WARNING. USING CIMS COMPILER");
			let envData;
			if (process.env.NODE_ENV === 'PRODUCTION') {
				envData = { OS : "linux" , cmd : "gcc" ,options: {timeout:1000}};
			}
			else{
				envData = { OS : "windows" , cmd : "g++",options: {timeout:1000}};
			}
			console.log(envData);
			compiler.compileCPP(envData, req.body.code, function(data) {
				if(data.error){
					res.render('code-add', {user: req.session.username, output: data.error});
				}
				else if(req.body.add){
						
						const newcode = {};
         
						newcode.code = req.body.code;
						newcode.author = req.session.username.slug;
						newcode.authorfull = req.session.username.username;
						newcode.output = data.output;
						console.log(newcode);
						const dbcode = new CodeSnippets(newcode);
						dbcode.save( function(err){
							console.log(err);
							if(err){ res.render('code-add', {user: req.session.username, 	message: "DOCUMENT SAVE ERROR"});}
							else{
								res.render('code-add', {user: req.session.username, output: data.output});
							}
						});
					}
					else{
						res.render('code-add', {user: req.session.username, output: data.output});
						
					}
			});
			
			
      }
		else{
			const program = {
				script : req.body.code,
				language: "c",
				versionIndex: "0",
				clientId: process.env.CLIENT_ID,
				clientSecret: process.env.CLIENT_SECRET
			};
			request({
				url: 'https://api.jdoodle.com/execute',
				method: "POST",
				json: program
			},	
			function (error, response, body) {
				console.log("CODE IS EQUAL TO", req.body);
				if(error) {res.render('code-add', {user: req.session.username, output: error});}
				else{
					if(req.body.add){
						const newcode = {};
         
						newcode.code = req.body.code;
						newcode.author = req.session.username.slug;
						newcode.authorfull = req.session.username.username;
						newcode.output = body.output;
						console.log(newcode);
						const dbcode = new CodeSnippets(newcode);
						dbcode.save( function(err){
							console.log(err);
							if(err){ res.render('code-add', {user: req.session.username, 	message: "DOCUMENT SAVE ERROR"});}
							else{
								res.render('code-add', {user: req.session.username, output: body.output, original:req.body.code});
							}
						});
					}
					res.render('code-add', {user: req.session.username, output: body.output, original:req.body.code});
				
			}
			
			});
		}
		
		
			
		
   }
});

app.get('/code/:author', (req, res) => {
   CodeSnippets.find({"author":req.param('author')}, (err, code) => {
         res.render('code-detail', {user: req.session.username, code: code});
   });
});

app.use(bodyParser.json());

app.listen(process.env.PORT || 3000);