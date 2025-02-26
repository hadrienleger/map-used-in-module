/****************************************************
 * Code principal JavaScript pour la carte Mapbox
 * ----------------------------------------------
 * 1) Les couches sont décrites dans layerConfigs.
 * 2) On a une unique fonction "window.updateMapLayers(layerId, options)"
 *    qui va déterminer le type de la couche (selectable, choropleth, etc.)
 *    et configurer la couche en conséquence.
 * 3) On peut surcharger (ou compléter) la config
 *    via "options.property", "options.breaks", "options.colors", etc.
 * 4) On gère aussi l'affichage des "labels" si 'labels.enabled' est true.
 ****************************************************/

let map;
let selectedFeatures = [];  // pour stocker les ID sélectionnés dans les couches SELECTABLE
let currentLayerId = null;

// ---------------------------
// 1) Configuration unifiée
// ---------------------------
const layerConfigs = {

  // Ex. couche SELECTABLE "communes"
  communes: {
    type: 'selectable',
    source: {
      type: 'vector',
      url: 'mapbox://hadrienleger.cya562rc'
    },
    sourceLayer: 'simplifie-fusion-communes-et--439qo9',
    paint: {
      'fill-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        '#FF0000',
        '#2C3E50'
      ],
      'fill-opacity': 0.8,
      'fill-outline-color': '#FFFFFF'
    },
    interactions: {
      selectable: true,
      idField: 'INSEE_COM',
      cursor: 'pointer',
      bubbleFunction: 'com',
      specialCases: {
        ids: ['75056', '69123', '13055'], // codes communes globales de Paris, Lyon, Marseille
        alternateField: 'INSEE_ARM'       // champ contenant l’arrondissement
      }
    },
    labels: {
      enabled: true,
      field: 'NOM',
      textSize: 12,
      color: '#FFF',
      haloColor: '#000',
      haloWidth: 1
    }
  },

  // Ex. couche SELECTABLE "departements"
  departements: {
    type: 'selectable',
    source: {
      type: 'vector',
      url: 'mapbox://hadrienleger.7ys4ypx4'
    },
    sourceLayer: 'simplifie-DEPARTEMENT-asio6w',
    paint: {
      'fill-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        '#FF0000',
        '#2C3E50'
      ],
      'fill-opacity': 0.8,
      'fill-outline-color': '#FFFFFF'
    },
    interactions: {
      selectable: true,
      idField: 'INSEE_DEP',
      cursor: 'pointer',
      bubbleFunction: 'dep'
    },
    labels: {
      enabled: true,
      field: 'NOM',  // par ex. s'il y a un champ "NOM"
      textSize: 11,
      color: '#000',
      haloColor: '#fff',
      haloWidth: 1
    }
  },

  // Couche CHOROPLETH "niveauVie"
  niveauVie: {
    type: 'choropleth',
    source: {
      type: 'vector',
      url: 'mapbox://hadrienleger.filosofi2019'
    },
    sourceLayer: 'c200_filosofi_2019',
    // config par défaut si pas surchargé
    property: 'nv_moyen', 
    breaks: [15000, 20000, 25000, 30000, 35000],
    colors: ['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15', '#67000d'],
    // ex. label éventuelle sur la carte
    opacity: 0.5,
    labels: {
      enabled: false
    }
  },

  // Couche CHOROPLETH "logementSocial"
  logementSocial: {
    type: 'choropleth',
    source: {
      type: 'vector',
      url: 'mapbox://hadrienleger.filosofi2019'
    },
    sourceLayer: 'c200_filosofi_2019',
    property: 'part_log_soc',
    breaks: [5, 10, 15, 20, 25],
    colors: ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c', '#042f6b'],
    opacity: 0.5,
    labels: {
      enabled: false
    }
  },

    // Couche CHOROPLETH Notes sur 20 des communes (insécurité)
  notesInsecurite: {
    type: 'choropleth',
    source: {
      type: 'vector',
      url: 'mapbox://hadrienleger.7ypxua5r'
    },
    sourceLayer: 'communes_securite-2449ue',
    property: 'note_sur_20',
    breaks: [5, 10, 15, 20, 25],
    colors: ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c', '#042f6b'],
    opacity: 0.5,
    labels: {
      enabled: true,
      field: 'note_sur_20',
      textSize: 12,
      color: '#FFF',
      haloColor: '#000',
      haloWidth: 1
    }
  },

  // Couche FILTERABLE, ex. carreaux 200m
  carresResult: {
    type: 'filterable',
    source: {
      type: 'vector',
      url: 'mapbox://hadrienleger.grille200m'
    },
    sourceLayer: 'grille200m_metropole',
    paint: {
      'fill-color': '#8338ec',
      'fill-opacity': 0.7
    },
    idField: 'idINSPIRE'
  }

};

