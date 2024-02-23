// Define the tile layer
const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

// Create the Leaflet map
const myMap = L.map('map').setView([37.8, -96], 5); // Set initial view
tileLayer.addTo(myMap); // Add the tile layer to the map

// Load CSV data
fetch('../clean_data/clean_data.csv')
    .then(response => response.text())
    .then(csvData => {
        // Convert CSV data to JSON
        const enrollmentData = csvJSON(csvData);

        // Import the GeoJSON data from geoJsonData.js
        import('./geoJsonData.js')
            .then(module => {
                const geoJsonData = module.default;

                // Merge data with the GeoJSON data based on state names
                geoJsonData.features.forEach(stateFeature => {
                    const stateName = stateFeature.properties.name; 

                    // Find corresponding data from JSON file
                    const correspondingData = enrollmentData.find(data => data.state_name === stateName);

                    // Attach the additional data to the GeoJSON feature properties
                    if (correspondingData) {
                        stateFeature.properties.enrollment = correspondingData.enrollment;
                        stateFeature.properties.inperson = correspondingData.inperson;
                        stateFeature.properties.hybrid = correspondingData.hybrid;
                        stateFeature.properties.virtual = correspondingData.virtual;
                    }
                });
                console.log(geoJsonData);
                // Add the modified GeoJSON data to the map
                L.geoJSON(geoJsonData, {
                    style: function (feature) {
                        const stateName = feature.properties.name; // Get the state name from GeoJSON data
                        const correspondingData = enrollmentData.find(data => data.state_name === stateName);

                        if (correspondingData) {
                            const inpersonPercentage = parseFloat(correspondingData.inperson);
                            const hybridPercentage = parseFloat(correspondingData.hybrid);
                            const virtualPercentage = parseFloat(correspondingData.virtual);

                            // Calculate the total percentage for proper comparison
                            const totalPercentage = inpersonPercentage + hybridPercentage + virtualPercentage;

                            // Default style for states not in the school_clean_data
                            let fillColor = '#625f5c'; // Gray color for states not in the data

                            // Change fill color based on in-person attendance percentage
                            if (totalPercentage === 0 || isNaN(totalPercentage)) {
                                fillColor = '#625f5c'; // Gray color for states without any data
                            } else {
                                const inpersonPercent = inpersonPercentage;

                                if (inpersonPercent > 75) {
                                    fillColor = 'red'; // Red color for over 75%
                                } else if (inpersonPercent >= 50 && inpersonPercent <= 75) {
                                    fillColor = 'brown'; // Brown color for 50% to 75%
                                } else if (inpersonPercent >= 25 && inpersonPercent < 50) {
                                    fillColor = 'orange'; // Orange color for 25% to 50%
                                } else if (inpersonPercent < 25) {
                                    fillColor = 'green'; // Green color for 0% to 25%
                                }
                            };


                            return {
                                color: '#000', // Border color
                                weight: 1,
                                fillOpacity: 0.6,
                                fillColor: fillColor // Fill color
                            };
                        }
                    },    
                    onEachFeature: function (feature, layer) {
                        layer.on({
                            mouseover: function (e) {
                                layer.setStyle({
                                    weight: 5,
                                    color: 'white'
                                });

                                var state = e.target.feature.properties.name;
                                var enrollment = e.target.feature.properties.enrollment;
                                var inperson = e.target.feature.properties.inperson;
                                var hybrid = e.target.feature.properties.hybrid;
                                var virtual = e.target.feature.properties.virtual;

                                // Show information in a popup
                                layer.bindPopup(`
                                    <strong>State:</strong> ${state}<br>
                                    <strong>Total Enrollment:</strong> ${enrollment}<br>
                                    <strong>% Inperson:</strong> ${inperson}<br>
                                    <strong>% Hybrid:</strong> ${hybrid}<br>
                                    <strong>% Virtual:</strong> ${virtual}
                                `).openPopup();

                            },
                            mouseout: function (e) {
                                layer.setStyle({
                                    weight: 1,
                                    color: '#000'
                                });
                            },
                        });
                    }
                }).addTo(myMap); // Add the GeoJSON layer to the map

            })
            
            // Define the legend control and add it to the map
            const legend = L.control({ position: 'topright' });

            legend.onAdd = function (map) {
                const div = L.DomUtil.create('div', 'info legend');
                const labels = ['<strong>Percentage In-Person Attendance</strong>'];

                const grades = [0, 1, 25, 50, 75];
                const colors = ['gray', 'green', 'orange', 'brown', 'red']; // Corresponding colors

                // Loop through the percentage ranges and generate a label with a colored square for each
                for (let i = 0; i < grades.length; i++) {
                    const from = grades[i];
                    const to = grades[i + 1];

                    labels.push(
                        '<i style="background:' +
                        colors[i] +
                        '"></i> ' +
                        (i === 0 ? 'No data' : from + (to ? '% &ndash; ' + to + '%' : '% +'))
                    );
                }

                div.innerHTML = labels.join('<br>');
                return div;
            };

            legend.addTo(myMap); // Add legend to the map
        });    
