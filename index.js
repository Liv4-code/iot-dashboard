const dashboardData = {
    organizationID: "622a0a5d38a5c00c19e4dd03",
    deviceID: "622a0a5d38a5c00c19e4dd03",
    oneDay: 1000 * 60 * 60 * 24,
    twoDays: 1000 * 60 * 60 * 24 * 2,
    riserDeviceList: [],
    riserDates: [],
    deviceList: [],
};

// Referencing Outputs

// Building overview outputs
const organizationLogoOutput = document.querySelector("#companyLogoOutput");
const organizationNameOutput = document.querySelector("#companyNameOutput");
const organizationAddressOutput = document.querySelector(
    "#companyAddressOutput"
);
const buildingUnitsOutput = document.querySelector("#unitsOutput");
const meterTypeOutput = document.querySelector("#meterTypeOutput");
const buildingTypeOutput = document.querySelector("#buildingType");
const floorsOutput = document.querySelector("#floors");
const wmInstalled = document.querySelector("#wm-check");
const wmWaterConsumptionOutput = document.querySelector(
    "#wmWaterConsumptionOutput"
);
const wmWaterCostOutput = document.querySelector("#wmWaterCostOutput");
const wmLeakCostOutput = document.querySelector("#wmLeakCostOutput");
const loadingDot = document.querySelector("#loadingDot");
const chartLoadingDot = document.querySelector("#chart-loading-dot");
// Device tables
const riserDeviceTable = document.querySelector("#riser-device-table");
const riserDeviceTableOutput = document.querySelector(
    "#riser-device-table-output"
);
const pouDeviceTable = document.querySelector("#pou-device-table");
const selectPOUModeButton = document.querySelector("#select-pou-mode-btn");
const selectRiserModeButton = document.querySelector("#select-riser-mode-btn");
// Reference to comparison cards
const compCardsLoadingDot = document.querySelector("#compCardsLoadingDot");
const card1DropdownArrow = document.querySelector(".card1DropdownArrow");
const card1DropdownList = document.querySelector(".card1DropdownList");
const card1DeviceList = document.querySelector(".card1DeviceList");
const card2DropdownArrow = document.querySelector(".card2DropdownArrow");
const card2DropdownList = document.querySelector(".card2DropdownList");
const card2DeviceList = document.querySelector(".card2DeviceList");
const card3DropdownArrow = document.querySelector(".card3DropdownArrow");
const card3DropdownList = document.querySelector(".card3DropdownList");
const card3DeviceList = document.querySelector(".card3DeviceList");

// Get Organization Details
async function getOrganization(organizationKey) {
    try {
        const res = await fetch(
            `https://cs.api.ubidots.com/api/v2.0/organizations/${organizationKey}/`,
            {
                headers: {
                    "X-Auth-Token": "BBFF-Ikwfez2MES9Kc2Pzp7YsyaCRbjFr30",
                },
            }
        );

        const data = await res.json();
        organizationLogoOutput.src = data.logo.raw;
        organizationNameOutput.innerText = data.name;
    } catch (e) {
        console.log(e);
    }
}

getOrganization(dashboardData.organizationID);

var leakPercentageOptions = {
    colors: ["#E8D12A"],
    series: [],
    title: {
        text: "Property Leak Percentage",
        align: "center",
        offsetY: 17,
        style: {
            fontSize: "16px",
            fontWeight: "bold",
            fontFamily: undefined,
        },
    },
    chart: {
        height: 200,
        type: "radialBar",
    },
    plotOptions: {
        radialBar: {
            hollow: {
                size: "50%",
            },
        },
    },
    labels: ["Leak"],
};

var leakRadialChart = new ApexCharts(
    document.querySelector("#radial-bar-chart"),
    leakPercentageOptions
);
leakRadialChart.render();

// Device object set-up for table hierarchy
const devices = {
    id: [],
    labels: [],
    locations: [],
};

// Creating object classes for tabular hierarchy
class Units {
    constructor(key, value = key, parent, children) {
        this.key = key;
        this.value = value;
        this.parent = parent;
        this.children = children;
    }
}

class Location {
    constructor(
        id,
        key,
        value = key,
        parent = null,
        children,
        highUsage,
        leak,
        signal,
        battery,
        offline
    ) {
        this.id = id;
        this.key = key;
        this.value = value;
        this.parent = parent;
        this.children = children;
        this.highUsage = highUsage;
        this.leak = leak;
        this.signal = signal;
        this.battery = battery;
        this.offline = offline;
    }
}

// Request for Water Monkey device last value 30 days variable data

const getWMData = async (deviceLabel) => {
    try {
        const res = await fetch(
            `https://cs.api.ubidots.com/api/v2.0/devices/~${deviceLabel}/_/values/last`,
            {
                headers: {
                    "X-Auth-Token": "BBFF-Ikwfez2MES9Kc2Pzp7YsyaCRbjFr30",
                },
            }
        );
        const data = await res.json();
        wmWaterConsumptionOutput.innerHTML =
            (data.water_consumption_30_days.value / 1000).toFixed(2) + " m3";
        wmWaterCostOutput.innerHTML =
            "$ " + data.water_cost_30_days.value.toFixed(2);
        wmLeakCostOutput.innerHTML =
            "$ " + data.leak_cost_30_days.value.toFixed(2);
        leakRadialChart.updateOptions({
            series: [data.leak_volume_percentage.value.toFixed(0)],
        });
    } catch (e) {
        console.log(e);
    }
};

const getRiserDeviceVariables = async (variablesURL) => {
    try {
        const res = await fetch(variablesURL, {
            headers: {
                "X-Auth-Token": "BBFF-Ikwfez2MES9Kc2Pzp7YsyaCRbjFr30",
            },
        });

        const data = await res.json();
        return data;
    } catch (e) {
        console.log(e);
    }
};