// -------------------------------------
// 2) Initialiser la carte
// -------------------------------------

function checkMapboxLoaded() {
  if (typeof mapboxgl === 'undefined') {
    console.error('Mapbox GL JS n\'est pas chargé.');
    return false;
  }
  return true;
}

if (checkMapboxLoaded()) {
  initializeMap();
}

function initializeMap() {
  console.log('Initialisation de la carte...');
  mapboxgl.accessToken = 'pk.eyJ1IjoiaGFkcmllbmxlZ2VyIiwiYSI6ImNsYm1oc3RidzA1NDczdm1xYTJmc3cwcm4ifQ.AguFBTkyTxFnz3VWFBSjrA';

  map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [2.361, 48.852],
    zoom: 9
  });

  map.on('load', () => {
    console.log('Carte chargée avec succès.');

    // Ajouter toutes les sources
    Object.keys(layerConfigs).forEach(layerId => {
      if (!map.getSource(layerId)) {
        map.addSource(layerId, layerConfigs[layerId].source);
      }
    });
  });
}

// -------------------------------------
// 3) hideAllLayers() : masquer tout
// -------------------------------------
function hideAllLayers() {
  console.log("=== hideAllLayers called ===");
  Object.keys(layerConfigs).forEach(layerId => {
    const config = layerConfigs[layerId];
    if (config.type === 'choropleth') {
      // Masquer la couche choropleth
      if (map.getLayer(`${layerId}-choropleth`)) {
        map.setLayoutProperty(`${layerId}-choropleth`, 'visibility', 'none');
      }
      // Masquer les labels pour les choropleths
      if (config.labels?.enabled && map.getLayer(`${layerId}-labels`)) {
        map.setLayoutProperty(`${layerId}-labels`, 'visibility', 'none');
      }
    } else {
      // Masquer les autres types de couches
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', 'none');
      }
      // Masquer les labels pour les autres couches
      if (config.labels?.enabled && map.getLayer(`${layerId}-labels`)) {
        map.setLayoutProperty(`${layerId}-labels`, 'visibility', 'none');
      }
    }
  });
}

// Exposer à Bubble
window.hideAllLayers = hideAllLayers;

