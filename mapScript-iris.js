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
let currentLayerId = null;

// ---------------------------
// 1) Configuration unifiée
// ---------------------------
const layerConfigs = {

  // Couche des quartiers IRIS
  iris: {
    source: {
      type: 'vector',
      url: 'mapbox://hadrienleger.79g5r5gt'
    },
    sourceLayer: 'iris-ign-simple-8us3r7',
    basePaint: {
      'fill-color': '#8338ec',
      'fill-opacity': 0.7,
      'fill-outline-color': '#FFFFFF'
    },
    idField: 'CODE_IRIS',
    clickable: true,
    useFeatureStateClicked: true,
    isChoropleth: false,
    labels: {
      enabled: true,
      field: 'NOM_IRIS',
      textSize: 12,
      color: '#FFF',
      haloColor: '#000',
      haloWidth: 1
    }
  },

  // Couche CHOROPLETH "niveauVie"
  niveauVie: {
    source: {
      type: 'vector',
      url: 'mapbox://hadrienleger.filosofi2019'
    },
    sourceLayer: 'c200_filosofi_2019',
    isChoropleth: true,
    // config par défaut si pas surchargé
    property: 'nv_moyen', 
    breaks: [15000, 20000, 25000, 30000, 35000],
    colors: ['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15', '#67000d'],
    // ex. label éventuelle sur la carte
    opacity: 0.5,
    clickable: false,
    labels: {
      enabled: false
    }
  },

  // Couche CHOROPLETH "logementSocial"
  logementSocial: {
    source: {
      type: 'vector',
      url: 'mapbox://hadrienleger.filosofi2019'
    },
    sourceLayer: 'c200_filosofi_2019',
    isChoropleth: true,
    property: 'part_log_soc',
    breaks: [5, 10, 15, 20, 25],
    colors: ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c', '#042f6b'],
    opacity: 0.5,
    clickable: false,
    labels: {
      enabled: false
    }
  },

    // Couche CHOROPLETH Notes sur 20 des communes (insécurité)
  notesInsecurite: {
    source: {
      type: 'vector',
      url: 'mapbox://hadrienleger.7ypxua5r'
    },
    sourceLayer: 'communes_securite-2449ue',
    isChoropleth: true,
    property: 'note_sur_20',
    breaks: [5, 10, 15, 20, 25],
    colors: ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c', '#042f6b'],
    opacity: 0.5,
    clickable: false,
    labels: {
      enabled: true,
      field: 'note_sur_20',
      textSize: 12,
      color: '#333',
      haloColor: 'rgba(255,255,255,0.8)',
      haloWidth: 2
    }
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
    zoom: 10
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
function addLayer(layerId) {
  const config = layerConfigs[layerId];
  if (!config) return;

  // (A) Source déjà ajoutée au load, on ne touche pas
  // On vérifie si le layer existe déjà
  if (map.getLayer(layerId)) {
    return; // déjà existant
  }

  // (B) Construire paint object
  let paintObj;
  if (config.isChoropleth) {
    // Construire l'expression step sur config.property, config.breaks, config.colors
    const colorExpr = [
      "step",
      ["get", config.property],
      config.colors[0]
    ];
    config.breaks.forEach((brk,i) => {
      colorExpr.push(brk);
      colorExpr.push(config.colors[i+1]);
    });

    paintObj = {
      'fill-color': colorExpr,
      'fill-opacity': config.opacity ?? 0.7,
      'fill-outline-color': '#ffffff'
    };
  } else {
    // fill simple
    if (config.basePaint) {
      paintObj = { ...config.basePaint };
    } else {
      // default
      paintObj = {
        'fill-color': '#2C3E50',
        'fill-opacity': 0.8,
        'fill-outline-color': '#FFF'
      };
    }
    if (config.useFeatureStateClicked) {
      // On veut colorer en rouge si clicked
      paintObj['fill-color'] = [
        'case',
        ['boolean',['feature-state','clicked'],false],
        '#FF0000',
        paintObj['fill-color']
      ];
    }
  }

  // (C) Ajouter le fill layer
  map.addLayer({
    id: layerId,
    type: 'fill',
    source: layerId,
    'source-layer': config.sourceLayer,
    paint: paintObj
  });

  // (D) Ajouter un layer symbol pour les labels si enabled
  if (config.labels?.enabled) {
    const labelLayerId = `${layerId}-labels`;
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

  // (E) Rendre le layer cliquable ?
  if (config.clickable) {
    map.on('click', layerId, e => handleLayerClick(e, layerId));
    map.on('mouseenter', layerId, () => map.getCanvas().style.cursor = 'pointer');
    map.on('mouseleave', layerId, () => map.getCanvas().style.cursor = '');
  }
}


// -------------------------------------
// 5) handleLayerClick
// -------------------------------------
  let lastClickedFeatureId = null;

  function handleLayerClick(e, layerId) {
    const config = layerConfigs[layerId];
    if (!config) return;
    const feature = e.features[0];
    if (!feature) return;

    // l'ID = codeVal
    const codeVal = config.idField ? feature.properties[config.idField] : null;

    // si on veut un unique polygone "clicked"
    if (lastClickedFeatureId) {
      map.setFeatureState(
        { source: layerId, sourceLayer: config.sourceLayer, id: lastClickedFeatureId },
        { clicked: false }
      );
    }
    map.setFeatureState(
      { source: layerId, sourceLayer: config.sourceLayer, id: feature.id },
      { clicked: true }
    );
    lastClickedFeatureId = feature.id;

    // envoyons à Bubble
    if (typeof bubble_fn_mapClicked === 'function') {
      bubble_fn_mapClicked({
        output1: layerId,
        output2: codeVal
      });
    }
  }


  // -------------------------------------
  // 5 bis) clic sur les couches IRIS
  // -------------------------------------

  function handleIrisClick(e, layerId) {
    const config = layerConfigs[layerId];
    if (!config) return;

    const feature = e.features[0];
    if (!feature) return;

    // Récupérer l'ID IRIS
    const irisCode = feature.properties[config.idField];

    // 1) Désélectionner l'ancien polygone, si lastClickedFeatureId existe
    if (lastClickedFeatureId) {
      map.setFeatureState(
        { source: layerId, sourceLayer: config.sourceLayer, id: lastClickedFeatureId },
        { clicked: false }
      );
    }

    // 2) Sélectionner le nouveau
    map.setFeatureState(
      { source: layerId, sourceLayer: config.sourceLayer, id: feature.id },
      { clicked: true }
    );
    lastClickedFeatureId = feature.id; // on mémorise

    console.log("IRIS cliqué, code =", irisCode);

    // 3) Envoyer l'info à Bubble : 
    //    par ex. on appelle bubble_fn_mapClicked si défini
    if (typeof bubble_fn_mapClicked === 'function') {
      bubble_fn_mapClicked({
        output1: 'iris',
        output2: irisCode
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

// Mettre à jour le layer
window.updateMapLayers = function(layerId) {

  addLayer(layerId);  
  // rendant visible
  if (map.getLayer(layerId)) {
    map.setLayoutProperty(layerId, 'visibility','visible');
  }
  const config = layerConfigs[layerId];
  if (config?.labels?.enabled && map.getLayer(layerId+'-labels')) {
    map.setLayoutProperty(layerId+'-labels','visibility','visible');
  }
};

// Fonction pour appeler la couche des IRIS
// Modifions la fonction filterIRIS pour s'assurer que la carte est chargée
window.filterIRIS = function(irisString) {
  if (!map || !map.loaded()) {
    console.error("La carte n'est pas encore chargée");
    return;
  }

  // 1. Convertir la chaîne en tableau
  let selectedIds;
  if (typeof irisString === 'string') {
    selectedIds = irisString.split(',').map(item => item.trim());
  } else {
    selectedIds = irisString;
  }
  
  console.log("Filtrage des IRIS avec IDs:", selectedIds);

  hideAllLayers();

  // 2. Vérifier et configurer les couches
  if (!map.getSource('iris')) {
    console.error("La source 'iris' n'existe pas");
    return;
  }

  // 3. S'assurer que les deux couches sont ajoutées
  if (!map.getLayer('iris')) {
    addLayer('iris');
  }

  // 4. Rendre les couches visibles
  map.setLayoutProperty('iris', 'visibility', 'visible');
  if (map.getLayer('iris-labels')) {
    map.setLayoutProperty('iris-labels', 'visibility', 'visible');
  }

  // 5. Appliquer le même filtre aux deux couches
  try {
    const filter = ['match', ['get', 'CODE_IRIS'], selectedIds, true, false];
    
    // Appliquer le filtre à la couche principale
    map.setFilter('iris', filter);
    
    // Appliquer le même filtre à la couche des labels
    if (map.getLayer('iris-labels')) {
      map.setFilter('iris-labels', filter);
    }

    // 6. Ajuster la vue
    const features = map.querySourceFeatures('iris', {
      sourceLayer: layerConfigs.iris.sourceLayer,
      filter: filter
    });

    if (features.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      features.forEach(feature => {
        if (feature.geometry) {
          if (feature.geometry.type === 'Polygon') {
            feature.geometry.coordinates[0].forEach(coord => bounds.extend(coord));
          } else if (feature.geometry.type === 'MultiPolygon') {
            feature.geometry.coordinates.forEach(polygon => {
              polygon[0].forEach(coord => bounds.extend(coord));
            });
          }
        }
      });
      map.fitBounds(bounds, { padding: 50 });
    }
  } catch (error) {
    console.error("Erreur lors de l'application du filtre:", error);
  }
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

