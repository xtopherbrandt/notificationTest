/**
Copyright (C) 2019 Christopher Brandt

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.

Contact Info: xtopher.brandt at gmail
*/

'use strict';
 
const functions = require('firebase-functions');
const { dialogflow, Image, UpdatePermission, SimpleResponse, Suggestions, List } = require('actions-on-google')

const moment = require( 'moment' );

const {google} = require('googleapis');
const request = require('request');
const PATH_TO_KEY = './notificationTest-d461517c012c.json'; // <--- Do not put this key into Git Hub, it is a private key
const key = require(PATH_TO_KEY);

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

const app = dialogflow({debug: true});

const admin = require('./initApp');

app.intent('Queue Search Request', queueSearchRequest);

app.intent('Default Welcome Intent', welcome );
app.intent('Default Fallback Intent', fallback );

app.intent('Send Notification', testNotification);
app.intent('Current Time', currentTime);
app.intent('Start Search', startSearch);
app.intent('Saved View', savedView);

app.intent('Setup Push Notifications', setupNotification );
app.intent('Finish Push Setup', finishNotificationSetup );

const welcomeSuggestions = [
    'Send Notification',
    'Current Time',
    'Start Search'
]

function welcome(conv) {

    var dayPartName = getDayPartName();

    conv.ask(new SimpleResponse({
        speech: `Good ${dayPartName}! How can I help you?`,
        text: `Good ${dayPartName}! How can I help you?`,
    }));
    
    conv.ask(new Suggestions(welcomeSuggestions));
}

function getDayPartName(){
    var hour = moment().utcOffset(-8, false ).hour();

    if ( hour > 2 && hour < 12 ) {
        return 'morning';
    }
    if ( hour >= 12 && hour < 18 ){
        return 'afternoon';
    }
    if ( hour >= 18 || hour <= 2 ){
        return 'evening'
    }
}

function fallback(conv) {
    conv.ask(new SimpleResponse({
        speech: `Sorry, I didn't catch that.`,
        text: `Sorry, I don't quite understand.`,
    }));
    
    conv.ask(new Suggestions(welcomeSuggestions));
}

function sendNotifcation( conv ){
    console.log( 'Sending Notification' );
    conv.close( new SimpleResponse({
        speech: 'Notification Sent',
        text: 'Notification Sent'
    }));
}

function currentTime( conv ){
    var currentTime = moment().format("h:mm:ss a");
    var currentDate = moment().format("dddd, MMMM Do YYYY");
    var response = `It is currently ${currentTime} on ${currentDate}`;
    //console.log( response );
    conv.close( new SimpleResponse({
        speech: response,
        text: response
    }));
}

function getStartSearchContext( conv ){
    return conv.contexts.get( 'start_search' );
}

function getGenderFromContext( context ){
    if ( context ){
        if ( context.parameters.Gender ){
            return context.parameters.Gender;
        }
        else if ( context.parameters.adult_female || context.parameters.child_female ){
            return 'Female';
        }
        else if ( context.parameters.adult_male || context.parameters.child_male ){
            return 'Male';
        }
    }
}

function addGenderToParameters( value, parameters ){
    if ( value ){
        parameters.gender = value;
    }
}

function getUpperBodyColorFromContext( context ){
    if ( context.parameters.UpperBody ){
        return context.parameters.UpperBody.ClothingColor;
    }
}

function addUpperBodyColorToParameters( value, parameters ){
    if ( value ){
        parameters.upperBodyClothingColor = value;
    }
}

function getLowerBodyColorFromContext( context ){
    if ( context.parameters.LowerBody ){
        return context.parameters.LowerBody.ClothingColor;
    }
}

function addLowerBodyColorToParameters( value, parameters ){
    if ( value ){
        parameters.lowerBodyClothingColor = value;
    }
}

function getHairColorFromContext( context ){
    if ( context.parameters.Hair && context.parameters.Hair.HairColor ){
        return context.parameters.Hair.HairColor;
    }
}

function addHairColorToParameters( value, parameters ){
    if ( value ){
        parameters.hairColor = value;
    }
}

function getAgeFromContext( context ){
    if ( context ){
        if ( context.parameters.CoarseAge ){
            return context.parameters.CoarseAge;
        }
        else if ( context.parameters.adult_female || context.parameters.adult_male ){
            return 'adult';
        }
        else if ( context.parameters.child_female || context.parameters.child_male ){
            return 'child';
        }
    }
}

function addAgeToParameters( value, parameters ){
    if ( value ){
        parameters.age = value;
    }
}

function startSearch( conv ){

    var context = getStartSearchContext( conv );
    var parameters = convertContextToParameterSet( context );

    console.log( 'Start Search' );

    return queueSearchRequest(parameters)
        .then(() => {

            var response = `Got it! A search has been initiated`;
    
            response = addGenderToResponse( parameters, response );
            response = addAgeToResponse( parameters, response );
            response = addUpperBodyToResponse( parameters, response );
            response = addLowerBodyToResponse( parameters, response );
            response = addHairToResponse( parameters, response );
            
            console.log( response );

            conv.close( new SimpleResponse({
                speech: response,
                text: response
            }));

        })
        .catch(error => console.log('ERROR in queueSearchRequest', error));
   
}

