define(["app/dom", "app/config", "app/api"], function($, config, api) {

    "use strict";

    var isso = null;
    var requestedSDK = false;
    var loadedSDK = false;
    var loginRequest = false;
    var loggedIn = false;
    var authorData = null;
    var token = null;

    var statusChangeCallback = function(response) {
        if (response.status === "connected") {
            token = response.authResponse.accessToken;
            FB.api("/me", {fields: ["name", "email"]}, function(response) {
                loggedIn = true;
                authorData = {
                    uid: response["id"],
                    name: response["name"],
                    email: response["email"] || "",
                };
                localStorage.setItem("login_method", JSON.stringify("facebook"));
                isso.updateAllPostboxes();
            });
        } else {
            loggedIn = false;
            authorData = null;
            token = null;
            localStorage.removeItem("login_method");
            isso.updateAllPostboxes();
        }

    }

    var init = function(isso_ref) {
        if (!config["facebook-enabled"]) {
            return;
        }

        isso = isso_ref;

        var method = JSON.parse(localStorage.getItem("login_method"));
        if (method == "google") {
            loadSDK(false);
        }
    }

    var loadSDK = function(activeClick) {
        if (requestedSDK) {
            if (activeClick) {
                if (loadedSDK) {
                    FB.login(function(response) {
                        statusChangeCallback(response);
                    }, {scope: 'public_profile,email'});
                } else {
                    loginRequest = true;
                }
            }
            return;
        }

        requestedSDK = true;
        loginRequest = activeClick;

        // Called when Facebook SDK has loaded
        window.fbAsyncInit = function() {
            FB.init({
                appId      : config["facebook-app-id"],
                cookie     : true,  // enable cookies to allow the server to access the session
                xfbml      : true,  // parse social plugins on this page
                version    : "v2.5" // use graph api version 2.5
            });

            loadedSDK = true;

            FB.getLoginStatus(function(response) {
                statusChangeCallback(response);
            });
            if (loginRequest) {
                FB.login(function(response) {
                    statusChangeCallback(response);
                }, {scope: 'public_profile,email'});
            } else {
                FB.getLoginStatus(function(response) {
                    statusChangeCallback(response);
                });
            }
        };

        // Load Facebook SDK
        (function(d, s, id) {
            var js, fjs = d.getElementsByTagName(s)[0];
            if (d.getElementById(id)) return;
            js = d.createElement(s); js.id = id;
            js.src = "//connect.facebook.net/en_US/sdk.js";
            fjs.parentNode.insertBefore(js, fjs);
        }(document, "script", "facebook-jssdk"));
    }

    var updatePostbox = function(el) {
        if (loggedIn) {
            $(".auth-not-loggedin", el).hide();
            $(".auth-loggedin-facebook", el).showInline();
            $(".auth-facebook-name", el).innerHTML = authorData.name;
            $(".isso-postbox .avatar", el).setAttribute("src", "//graph.facebook.com/" + authorData.uid + "/picture");
            $(".isso-postbox .avatar", el).show();
        } else {
            $(".auth-loggedin-facebook", el).hide();
            $(".social-login-link-facebook", el).showInline();
            $(".social-login-link-facebook > img", el).setAttribute("src", api.endpoint + "/images/facebook-color.png");
        }
    }

    var initPostbox = function(el) {
        if (!config["facebook-enabled"]) {
            return;
        }
        updatePostbox(el);
        $(".social-logout-link-facebook", el).on("click", function() {
            FB.logout(function(response) {
                statusChangeCallback(response);
            });
        });
        $(".social-login-link-facebook", el).on("click", function() {
            loadSDK(true);
        });
    }

    var isLoggedIn = function() {
        return loggedIn;
    }

    var getAuthorData = function() {
        return {
            network: "facebook",
            id: authorData.uid,
            idToken: token,
            pictureURL: null,
            name: authorData.name,
            email: authorData.email,
            website: "",
        };
    }

    var prepareComment = function(comment) {
        comment.website = "//www.facebook.com/" + comment.social_id;
        comment.pictureURL = "//graph.facebook.com/" + comment.social_id + "/picture";
    }

    return {
        init: init,
        initPostbox: initPostbox,
        updatePostbox: updatePostbox,
        isLoggedIn: isLoggedIn,
        getAuthorData: getAuthorData,
        prepareComment: prepareComment
    };

});
