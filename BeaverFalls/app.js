//Beaver Falls
require([
    "esri/Map",
    "esri/views/MapView",
    "esri/layers/FeatureLayer",
    "esri/widgets/Legend",
    "esri/widgets/Expand"  // Add Expand widget for legend
], function(Map, MapView, FeatureLayer, Legend, Expand) {

    // Change basemap to a more neutral option
    const map = new Map({
        basemap: "gray-vector" // Less yellow, more neutral
    });

    const view = new MapView({
      container: "viewDiv",
      map: map,
      center: [-80.166320, 40.551708], 
      zoom: 10
    });

    let selectedOrigins = new Set(); // Store multiple origin IDs
    let tripData = {}; // Modified to store trips for multiple origins
    let clickCount = {}; // Track clicks per block group

    // Create tooltip div right away
    const tooltip = document.createElement("div");
    tooltip.id = "tripTooltip";
    tooltip.style.display = "none";
    tooltip.style.position = "fixed";
    tooltip.style.backgroundColor = "white";
    tooltip.style.padding = "5px";
    tooltip.style.border = "1px solid black";
    tooltip.style.borderRadius = "3px";
    tooltip.style.zIndex = "1000";
    tooltip.style.pointerEvents = "none";
    tooltip.style.fontFamily = "Arial, sans-serif";
    tooltip.style.fontSize = "12px";
    tooltip.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
    document.body.appendChild(tooltip);
  
    // Add the Combined BG layer (ID matches BG_ID values)
    const combinedBG = new FeatureLayer({
      url: "https://services3.arcgis.com/MV5wh5WkCMqlwISp/arcgis/rest/services/Origin_Block_Groups/FeatureServer/1",
      id: "Combined_BG",
      outFields: ["*"],  // This will fetch all fields
      visible: true,
      opacity: 0.7,
      renderer: {
          type: "simple",
          symbol: {
              type: "simple-fill",
              color: [67, 170, 139, 0.5],  // Semi-transparent green
              outline: {
                  color: [26, 122, 94],
                  width: 1
              }
          }
      },
    });

    // Define the class breaks renderer
    const tripsRenderer = {
        type: "class-breaks",
        field: "Trips",
        defaultSymbol: {
            type: "simple-fill",
            color: [225, 225, 225, 0.5],  // Light gray for no data
            outline: { color: [128, 128, 128], width: 0.5 }
        },
        defaultLabel: "No trips",
        classBreakInfos: [
            {
                minValue: 1,
                maxValue: 5,
                symbol: {
                    type: "simple-fill",
                    color: [255, 241, 169, 0.7],  // Light yellow
                    outline: { color: [128, 128, 128], width: 0.5 }
                },
                label: "1-5 trips"
            },
            {
                minValue: 6,
                maxValue: 15,
                symbol: {
                    type: "simple-fill",
                    color: [254, 204, 92, 0.7],  // Yellow
                    outline: { color: [128, 128, 128], width: 0.5 }
                },
                label: "6-15 trips"
            },
            {
                minValue: 16,
                maxValue: 25,
                symbol: {
                    type: "simple-fill",
                    color: [253, 141, 60, 0.7],  // Orange
                    outline: { color: [128, 128, 128], width: 0.5 }
                },
                label: "16-25 trips"
            },
            {
                minValue: 26,
                maxValue: 50,
                symbol: {
                    type: "simple-fill",
                    color: [240, 59, 32, 0.7],  // Red-orange
                    outline: { color: [128, 128, 128], width: 0.5 }
                },
                label: "26-50 trips"
            },
            {
                minValue: 51,
                maxValue: 99999,
                symbol: {
                    type: "simple-fill",
                    color: [189, 0, 38, 0.7],  // Dark red
                    outline: { color: [128, 128, 128], width: 0.5 }
                },
                label: ">50 trips"
            }
        ]
    };

    const odTable = new FeatureLayer({
      url: "https://services3.arcgis.com/MV5wh5WkCMqlwISp/arcgis/rest/services/Origin_Block_Groups/FeatureServer/2",
      id: "OD_Table",
      outFields: ["*"],  // This will fetch all fields
      visible: true,
      opacity: 0.7,
      renderer: tripsRenderer
    });

    const destBG = new FeatureLayer({
      url: combinedBG.url,
      id: "Dest_BG",
      outFields: ["Block_Group","Trips"],
      renderer: tripsRenderer,
      definitionExpression: "1=0",
      opacity: 0.7
    });

    // Add new origin block groups layer
    const originBG = new FeatureLayer({
        url: "https://services3.arcgis.com/MV5wh5WkCMqlwISp/arcgis/rest/services/Origin_Block_Groups/FeatureServer/0",
        id: "Origin_BG",
        outFields: ["*"],
        visible: true,
        opacity: 0.7,
        renderer: {
            type: "simple",
            symbol: {
                type: "simple-fill",
                color: [106, 81, 163, 0.5],  // Semi-transparent purple
                outline: {
                    color: [76, 51, 133],
                    width: 1
                }
            }
        }
    });
    
    map.addMany([combinedBG, odTable, destBG, originBG]);

    // Add the legend widget
    const legend = new Legend({
        view: view,
        style: "classic",
        layerInfos: [
            {
                layer: destBG,
                title: "Number of Trips"
            },
            {
                layer: originBG,
                title: "Origin Block Groups"
            },
            {
                layer: combinedBG,
                title: "Block Groups"
            }
        ]
    });

    // Create an Expand widget for the legend
    const legendExpand = new Expand({
        view: view,
        content: legend,
        expanded: true,  // Changed to true to show legend by default
        expandIconClass: "esri-icon-legend",
        mode: "floating",
    });

    view.ui.add(legendExpand, "bottom-left");
  
    view.on("click", function(event) {
        view.hitTest(event).then(function(response) {
            const result = response.results.find(r =>
                r.graphic.layer.id === "Combined_BG"
            );
            if (!result) {
                document.getElementById("sidePanel").style.display = "none";
                return;
            }

            const clickedBGId = result.graphic.attributes.Block_Group;
            const clickedMunicipality = result.graphic.attributes.Municipality;
            
            // Track clicks for this block group
            clickCount[clickedBGId] = (clickCount[clickedBGId] || 0) + 1;
            
            // Remove if clicked twice
            if (clickCount[clickedBGId] > 1) {
                selectedOrigins.delete(clickedBGId);
                delete clickCount[clickedBGId];
                delete tripData[clickedBGId];
                
                // Refresh the display
                updateDisplay();
                return;
            }

            // Add new origin
            selectedOrigins.add(clickedBGId);
            
            // Update side panel content
            const sidePanel = document.getElementById("sidePanel");
            let sidePanelContent = `
                <div style="text-align: right;">
                    <button onclick="this.parentElement.parentElement.style.display='none'" 
                            style="border: none; background: none; cursor: pointer;">✕</button>
                </div>
                <h3>Selected Block Groups</h3>
            `;

            // Add information for all selected block groups
            selectedOrigins.forEach(bgId => {
                // Query to get Municipality for this block group
                const bgLayer = map.findLayerById("Combined_BG");
                bgLayer.queryFeatures({
                    where: `Block_Group = '${bgId}'`,
                    outFields: ["Block_Group", "Municipality"],
                    returnGeometry: false
                }).then(function(results) {
                    const municipality = results.features[0]?.attributes.Municipality || "Unknown";
                    
                    sidePanelContent += `
                        <div style="margin-bottom: 10px;">
                            <p><strong>Block Group:</strong> ${bgId}</p>
                            <p><strong>Municipality:</strong> ${municipality}</p>
                    `;
                    
                    if (tripData[bgId]) {
                        const totalTrips = Object.values(tripData[bgId]).reduce((sum, trips) => sum + trips, 0);
                        sidePanelContent += `
                            <p><strong>Total Outbound Trips:</strong> ${totalTrips}</p>
                            <hr>
                        `;
                    }
                    
                    sidePanelContent += `</div>`;
                    
                    sidePanel.innerHTML = sidePanelContent;
                });
            });

            sidePanel.innerHTML = sidePanelContent;
            sidePanel.style.display = "block";

            // Query the OD table for trips from this origin
            const odTable = map.findLayerById("OD_Table");
            const query = {
                where: `Origin_Block_Group = '${clickedBGId}'`,
                outFields: ["Destination_Block_Group", "Trips"],
                returnGeometry: false
            };



            odTable.queryFeatures(query).then(function(results) {
                if (!results.features.length) {
                    console.log("No destinations found for origin:", clickedBGId);
                    return;
                }

                // Store trips for this origin
                tripData[clickedBGId] = {};
                results.features.forEach(f => {
                    const destId = f.attributes.Destination_Block_Group;
                    tripData[clickedBGId][destId] = f.attributes.Trips;
                });

                updateDisplay();
            });
        });
    });

    // Add this new function to handle display updates
    function updateDisplay() {
        view.graphics.removeAll();

        // Skip if no origins selected
        if (selectedOrigins.size === 0) return;

        // Query and highlight selected origins
        const originLayer = map.findLayerById("Combined_BG");
        const originIds = Array.from(selectedOrigins).map(id => `'${id}'`).join(",");
        const originQuery = originLayer.createQuery();
        originQuery.where = `Block_Group IN (${originIds})`;
        originQuery.outFields = ["Block_Group","Municipality"];

        originLayer.queryFeatures(originQuery).then(function(originResults) {
            // Add highlight graphics for origins
            originResults.features.forEach(function(f) {
                const originGraphic = {
                    geometry: f.geometry,
                    symbol: {
                        type: "simple-fill",
                        color: [255, 0, 0, 0.3],  // Semi-transparent red
                        outline: { 
                            color: [255, 0, 0], 
                            width: 2 
                        }
                    }
                };
                view.graphics.add(originGraphic);
            });

            // Calculate combined trips for all destinations
            let combinedTrips = {};
            Object.values(tripData).forEach(originData => {
                Object.entries(originData).forEach(([destId, trips]) => {
                    combinedTrips[destId] = (combinedTrips[destId] || 0) + trips;
                });
            });

            // Query and highlight destinations
            const bgLayer = map.findLayerById("Combined_BG");
            const destIds = Object.keys(combinedTrips).map(id => `'${id}'`).join(",");
            const bgQuery = bgLayer.createQuery();
            bgQuery.where = `Block_Group IN (${destIds})`;
            bgQuery.outFields = ["Block_Group"];

            bgLayer.queryFeatures(bgQuery).then(function(bgResults) {
                bgResults.features.forEach(function(f) {
                    const tripCount = combinedTrips[f.attributes.Block_Group] || 0;
                    
                    // Use existing color logic
                    let color;
                    if (tripCount == 0) color = [255, 255, 255, 0.7];
                    else if (tripCount <= 5) color = [255, 241, 169, 0.7];
                    else if (tripCount <= 15) color = [254, 204, 92, 0.7];
                    else if (tripCount <= 25) color = [253, 141, 60, 0.7];
                    else if (tripCount <= 50) color = [240, 59, 32, 0.7];
                    else color = [189, 0, 38, 0.7];

                    const destGraphic = {
                        geometry: f.geometry,
                        symbol: {
                            type: "simple-fill",
                            color: color,
                            outline: { color: [0, 0, 255], width: 1 }
                        }
                    };
                    view.graphics.add(destGraphic);
                });
            });
        });

        // Update side panel
        const sidePanel = document.getElementById("sidePanel");
        if (selectedOrigins.size === 0) {
            sidePanel.style.display = "none";
        } else {
            let sidePanelContent = `
                <div style="text-align: right;">
                    <button onclick="this.parentElement.parentElement.style.display='none'" 
                            style="border: none; background: none; cursor: pointer;">✕</button>
                </div>
                <h3>Selected Block Groups</h3>
            `;

            const bgLayer = map.findLayerById("Combined_BG");
            const promises = Array.from(selectedOrigins).map(bgId => {
                return bgLayer.queryFeatures({
                    where: `Block_Group = '${bgId}'`,
                    outFields: ["Block_Group", "Municipality"],
                    returnGeometry: false
                });
            });

            Promise.all(promises).then(results => {
                results.forEach((result, index) => {
                    const bgId = Array.from(selectedOrigins)[index];
                    const municipality = result.features[0]?.attributes.Municipality || "Unknown";
                    
                    sidePanelContent += `
                        <div style="margin-bottom: 10px;">
                            <p><strong>Block Group:</strong> ${bgId}</p>
                            <p><strong>Municipality:</strong> ${municipality}</p>
                    `;
                    
                    if (tripData[bgId]) {
                        const totalTrips = Object.values(tripData[bgId]).reduce((sum, trips) => sum + trips, 0);
                        sidePanelContent += `
                            <p><strong>Total Outbound Trips:</strong> ${totalTrips}</p>
                            <hr>
                        `;
                    }
                    
                    sidePanelContent += `</div>`;
                });
                
                sidePanel.innerHTML = sidePanelContent;
                sidePanel.style.display = "block";
            });
        }
    }

    // Update the pointer-move handler
    view.on("pointer-move", function(event) {
        if (selectedOrigins.size === 0) {
            tooltip.style.display = "none";
            return;
        }

        view.hitTest(event).then(function(response) {
            const result = response.results.find(r =>
                r.graphic.layer.id === "Combined_BG"
            );
            
            if (result) {
                const hoveredBGId = result.graphic.attributes.Block_Group;
                
                // Check if the hovered block group is any origin block group
                const originLayer = map.findLayerById("Origin_BG");
                originLayer.queryFeatures({
                    where: `Block_Group = '${hoveredBGId}'`,
                    returnGeometry: false
                }).then(function(originResults) {
                    // If it's an origin block group, hide tooltip
                    if (originResults.features.length > 0) {
                        tooltip.style.display = "none";
                        return;
                    }
                    
                    // Calculate combined trips for this destination
                    let totalTrips = 0;
                    Object.values(tripData).forEach(originData => {
                        totalTrips += originData[hoveredBGId] || 0;
                    });
                    
                    // Show tooltip for all destination block groups
                    tooltip.style.left = event.x + 10 + "px";
                    tooltip.style.top = event.y + 10 + "px";
                    tooltip.style.display = "block";
                    tooltip.innerHTML = `Total Trips: ${totalTrips}`;
                });
            } else {
                tooltip.style.display = "none";
            }
        });
    });

    // Hide tooltip when moving the map
    view.on("drag", function() {
        const tooltip = document.getElementById("tripTooltip");
        if (tooltip) tooltip.style.display = "none";
    });

    // Add CSS to the head of the document
    const style = document.createElement("style");
    style.textContent = `
        #tripTooltip {
            display: none;
            pointer-events: none;
            font-family: Arial, sans-serif;
            font-size: 12px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
    `;
    document.head.appendChild(style);
});