const getOrganizationDevices = async (organizationKey) => {
    // Add loading dot
    loadingDot.classList.remove("d-none");
    try {
        const res = await fetch(
            `https://cs.api.ubidots.com/api/v2.0/devices/?organization__id=${organizationKey}&fields=label,properties,deviceType,id,variables`,
            {
                headers: {
                    "X-Auth-Token": "BBFF-Ikwfez2MES9Kc2Pzp7YsyaCRbjFr30",
                },
            }
        );

        const data = await res.json();

        // Check if any devices are assigned to the water monkey device type
        const waterMonkeyInstalled = data.results.reduce(
            (initialDevice, currentDevice) => {
                if (
                    (currentDevice.properties._device_type = "watermonkeyv2.0")
                ) {
                    return true;
                } else {
                    return false;
                }
            }
        );

        // Setting water monkey installed data
        if (waterMonkeyInstalled) {
            wmInstalled.classList.add("wm-installed");
            getWMData("351516172864902");
        }

        // Filter out generic device
        const genericDevice = data.results.filter((result) => {
            if (result.properties.total_units) {
                return result;
            }
        });

        // Set dashboard properties
        buildingUnitsOutput.innerText = genericDevice[0].properties.total_units;
        meterTypeOutput.innerText = genericDevice[0].properties.meter_type;
        buildingTypeOutput.innerText =
            genericDevice[0].properties.building_type;
        floorsOutput.innerText = genericDevice[0].properties.floors;
        organizationAddressOutput.innerText =
            "14 Overbury St Cnr, Swartkoppies Street, Johannesburg, 1448";

        // Filter out Riser devices from organizations devices
        const riserDevices = data.results.filter((result) => {
            if (result.properties.location === "Riser") {
                riserDeviceTable.classList.remove("d-none");
                return result;
            }
        });

        // Request for riser devices variable data
        const riserDeviceVariableDataPromises = [];
        riserDevices.forEach((device) => {
            riserDeviceVariableDataPromises.push(
                getRiserDeviceVariables(device.variables)
            );
        });

        const riserDevicesVariables = await Promise.all(
            riserDeviceVariableDataPromises
        );

        riserDevices.forEach((result, index) => {
            // Filtering out variables relevant to table
            const highUageIndicationBit = riserDevicesVariables[
                index
            ].results.filter((variable) => {
                if (variable.label === "high_usage_indication_bit") {
                    return variable;
                }
            });
            const leakStateBit = riserDevicesVariables[index].results.filter(
                (variable) => {
                    if (variable.label === "leak_state_bit") {
                        return variable;
                    }
                }
            );
            const signalIndicationBit = riserDevicesVariables[
                index
            ].results.filter((variable) => {
                if (variable.label === "signal_indication_bit") {
                    return variable;
                }
            });
            const batteryIndicationBit = riserDevicesVariables[
                index
            ].results.filter((variable) => {
                if (variable.label === "battery_indication_bit") {
                    return variable;
                }
            });
            const deviceOfflineBit = riserDevicesVariables[
                index
            ].results.filter((variable) => {
                if (variable.label === "device_offline_bit") {
                    return variable;
                }
            });

            // Compiling device instances from results
            devices.id.push(result.id);
            devices.labels.push(result.label);
            devices.locations.push(
                new Location(
                    result.id,
                    result.properties.location,
                    result.properties.location_no,
                    null,
                    new Units(
                        result.properties.unit,
                        result.properties.unit_no,
                        result.properties.location
                    ),
                    highUageIndicationBit[0].lastValue.value,
                    leakStateBit[0].lastValue.value,
                    signalIndicationBit[0].lastValue.value,
                    batteryIndicationBit[0].lastValue.value,
                    deviceOfflineBit[0].lastValue.value
                )
            );
        });

        devices.locations.sort((a, b) =>
            parseInt(a.value) > parseInt(b.value) ? 1 : -1
        );
        // Add loading dot
        loadingDot.classList.add("d-none");
        // Rendering HTML
        devices.locations.forEach((location, index) => {
            riserDeviceTableOutput.innerHTML += `
      <tr>
      <td>${location.key + " " + location.value}</td>
      <td><div class="riserDot highUsageAlert"></div></td>
      <td><div class="riserDot leakAlert"></div></td>
      <td><div class="riserDot signalAlert"></div></td>
      <td><div class="riserDot batteryAlert"></div></td>
      <td><div class="riserDot offlineAlert"></div></td>
    </tr>`;
        });

        const highUsageAlertOutputs =
            document.querySelectorAll(".highUsageAlert");
        const leakAlertOutputs = document.querySelectorAll(".leakAlert");
        const signalAlertOutputs = document.querySelectorAll(".signalAlert");
        const batteryAlertOutputs = document.querySelectorAll(".batteryAlert");
        const offlineAlertOutputs = document.querySelectorAll(".offlineAlert");

        devices.locations.forEach((location, index) => {
            if (location.highUsage === 1) {
                highUsageAlertOutputs[index].classList.add("yellow-alert");
            } else if (location.highUsage === 0) {
                highUsageAlertOutputs[index].classList.remove("yellow-alert");
            } else if (!location.highUsage) {
                highUsageAlertOutputs[index].classList.remove("yellow-alert");
            }
            if (location.leak === 1) {
                leakAlertOutputs[index].classList.add("yellow-alert");
            } else if (location.leak === 0) {
                // leakAlertOutputs[index].classList.add("greenAlert");
                leakAlertOutputs[index].classList.remove("yellow-alert");
            } else {
                leakAlertOutputs[index].classList.remove("yellow-alert");
            }
            if (location.signal === 1) {
                signalAlertOutputs[index].classList.add("yellow-alert");
                signalAlertOutputs[index].classList.remove("greenAlert");
            } else if (location.signal === 0) {
                signalAlertOutputs[index].classList.remove("yellow-alert");
            } else {
                signalAlertOutputs[index].classList.remove("yellow-alert");
            }
            if (location.battery === 1) {
                batteryAlertOutputs[index].classList.add("yellow-alert");
            } else if (location.battery === 0) {
                batteryAlertOutputs[index].classList.remove("yellow-alert");
            } else {
                batteryAlertOutputs[index].classList.remove("yellow-alert");
            }
            if (location.offline === 1) {
                offlineAlertOutputs[index].classList.add("yellow-alert");
            } else if (location.offline === 0) {
                offlineAlertOutputs[index].classList.remove("yellow-alert");
            } else {
                offlineAlertOutputs[index].classList.remove("yellow-alert");
            }
        });
    } catch (e) {
        console.log(e.message);
    }
};

getOrganizationDevices(dashboardData.organizationID);

// POU table

let tableData = [];
let deviceNames = [];
let deviceIDs = [];
let offlineVariableIDs = [];
let leakVariableIDs = [];
let battVariableIDs = [];
let variableIDs = [];
let onlineDevices = [];
let allDevicesFetched = false;

// Set up API requests

