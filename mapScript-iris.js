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
// Dans layerConfigs
  iris: {
      source: {
        type: 'vector',
        url: 'mapbox://hadrienleger.ak5sb828'
      },
      sourceLayer: 'iris-ign-petite-etendue-wgs84-7y17me',
      basePaint: {
        'fill-color': [
          'case',
          ['boolean', ['feature-state', 'clicked'], false],
          '#FF0000',
          '#8338ec'
        ],
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
      },
      minzoom: 8,
      maxzoom: 22
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

// Fonction utilitaire pour vérifier de manière sûre si la carte est chargée
// Fonction utilitaire pour vérifier si la carte est prête à être utilisée
function isMapReady(mapInstance) {
  if (!mapInstance) return false;
  
  // Vérifier si les méthodes essentielles existent
  const methods = ['getSource', 'addSource', 'getLayer', 'addLayer', 'setLayoutProperty'];
  const allMethodsExist = methods.every(method => typeof mapInstance[method] === 'function');
  
  if (!allMethodsExist) {
    console.warn("Certaines méthodes attendues n'existent pas sur l'instance de carte");
    return false;
  }
  
  // Vérifier si la carte est chargée
  if (typeof mapInstance.loaded === 'function') {
    return mapInstance.loaded();
  } else if (mapInstance._loaded !== undefined) {
    return mapInstance._loaded === true;
  } else {
    // Si on ne peut pas déterminer si la carte est chargée
    console.warn("Impossible de déterminer si la carte est chargée, on suppose qu'elle ne l'est pas");
    return false;
  }
}

window.onload = () => {
  console.log("Window loaded, checking Mapbox GL JS...");
  if (typeof mapboxgl === 'undefined') {
    console.error("Mapbox GL JS n’est pas chargé.");
    return;
  }
  console.log("Mapbox GL JS est chargé, initialisation de la carte...");
  initializeMap();
};

function initializeMap() {
  console.log("Tentative d'initialisation de la carte...");
  
  // Si une carte existe déjà
  if (window.map) {
    console.log("Instance de carte existante trouvée");
    map = window.map;
    
    // Vérifier si la carte est prête
    if (isMapReady(map)) {
      console.log("Carte existante prête, configuration...");
      configureMap(map);
    } else {
      console.log("Carte existante pas encore prête, attente de l'événement load");
      map.once('load', function() {
        console.log("Événement load déclenché pour la carte existante");
        configureMap(map);
      });
    }
    return;
  }
  
  // Création d'une nouvelle carte
  console.log("Création d'une nouvelle instance de carte");
  try {
    mapboxgl.accessToken = 'pk.eyJ1IjoiaGFkcmllbmxlZ2VyIiwiYSI6ImNsYm1oc3RidzA1NDczdm1xYTJmc3cwcm4ifQ.AguFBTkyTxFnz3VWFBSjrA';
    map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [2.361, 48.852],
      zoom: 10
    });
    
    // Conserver la référence globale
    window.map = map;
    
    console.log("Nouvelle carte créée, attente de l'événement load");
    map.once('load', function() {
      console.log("Événement load déclenché pour la nouvelle carte");
      configureMap(map);
    });
  } catch (error) {
    console.error("Erreur lors de la création de la carte:", error);
  }
}

