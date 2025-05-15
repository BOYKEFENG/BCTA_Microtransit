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
      center: [-80.166320, 40.551708], // Aliquippa coordinates
      zoom: 10
    });
  
    // 2. Add the Combined BG layer (ID matches BG_ID values)
    const combinedBG = new FeatureLayer({
      url: "https://services1.arcgis.com/HmwnYiJTBZ4UkySc/arcgis/rest/services/BeaverFalls_OD_Merge11/FeatureServer/1",
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
      url: "https://services1.arcgis.com/HmwnYiJTBZ4UkySc/arcgis/rest/services/BeaverFalls_OD_Merge11/FeatureServer/2",
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
        url: "https://services1.arcgis.com/HmwnYiJTBZ4UkySc/arcgis/rest/services/BeaverFalls_OD_Merge11/FeatureServer/0",
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

    // 4. Add the legend widget
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

    // Keep the existing Expand widget code
    const legendExpand = new Expand({
        view: view,
        content: legend,
        expanded: true,  // Changed to true to show legend by default
        expandIconClass: "esri-icon-legend",
        mode: "floating",
    });

    // Keep the existing view.ui.add
    view.ui.add(legendExpand, "bottom-left");
  
    // 4. Click handler to identify the BG and toggle related layer
    view.on("click", function(event) {
        view.hitTest(event).then(function(response) {
            const result = response.results.find(r =>
                r.graphic.layer.id === "Combined_BG"
            );
            if (!result) {
                document.getElementById("sidePanel").style.display = "none";
                return;
            }
                
        
            // Get clicked block group ID
            const clickedBGId = result.graphic.attributes.Block_Group;
            console.log("Clicked BG_ID:", clickedBGId);
        
            // Query the OD table for trips from this origin
            const odTable = map.findLayerById("OD_Table");
            const query = {
                where: `Origin_Block_Group = '${clickedBGId}'`,
                outFields: ["Destination_Block_Group", "Trips"],
                returnGeometry: false
            };
        
            // Highlight the clicked block group in red
            view.graphics.removeAll();
            result.graphic.symbol = {
                type: "simple-fill",
                color: [255, 0, 0, 0.3],
                outline: { color: [255, 0, 0], width: 2 }
            };
            view.graphics.add(result.graphic);

            const sidePanel = document.getElementById("sidePanel");
            sidePanel.innerHTML = `
                <div style="text-align: right;">
                    <button onclick="this.parentElement.parentElement.style.display='none'" 
                            style="border: none; background: none; cursor: pointer;">✕</button>
                </div>
                <h3>Block Group Information</h3>
                <p><strong>Selected Block Group:</strong> ${clickedBGId}</p>
            `;
            sidePanel.style.display = "block";            
        
            // Query to get all destinations and their trip counts
            odTable.queryFeatures(query).then(function(results) {
                if (!results.features.length) {
                    console.log("No destinations found for this origin");
                    return;
                }

                // Get destination IDs and their trip counts
                const destData = results.features.map(f => ({
                    id: f.attributes.Destination_Block_Group,
                    trips: f.attributes.Trips
                }));
                console.log("Destination data:", destData);

                // Query the block groups layer to highlight destinations
                const bgLayer = map.findLayerById("Combined_BG");
                const destIds = destData.map(d => `'${d.id}'`).join(",");
                const bgQuery = bgLayer.createQuery();
                bgQuery.where = `Block_Group IN (${destIds})`;
                bgQuery.outFields = ["Block_Group"];

                bgLayer.queryFeatures(bgQuery).then(function(bgResults) {
                    bgResults.features.forEach(function(f) {
                        // Find trip count for this destination
                        const tripCount = destData.find(d => 
                            d.id === f.attributes.Block_Group).trips;
                        
                        // Color based on number of trips
                        let color;
                        if (tripCount == 0) color = [255, 255, 255, 0.7];      // White
                        else if (tripCount <= 5) color = [255, 241, 169, 0.7];      // Light yellow
                        else if (tripCount <= 15) color = [254, 204, 92, 0.7];  // Yellow
                        else if (tripCount <= 25) color = [253, 141, 60, 0.7];  // Orange
                        else if (tripCount <= 50) color = [240, 59, 32, 0.7];   // Red-orange
                        else color = [189, 0, 38, 0.7];                         // Dark red

                        f.symbol = {
                            type: "simple-fill",
                            color: color,
                            outline: { color: [0, 0, 255], width: 1 }
                        };
                        view.graphics.add(f);
                    });
                });
            });
        });
    });

  });
