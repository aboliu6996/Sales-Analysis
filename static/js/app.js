// Initialize dropdown
let selector = d3.select("#selDataset");
console.log("View if data are fetched: ", selector);

let caseData1, caseData2; // Define variables to store fetched data
// Function to fetch and parse CSV data
function fetchAndParseCSV(url) {
    return fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Network response was not ok for ${url}`);
            }
            return response.text();
        })
        .then(csvData => csvJSON(csvData))
        .catch(error => {
            console.error('Error fetching or parsing CSV:', error);
        });
};

// Load CSV data
Promise.all([
    fetchAndParseCSV('../clean_data/school_clean_data.csv'),
    fetchAndParseCSV('../clean_data/school_group.csv')
]).then(([data1, data2]) => {
    caseData1 = data1;
    caseData2 = data2;

    // Extract 'state' column data from both CSV files
    const states1 = caseData1.map(row => row.state);
    const states2 = caseData2.map(row => row.state);

    // Find common states between both CSV files
    const commonStates = states1.filter(state => states2.includes(state));

    // Set the first common state as the firstState selector
    const firstState = commonStates[0]; // Change this logic as needed

    // Output common states and firstState
    console.log('Common states:', commonStates);
    console.log('First common state to use as selector:', firstState);

    // Populate dropdown select options with common states
    selector.selectAll("option")
        .data(commonStates)
        .enter()
        .append("option")
        .text(d => d)
        .attr("value", d => d);

    // Function call to build chart and panel with the first state
    buildCharts(firstState);
    buildMetadata(firstState);
});

// Function to update dashboard with new selected sample
function optionChanged(newSample) {
    buildMetadata(newSample);
    buildCharts(newSample);
};

// Function to build metadata
function buildMetadata(sample) {
    // Find the matching row for the selected state in each CSV file
    const cleanDataMatch = caseData1.find(row => row.state === sample);
    const groupDataMatch = caseData2.find(row => row.state === sample);

    // Assing panel with 'sample-metadata'
    const panel = d3.select("#sample-metadata");

    // Clear existing metadata
    panel.html("");

    // Append each key-value pair to the panel
    if (cleanDataMatch) {
        Object.entries(cleanDataMatch).forEach(([key, value]) => {
            panel.append("h6").text(`${key}: ${value}`);
        });
    };
};

// Function to build charts
function buildCharts(sample) {
    const groupDataMatch = caseData2.find(row => row.state === sample);

    if (groupDataMatch) {
        const years = [];
        const cases = [];

        // Extract year-mm and case number for the selected state from group data
        caseData2.forEach(row => {
            if (row.state === sample) {
                years.push(row['YYYY-MM']);
                cases.push(+row['TotalCasesStudents']); // Convert to number
            }
        });

   
        // Create trace for bar chart
        let barTrace = {
            x: years,
            y: cases,
            type: 'bar'
        };

        let barData = [barTrace];

        let barLayout = {
            title: `Total Cases for ${sample}`,
            xaxis: { title: 'Year-MM', tickangle: 45},
            yaxis: { title: 'Total Cases' }
        };

        Plotly.newPlot('bar', barData, barLayout); 

    } else {
        console.error('No group data found for the selected state');
    };
};
