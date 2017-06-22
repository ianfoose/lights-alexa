/**
 Copyright 2017 Ian Foose Foose Industries
*/

'use strict';

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        //if (event.session.application.applicationId !== "amzn1.ask.skill.fb6bfc1b-f06c-431f-8a67-537810a3fd42") {
          //  context.fail("Invalid Application ID");
        //}

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId
        + ", sessionId=" + session.sessionId);

    // add any session init logic here
}

/**
 * Called when the user invokes the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId
        + ", sessionId=" + session.sessionId);

    var cardTitle = "Lights"
    var output = "Turn lights on or off."
    callback(session.attributes, buildSpeechletResponse(cardTitle, output, "", false));
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId
        + ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name,
        intentSlots = intentRequest.intent.slots,
        errOutput = "An error has occured";

    console.log('/api/lights/name/'+intentSlots.channel.value);

    if(!intentSlots.channel.value) {
        console.log("VAL: "+intentSlots.channel.value);
        var msg = "Error";
        callback(session.attributes,buildSpeechletResponse(msg,msg, msg, true));
    }

    // dispatch custom intents to handlers here
    if(intentName == "OnIntent") {
         var output = "Turning On";
         getAPIResult("PUT", false, 'fooseindustries.com', 8080, '/api/lights/name/'+encodeURIComponent(intentSlots.channel.value.trim()), 'state=true', null).then(result => {
            callback(session.attributes,buildSpeechletResponse(output,output, output, true));
        }).catch(err => {
            callback(session.attributes,buildSpeechletResponse(errOutput,errOutput, errOutput, true));
        });
    } else if(intentName == "OffIntent") {
        var output2 = "Turning Off";
        console.log("CHANNEL: "+intentSlots.channel.value);
        getAPIResult("PUT", false, 'fooseindustries.com', 8080, '/api/lights/name/'+encodeURIComponent(intentSlots.channel.value.trim()), 'state=false', null).then(result => {
            callback(session.attributes,buildSpeechletResponse(output2,output2, output2, true));
        }).catch(err => {
            errOutput = intentSlots.channel.value;
            callback(session.attributes,buildSpeechletResponse(errOutput,errOutput, errOutput, true));
        });
    } else if(intentName == "AMAZON.CancelIntent" || intentName == "AMAZON.StopIntent") { // cancel
         callback(session.attributes,buildSpeechletResponseWithoutCard("Thanks for using Lights, Goodbye!", "", true));
    } else if(intentName == "AMAZON.HelpIntent") { // help
         var speechOutput = "Try saying the name of a light to turn on or off, example, Turn Light 1 off",
            repromptText = speechOutput;
         callback(session.attributes,buildSpeechletResponseWithoutCard(speechOutput, repromptText, false));
    } else if(intentName == "EasterEggIntent") { // easter egg
        callback(session.attributes,buildSpeechletResponse("Creator","Ian Foose, the best programmer in the universe", null, true));
    } else {
        throw "Invalid intent";
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId
        + ", sessionId=" + session.sessionId);

    // Add any cleanup logic here
}

// ------- Helper functions to build responses -------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: title,
            content: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildSpeechletResponseWithoutCard(output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}

// API Functions

function getJSONResult(method, https, url, port, path, body, headers) {
    return new Promise(function(resolve, reject) {
       getAPIResult(method, https, url, port, path, body, headers).then(result => {
           try {
               result = JSON.parse(result);
               resolve(result);
           } catch (error) {
               reject(new Error('JSON Parsing Error'));
           }
       }).catch(error => {
            reject(error); 
       });
    });
} 

function getAPIResult(method, https, url, port, path, body, headers) {
    return new Promise(function(resolve, reject) {
        intitateAPIRequest(method, https, url, port, path, body, headers).then(result => {
            resolve(result);
        }).catch(error => {
           reject(error); 
        });
    }); 
}

function intitateAPIRequest(method, https, url, port, path, body, headers) {
    return new Promise(function(resolve, reject) {
        if(url === null) {
            reject(new Error('URL Cannot Be Null'));
        } else{
            if(method != 'GET' && method != 'POST' && method != 'DELETE' && method != 'PUT') {
                reject(new Error('Invalid HTTP Method'));
            } else{
                var http = require('http');
                var data;
            
                var h = {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            
                var options = {
                    hostname: url,
                    path: path,
                    headers:h,
                    method: method,
                    port: port
                }; 
            
                if(https === true) { http = require('https'); }
                
                if(headers !== null) { options['headers'] = headers; }
                
                var req = http.request(options, result => {
                     result.setEncoding('utf-8');
                     
                     result.on('data', chunk => { data += chunk; });
                     result.on('end', function() { resolve(data); });
                });
                
                req.on('error', error => { 
                    reject(error); 
                });
                
                if(body !== null) {
                    req.write(body);
                }
                
                req.end();
            } 
        }
    });
}