// -------------------------------------
// 4) addLayer() en fonction du type
// -------------------------------------
function addLayer(layerId, options={}) {
  const config = layerConfigs[layerId];
  if (!config) return;

  // Surcharger la config choropleth si options contient property / breaks / colors
  if (config.type === 'choropleth') {
    if (options.property) config.property = options.property;
    if (options.breaks) config.breaks = options.breaks;
    if (options.colors) config.colors = options.colors;
  }

  if (map.getLayer(layerId)) {
    // couche déjà ajoutée (pour selectable/filterable)
    // on fait rien
  } else if (config.type === 'selectable' || config.type === 'filterable') {
    // Ajouter un fill layer simple
    map.addLayer({
      id: layerId,
      type: 'fill',
      source: layerId,
      'source-layer': config.sourceLayer,
      paint: config.paint
    });
    
    // Pour SELECTABLE, on gère l'interactivité
    if (config.type === 'selectable' && config.interactions?.selectable) {
      map.on('click', layerId, e => handleFeatureClick(e, layerId));
      if (config.interactions.cursor) {
        map.on('mouseenter', layerId, () => {
          map.getCanvas().style.cursor = config.interactions.cursor;
        });
        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = '';
        });
      }
    }

  } else if (config.type === 'choropleth') {
  const layerIdFull = layerId + '-choropleth';
  if (!map.getLayer(layerIdFull)) {
    // Voici la partie critique : construire l'expression step
    const colorExpr = [
      "step",
      ["get", config.property],
      // 3ᵉ élément du tableau => la couleur “par défaut”
      config.colors[0]  
    ];
    // Ensuite, pour chaque break, on ajoute (break, couleur)
    config.breaks.forEach((brk, i) => {
      colorExpr.push(brk);
      // la couleur associée est colors[i+1]
      colorExpr.push(config.colors[i + 1]);
    });

    // Au final, colorExpr ressemble à :
    // ["step", ["get","nv_moyen"], "#fee5d9", 15000, "#fcae91", 20000, "#fb6a4a", ... , 35000, "#67000d"]

      map.addLayer({
        id: layerIdFull,
        type: 'fill',
        source: layerId,
        'source-layer': config.sourceLayer,
        paint: {
          'fill-color': colorExpr,
          'fill-opacity': config.opacity ?? 0.7,
          'fill-outline-color': '#ffffff'
        }
      });
    }
  }

  // Ajouter labels si config.labels.enabled
  if (config.labels?.enabled) {
    const labelLayerId = layerId + '-labels';
    if (!map.getLayer(labelLayerId)) {
      map.addLayer({
        id: labelLayerId,
        type: 'symbol',
        source: layerId,
        'source-layer': config.sourceLayer,
        layout: {
          'text-field': ['get', config.labels.field],
          'text-size': config.labels.textSize || 12,
          'text-anchor': 'center'
        },
        paint: {
          'text-color': config.labels.color || '#000',
          'text-halo-color': config.labels.haloColor || '#fff',
          'text-halo-width': config.labels.haloWidth || 1
        }
      });
    }
  }
}

// -------------------------------------
// 5) handleFeatureClick : SELECTABLE
// -------------------------------------
function handleFeatureClick(e, layerId) {
  const config = layerConfigs[layerId];
  const feature = e.features[0];
  if (!feature) return;

  // 1) Récupérer l'ID principal
  let idVal = feature.properties[config.interactions.idField];

  // 2) Gérer les cas Paris, Lyon, Marseille
  //    si config.interactions.specialCases existe
  if (config.interactions.specialCases) {
    const sc = config.interactions.specialCases;  // ex. { ids: ['75056','69123','13055'], alternateField: 'INSEE_ARM' }

    // On check si 'idVal' figure dans sc.ids
    if (sc.ids.includes(idVal)) {
      // On remplace par la valeur du champ alternateField, ex. 'INSEE_ARM'
      const altValue = feature.properties[sc.alternateField];
      if (altValue) {
        idVal = altValue;
      }
    }
  }

  // 3) Toggle la sélection
  const idx = selectedFeatures.indexOf(idVal);
  if (idx > -1) {
    // Déjà sélectionné => on retire
    selectedFeatures.splice(idx, 1);
    map.setFeatureState(
      { source: layerId, sourceLayer: config.sourceLayer, id: feature.id },
      { selected: false }
    );
  } else {
    // Pas encore sélectionné => on ajoute
    selectedFeatures.push(idVal);
    map.setFeatureState(
      { source: layerId, sourceLayer: config.sourceLayer, id: feature.id },
      { selected: true }
    );
  }

  // 4) Envoyer la liste mise à jour à Bubble
  if (typeof bubble_fn_selectedFeatures === 'function') {
    bubble_fn_selectedFeatures({
      output1: config.interactions.bubbleFunction,
      outputlist1: selectedFeatures
    });
  }
}


// -------------------------------------
// 6) Filtrage pour "filterable" type
// -------------------------------------
function setFilterableIDs(layerId, listOfIDs) {
  const config = layerConfigs[layerId];
  if (map.getLayer(layerId)) {
    const filter = ["in", ["get", config.idField], ["literal", listOfIDs]];
        console.log("Filtre appliqué:", JSON.stringify(filter));
    map.setFilter(layerId, [
      "in",
      config.idField,
      ["literal", listOfIDs]
    ]);

     // Vérifier le filtre après application
        const currentFilter = map.getFilter(layerId);
        console.log("Filtre actuel:", JSON.stringify(currentFilter));

      const features = map.queryRenderedFeatures({ layers: [layerId] });
      console.log("Exemple de propriétés:", features[0]?.properties);
        }
}

