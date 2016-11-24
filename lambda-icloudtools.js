var Alexa = require('alexa-app');
var debug = require('debug')('lambda-findappledevice');
//var ICloudConnection = require('appledevice');
//var Credentials = require('credentials');
//var AlexaResponseError = require('alexa-error');
var Promise = require('bluebird');
var _ = require('underscore');

var config = require('config-node')({env: "dev"});
var ICloudTools = require('icloudtools');
var iCloudTools = new ICloudTools(config);


var app = new Alexa.app();

app.pre = function (request, response, type) {
    debug(JSON.stringify(request));
    // extract which configuration should be invoked.
    var conf = app.handler.arguments[1].invokedFunctionArn.replace(/.*:/g, '');

    if (conf == "production") {
        config = require('config-node')({env: conf});
        //      iCloudTools = new ICloudTools(config);
    } else {
        // default to dev
        config = require('config-node')({env: "dev"});
        //       iCloudTools = new ICloudTools(config);
    }

    debug(JSON.stringify(config));
};


// Initial route request when launching the App
app.launch(function (request, response) {
    response.say(config.Alexa.introMessage)
        .shouldEndSession(false)
        .send();
});


// Register Help: Examples of how to use
app.intent("AMAZON.HelpIntent", function (request, response) {
    response.say(config.Alexa.helpMessage)
        .reprompt(config.Alexa.helpMessage)
        .shouldEndSession(false)
        .send();
});

// Register Stop
app.intent("AMAZON.StopIntent", function (request, response) {
    response.say(config.Alexa.stopMessage)
        .shouldEndSession(true)
        .send();
});

// Register Cancel
app.intent("AMAZON.CancelIntent", function (request, response) {
    response.say(config.Alexa.cancelMessage)
        .shouldEndSession(true)
        .send();
});


//Primary Intent pingDevice , hinting utterances from conf
app.intent("pingDevice",
    {
        "utterances": _.pluck(_.filter(config.Alexa.interactionModel.utteranceTemplate,
            function (utt) {
                return utt.intent == "PingDevice"
            }
        ), "template")
    },
    function (request, response) {

        var requestedDevice = {FirstNames: request.slot("FirstNames"), Device: request.slot("Device")};
        iCloudTools.pingDevice(requestedDevice)
            .then(function (msg) {
                response.say(msg)
                    .send();

            });

        // async
        return false;
    });


//Primary Intent addReminder, hinting utterances from conf
app.intent("addReminder",
    {
        "utterances": _.pluck(_.filter(config.Alexa.interactionModel.utteranceTemplate,
            function (utt) {
                return utt.intent == "addReminder"
            }
        ), "template")
    },
    function (request, response) {

        var intentRequest = {
            FirstNames: request.slot("FirstNames"),
            Reminder: request.slot("Reminder")
        };

        iCloudTools.addCloudReminder(intentRequest)
            .then(function (msg) {
                response.say(msg)
                    .send();

            });

        return false;
    });


app.sessionEnded(function (request, response) {
    // Clean up the user's server-side stuff, if necessary
    // logout( request.userId );
    // No response necessary
});


// Connect to lambda

exports.handler = app.lambda();