const getAllDevicesInOrganization = async (organizationKey, pageNo) => {
    try {
        const res = await fetch(
            `https://cs.api.ubidots.com/api/v2.0/devices/?fields=name,id,variables,properties&organization__id=${organizationKey}&variables__label=device_offline_bit&page_size=10&page=${pageNo}`,
            {
                headers: {
                    "X-Auth-Token": "BBFF-Ikwfez2MES9Kc2Pzp7YsyaCRbjFr30",
                },
            }
        );

        const data = await res.json();
        if (res.ok) {
            return data.results;
        } else {
            allDevicesFetched = true;
        }
    } catch (e) {
        console.log(e.message);
    }
};

const getDeviceVariables = async (variablesURL, variableLabel) => {
    try {
        const res = await fetch(
            variablesURL +
                `?label__contains=${variableLabel}&fields=label,lastValue,id`,
            {
                headers: {
                    "X-Auth-Token": "BBFF-Ikwfez2MES9Kc2Pzp7YsyaCRbjFr30",
                },
            }
        );

        const data = await res.json();
        return data.results[0];
    } catch (e) {
        console.log(e);
    }
};

const getRawData = async (variableIDs) => {
    const oneDay = 1000 * 60 * 60 * 24;
    try {
        const response = await fetch(
            `https://cs.api.ubidots.com/api/v1.6/data/raw/series`,
            {
                method: "POST",
                headers: {
                    "X-Auth-Token": "BBFF-rFViloWTXSJjM8h8DoQTDiAxgFUwca",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    variables: variableIDs,
                    columns: ["value.value", "timestamp"],
                    join_dataframes: false,
                    start: new Date().getTime() - oneDay,
                    end: new Date().getTime(),
                    limit: 3,
                }),
            }
        );
        const data = await response.json();
        return data;
    } catch (e) {
        console.log(e.message);
    }
};

const getAllDevices = async () => {
    const pouLoadingDot = document.querySelector("#pouLoadingDot");
    for (let i = 1; !allDevicesFetched; i++) {
        // Display loading dot
        pouLoadingDot.classList.remove("d-none");

        const organizationDevices = await getAllDevicesInOrganization(
            dashboardData.organizationID,
            i
        );

        console.log("pou devices", organizationDevices);
        let allDeviceOfflinePromises = [];
        let allLeakDetectedPromises = [];
        let allBattPercentPromises = [];

        if (organizationDevices) {
            organizationDevices
                .filter((device) => {
                    if (
                        device.properties.location === "Floor" ||
                        device.properties.location === "Level"
                    ) {
                        return device;
                    }
                })
                .map((device) => {
                    // Compiling an array of promises to fetch device variables
                    allDeviceOfflinePromises.push(
                        getDeviceVariables(
                            device.variables,
                            "device_offline_bit"
                        )
                    );
                    allLeakDetectedPromises.push(
                        getDeviceVariables(device.variables, "leak_state_bit")
                    );
                    allBattPercentPromises.push(
                        getDeviceVariables(
                            device.variables,
                            "battery_percentage"
                        )
                    );
                    // Setting aside device ID's for session storage
                    deviceNames.push(device.name);
                    deviceIDs.push(device.id);
                });

            console.log(deviceNames);
            const allDeviceOfflineData = await Promise.all(
                allDeviceOfflinePromises
            );
            const allLeakDetectedData = await Promise.all(
                allLeakDetectedPromises
            );
            const allBattPercentData = await Promise.all(
                allBattPercentPromises
            );

            // Consolidate all device data and variable id's
            allDeviceOfflineData.map((offlineData, index) => {
                if (
                    allDeviceOfflineData[index] &&
                    allLeakDetectedData[index] &&
                    allBattPercentData[index]
                ) {
                    offlineVariableIDs.push(offlineData.id);
                    leakVariableIDs.push(allLeakDetectedData[index].id),
                        battVariableIDs.push(allBattPercentData[index].id);
                } else if (
                    allDeviceOfflineData[index] &&
                    !allLeakDetectedData[index] &&
                    allBattPercentData[index]
                ) {
                    offlineVariableIDs.push(offlineData.id);
                    leakVariableIDs.push(allLeakDetectedData[index]),
                        battVariableIDs.push(allBattPercentData[index].id);
                } else if (
                    allDeviceOfflineData[index] &&
                    allLeakDetectedData[index] &&
                    !allBattPercentData[index]
                ) {
                    offlineVariableIDs.push(offlineData.id);
                    leakVariableIDs.push(allLeakDetectedData[index].id),
                        battVariableIDs.push(allBattPercentData[index]);
                } else if (
                    allDeviceOfflineData[index] &&
                    !allLeakDetectedData[index] &&
                    !allBattPercentData[index]
                ) {
                    offlineVariableIDs.push(offlineData.id);
                    leakVariableIDs.push(allLeakDetectedData[index]),
                        battVariableIDs.push(allBattPercentData[index]);
                }
            });

            // Filter out all online devices
            organizationDevices
                .filter((device) => {
                    if (
                        device.properties.location === "Floor" ||
                        device.properties.location === "Level"
                    ) {
                        return device;
                    }
                })
                .filter((device, index) => {
                    if (
                        allDeviceOfflineData[index].lastValue.value === 0 &&
                        allLeakDetectedData[index] &&
                        allBattPercentData[index]
                    ) {
                        return onlineDevices.push({
                            id: device.id,
                            name: device.name,
                            leak: allLeakDetectedData[index].lastValue.value,
                            leakDate:
                                allLeakDetectedData[index].lastValue.timestamp,
                            battPercent:
                                allBattPercentData[index].lastValue.value,
                        });
                    }
                });

            // Run sorting function for each batch of devices
            let sortedDevices = onlineDevices.sort(function (a, b) {
                if (a.leak === 1 && b.leak === 1) {
                    if (a.leakDate < b.leakDate) {
                        return -7;
                    } else if (a.leakDate > b.leakDate) {
                        return 7;
                    } else {
                        return 0;
                    }
                } else if (a.leak > b.leak) {
                    return -6;
                } else if (a.leak < b.leak) {
                    return 6;
                } else if (a.leak === 0 && b.leak === 0) {
                    if (a.battPercent < b.battPercent || !a.battPercent) {
                        return -1;
                    } else if (
                        a.battPercent > b.battPercent ||
                        !b.battPercent
                    ) {
                        return 1;
                    } else {
                        return 0;
                    }
                }
            });

            state.querySet = sortedDevices;

            // If the last page of data has been retrieved stop running loop & re-build table
            if (organizationDevices.length < 10) {
                allDevicesFetched = true;
                pouLoadingDot.classList.add("d-none");
            }

            // Update Table
            $("#table-body").empty();
            buildTable();
        }
    }

    // Storing all device names, device id's and variable id's
    sessionStorage.setItem("deviceNames", JSON.stringify(deviceNames));
    sessionStorage.setItem("deviceIDs", JSON.stringify(deviceIDs));
    sessionStorage.setItem(
        "offlineVariableIDs",
        JSON.stringify(offlineVariableIDs)
    );
    sessionStorage.setItem("leakVariableIDs", JSON.stringify(leakVariableIDs));
    sessionStorage.setItem("battVariableIDs", JSON.stringify(battVariableIDs));
    // }
};

