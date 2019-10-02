"use strict";

const {
  List,
  Suggestions,
  Image,
  BasicCard,
  Button,
  Table
} = require("actions-on-google");

const database = require("./database");
const { response, totalTimeToString, constants } = require("./util");

/**
 * Handle welcome and first intent
 * @param {*} conv
 */
function welcomeIntent(conv) {
  conv.contexts.delete(constants.SELECTED_RECIPE_CONTEXT);
  conv.ask(response("Olá, qual receita iremos preparar hoje?"));
  conv.ask(
    new Suggestions(["Bolo de cenoura", "Torta de maçã", "Salada de frutas"])
  );
}

/**
 * Handle search recipe intent for visual devices
 * @param {*} conv
 * @param {*} params
 */
function searchRecipeIntent(conv, params) {
  conv.contexts.delete(constants.SELECTED_RECIPE_CONTEXT);

  const { page = 0 } = conv.data;
  // eslint-disable-next-line promise/catch-or-return
  return database.search({ term: params.recipe, page }).then(data => {
    conv.data = {
      recipe: params.recipe,
      page: page,
      totalPages: data.totalPages
    };

    if (data.total < 1) {
      conv.close(response(`Não encontamos nenhuma receita ${params.recipe}`));
    } else {
      if (conv.data.page === 0) {
        conv.ask(response(`Encontramos ${data.total} receitas.`));
      } else {
        conv.ask(response(`Mostrando próximas receitas.`));
      }
      if (conv.data.page < data.totalPages - 1) {
        conv.ask(new Suggestions(["Mostrar Mais"]));
      }

      const items = data.recipes.reduce((acc, recipe) => {
        acc[recipe.id] = {
          title: recipe.name,
          description: `Rendimento: ${
            recipe.recipeYield
          }\nTempo Preparo: ${totalTimeToString(recipe.totalTime)}`,
          image: new Image({
            url: recipe.image,
            alt: recipe.name
          })
        };
        return acc;
      }, {});

      conv.ask(new List({ items }));
    }
    return;
  });
}

function searchRecipeShowModeIntent(conv, params) {
  conv.data.page = Math.min(conv.data.totalPages - 1, conv.data.page + 1);
  return searchRecipeIntent(conv, params);
}

function recipeSelectedIntent(conv, params, option) {
  if (option) {
    return database.get(option).then(recipe => {
      conv.data = { recipe };
      conv.ask(response(`Você selecionou ${recipe.name}`));
      conv.ask(new Suggestions(["Ingredientes", "Modo Preparo", "Ditar"]));
      conv.ask(
        new BasicCard({
          title: recipe.name,
          subtitle: `Rendimento: ${
            recipe.recipeYield
          }\nTempo Preparo: ${totalTimeToString(recipe.totalTime)}`,
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
      return;
    });
  } else {
    conv.ask(response("Não conheço a receita que você selecionou"));
    return Promise.resolve();
  }
}

function ingredientsIntent(conv, params, option) {
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
}

function preparationIntent(conv, params, option) {
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
}

function _dictateRecipe(dictateType, conv, params) {
  const { recipe } = conv.data;
  let { position } = conv.data;
  const { progress } = params;
  let { steps } = params;

  dictateType = dictateType || conv.data.type;

  const property =
    dictateType === constants.INGREDIENTS_TYPE
      ? "recipeIngredient"
      : dictateType === constants.PREPARATION_TYPE
      ? "recipeInstructions"
      : null;

  const data = recipe[property];
  const lastPos = data.length - 1;

  position = Number(position) || 0;
  steps = Number(steps) || 1;

  if (progress === undefined) {
    if (dictateType === constants.INGREDIENTS_TYPE) {
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

    if (dictateType === constants.INGREDIENTS_TYPE) {
      conv.ask(new Suggestions(["Ditar Modo Preparo"]));
    } else if (dictateType === constants.PREPARATION_TYPE) {
      conv.ask(new Suggestions(["Ditar Ingredientes"]));
    }
  } else {
    conv.ask(new Suggestions(["Próximo", "Repetir", "Anterior"]));
  }
  conv.data.position = position;
  conv.data.type = dictateType;
}

function startDictateIntent(conv, params) {
  conv.data.progress = undefined;
  conv.data.position = 0;
  conv.data.steps = 0;
  _dictateRecipe(params.dictate, conv, params);
}

function dictateIntent(conv, params) {
  _dictateRecipe(params.dictate, conv, params);
}

function dictateIngredientsIntent(conv, params) {
  _dictateRecipe(INGREDIENTS, conv, params);
}

function dictatePreparationIntent(conv, params) {
  _dictateRecipe(PREPARATION, conv, params);
}

function fallbackIntent(conv) {
  conv.add(response("Não entendi o que você quis dizer"));
  conv.ask(response("Poderia tentar de novo?"));
}

function byeIntent(conv) {
  conv.close(response("Okey, até mais!"));
}

module.exports = {
  welcomeIntent,
  searchRecipeIntent,
  searchRecipeShowModeIntent,
  recipeSelectedIntent,
  ingredientsIntent,
  preparationIntent,
  startDictateIntent,
  dictateIntent,
  dictateIngredientsIntent,
  dictatePreparationIntent,
  fallbackIntent,
  byeIntent
};
