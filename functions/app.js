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

app.intent('Default Welcome Intent', welcome );
app.intent('Default Fallback Intent', fallback );

app.intent('Send Notification', testNotification);
app.intent('Current Time', currentTime);
app.intent('Start Search', startSearch);
app.intent('Star Result', starResult);
app.intent('Add Hair Facet', addHairFacet);
app.intent('Add Upper Body Facet', addUpperBodyFacet );
app.intent('Add Lower Body Facet', addLowerBodyFacet );
app.intent('Add Age Facet', addAgeFacet );
app.intent('Add Gender Facet', addGenderFacet );
app.intent('Add Search Time', addTimeFacet );
app.intent('Remove Facet', removeFacet);
app.intent('Add Location', addLocationFacet );
app.intent('Start Tracking', startTracking);

app.intent('Look For Food Fairy', lookForFoodFairy);
app.intent('Open Saved View', openSavedView );

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

function getSavedViewContext( conv ){
    return conv.contexts.get( 'saved_view' );
}

function removeParameterFromContext( conv, parameterName ){
    var parameters = getStartSearchContext( conv ).parameters;
    delete parameters[ parameterName ];

    conv.contexts.set( 'start_search', 5, parameters );
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
    if ( context.parameters.UpperBodyColor ){
        return context.parameters.UpperBodyColor;
    }
}

function addUpperBodyColorToParameters( value, parameters ){
    if ( value ){
        parameters.upperBodyClothingColor = value;
    }
}

function getLowerBodyColorFromContext( context ){
    if ( context.parameters.LowerBodyColor ){
        return context.parameters.LowerBodyColor;
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
        if ( context.parameters.adult_female || context.parameters.adult_male ){
            console.log( 'adult' );
            return 'adult';
        }
        else if ( context.parameters.child_female || context.parameters.child_male ){
            return 'child';
        }
        else if ( context.parameters.CoarseAge ){
            return context.parameters.CoarseAge;
        }
    }
}

function addAgeToParameters( value, parameters ){
    if ( value ){
        parameters.age = value;
    }
}

function getTimeRangeFromContext( context ){

    if ( context.parameters.DateTime && context.parameters.DateTime["date-time"] ){
        return context.parameters.DateTime["date-time"];
    }
}

function addTimeRangeToParameters( value, parameters ){
    if ( value && value.startDateTime && value.endDateTime ){
        parameters.startTime = value.startDateTime;
        parameters.endTime = value.endDateTime;

        console.log ( `Time Range: ${parameters.startTime} - ${parameters.endTime}` );
    }
}

function getStarredResultNumberFromContext( context ){
    if ( context.parameters.resultNumber ){
        return context.parameters.resultNumber;
    }
}

function addStarredResultToParameters( value, parameters ){
    if (value){
        parameters.starredResultNumber = value;
    }
}

function getFacetToRemoveFromContext( context ){
    if ( context.parameters.facetToRemove ){
        return context.parameters.facetToRemove;
    }
}

function getLocationFromContext( context ){
    if ( context.parameters.CameraLocation ){
        return context.parameters.CameraLocation;
    }
}

function addLocationParameters( value, parameters ){
    if (value){
        parameters.location = value;
    }  
}

function getOpenSavedViewFromContext( context ){

    if ( context.parameters.openSavedView ){
        return context.parameters.openSavedView;
    }
}

function addOpenSavedViewParameters( value, parameters ){
    if (value){
        parameters.openSavedView = value;
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
            response = addTimeRangeToResponse( parameters, response );
            
            response += '. How would you like to refine the results?'
            console.log( response );

            conv.ask( new SimpleResponse({
                speech: response,
                text: response
            }));

        })
        .catch(error => console.log('ERROR in queueSearchRequest', error));
   
}

function addHairFacet( conv ){
    return addFacet( conv, 'Adding hair color' );
}

function addAgeFacet( conv ){
    return addFacet( conv, 'Adding age.' );
}

function addGenderFacet( conv ){
    return addFacet( conv, 'Adding gender.' );
}

function addUpperBodyFacet( conv ){
    return addFacet( conv, 'Adding upper clothing color.' );
}

function addLowerBodyFacet( conv ){
    return addFacet( conv, 'Adding lower clothing color.' );
}

function addTimeFacet( conv ){
    return addFacet( conv, 'Setting search time range.' );
}

function addLocationFacet( conv ){
    return addFacet( conv, 'Refining location.' );
}