getAllDevices();

// Loop through array & access each value then create table rows & append to table

let state = {
    querySet: tableData,
    page: 1,
    rows: 10,
    window: 5,
    currentPageDevices: [],
};

function pagination(querySet, page, rows) {
    let trimStart = (page - 1) * rows;
    let trimEnd = trimStart + rows;

    let trimmedData = querySet.slice(trimStart, trimEnd);
    state.currentPageDevices = trimmedData;

    let pages = Math.ceil(querySet.length / rows);

    return {
        querySet: trimmedData,
        pages: pages,
    };
}

function pageButtons(pages) {
    let wrapper = document.getElementById("pagination-wrapper");

    wrapper.innerHTML = ``;

    let maxLeft = state.page - Math.floor(state.window / 2);
    let maxRight = state.page + Math.floor(state.window / 2);

    if (maxLeft < 1) {
        maxLeft = 1;
        maxRight = state.window;
    }

    if (maxRight > pages) {
        maxLeft = pages - (state.window - 1);

        if (maxLeft < 1) {
            maxLeft = 1;
        }
        maxRight = pages;
    }

    for (let page = maxLeft; page <= maxRight; page++) {
        wrapper.innerHTML += `<button value=${page} class="page btn btn-sm btn-info">${page}</button>`;
    }

    if (state.page != 1) {
        wrapper.innerHTML =
            `<button value=${1} class="page btn btn-sm btn-info">&#171; First</button>` +
            wrapper.innerHTML;
    }

    if (state.page != pages) {
        wrapper.innerHTML += `<button value=${pages} class="page btn btn-sm btn-info">Last &#187;</button>`;
    }

    $(".page").on("click", function () {
        $("#table-body").empty();

        state.page = Number($(this).val());

        buildTable();
    });
}

function buildTable() {
    let table = $("#table-body");

    let data = pagination(state.querySet, state.page, state.rows);
    let myList = data.querySet;

    for (let i in myList) {
        let row = `<tr class="pouTableRow">
                  <td>${myList[i].name}</td>
                  <td><div class="wsTableDot leakDot"></div></td>
                  <td><div class="wsTableDot battDot"></div></td>
                  <td><div class="wsTableDot offlineDot"></div></td>`;
        table.append(row);
    }

    let firstPageRows = document.querySelectorAll(".pouTableRow");
    let leakAlertDots = document.querySelectorAll(".leakDot");
    let battAlertDots = document.querySelectorAll(".battDot");
    let offlineAlertDots = document.querySelectorAll(".offlineDot");

    // console.log(state.currentPageDevices)

    state.currentPageDevices.forEach((device, index) => {
        if (device.leak === 1 && device.battPercent <= 20) {
            leakAlertDots[index].classList.add("alert");
            battAlertDots[index].classList.add("alert");
        } else if (device.leak === 1) {
            leakAlertDots[index].classList.add("alert");
        } else if (device.battPercent <= 20 || !device.battPercent) {
            battAlertDots[index].classList.add("alert");
        }

        if (device.offline === 1) {
            offlineAlertDots[index].classList.add("alert");
        } else if (device.offline === 0) {
            offlineAlertDots[index].classList.remove("alert");
        }
    });

    pageButtons(data.pages);
}

// Select different ODEUS device mode tables:

selectPOUModeButton.addEventListener("click", () => {
    riserDeviceTable.classList.add("d-none");
    pouDeviceTable.classList.remove("d-none");
    selectPOUModeButton.classList.add("d-none");
    selectRiserModeButton.classList.remove("d-none");
});

selectRiserModeButton.addEventListener("click", () => {
    pouDeviceTable.classList.add("d-none");
    riserDeviceTable.classList.remove("d-none");
    selectRiserModeButton.classList.add("d-none");
    selectPOUModeButton.classList.remove("d-none");
});

// Reference to time picker buttons
const dayButton = document.querySelector("#dayButton");
const weekButton = document.querySelector("#weekButton");
const monthButton = document.querySelector("#monthButton");
const yearButton = document.querySelector("#yearButton");

let riserChartOptions = {
    dataLabels: {
        enabled: false,
    },
    colors: [
        "#b06f00",
        "#bf7b08",
        "#d18a13",
        "#eb9b13",
        "#E8A736",
        "#edc074",
        "#f5cf90",
    ],
    series: [],
    chart: {
        type: "bar",
        height: 420,
        stacked: true,
        toolbar: {
            show: false,
        },
    },
    responsive: [
        {
            breakpoint: 280,
        },
    ],
    plotOptions: {
        bar: {
            horizontal: false,
            borderRadius: 10,
            dataLabels: {
                enabled: false,
            },
        },
    },
    legend: {
        show: true,
        position: "top",
        offsetY: 0,
        labels: {
            colors: undefined,
            useSeriesColors: false,
        },
    },
    yaxis: {
        title: {
            text: "Volume Activity in Liters (Riser Mode)",
        },
    },
    tooltip: {
        y: {
            formatter: function (val) {
                return val + " Liters";
            },
        },
    },
};

var pouChartOptions = {
    colors: [
        function ({ value }) {
            if (value > 885) {
                return "#e8d12a";
            } else {
                return "#a6a6a6";
            }
        },
    ],
    series: [
        {
            name: "Activity Scale (Liters)",
            data: [],
        },
    ],
    chart: {
        type: "bar",
        height: 480,
        toolbar: {
            show: false,
        },
    },
    plotOptions: {
        bar: {
            borderRadius: 10,
            columnWidth: "35%",
            endingShape: "rounded",
        },
        dataLabels: {
            enabled: false,
            total: {
                enabled: true,
                style: {
                    fontSize: "13px",
                    fontWeight: 900,
                },
            },
        },
    },
    dataLabels: {
        enabled: false,
    },
    stroke: {
        show: true,
        width: 2,
        colors: ["transparent"],
    },
    xaxis: {
        floating: false,
        tickPlacement: "on",
        labels: {
            show: true,
            rotate: -45,
            rotateAlways: false,
            trim: false,
            minHeight: "100px",
            maxHeight: undefined,
            style: {
                fontSize: "10px",
                fontWeight: 400,
            },
        },
    },
    yaxis: {
        title: {
            text: "Difference In Activity (Unit Mode)",
        },
    },
    fill: {
        opacity: 1,
    },
    tooltip: {
        y: {
            formatter: function (val) {
                return val + " Liters";
            },
        },
    },
};