function convertContextToParameterSet( context ){
    var parameters = {};
        
    addGenderToParameters( getGenderFromContext( context ), parameters );
    addUpperBodyColorToParameters( getUpperBodyColorFromContext( context ), parameters );
    addLowerBodyColorToParameters( getLowerBodyColorFromContext( context ), parameters );
    addHairColorToParameters( getHairColorFromContext( context ), parameters );
    addAgeToParameters( getAgeFromContext( context ), parameters );

    return parameters;

}

function addGenderToResponse( parameters, response ){

    if (parameters.gender){
        response += ` for a ${parameters.gender}`;
    }
    
    return response;
}

function addAgeToResponse( parameters, response ){

    if (parameters.age){
        response += ` ${parameters.age}`;
    }
    
    return response;
}

function addUpperBodyToResponse( parameters, response ){
   
    if (parameters.upperBodyClothingColor){
        response += ` wearing ${parameters.upperBodyClothingColor} on their upper body`;
    }
    
    return response;
}

function addLowerBodyToResponse( parameters, response ){
   
    if (parameters.lowerBodyClothingColor){
        response += ` wearing ${parameters.lowerBodyClothingColor} on thier lower body`;
    }
    
    return response;
}

function addHairToResponse( parameters, response ){
   
    if (parameters.hairColor){
        response += ` with ${parameters.hairColor} hair`;
    }
    
    return response;
}


function savedView( conv ){

    conv.close( new SimpleResponse({
        speech: "Opening a saved view",
        text: "Opening a saved view"
    }));
}

function notifyOnLiftStatus( conv ){
    console.log( 'Notify When A Lift Status Changes');
}

function setupNotification( conv ){
    console.log( 'Setup Push Notifications' );
    conv.ask(new UpdatePermission({intent: 'Check a Lift'}));
}

function finishNotificationSetup( conv ){
    console.log('Finish Push Setup');

    if (conv.arguments.get('PERMISSION')) {
        const userID = conv.arguments.get('UPDATES_USER_ID');
        // code to save intent and userID in your db
        conv.close(`Ok, I'll start alerting you.`);

        admin.initializeApp(functions.config().firebase);

        var db = admin.firestore();
        var userReference = db.collection('users').doc(userID).set({'notify' : true});
        var anyLiftReference = db.collection('notifications').doc('anyLiftUsers').set(userReference);


    } else {
      conv.close(`Ok, I won't alert you.`);
    }
}


function testNotification( conv ){
    var userID = 'ABwppHGKZe_sxq25BB-UesIt1AMqK8eAbMWXMUvrFm5HdjKHVKx1rr9HAjuF7fOvHSBhQEXoZq4TgT9k5tvndZKTBMos7Ra9';
    sendNotifcation( userID, 'Current Time');
}

function sendNotifcation( userId, intent ){ 
    let jwtClient = new google.auth.JWT(
        key.client_email, null, key.private_key,
        ['https://www.googleapis.com/auth/actions.fulfillment.conversation'],
        null
    );
    
    jwtClient.authorize((err, tokens ) => {
    
        // code to retrieve target userId and intent
        let notif = {
            userNotification: {
            title: 'Current Time',
            },
            target: {
            userId: userId,
            intent: intent,
            // Expects a IETF BCP-47 language code (i.e. en-US)
            locale: 'en-US'
            },
        };

        request.post('https://actions.googleapis.com/v2/conversations:send', {
            'auth': {
            'bearer': tokens.access_token,
            },
            'json': true,
            'body': {'customPushMessage': notif},
        }, (err, httpResponse, body) => {
            console.log( 'notifcation post: ' + httpResponse.statusCode + ': ' + httpResponse.statusMessage);
        });
    });
}

function queueSearchRequest(request) {
    // const request = {};
    // age,
    // gender,
    // hairColour: hair,
    // lowerBodyClothingColor: lowerBody,
    // upperBodyClothingColor: upperBody

    return new Promise((resolve, reject) => {
        admin.database().ref('searchRequest/currentIndex')
            .once('value').then( (snapshot) => {
                const index = snapshot.val();

                console.log('Index is: ', index);

                if (!index && index !== 0) {
                    reject('No index!');
                    return;
                }

                admin.database().ref('searchRequest/' + index)
                    .set(request)
                    .then(() => {
                        let newIndex = index + 1;
                        admin.database().ref().update({
                            'searchRequest/currentIndex': newIndex
                        })
                        .then((something) => {
                            console.log('Successful increment: ', newIndex);
                            console.log('Update returned: ', something);
                            resolve();
                        });
    
                    })
                    .catch((error) => {
                        console.log('ERROR in setting the entry:', error);
                        reject(error);
                    })
            })
            .catch( (error) => {
                console.log('ERROR in getting the entry:', error);
                reject(error);
            })
    })
}

module.exports = app;