"use strict";

const {
  dialogflow,
  List,
  Suggestions,
  Image,
  BasicCard,
  Button,
  Table
} = require("actions-on-google");
const functions = require("firebase-functions");

const database = require("./database");
const { response } = require("./util");

const AppContexts = {
  SELECTED_RECIPE: "selectedrecipe-followup"
};

const Lifespans = {
  DEFAULT: 5
};

const app = dialogflow({ debug: true });

app.middleware(conv => {
  conv.hasScreen = conv.surface.capabilities.has(
    "actions.capability.SCREEN_OUTPUT"
  );
  conv.hasAudioPlayback = conv.surface.capabilities.has(
    "actions.capability.AUDIO_OUTPUT"
  );
  conv.hasWebBrowser = conv.surface.capabilities.has(
    "actions.capability.WEB_BROWSER"
  );
});

app.intent("Default Welcome Intent", conv => {
  conv.contexts.delete(AppContexts.SELECTED_RECIPE);
  conv.ask(response("Olá, qual receita iremos preparar hoje?"));
  conv.ask(
    new Suggestions(["Bolo de cenoura", "Torta de maçã", "Salada de frutas"])
  );
});

function totalTimeToString(totalTime) {
  totalTime = totalTime.replace('PT','');
  if(totalTime.indexOf('H') > -1 && totalTime.indexOf('M') > -1) {
    totalTime = totalTime.replace('H',':').replace('M','');
    if(totalTime.indexOf(':') < 2) {
      totalTime = '0'+totalTime;
    }
    if(totalTime.indexOf(':') === totalTime.length - 2) {
      totalTime = totalTime.substr(0, totalTime.indexOf(':') + 1) + '0' + totalTime.substr(totalTime.indexOf(':') + 1);
    }
    return totalTime;
  } 
  else if(totalTime.indexOf('H') > -1) {
    totalTime = totalTime.replace('H','');
    if(totalTime === '1') {
    return totalTime + ' Hora';
    }
    return totalTime + ' Horas';
  } 
  else if(totalTime.indexOf('M') > -1) {
    totalTime = totalTime.replace('M','');
    if(totalTime === '1') {
    return totalTime + ' Minuto';
    }
    return totalTime + ' Minutos';
  }
  return 'N/I';
}

// If the action has screen display list to user select
function searchRecipeVisualHandler(conv, data) {
  if (conv.data.page < data.totalPages - 1) {
    conv.ask(new Suggestions(["Mostrar Mais"]));
  }
  const items = data.recipes.reduce((acc, recipe) => {
    acc[recipe.objectID] = {
      title: recipe.name,
      description: `Rendimento: ${recipe.recipeYield}\nTempo Preparo: ${totalTimeToString(recipe.totalTime)}`,
      image: new Image({
        url: recipe.image,
        alt: recipe.name
      })
    };
    return acc;
  }, {});

  conv.ask(new List({ items }));
}

function searchRecipeHandler(conv, params) {
  conv.contexts.delete(AppContexts.SELECTED_RECIPE);

  const { page = 0 } = conv.data;
  // eslint-disable-next-line promise/catch-or-return
  return database.search({ query: params.recipe, page }).then(data => {
    conv.data = {
      recipe: params.recipe,
      page: page,
      totalPages: data.totalPages
    };

    // eslint-disable-next-line promise/always-return
    if (data.total < 1) {
      conv.close(response(`Não encontamos nenhuma receita ${params.recipe}`));
    } else {
      if (conv.data.page === 0) {
        conv.ask(response(`Encontramos ${data.total} receitas.`));
      } else {
        conv.ask(response(`Mostrando próximas receitas.`));
      }
      searchRecipeVisualHandler(conv, data);
    }
  });
}

// Search the recipes and direct to correct intent
app.intent("Search Recipes", searchRecipeHandler);

app.intent("Search Recipes - Show More", (conv, params) => {
  conv.data.page = Math.min(conv.data.totalPages - 1, conv.data.page + 1);
  return searchRecipeHandler(conv, params);
});