function addFacet( conv, response ){

    var context = getStartSearchContext( conv );
    var parameters = convertContextToParameterSet( context );

    console.log( `Add Facet: ${response}` );
    console.log( `  context: ${JSON.stringify(context)}`);
    console.log( `  parameters: ${JSON.stringify(parameters)}`);

    return queueSearchRequest(parameters)
        .then(() => {
            
            console.log( response );

            conv.ask( new SimpleResponse({
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
    addTimeRangeToParameters( getTimeRangeFromContext( context ), parameters );
    addStarredResultToParameters( getStarredResultNumberFromContext( context ), parameters );
    addLocationParameters( getLocationFromContext( context ), parameters );

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
        response += ` wearing ${parameters.lowerBodyClothingColor} on their lower body`;
    }
    
    return response;
}

function addHairToResponse( parameters, response ){
   
    if (parameters.hairColor){
        response += ` with ${parameters.hairColor} hair`;
    }
    
    return response;
}

function addTimeRangeToResponse( parameters, response ){
   
    if (parameters.startTime){
        var startTime = moment( parameters.startTime ).format("MMM D H:mm");
        var endTime = moment( parameters.endTime ).format("MMM D H:mm");

        response += ` between ${startTime} and ${endTime}`;
    }
    
    return response;
}

function starResult( conv ){

    var context = getStartSearchContext( conv );
    var parameters = convertContextToParameterSet( context );

    console.log( 'Star Result' );

    return queueSearchRequest(parameters)
        .then(() => {

            var response = `Ok, `;
    
            response = addStarredResultToResponse( parameters, response );
            
            console.log( response );

            conv.ask( new SimpleResponse({
                speech: response,
                text: response
            }));

        })
        .catch(error => console.log('ERROR in queueSearchRequest', error));
   
}

function addStarredResultToResponse( parameters, response ){
   
    if (parameters.starredResultNumber){

        response += ` starring result ${parameters.starredResultNumber}`;
    }
    
    return response;
}

function addLocationToResponse( parameters, response ){
   
    if (parameters.location){

        response += ` looking on ${parameters.location} cameras`;
    }
    
    return response;
}

function removeFacetFromParmeters( parameters, facet ){
    switch( facet ){
        case 'Age':
        {           
            delete parameters.age;
            break;
        }
        case 'Gender':
        {           
            delete parameters.gender;
            break;
        }
        case 'Hair':
        {           
            delete parameters.hairColor;
            break;
        }
        case 'UpperBody':
        {           
            delete parameters.upperBodyClothingColor;
            break;
        }
        case 'LowerBody':
        {           
            delete parameters.lowerBodyClothingColor;
            break;
        }
    }

    return parameters;
}

function removeFacet( conv ){
    
    var context = getStartSearchContext( conv );
    var parameters = convertContextToParameterSet( context );
    var facetToRemove = getFacetToRemoveFromContext( context );

    console.log( `Remove Facet : ${facetToRemove}` );

    parameters = removeFacetFromParmeters( parameters, facetToRemove );

    return queueSearchRequest(parameters)
        .then(() => {

            var response = `Removing `;
    
            response = addRemovedFacetToResponse( facetToRemove, response );
            
            console.log( response );

            removeParameterFromContext( conv, facetToRemove );

            conv.ask( new SimpleResponse({
                speech: response,
                text: response
            }));

        })
        .catch(error => console.log('ERROR in queueSearchRequest', error));
}

function addRemovedFacetToResponse( facetToRemove, response ){

    response += ` ${facetToRemove}`;
    
    return response;
}

function openSavedView( conv ){
    
    var context = getSavedViewContext( conv );
    
    var parameters = {};
    addOpenSavedViewParameters( getOpenSavedViewFromContext( context), parameters );

    console.log( `Opening Saved View '${parameters.openSavedView}` );

    return queueSearchRequest(parameters)
        .then(() => {

            var response = `Here you go. Opening saved view ${parameters.openSavedView}`;
            
            console.log( response );

            conv.ask( new SimpleResponse({
                speech: response,
                text: response
            }));

        })
        .catch(error => console.log('ERROR in queueSearchRequest', error));
   
}

function lookForFoodFairy( conv ){

    var parameters = {
        person: 'Food Fairy',
        track: true,
        location: '2nd Floor'
    }

    console.log( 'Find Food Fairy' );

    return queueSearchRequest(parameters)
        .then(() => {

            var response = `You got it! Now stalking the food fairy.`;
            
            console.log( response );

            conv.ask( new SimpleResponse({
                speech: response,
                text: response
            }));

        })
        .catch(error => console.log('ERROR in queueSearchRequest', error));
   
}

function startTracking( conv ){
    
    var context = getStartSearchContext( conv );
    var parameters = convertContextToParameterSet( context );

    console.log( `Start Tracking` );

    parameters = convertContextToParameterSet( context );
    parameters.track = true;

    return queueSearchRequest(parameters)
        .then(() => {

            var response = `Ok, tracking this person.`;
               
            console.log( response );

            conv.ask( new SimpleResponse({
                speech: response,
                text: response
            }));

        })
        .catch(error => console.log('ERROR in queueSearchRequest', error));
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
    if (!Object.keys(request).length) {
        console.log('REQUEST IS EMPTY: ', JSON.stringify(request));
        return new Promise((resolve, reject) => resolve());
    }

    return new Promise((resolve, reject) => {
        admin.database().ref('searchRequest/currentIndex')
            .once('value').then( (snapshot) => {
                const index = snapshot.val();

                if (!index && index !== 0) {
                    reject('No index!');
                    return;
                }

                console.log( `Adding Entry ${index} : ${JSON.stringify(request)}` );

                admin.database().ref('searchRequest/' + index)
                    .set(request)
                    .then(() => {
                        let newIndex = index + 1;

                        console.log( '  Added. Updating index.' );

                        admin.database().ref().update({
                            'searchRequest/currentIndex': newIndex
                        })
                        .then((something) => {
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