var riserChart = new ApexCharts(
    document.querySelector("#riser-chart"),
    riserChartOptions
);
riserChart.render();

let pouChart = new ApexCharts(
    document.querySelector("#pou-chart"),
    pouChartOptions
);
pouChart.render();

// Setting up API requests

// Getting All Devices In Organization
const getOdeusOrganizationDevices = async (organizationKey) => {
    try {
        const res = await fetch(
            `https://cs.api.ubidots.com/api/v2.0/organizations/${organizationKey}/devices/?fields=name,id,label&label__contains=odeus-dummy&page_size=10000`,
            {
                headers: {
                    "X-Auth-Token": "BBFF-Ikwfez2MES9Kc2Pzp7YsyaCRbjFr30",
                },
            }
        );

        const data = await res.json();
        return data.results;
    } catch (e) {
        console.log(e.message);
    }
};

// Get Variables ID's:
const getDeviceVariableData = async (deviceID, variableLabel) => {
    try {
        const res = await fetch(
            `https://cs.api.ubidots.com/api/v2.0/devices/${deviceID}/variables/~${variableLabel}/?fields=id&page_size=10000`,
            {
                headers: {
                    "X-Auth-Token": "BBFF-Ikwfez2MES9Kc2Pzp7YsyaCRbjFr30",
                },
            }
        );

        const data = await res.json();
        return data.id;
    } catch (e) {
        console.log(e.message);
    }
};

// Get riser variable data
const getRiserAggregatedData = async (
    variableIds,
    period,
    startTimestamp,
    endingTimestamp
) => {
    try {
        const response = await fetch(
            `https://cs.api.ubidots.com/api/v1.6/data/stats/resample/`,
            {
                method: "POST",
                headers: {
                    "X-Auth-Token": "BBFF-rFViloWTXSJjM8h8DoQTDiAxgFUwca",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    variables: variableIds,
                    aggregation: "sum",
                    period: period,
                    join_dataframes: false,
                    start: startTimestamp,
                    end: endingTimestamp,
                }),
            }
        );
        const data = await response.json();
        return data;
    } catch (e) {
        console.log(e.message);
    }
};

// Get POU variable data
const getPOUAggregatedData = async (variableIds, startTimestamp) => {
    try {
        const response = await fetch(
            `https://cs.api.ubidots.com/api/v1.6/data/stats/aggregation/`,
            {
                method: "POST",
                headers: {
                    "X-Auth-Token": "BBFF-rFViloWTXSJjM8h8DoQTDiAxgFUwca",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    variables: variableIds,
                    aggregation: "mean",
                    join_dataframes: false,
                    start: startTimestamp,
                    end: 1670491010000,
                }),
            }
        );
        const data = await response.json();
        return data;
    } catch (e) {
        console.log(e.message);
    }
};

const updateChart = async (timePicked, startingTimestamp, endingTimestamp) => {
    // Updating riser chart

    // Getting riser devices & variables id's from session storage
    const storedRiserDeviceNames = sessionStorage.getItem("riserDeviceNames");
    const storedRiserDevicesVariableIDs =
        sessionStorage.getItem("riserVariableIDs");

    // Converting string data to an array
    const riserDeviceNames = storedRiserDeviceNames.split(",");
    const riserDevicesVariableIDs = storedRiserDevicesVariableIDs.split(",");

    // Request for Riser Min Delta data
    const riserMinDeltaData = await getRiserAggregatedData(
        riserDevicesVariableIDs,
        timePicked,
        startingTimestamp,
        endingTimestamp
    );

    // Setting dates for x-axis
    let riserDates = [];
    riserMinDeltaData.results[0].reverse().forEach((result) => {
        // Check if time picked was for annual display
        if (timePicked === "1M") {
            // Converting timestamp to datetime format
            const dateFromTimestamp = new Date(result[0]);
            const dateTime = dateFromTimestamp.toLocaleString("en-US", {
                dateStyle: "medium",
            });
            riserDates.push(dateTime);
        } else {
            // Converting timestamp to datetime format
            const dateFromTimestamp = new Date(result[0]);
            const dateTime = dateFromTimestamp.toLocaleString("en-US");
            riserDates.push(dateTime);
        }
    });

    const riserChartSeriesData = riserMinDeltaData.results.map(
        (result, index) => {
            // Removing loading dot
            chartLoadingDot.classList.add("d-none");

            // Extracting data dot value
            const values = result.reverse().map((r) => {
                return r[1].toFixed(2);
            });

            // Setting to each device object to be displayed in chart
            return {
                name: riserDeviceNames[index],
                data: values,
            };
        }
    );

    // Re-render riser chart
    riserChart.updateOptions({
        series: riserChartSeriesData,
        xaxis: {
            type: "category",
            categories: riserDates,
            floating: false,
            tickPlacement: "on",
            labels: {
                show: true,
                rotate: -40,
            },
        },
    });

    // Updating POU chart

    // Getting pou devices & variables id's from session storage
    const storedPOUDeviceNames = sessionStorage.getItem("pouDeviceNames");
    const pouChartDevices = storedPOUDeviceNames.split(",");
    const storedPOUDevicesVariableIDs =
        sessionStorage.getItem("pouVariableIDs");
    const pouChartDevicesVariableIDs = storedPOUDevicesVariableIDs.split(",");

    // Request for POU Min delta data
    const pouMinDeltaData = await getPOUAggregatedData(
        pouChartDevicesVariableIDs,
        startingTimestamp
    );

    pouChartSeriesData = [];
    pouMinDeltaData.results.forEach((result) => {
        chartLoadingDot.classList.add("d-none");
        pouChartSeriesData.push(result.value.toFixed(2));
    });

    // Re-render POU chart
    pouChart.updateOptions({
        series: [
            {
                data: pouChartSeriesData,
            },
        ],
        xaxis: {
            categories: pouChartDevices,
        },
    });
};

