# pepper-chat-weather-dialogflow-module

This module provides functionality to learn the weather conversationally through a Pepper running the SBRA Pepper Chat solution, using a Dialogflow V2 chatbot. It must be used in conjunction with the [Pepper Chat Dialogflow Fulfillment Library](https://github.com/softbank-robotics-america/pepper-chat-dialogflow-fulfillment-library).

## Usage
### Step 1 - Copy intents into your Agent
Download the zip of the agent in this module called Agent.Weather-Module. Copy the intent into your agent.

### Step 2 - Declare all dependencies in your Webhook's manifest
Include the module in your Node.JS webhook (fulfillment) naming the following dependencies statement in your package.json file. In addition to the Pepper Chat Weather module, you will also need to include the Pepper Chat Dialogflow Fulfillment Library:

```     
"pepper-chat-weather": "softbank-robotics-america/pepper-chat-weather-dialogflow-module#dialogflow-v2",
"pepper-chat-dialogflow": "softbank-robotics-america/pepper-chat-dialogflow-fulfillment-library#dialogflow-v2"
```

### Step 3 - Initialize the modules in your Webhook
Initialize the module in your index.js file as follows:

```
/**
 * PEPPER CHAT LIBRARY - initialization & configuration:
 */
const PepperChatLibrary = require('pepper-chat-dialogflow');

/**
 * WEATHER MODULE - initialization & configuration:
 */
const worldWeatherOnlineApiKey = 'Insert your World Weather Online API key'; // https://developer.worldweatheronline.com/my/analytics.aspx?key_id=183570 --> 3 day forecast
const { WeatherPepperChat } = require('pepper-chat-weather');
const pepper_chat_weather = new WeatherPepperChat(PepperChatLibrary, { worldWeatherOnlineApiKey });
```

### Step 4 - Setup your action handler in your Webhook

Actually using the library in your index.js file to handle requests is as easy as:
```
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {

   let agent = new WebhookClient({request: request, response: response});
   let action = agent.action; // https://dialogflow.com/docs/actions-and-parameters

   // Specify the above handlers in an action handler object
   const actionHandlers = {
          'weather': weatherHandler
    };   
    actionHandlers[action]();
    
   /******************************************************************************************************************
   * WEATHER MODULE:                                                                                                 *
   ******************************************************************************************************************/
   function weatherHandler() {
      pepper_chat_weather.actionHandler(request, response, agent);
   }
}
  ```
### Step 5 - Customize the module for a given robot from within the Pepper Chat CMS
Provide the latitude and longitude to the module through the Pepper Chat CMS via parameters
```
CITY: City Name

e.g. 
CITY: San Francisco, CA
```