// Fonction pour configurer la carte une fois chargée
function configureMap(mapInstance) {
  try {
    console.log("Configuration de la carte...");
    
    // Ajouter les sources
    Object.keys(layerConfigs).forEach(layerId => {
      try {
        if (!mapInstance.getSource(layerId)) {
          mapInstance.addSource(layerId, layerConfigs[layerId].source);
          console.log(`Source ${layerId} ajoutée`);
        } else {
          console.log(`Source ${layerId} existe déjà`);
        }
      } catch (error) {
        console.error(`Erreur lors de l'ajout de la source ${layerId}:`, error);
      }
    });
    
    // Ajouter la barre de recherche
    try {
      if (typeof mapboxsearch !== 'undefined' && mapboxsearch.MapboxSearchBox) {
        const searchBox = new mapboxsearch.MapboxSearchBox();
        
        // Configuration de la barre de recherche
        searchBox.accessToken = mapboxgl.accessToken;
        searchBox.options = {
          types: 'address,poi',
          language: 'fr',
          proximity: mapInstance.getCenter(),
          placeholder: 'Recherchez une adresse ou un lieu'
        };
        searchBox.mapboxgl = mapboxgl;
        searchBox.marker = true;

        // Lier la barre de recherche à la carte
        searchBox.bindMap(mapInstance);

        // Ajouter la barre de recherche au DOM
        const searchContainer = document.createElement('div');
        searchContainer.id = 'search-box-container';
        searchContainer.style.position = 'absolute';
        searchContainer.style.top = '10px';
        searchContainer.style.left = '50%';
        searchContainer.style.transform = 'translateX(-50%)';
        searchContainer.style.zIndex = '1';
        searchContainer.style.width = '300px';
        
        const mapElement = document.getElementById('map');
        if (mapElement && mapElement.parentNode) {
          mapElement.parentNode.appendChild(searchContainer);
          searchContainer.appendChild(searchBox);
          console.log("Barre de recherche ajoutée");
        } else {
          console.error("Élément parent de la carte introuvable");
        }
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout de la barre de recherche:", error);
    }
    
    console.log("Configuration de la carte terminée");
  } catch (error) {
    console.error("Erreur lors de la configuration de la carte:", error);
  }
}

// -------------------------------------
// 3) hideAllLayers() : masquer tout
// -------------------------------------
function hideAllLayers() {
  console.log("=== hideAllLayers called ===");
  
  if (!map || !isMapReady(map)) {
    console.error("La carte n'est pas prête pour masquer les couches");
    return;
  }
  
  Object.keys(layerConfigs).forEach(layerId => {
    try {
      const config = layerConfigs[layerId];
      
      if (config.type === 'choropleth') {
        if (map.getLayer(`${layerId}-choropleth`)) {
          map.setLayoutProperty(`${layerId}-choropleth`, 'visibility', 'none');
        }
        
        if (config.labels?.enabled && map.getLayer(`${layerId}-labels`)) {
          map.setLayoutProperty(`${layerId}-labels`, 'visibility', 'none');
        }
      } else {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', 'none');
        }
        
        if (config.labels?.enabled && map.getLayer(`${layerId}-labels`)) {
          map.setLayoutProperty(`${layerId}-labels`, 'visibility', 'none');
        }
      }
    } catch (error) {
      console.error(`Erreur lors de la tentative de masquer la couche ${layerId}:`, error);
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
    minzoom: config.minzoom,    // Ajouter cette ligne
    maxzoom: config.maxzoom,    // Ajouter cette ligne
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

// Modifions le handleLayerClick pour gérer les multi-polygones
function handleLayerClick(e, layerId) {
    const config = layerConfigs[layerId];
    if (!config) return;
    
    const feature = e.features[0];
    if (!feature) return;

    // Logs pour déboguer
    console.log("Clic sur feature:", {
        id: feature.id,
        type: feature.geometry.type,
        properties: feature.properties
    });

    const codeIris = feature.properties[config.idField];
    
    // Récupérer tous les features qui composent cet IRIS
    const allIrisFeatures = map.queryRenderedFeatures({ 
        layers: [layerId],
        filter: ['==', ['get', config.idField], codeIris]
    });
    
    console.log(`Nombre de parties pour cet IRIS: ${allIrisFeatures.length}`);

    // Désélectionner l'ancien si existe
    if (lastClickedFeatureId) {
        // Retirer tous les états précédents
        map.removeFeatureState({
            source: layerId,
            sourceLayer: config.sourceLayer
        });
    }

    // Sélectionner toutes les parties du nouvel IRIS
    allIrisFeatures.forEach(f => {
        map.setFeatureState(
            { 
                source: layerId, 
                sourceLayer: config.sourceLayer, 
                id: f.id 
            },
            { clicked: true }
        );
    });

    lastClickedFeatureId = feature.id;

    // Envoi à Bubble
    if (typeof bubble_fn_mapClicked === 'function') {
        bubble_fn_mapClicked({
            output1: layerId,
            output2: codeIris
        });
    }
}

  // -------------------------------------
  // 5 bis) clic sur les couches IRIS (fonction supprimée pour l'instant)
  // -------------------------------------



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
  console.log("filterIRIS appelé avec:", irisString);
  
  if (!map) {
    console.error("La carte n'est pas initialisée");
    return;
  }
  
  if (!isMapReady(map)) {
    console.log("La carte n'est pas prête, enregistrement d'un rappel");
    // Enregistrer la fonction pour être rappelée quand la carte est prête
    map.once('load', function() {
      console.log("Carte chargée, rappel de filterIRIS");
      window.filterIRIS(irisString);
    });
    return;
  }
  
  try {
    // Réinitialiser l'état des features
    if (lastClickedFeatureId) {
      map.removeFeatureState({
        source: 'iris',
        sourceLayer: layerConfigs.iris.sourceLayer
      });
      lastClickedFeatureId = null;
    }
    
    // 1. Convertir la chaîne en tableau
    let selectedIds;
    if (typeof irisString === 'string') {
      selectedIds = irisString.split(',').map(item => item.trim());
    } else {
      selectedIds = irisString;
    }
    
    console.log("Filtrage des IRIS avec IDs:", selectedIds);
    
    try {
      hideAllLayers();
    } catch (error) {
      console.error("Erreur lors du masquage des couches:", error);
    }
    
    // 2. Vérifier la source
    if (!map.getSource('iris')) {
      console.error("La source 'iris' n'existe pas");
      
      // Tentative d'ajout de la source
      try {
        map.addSource('iris', layerConfigs.iris.source);
        console.log("Source 'iris' ajoutée");
      } catch (error) {
        console.error("Impossible d'ajouter la source 'iris':", error);
        return;
      }
    }
    
    // 3. S'assurer que la couche est ajoutée
    if (!map.getLayer('iris')) {
      try {
        addLayer('iris');
        console.log("Couche 'iris' ajoutée");
      } catch (error) {
        console.error("Erreur lors de l'ajout de la couche 'iris':", error);
        return;
      }
    }
    
    // 4. Rendre les couches visibles
    try {
      map.setLayoutProperty('iris', 'visibility', 'visible');
      console.log("Couche 'iris' rendue visible");
      
      if (map.getLayer('iris-labels')) {
        map.setLayoutProperty('iris-labels', 'visibility', 'visible');
        console.log("Couche 'iris-labels' rendue visible");
      }
    } catch (error) {
      console.error("Erreur lors du changement de visibilité:", error);
    }
    
    // 5. Appliquer le filtre
    try {
      const filter = ['match', ['get', 'CODE_IRIS'], selectedIds, true, false];
      console.log("Application du filtre:", filter);
      
      map.setFilter('iris', filter);
      console.log("Filtre appliqué à la couche principale");
      
      if (map.getLayer('iris-labels')) {
        map.setFilter('iris-labels', filter);
        console.log("Filtre appliqué à la couche des labels");
      }
      
      // 6. Ajuster la vue
      try {
        const features = map.querySourceFeatures('iris', {
          sourceLayer: layerConfigs.iris.sourceLayer,
          filter: filter
        });
        console.log(`Nombre de features trouvées: ${features.length}`);
        
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
          
          console.log("Ajustement de la vue aux features");
          map.fitBounds(bounds, { padding: 50 });
        } else {
          console.log("Aucune feature trouvée, vue non ajustée");
        }
      } catch (error) {
        console.error("Erreur lors de l'ajustement de la vue:", error);
      }
    } catch (error) {
      console.error("Erreur lors de l'application du filtre:", error);
    }
  } catch (error) {
    console.error("Erreur générale dans filterIRIS:", error);
  }
};