const generateCharts = async () => {
    // Display loading dot
    chartLoadingDot.classList.remove("d-none");

    // Fetch session storage for variable id's & device names
    if (sessionStorage.getItem("riserVariableIDs")) {
        const oneWeek = dashboardData.oneDay * 6;
        let startDate = 1670491010000 - oneWeek;

        updateChart("1D", startDate, 1670491010000);
    }
    // Set session storage for variable id's & device names
    else if (!sessionStorage.getItem("riserVariableIDs")) {
        // Request for all organizations ODEUS devices
        const odeusDevices = await getOdeusOrganizationDevices(
            dashboardData.organizationID
        );

        // Get variable id request promises for odeus devices
        const riserDeviceNames = [];
        const riserVariableIDPromises = [];
        const riserTotalCostVariableIDPromises = [];
        const riserLeakCostVariableIDPromises = [];
        const pouDeviceNames = [];
        const pouVariableIDPromises = [];
        const pouTotalCostVariableIDPromises = [];
        const pouLeakCostVariableIDPromises = [];

        odeusDevices.forEach((device) => {
            // Filter out riser mode devices
            if (device.name.includes("Riser")) {
                riserDeviceNames.push(device.name);
                riserVariableIDPromises.push(
                    getDeviceVariableData(device.id, "dummy_min_delta_1h")
                );
                riserTotalCostVariableIDPromises.push(
                    getDeviceVariableData(device.id, "total_consumption_cost")
                );
                riserLeakCostVariableIDPromises.push(
                    getDeviceVariableData(device.id, "leak_cost")
                );
            } else if (device.name.includes("Floor")) {
                // Filter out POU mode devices
                pouDeviceNames.push(device.name);
                pouVariableIDPromises.push(
                    getDeviceVariableData(device.id, "dummy_min_delta_1h")
                );
                pouTotalCostVariableIDPromises.push(
                    getDeviceVariableData(device.id, "total_consumption_cost")
                );
                pouLeakCostVariableIDPromises.push(
                    getDeviceVariableData(device.id, "leak_cost")
                );
            }
        });

        // Request for riser variable id's
        const riserVariableIDs = await Promise.all(riserVariableIDPromises);
        const riserTotalCostVariableIDs = await Promise.all(
            riserTotalCostVariableIDPromises
        );
        const riserLeakCostVariableIDs = await Promise.all(
            riserLeakCostVariableIDPromises
        );
        // Request for POU variable id's
        const pouDevicesVariableIDs = await Promise.all(pouVariableIDPromises);
        const pouTotalCostDevicesVariableIDs = await Promise.all(
            pouTotalCostVariableIDPromises
        );
        const pouLeakCostDevicesVariableIDs = await Promise.all(
            pouLeakCostVariableIDPromises
        );

        // Store riser & POU devices & variable id's to session storage
        sessionStorage.setItem("riserDeviceNames", riserDeviceNames);
        sessionStorage.setItem("riserVariableIDs", riserVariableIDs);
        sessionStorage.setItem(
            "riserTotalCostVariableIDs",
            riserTotalCostVariableIDs
        );
        sessionStorage.setItem(
            "riserLeakCostVariableIDs",
            riserLeakCostVariableIDs
        );
        sessionStorage.setItem("pouDeviceNames", pouDeviceNames);
        sessionStorage.setItem("pouVariableIDs", pouDevicesVariableIDs);

        // Request for riser min delta data
        const oneWeek = dashboardData.oneDay * 6;
        let startDate = 1670491010000 - oneWeek;
        const riserMinDeltaData = await getRiserAggregatedData(
            riserVariableIDs,
            "1D",
            startDate,
            1670491010000
        );

        // Setting dates for riser chart x-axis
        riserMinDeltaData.results[0].reverse().forEach((result) => {
            // Converting timestamp to datetime format
            const dateFromTimestamp = new Date(result[0]);
            const dateTime = dateFromTimestamp.toLocaleDateString("en-US");
            dashboardData.riserDates.push(dateTime);
        });

        const riserChartSeriesData = riserMinDeltaData.results.map(
            (result, index) => {
                // Removing loading dot
                chartLoadingDot.classList.add("d-none");

                // Extracting data dot value
                const values = result.reverse().map((r) => {
                    return r[1].toFixed(2);
                });

                // Setting to each device object to be displayed in chart
                return {
                    name: riserDeviceNames[index],
                    data: values,
                };
            }
        );

        // Render riser chart
        riserChart.updateOptions({
            series: riserChartSeriesData,
            xaxis: {
                type: "category",
                categories: dashboardData.riserDates,
                floating: false,
                tickPlacement: "on",
                labels: {
                    show: true,
                    rotate: -40,
                    style: {
                        fontSize: "10px",
                        fontWeight: 400,
                    },
                },
            },
        });

        // Request for POU min delta data
        const pouMinDeltaData = await getPOUAggregatedData(
            pouDevicesVariableIDs,
            startDate
        );

        // Data for populating POU chart
        let pouChartSeriesData = [];
        pouMinDeltaData.results.forEach((result) => {
            chartLoadingDot.classList.add("d-none");
            pouChartSeriesData.push(result.value.toFixed(2));
        });

        // Render POU chart
        pouChart.updateOptions({
            series: [
                {
                    data: pouChartSeriesData,
                },
            ],
            xaxis: {
                categories: pouDeviceNames,
            },
        });
    }
};

generateCharts();

// Update charts according to timeframe selected
dayButton.addEventListener("click", () => {
    // Add loading dot
    chartLoadingDot.classList.remove("d-none");
    // Setting background color once selected
    dayButton.classList.add("selected");
    weekButton.classList.remove("selected");
    monthButton.classList.remove("selected");
    yearButton.classList.remove("selected");

    let startDate = 1670491010000 - dashboardData.twoDays;
    updateChart("1H", startDate, 1670491010000 - dashboardData.oneDay);
});

weekButton.addEventListener("click", () => {
    // Add loading dot
    chartLoadingDot.classList.remove("d-none");
    // Setting background color once selected
    dayButton.classList.remove("selected");
    weekButton.classList.add("selected");
    monthButton.classList.remove("selected");
    yearButton.classList.remove("selected");

    const oneWeek = dashboardData.oneDay * 6;
    let startDate = 1670491010000 - oneWeek;

    updateChart("1D", startDate, 1670491010000);
});

monthButton.addEventListener("click", () => {
    // Add loading dot
    chartLoadingDot.classList.remove("d-none");
    // Setting background color once selected
    dayButton.classList.remove("selected");
    weekButton.classList.remove("selected");
    monthButton.classList.add("selected");
    yearButton.classList.remove("selected");

    const oneMonth = dashboardData.oneDay * 30;
    let startDate = 1670491010000 - oneMonth;

    updateChart("1D", startDate, 1670491010000);
});

