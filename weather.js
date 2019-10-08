
// Load Javascript utility helper libraries: ramda, lodash, & moment
const R = require('ramda');
const { path, pluck, mean, compose, map, forEach, addIndex, replace } = R;

const { capitalize, toLower, isEmpty } = require('lodash');
const moment = require('moment');

// Load Javascript API requests helper libraries: request & restful.js
const requestApi = require('request');
const restful = require('restful.js');
const { requestBackend } = restful;

 /******************************************************************************************************************
 * WEATHER MODULE:                                                                                                 *
 ******************************************************************************************************************/
class WeatherPepperChat {
    constructor(PepperChatLibrary, config) { 
        if (!('worldWeatherOnlineApiKey' in config)) { throw 'worldWeatherOnlineApiKey is required for the weather Pepper Chat weather module to function' }
        if (!('PepperResponse' in PepperChatLibrary)) { throw 'PepperResponse is required for the Pepper Chat weather module to function'}
        if (!('BasicCard' in PepperChatLibrary)) { throw 'BasicCard is required for the Pepper Chat weather module to function'}  
        if (!('randomlyChoose' in PepperChatLibrary)) { throw 'randomlyChoose is required for the Pepper Chat weather module to function'}     
        this.PepperResponse = PepperChatLibrary.PepperResponse;
        this.BasicCard = PepperChatLibrary.BasicCard;
        this.randomlyChoose = PepperChatLibrary.randomlyChoose;        
        this.worldWeatherOnlineApiKey = config.worldWeatherOnlineApiKey;
        this.defaultCity = config.defaultCity;
        this.defaultMsg = config.defaultMsg || "I don't know the weather right now. \\pau=200\\ I'm not allowed to go outside anyways. \\pau=800\\ What else would you like to do? || I don't know the weather right now."; 
        this.followupMsg = config.followupMsg || "\\pau=600\\ What else would you like to talk about?";
        this.fallbackMsg = config.fallbackMsg || "I don't know the weather right now, but I always think {city} is a charming place. ";
        this.fallbackMsgBuilder = replace(/\{city\}/g, R.__, `${this.fallbackMsg} ${this.followupMsg} || ${this.fallbackMsg}`);
        this.weatherApi = restful.default('http://api.worldweatheronline.com', requestBackend(requestApi));  
    }
    actionHandler( { body }, response, agent) {
        let { session } = body;
        let { action, context, parameters } = agent;    
        let localContext = context.get('local'), local = localContext ? localContext.parameters : {}; // Local context stores Pepper Chat CMS parameters
        let initContext = context.get('init'), init = initContext ? initContext.parameters : {}; // Init context stores init1234 Chatbot-wide parameters (used for SmallTalk intents)
        /**
         * This function is specific to the data model returned by the World Weather Online 3-day forecast API. The data 
         * model features weather descriptions in increments of 3 hours, starting at midnight (AM) of the current day. */
        let { geoCity : city, date, timePeriod, originalDate = 'today', originalTimePeriod } = parameters;
        // Check to see if the user provided a city; otherwise check if it was set in the CMS; if no city is specified, use the default city
        city = city.length !== 0 ? city : local.city || local.CITY || this.defaultCity;
        date = date.length !== 0 ? date : new Date().toISOString().slice(0, 10);
        let weather_fallback_msg = this.fallbackMsgBuilder(city);
        const weatherRequestPath = `premium/v1/weather.ashx?format=json&num_of_days=1&q=${encodeURIComponent(city)}&key=${this.worldWeatherOnlineApiKey}&date=${date}`;
        this.weatherApi.custom(weatherRequestPath).get().then( api_response => {
            console.log(weatherRequestPath)
            console.log(this.weatherApi)
            console.log(api_response)
            console.log(JSON.stringify(api_response));
            let timeContext = 'present', currentConditions, weatherCode;
            if (date && moment() <= moment(date)) {
               timeContext = 'future';
            } else if (date && timePeriod) {
                const {    startTime = { hours: 0 }    } = timePeriod; // If the startTime has been provided via timePeriod, use that; otherwise use 0
                if (moment() <= moment(date).add(moment(startTime).hours(), 'hours')) {
                    timeContext = 'future';
                }
            }
            const response_body = api_response.body(false);
            const forecast = path(['data', 'weather', 0], response_body);
            const location = path(['data', 'request', 0], response_body);
            const hourly = path(['hourly'], forecast);

            // Determine weather code
            if (timeContext === 'present') {
                const conditions = path(['data', 'current_condition', 0], response_body);
                currentConditions = path(['weatherDesc', 0, 'value'], conditions);
                console.log(Object.keys(conditions));
                weatherCode = conditions.weatherCode; 
            } else {
                const { startTime } = timePeriod;
                const timePeriodHour = moment(startTime).hours() * 100;
                let desiredHour;
                addIndex(forEach)((hour, index) => {
                    try {
                        let startRange = parseInt(hour.time);
                        let endRange = parseInt(hourly[index + 1].time);
                        if (startRange <= timePeriodHour && timePeriodHour <= endRange) {
                            desiredHour = hour;
                        }
                    } catch (e) {
                        if (!desiredHour) desiredHour = hour;
                    }
                })(hourly);
                currentConditions = path(['weatherDesc', 0, 'value'], desiredHour);
                weatherCode = desiredHour.weatherCode;
            }
            const formatedDate = moment(forecast.date).format('MMMM Do YYYY');
            const { mintempF, maxtempF } = forecast;
            const sentenceTense = timeContext === 'future' ? 'there will be' : "it's";
            const defaultSafeDate = (originalDate) => !isEmpty(originalDate) ? originalDate : 'Today'; // Return of value is implicit in 1-line arrow functions (ES6)
            const safeOriginalDate = compose(capitalize, defaultSafeDate)(originalDate); 
            originalTimePeriod = !originalTimePeriod ? "" : originalTimePeriod;
            let simpleText = `${safeOriginalDate} ${originalTimePeriod}, ${sentenceTense} ${toLower(currentConditions)} conditions.`.replace(/\s+/g, ' ');
            simpleText += ` You can expect a high of ${maxtempF}°F and a low of ${mintempF}°F. \\pau=700\\ You can ask me the weather for another city or just say Menu to go back to the main menu?`;
            let defaultMessage = simpleText + ` || You can expect a high of ${maxtempF}°F and a low of ${mintempF}°F.`;
            const chanceOfRain = compose(mean, pluck('chanceofrain'));
            const chance = chanceOfRain(hourly);
            let title = `Weather in ${city || deviceCity}`;
            const text = `${formatedDate}, High - ${maxtempF}, Low - ${mintempF}. chance of rain - ${Math.round(chance)}%`;
            const imageUrl = `https://storage.googleapis.com/core-intelligence-module-assets/weather/${weatherCode}.png`;
            title = simpleText + " || " + title;
            new this.PepperResponse(new this.BasicCard(title, imageUrl)).send(response)   
        })
        .catch(error => {
            console.error(error);
            new this.PepperResponse(this.randomlyChoose([weather_fallback_msg, this.defaultMsg])).send(response)
        });
    }
}
module.exports = { WeatherPepperChat };