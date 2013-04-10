/*
 * GET home page.
 */

 var http = require('http');
 var querystring = require('querystring');
 var Shred = require("shred");
 var shred = new Shred();

exports.index = function(req, res){
	/*
  	// if user is not logged in, ask them to login
    if (typeof req.session.email == 'undefined') res.render('home', { title: 'Home'});
    // if user is logged in already, take them straight to the items list
    else res.redirect('/profile');
    */
    res.render('home', { title: 'Home'});
};

// handler for form submitted from homepage
exports.index_process_form = function(req, res) {
    // if the username is not submitted, give it a default of "Anonymous"
    email = req.body.email || 'anonymous';
    // store the username as a session variable
    req.session.email = email;
    // redirect the user to homepage
    res.render('profile', {title: "Profile", email: req.session.email});
};

//   This is the URL to use to test a client redirect to CampusConnect
//   http://localhost:8081/oauth/authorize?client_id=2f18b05f9da2c9c32c8b32cc1e1c6717&perms=transcript&uni=duke&redirect_uri=http://localhost:3000/oauthcall

exports.oauthcall = function(req, res) {

   var code = req.query.code;


    var req = shred.post({
      url: "http://localhost:8081/oauth/access_token",
      headers: {
        "Content-Type": "application/json"
      },
      // Shred will JSON-encode PUT/POST bodies
      content: { client_id: "2f18b05f9da2c9c32c8b32cc1e1c6717", client_secret: "b9d84f78d9a37ba42965df2b8c513194", redirect_uri: "http://localhost:3000/oauthresp", code: code, uni: "duke", perms: "transcript" },

      on: {
        // you can use response codes as events
        200: function(response) {

          var access_token = response.content.data.access_token;

          var req = shred.get({
            url: "http://localhost:8081/exchange?access_token="+access_token,
            headers: {
              Accept: "application/json"
            },
            on: {
              // You can use response codes as events
              200: function(response) {
                // Shred will automatically JSON-decode response bodies that have a
                // JSON Content-Type
                console.log(response.content.data);
                res.send(response.content.data);
              },
              // Any other response means something's wrong
              response: function(response) {
                console.log("Oh no!");
              }
            }
          });

        },
        response: function(response) {
          // We got a 40X that is not a 409, or a 50X
          console.log("Oh no, something went wrong!");
        }
      }
    });
    

};