yearButton.addEventListener("click", () => {
    // Add loading dot
    chartLoadingDot.classList.remove("d-none");
    // Setting background color once selected
    dayButton.classList.remove("selected");
    weekButton.classList.remove("selected");
    monthButton.classList.remove("selected");
    yearButton.classList.add("selected");

    const oneYear = dashboardData.oneDay * 365;
    let startDate = 1670491010000 - oneYear;

    updateChart("1M", startDate, 1670491010000);
});

// Comparison cards

// Setting up API requests

const getWaterActivity = async (deviceLabel, variableLabel) => {
    // Display loading dot
    compCardsLoadingDot.classList.remove("d-none");

    try {
        const res = await fetch(
            `https://cs.api.ubidots.com/api/v1.6/devices/${deviceLabel}/${variableLabel}/lv`,
            {
                headers: {
                    "X-Auth-Token": "BBFF-PNvukg88555B1vTL2vhaZuxlfZVRN1",
                },
            }
        );
        const data = await res.json();
        // Remove loading dot
        compCardsLoadingDot.classList.add("d-none");

        return data.toFixed(2);
    } catch (e) {
        console.log(e);
    }
};

const getDeviceList = async (organizationID, dropdownList, deviceList) => {
    // Display loading dot
    compCardsLoadingDot.classList.remove("d-none");

    try {
        const res = await fetch(
            `https://cs.api.ubidots.com/api/v2.0/organizations/${organizationID}/devices/?fields=label,name,id&label__contains=odeus-dummy`,
            {
                headers: {
                    "X-Auth-Token": "BBFF-PNvukg88555B1vTL2vhaZuxlfZVRN1",
                },
            }
        );
        const data = await res.json();

        data.results.forEach((result) => {
            // Remove loading dot
            compCardsLoadingDot.classList.add("d-none");
            // Compile list of devices for HTML rendering
            if (result.name.includes("Riser")) {
                dashboardData.deviceList.push({
                    name: result.name,
                    label: result.label,
                });
                deviceList.innerHTML += `<li class="${result.label} card-device-list-item">${result.name}</li>`;
            }
        });
        dropdownList.style.display = "block";

        // Get device variable data when device list item is clicked
        const deviceListItems = document.querySelectorAll(
            ".card-device-list-item"
        );

        deviceListItems.forEach((item) => {
            item.addEventListener("click", (e) => {
                // Removing list once a device is clicked (chosen)
                e.target.parentNode.parentNode.style.display = "none";
                // Setting chosen device heading
                let chosenDevice =
                    e.target.parentNode.parentNode.parentNode.firstElementChild
                        .firstElementChild;
                chosenDevice.innerHTML = e.target.innerText;

                // Setting outputs with fetched data
                console.log(
                    e.target.parentNode.parentNode.parentNode.lastElementChild
                        .children[1].children[0].children[1]
                );
                let totalVolumeOutput =
                    e.target.parentNode.parentNode.parentNode.lastElementChild
                        .children[0].children[0].children[1];
                let totalCostOutput =
                    e.target.parentNode.parentNode.parentNode.lastElementChild
                        .children[0].children[1].children[1];
                let consumptionVolumeOutput =
                    e.target.parentNode.parentNode.parentNode.lastElementChild
                        .children[1].children[0].children[1];
                let consumptionCostOutput =
                    e.target.parentNode.parentNode.parentNode.lastElementChild
                        .children[1].children[1].children[1];
                let leakVolumeOutput =
                    e.target.parentNode.parentNode.parentNode.lastElementChild
                        .children[2].children[0].children[1];
                let leakCostOutput =
                    e.target.parentNode.parentNode.parentNode.lastElementChild
                        .children[2].children[1].children[1];
                getWaterActivity(
                    e.target.classList[0],
                    "riser_flow_volume"
                ).then((data) => {
                    totalVolumeOutput.innerHTML = data + " liters";
                });
                getWaterActivity(
                    e.target.classList[0],
                    "total_consumption_cost"
                ).then((data) => {
                    totalCostOutput.innerHTML = "$ " + data;
                });
                getWaterActivity(e.target.classList[0], "actual_volume").then(
                    (data) => {
                        consumptionVolumeOutput.innerHTML = data + " liters";
                    }
                );
                getWaterActivity(e.target.classList[0], "actual_cost").then(
                    (data) => {
                        consumptionCostOutput.innerHTML = "$ " + data;
                    }
                );
                getWaterActivity(e.target.classList[0], "leak_volume").then(
                    (data) => {
                        leakVolumeOutput.innerHTML = data + " liters";
                    }
                );
                getWaterActivity(e.target.classList[0], "leak_cost").then(
                    (data) => {
                        leakCostOutput.innerHTML = "$ " + data;
                    }
                );
            });
        });
    } catch (e) {
        console.log(e.message);
    }
};

card1DropdownArrow.addEventListener("click", () => {
    let chosenDevice = document.querySelector("#card1ChosenDevice");
    let totalVolumeOutput = document.querySelector("#totalVolumeOutput1");
    let totalCostOutput = document.querySelector("#totalCostOutput1");
    let consumptionVolumeOutput = document.querySelector(
        "#consumptionVolumeOutput1"
    );
    let consumptionCostOutput = document.querySelector(
        "#consumptionCostOutput1"
    );
    let leakVolumeOutput = document.querySelector("#leakVolumeOutput1");
    let leakCostOutput = document.querySelector("#leakCostOutput1");

    if (dashboardData.deviceList.length) {
        if (!card1DeviceList.children.length) {
            dashboardData.deviceList.forEach((device) => {
                card1DeviceList.innerHTML += `<li class="${device.label} card1-device-list-item">${device.name}</li>`;
            });

            let deviceListItems = document.querySelectorAll(
                ".card1-device-list-item"
            );

            deviceListItems.forEach((item) => {
                item.addEventListener("click", (e) => {
                    card1DropdownList.style.display = "none";
                    chosenDevice.innerHTML = e.target.innerText;
                    getWaterActivity(
                        e.target.classList[0],
                        "riser_flow_volume"
                    ).then((data) => {
                        totalVolumeOutput.innerHTML = data + " liters";
                    });
                    getWaterActivity(
                        e.target.classList[0],
                        "total_consumption_cost"
                    ).then((data) => {
                        totalCostOutput.innerHTML = "$ " + data;
                    });
                    getWaterActivity(
                        e.target.classList[0],
                        "actual_volume"
                    ).then((data) => {
                        consumptionVolumeOutput.innerHTML = data + " liters";
                    });
                    getWaterActivity(e.target.classList[0], "actual_cost").then(
                        (data) => {
                            consumptionCostOutput.innerHTML = "$ " + data;
                        }
                    );
                    getWaterActivity(e.target.classList[0], "leak_volume").then(
                        (data) => {
                            leakVolumeOutput.innerHTML = data + " liters";
                        }
                    );
                    getWaterActivity(e.target.classList[0], "leak_cost").then(
                        (data) => {
                            leakCostOutput.innerHTML = "$ " + data;
                        }
                    );
                });
            });

            card1DropdownList.style.display = "block";
        } else if (
            card1DropdownList.style.display === "none" &&
            card1DeviceList.children.length
        ) {
            card1DropdownList.style.display = "block";
        } else {
            card1DropdownList.style.display = "none";
        }
    } else if (!dashboardData.deviceList.length) {
        getDeviceList(
            dashboardData.deviceID,
            card1DropdownList,
            card1DeviceList
        );
    }
});