// Handle list or carousel selection
app.intent("Recipe Selected", (conv, params, option) => {
  if (option) {
    // eslint-disable-next-line promise/catch-or-return
    return (
      database
        .get(option)
        // eslint-disable-next-line promise/always-return
        .then(recipe => {
          conv.ask(response(`Você selecionou ${recipe.name}`));
          conv.ask(new Suggestions(["Ingredientes", "Modo Preparo", "Ditar"]));
          conv.ask(
            new BasicCard({
              title: recipe.name,
              subtitle: `Rendimento: ${recipe.recipeYield}\nTempo Preparo: ${totalTimeToString(recipe.totalTime)}`,
              image: new Image({
                url: recipe.image,
                alt: recipe.name
              }),
              buttons: [
                new Button({
                  title: "Receita Completa",
                  url: recipe.url
                })
              ]
            })
          );
          conv.data = { recipe };
        })
    );
  } else {
    conv.ask(response("Não conheço a receita que você selecionou"));
  }
});

app.intent("Ingredients", (conv, params, option) => {
  const { recipe } = conv.data;
  conv.ask(response(`Estes são os ingredientes da receita ${recipe.name}`));

  conv.ask(
    new Table({
      dividers: true,
      columns: ["Ingredientes"],
      rows: recipe.recipeIngredient.map(i => ({ cells: [i] }))
    })
  );
  conv.ask(new Suggestions(["Modo Preparo", "Ditar"]));
});

app.intent("How to Prepare", (conv, params, option) => {
  const { recipe } = conv.data;
  conv.ask(response(`Este é o modo de preparo da receita ${recipe.name}`));

  conv.ask(
    new Table({
      dividers: true,
      columns: ["Modo Preparo"],
      rows: recipe.recipeInstructions.map(i => ({ cells: [i] }))
    })
  );
  conv.ask(new Suggestions(["Ingredientes", "Ditar"]));
});

const INGREDIENTS_TYPE = "ingredients",
  PREPARATION_TYPE = "preparation";

function dictateRecipe(dictateType, conv, params) {
  const { recipe } = conv.data;
  let { position } = conv.data;
  const { progress } = params;
  let { steps } = params;

  dictateType = dictateType || conv.data.type;

  const property =
    dictateType === INGREDIENTS_TYPE
      ? "recipeIngredient"
      : dictateType === PREPARATION_TYPE
      ? "recipeInstructions"
      : null;

  const data = recipe[property];
  const lastPos = data.length - 1;

  position = Number(position) || 0;
  steps = Number(steps) || 1;

  if (progress === undefined) {
    if (dictateType === INGREDIENTS_TYPE) {
      conv.ask(response(`Ditando os ingredientes da receita ${recipe.name}`));
    } else {
      conv.ask(response(`Ditando o modo de preparo da receita ${recipe.name}`));
    }
  } else {
    if (progress === "Anterior") {
      position = Math.max(0, position - steps);
    } else if (progress === "Próximo") {
      position = Math.min(lastPos, position + steps);
    }
  }

  conv.ask(response(data[position]));

  if (position === lastPos) {
    conv.ask(response("Isso é tudo"));

    if (dictateType === INGREDIENTS_TYPE) {
      conv.ask(new Suggestions(["Ditar Modo Preparo"]));
    } else if (dictateType === PREPARATION_TYPE) {
      conv.ask(new Suggestions(["Ditar Ingredientes"]));
    }
  } else {
    conv.ask(new Suggestions(["Próximo", "Repetir", "Anterior"]));
  }
  conv.data.position = position;
  conv.data.type = dictateType;
}

app.intent("Start Dictating", (conv, params) => {
  conv.data.progress = undefined;
  conv.data.position = 0;
  conv.data.steps = 0;
  dictateRecipe(params.dictate, conv, params);
});

app.intent("Dictate", (conv, params) => {
  dictateRecipe(params.dictate, conv, params);
});

app.intent("Dictate Ingredients", (conv, params) => {
  dictateRecipe(INGREDIENTS, conv, params);
});

app.intent("Dictate How to Prepare", (conv, params) => {
  dictateRecipe(PREPARATION, conv, params);
});

app.intent("Ingredients - Dictate", "Start Dictating");

app.intent("How to Prepare - Dictate", "Start Dictating");

app.intent("Default Fallback Intent", conv => {
  conv.add(response("Não entendi o que você quis dizer"));
  conv.ask(response("Poderia tentar de novo?"));
});

// Leave conversation
app.intent("bye response", conv => {
  conv.close(response("Okey, até mais!"));
});

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);