// ----------------------------------------------------------------------------
// 7) Fonctions publiques pour Bubble
// ----------------------------------------------------------------------------

/**
 * Permet d'afficher la couche "layerId" 
 * (selectable, choropleth, filterable)
 * et de surcharger éventuellement la config 
 * (ex: property, breaks, colors pour choropleth).
 */
window.updateMapLayers = function(layerId, options = {}) {
  // 1) on cache toutes les couches
  hideAllLayers();

  // 2) on reset la sélection
  selectedFeatures = [];
  currentLayerId = layerId;

  // 3) on ajoute la couche (et ses labels, éventuellement)
  addLayer(layerId, options);

  // 4) on la rend visible
  const config = layerConfigs[layerId];
  if (config.type === 'choropleth') {
    const layerIdFull = layerId + '-choropleth';
    if (map.getLayer(layerIdFull)) {
      map.setLayoutProperty(layerIdFull, 'visibility', 'visible');
    }
    if (config.labels?.enabled && map.getLayer(layerId + '-labels')) {
      map.setLayoutProperty(layerId + '-labels', 'visibility', 'visible');
    }
  } else {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, 'visibility', 'visible');
    }
    if (config.labels?.enabled && map.getLayer(layerId + '-labels')) {
      map.setLayoutProperty(layerId + '-labels', 'visibility', 'visible');
    }
  }
};


// Ancienne version qui n'a jamais marché, je la garde pour l'instant
window.updateCarresResult = function(listOfIDs) {
  const layerId = 'carresResult';
  const config = layerConfigs[layerId];  // Ajouter cette ligne pour le console.log

    // Vérifier la source
    const source = map.getSource(layerId);
    console.log("Source:", source);
    
    // Vérifier les features
    const features = map.querySourceFeatures(layerId, {
        sourceLayer: config.sourceLayer
    });
    console.log("Features trouvées:", features);

  addLayer(layerId);  // s'assure que la couche est créée
  // Rendre visible la couche
  map.setLayoutProperty(layerId, 'visibility', 'visible');

  setFilterableIDs(layerId, listOfIDs);
  console.log("listOfIDs recu:", listOfIDs);
  console.log("Applying setFilter to carresResult with property=", config.idField, " / nb IDs =", listOfIDs.length);
  console.log("Layers:", map.getStyle().layers);
  map.moveLayer('carresResult')
};

// Deuxième test de fonction pour appeler la couche de carrés
window.filterCarreaux = function(selectedIds) {
    const LAYER_ID = 'carresResult';
    const config = layerConfigs[LAYER_ID];

  // On cache toutes les couches
  hideAllLayers();

    if (!config) {
        console.error("Configuration non trouvée pour la couche carresResult");
        return;
    }

    // Si la couche n'existe pas, on la crée
    if (!map.getLayer(LAYER_ID)) {
        map.addLayer({
            id: LAYER_ID,
            type: 'fill',
            source: LAYER_ID,
            'source-layer': config.sourceLayer,
            paint: config.paint,
            filter: ['in', ['get', config.idField], ['literal', selectedIds]]
        });
    } else {
        // Sinon on met juste à jour le filtre
        map.setFilter(LAYER_ID, ['in', ['get', config.idField], ['literal', selectedIds]]);
    }

    // Rendre la couche visible
    map.setLayoutProperty(LAYER_ID, 'visibility', 'visible');

    // Logs de debug
    console.log(`Filtrage appliqué sur ${selectedIds.length} carreaux avec le champ ${config.idField}`);
};

// ----------------------------------------------------------------------------
// 8) Au chargement de la page, on init la map
// ----------------------------------------------------------------------------
window.onload = () => {
  if (typeof mapboxgl === 'undefined') {
    console.error("Pas de mapbox !");
    return;
  }
  initializeMap();
};