card2DropdownArrow.addEventListener("click", () => {
    let chosenDevice = document.querySelector("#card2ChosenDevice");
    let totalVolumeOutput = document.querySelector("#totalVolumeOutput2");
    let totalCostOutput = document.querySelector("#totalCostOutput2");
    let consumptionVolumeOutput = document.querySelector(
        "#consumptionVolumeOutput2"
    );
    let consumptionCostOutput = document.querySelector(
        "#consumptionCostOutput2"
    );
    let leakVolumeOutput = document.querySelector("#leakVolumeOutput2");
    let leakCostOutput = document.querySelector("#leakCostOutput2");

    if (dashboardData.deviceList.length) {
        if (!card2DeviceList.children.length) {
            dashboardData.deviceList.forEach((device) => {
                card2DeviceList.innerHTML += `<li class="${device.label} card2-device-list-item">${device.name}</li>`;
            });

            let deviceListItems = document.querySelectorAll(
                ".card2-device-list-item"
            );

            deviceListItems.forEach((item) => {
                item.addEventListener("click", (e) => {
                    card2DropdownList.style.display = "none";
                    chosenDevice.innerHTML = e.target.innerText;
                    getWaterActivity(
                        e.target.classList[0],
                        "riser_flow_volume"
                    ).then((data) => {
                        totalVolumeOutput.innerHTML = data + " liters";
                    });
                    getWaterActivity(
                        e.target.classList[0],
                        "total_consumption_cost"
                    ).then((data) => {
                        totalCostOutput.innerHTML = "$ " + data;
                    });
                    getWaterActivity(
                        e.target.classList[0],
                        "actual_volume"
                    ).then((data) => {
                        consumptionVolumeOutput.innerHTML = data + " liters";
                    });
                    getWaterActivity(e.target.classList[0], "actual_cost").then(
                        (data) => {
                            consumptionCostOutput.innerHTML = "$ " + data;
                        }
                    );
                    getWaterActivity(e.target.classList[0], "leak_volume").then(
                        (data) => {
                            leakVolumeOutput.innerHTML = data + " liters";
                        }
                    );
                    getWaterActivity(e.target.classList[0], "leak_cost").then(
                        (data) => {
                            leakCostOutput.innerHTML = "$ " + data;
                        }
                    );
                });
            });

            card2DropdownList.style.display = "block";
        } else if (card2DropdownList.style.display === "none") {
            card2DropdownList.style.display = "block";
        } else {
            card2DropdownList.style.display = "none";
        }
    } else if (!dashboardData.deviceList.length) {
        getDeviceList(
            dashboardData.deviceID,
            card2DropdownList,
            card2DeviceList
        );
    }
});

card3DropdownArrow.addEventListener("click", () => {
    let chosenDevice = document.querySelector("#card3ChosenDevice");
    let totalVolumeOutput = document.querySelector("#totalVolumeOutput3");
    let totalCostOutput = document.querySelector("#totalCostOutput3");
    let consumptionVolumeOutput = document.querySelector(
        "#consumptionVolumeOutput3"
    );
    let consumptionCostOutput = document.querySelector(
        "#consumptionCostOutput3"
    );
    let leakVolumeOutput = document.querySelector("#leakVolumeOutput3");
    let leakCostOutput = document.querySelector("#leakCostOutput3");

    if (dashboardData.deviceList.length) {
        if (!card3DeviceList.children.length) {
            dashboardData.deviceList.forEach((device) => {
                card3DeviceList.innerHTML += `<li class="${device.label} card3-device-list-item">${device.name}</li>`;
            });

            let deviceListItems = document.querySelectorAll(
                ".card3-device-list-item"
            );

            deviceListItems.forEach((item) => {
                item.addEventListener("click", (e) => {
                    card3DropdownList.style.display = "none";
                    chosenDevice.innerHTML = e.target.innerText;
                    getWaterActivity(
                        e.target.classList[0],
                        "riser_flow_volume"
                    ).then((data) => {
                        totalVolumeOutput.innerHTML = data + " liters";
                    });
                    getWaterActivity(
                        e.target.classList[0],
                        "total_consumption_cost"
                    ).then((data) => {
                        totalCostOutput.innerHTML = "$ " + data;
                    });
                    getWaterActivity(
                        e.target.classList[0],
                        "actual_volume"
                    ).then((data) => {
                        consumptionVolumeOutput.innerHTML = data + " liters";
                    });
                    getWaterActivity(e.target.classList[0], "actual_cost").then(
                        (data) => {
                            consumptionCostOutput.innerHTML = "$ " + data;
                        }
                    );
                    getWaterActivity(e.target.classList[0], "leak_volume").then(
                        (data) => {
                            leakVolumeOutput.innerHTML = data + " liters";
                        }
                    );
                    getWaterActivity(e.target.classList[0], "leak_cost").then(
                        (data) => {
                            leakCostOutput.innerHTML = "$ " + data;
                        }
                    );
                });
            });

            card3DropdownList.style.display = "block";
        } else if (card3DropdownList.style.display === "none") {
            card3DropdownList.style.display = "block";
        } else {
            card3DropdownList.style.display = "none";
        }
    } else if (!dashboardData.deviceList.length) {
        getDeviceList(
            dashboardData.deviceID,
            card3DropdownList,
            card3DeviceList
        );
    }
});
