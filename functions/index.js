"use strict";

const { dialogflow } = require("actions-on-google");
const functions = require("firebase-functions");

const app = dialogflow({ debug: true });
const intents = {
};

app.middleware(conv => {
  let actionFunctions = {};
  if(conv.surface.capabilities.has("actions.capability.SCREEN_OUTPUT")) {
    actionFunctions = require("./recipe.screen");
  } else {
    actionFunctions = require("./recipe.audio");
  }

  intents.welcomeIntent = actionFunctions.welcomeIntent.bind(this);
  intents.searchRecipeIntent = actionFunctions.searchRecipeIntent.bind(this);
  intents.searchRecipeShowModeIntent = actionFunctions.searchRecipeShowModeIntent.bind(this);
  intents.recipeSelectedIntent = actionFunctions.recipeSelectedIntent.bind(this);
  intents.ingredientsIntent = actionFunctions.ingredientsIntent.bind(this);
  intents.preparationIntent = actionFunctions.preparationIntent.bind(this);
  intents.startDictateIntent = actionFunctions.startDictateIntent.bind(this);
  intents.dictateIntent = actionFunctions.dictateIntent.bind(this);
  intents.dictateIngredientsIntent = actionFunctions.dictateIngredientsIntent.bind(this);
  intents.dictatePreparationIntent = actionFunctions.dictatePreparationIntent.bind(this);
  intents.fallbackIntent = actionFunctions.fallbackIntent.bind(this);
  intents.byeIntent = actionFunctions.byeIntent.bind(this);
});

app.intent("Default Welcome Intent", (conv, params, option) => {
  return intents.welcomeIntent(conv, params, option);
});
app.intent("Search Recipes", (conv, params, option) => {
  return intents.searchRecipeIntent(conv, params, option);
});
app.intent("Search Recipes - Show More", (conv, params, option) => {
  return intents.searchRecipeShowModeIntent(conv, params, option);
});
app.intent("Recipe Selected", (conv, params, option) => {
  return intents.recipeSelectedIntent(conv, params, option);
});
app.intent("Ingredients", (conv, params, option) => {
  return intents.ingredientsIntent(conv, params, option);
});
app.intent("How to Prepare", (conv, params, option) => {
  return intents.preparationIntent(conv, params, option);
});
app.intent("Start Dictating", (conv, params, option) => {
  return intents.startDictateIntent(conv, params, option);
});
app.intent("Dictate", (conv, params, option) => {
  return intents.dictateIntent(conv, params, option);
});
app.intent("Dictate Ingredients", (conv, params, option) => {
  return intents.dictateIngredientsIntent(conv, params, option);
});
app.intent("Dictate How to Prepare", (conv, params, option) => {
  return intents.dictatePreparationIntent(conv, params, option);
});
app.intent("Ingredients - Dictate", "Start Dictating");
app.intent("How to Prepare - Dictate", "Start Dictating");
app.intent("Default Fallback Intent", (conv, params, option) => {
  return intents.fallbackIntent(conv, params, option);
});
app.intent("bye response", (conv, params, option) => {
  return intents.byeIntent(conv, params, option);
});

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);
