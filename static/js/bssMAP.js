// Define the tile layer
const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

// Create the Leaflet map
const myMap = L.map('map').setView([35, -95], 5); // Set initial view
tileLayer.addTo(myMap); // Add the tile layer to the map

let groupedData = {}; // Initialize an object to store grouped data

// Load CSV data
fetch('../clean_data/cleanBB.csv')
    .then(response => response.text())
    .then(csvData => {
        // Convert CSV data to JSON
        const data = csvJSON(csvData);

        // Iterate through the CSV data to group by state and product type
        data.forEach(row => {
            var state = row.state;
            var productType = row.ProductType;
            var nrc = parseFloat(row.NRC) || 0; // Assuming NRC is a numeric value
            var mrc = parseFloat(row.MRC) || 0; // Assuming MRC is a numeric value

            // Check if the state key exists in groupedData
            if (!(state in groupedData)) {
                groupedData[state] = {};
            }

            // Check if the productType key exists in the state's data
            if (!(productType in groupedData[state])) {
                groupedData[state][productType] = {
                    totalNRC: 0,
                    totalMRC: 0,
                    totalCountKey: `${productType}_Total_Count`,
                    totalMRCKey: `${productType}_Total_MRC`,
                    totalNRCKey: `${productType}_Total_NRC`,
                };
            }

            // Update the total NRC and MRC for the productType in the state
            groupedData[state][productType].totalNRC += nrc;
            groupedData[state][productType].totalMRC += mrc;
        });
        

        // Now groupedData object contains the total NRC and MRC for each product type in each state
        console.log(groupedData);

        // Extract unique 'ProductType' values from the CSV data
        var selected_product_types = [...new Set(data.map(data => data.ProductType))];

        // Import the GeoJSON data from geoJsonData.js
        import('./geoJsonData.js')
        .then(module => {
            var geoJsonData = module.default;

            // Iterate through the GeoJSON data to add properties
            geoJsonData.features.forEach(stateFeature => {
                var stateName = stateFeature.properties.name;

                // Find corresponding data from groupedData
                var correspondingData = groupedData[stateName];

                // Check if corresponding data exists
                if (correspondingData) {

                    let totalSum = 0; // Initialize total sum for each state

                    for (const productType of selected_product_types) {
                        var totalCountKey = `${productType}_Total_Count`;
                        var totalMRCKey = `${productType}_Total_MRC`;
                        var totalNRCKey = `${productType}_Total_NRC`;

                        // Count occurrences for Total_Count
                        let totalCount = correspondingData[productType] ? 1 : 0;

                        // Check if the keys exist in correspondingData
                        if (totalCountKey in correspondingData && totalMRCKey in correspondingData && totalNRCKey in correspondingData) {
                            // Assign the values to GeoJSON feature properties
                            stateFeature.properties[totalCountKey] = totalCount;
                            stateFeature.properties[totalMRCKey] =
                                correspondingData[productType][totalMRCKey];
                            stateFeature.properties[totalNRCKey] =
                                correspondingData[productType][totalNRCKey];
                            // Accumulate the total sum for each state
                            totalSum += totalCount;
                        } else {
                            // Handle the case where the keys do not exist in correspondingData
                            //console.warn(`Keys not found for ${productType} in ${stateName}`);
                        }
                    }

                    // Add total sum to the GeoJSON feature properties
                    stateFeature.properties['Total_Sum'] = totalSum;
                }
            });

            // Add the modified GeoJSON data to the map
            L.geoJSON(geoJsonData, {
                style: function (feature) {
                    // Check if the state has data in groupedData
                    var hasData = selected_product_types.some(productType => {
                        return groupedData[feature.properties.name] && groupedData[feature.properties.name][productType];
                    });

                    // Set color based on data availability
                    var fillColor = hasData ? 'red' : 'gray';

                    return {
                        color: '#000', // Border color
                        weight: 1,
                        fillOpacity: 0.6,
                        fillColor: fillColor // Fill color based on data availability
                    };
                },
                onEachFeature: function (feature, layer) {
                    layer.on({
                        mouseover: function (e) {
                            layer.setStyle({
                                weight: 5,
                                color: 'white'
                            });
                
                            var state = e.target.feature.properties.name;
                            let popupContent = `<strong>State:</strong> ${state}<br>`;
                
                            // Add counts for each product type and total sum to the popup
                            selected_product_types.forEach(productType => {
                                // Check if the productType exists in groupedData[state]
                                if (groupedData[state] && groupedData[state][productType]) {
                                    var totalCountKey = `${productType}_Total_Count`;
                                    var totalMRCKey = `${productType}_Total_MRC`;
                                    var totalNRCKey = `${productType}_Total_NRC`;

                                    // Use the correct property keys to access values
                                    popupContent += `<strong>${productType}:</strong> Count: ${groupedData[state][productType].totalNRC}, MRC: ${groupedData[state][productType].totalMRC}, NRC: ${groupedData[state][productType].totalNRC}<br>`;
                                } else {
                                    console.warn(`Product type ${productType} not found in ${state}`);
                                }
                            });
                            // Calculate total MRC and total NRC sums for all products in the state
                            var totalMRCSum = 0;
                            var totalNRCSum = 0;
                            selected_product_types.forEach(productType => {
                                if (groupedData[state] && groupedData[state][productType]) {
                                    totalMRCSum += groupedData[state][productType].totalMRC;
                                    totalNRCSum += groupedData[state][productType].totalNRC;
                                }
                            });
                            // Display total MRC and total NRC sums in the popup
                            popupContent += `<strong>Total MRC Sum:</strong> ${totalMRCSum}<br>`;
                            popupContent += `<strong>Total NRC Sum:</strong> ${totalNRCSum}<br>`;

                            // Show information in a popup
                            layer.bindPopup(popupContent).openPopup();
                        },
                        mouseout: function (e) {
                            layer.setStyle({
                                weight: 1,
                                color: '#000'
                            });
                        },
                    });
                }
            }).addTo(myMap);

            // Add Legend
            var legend = L.control({ position: 'topright' });

            legend.onAdd = function (map) {
                var div = L.DomUtil.create('div', 'info legend');
                var labels = ['No Data', 'Data'];
                var colors = ['gray', 'red'];

                // loop through our density intervals and generate a label with a colored square for each interval
                for (var i = 0; i < colors.length; i++) {
                    div.innerHTML +=
                        '<i style="background:' + colors[i] + '"></i> ' +
                        labels[i] + (i < colors.length - 1 ? '<br>' : '');
                }

                return div;
            }
            legend.addTo(myMap);
        });
    });