/*global supabase, Chart, randomColor*/
import Papa from "papaparse";

const API_URL = "https://uzuarjwobeobconcjdkb.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYzMjA5MjUwMSwiZXhwIjoxOTQ3NjY4NTAxfQ.wcnGs329dCulDLOTPcLpEEY8zDREbXi-9mXduoq8npQ";
const supabaseClient = supabase.createClient(API_URL, ANON_KEY);

supabaseClient.auth.onAuthStateChange((event, session) => {
  console.log(event, session)
  if (event === "SIGNED_OUT") {
      // TODO change this to url of home page
      window.location.href = '/login.html'
  }
})

loadConnections()
  .then(res => {
    populateCards(res.count)

    createPositionsChart(res.data)
    createDatesChart(res.data)
    createCompaniesList(res.data)
  })
  .then(() => document.querySelector('#message').textContent = '')

// load connections for current user
async function loadConnections() {
  // TODO make this more specific
  const res = await supabaseClient
    .from('Connections')
    .select('Position, Company, "Connected On"', {
      count: 'estimated'
    });

  if (res.error) {
    console.error(res.error);
    document.querySelector('#message').textContent = res.error.message
    throw res.error.message
    // TODO format error message on page
  }

  return res
}

function populateCards(count) {
  const formattedCount = count.toLocaleString()
  document.querySelector('#total-connections').textContent = formattedCount
}

function createPositionsChart(data) {
  document.querySelector('#message').textContent = 'Loading...'

  const positions = {};

  // count number of connections in each position
  for (const item of data) {
    let position = item['Position'].toLowerCase()
    // let position = item['Position']
    if (position.includes('ceo') || position.includes('chief executive officer')) {
      position = 'CEO'
    } else if (position.includes('cfo') || position.includes('chief financial officer')) {
      position = 'CFO'
    } else if (position.includes('coo') || position.includes('chief operating officer')) {
      position = 'COO'
    } else if (position.includes('cto') || position.includes('chief technology officer')) {
      position = 'CTO'
    } else if (position === 'president') {
      position = 'President'
    } else if (position.includes('sales')) {
      position = 'Sales'
    } else if (position.includes('marketing')) {
      position = 'Marketing'
    } else if (position.includes('business development')) {
      position = 'Business Development'
    } else if (position.includes('vice president')) {
      position = 'Vice President'
    } else if (position.includes('founder')) {
      position = 'Founder' // maybe don't need this one
    } else {
      position = 'Other'
    }
    positions[position] ? positions[position] += 1 : positions[position] = 1;
  }

  // TODO: add popup to expand 'other'
  console.log(positions)

  const labelsList = []
  const numbersList = []

  // reformat to fit chart
  for (const [key, value] of Object.entries(positions)) {
    if (value < 2) {
      // skip positions with only 1 connection
      continue
    }
    labelsList.push(key)
    numbersList.push(value)
  }

  console.log('number of positons', numbersList.length)
  console.log('number of connections', data.length)

  const colors = randomColor({
    count: numbersList.length
  })

  const chartData = {
    labels: labelsList,
    datasets: [
      {
        label: 'Positions',
        data: numbersList,
        backgroundColor: colors
      }
    ]
  }

  const config = {
    type: 'pie',
    data: chartData
  }

  new Chart(
    document.getElementById('positionsChart'),
    config
  );
}

function createDatesChart(data) {
  const dates = {}

  console.log(data)

  const options = { month: 'long', year: 'numeric', timeZone: 'UTC' };
  const dateFormatter = new Intl.DateTimeFormat('en-US', options);

  // count number of connections for each month
  for (const item of data) {
    const rawDate = item['Connected On']
    const date = new Date(rawDate)
    date.setUTCDate(1) // set all dates to first of month
    const dateString = date.toISOString()

    dates[dateString] ? dates[dateString] += 1 : dates[dateString] = 1;
  }

  console.log(dates)

  const labelsList = []
  const numbersList = []

  // sort dates list
  const datesList = Object.entries(dates).sort((a, b) => {
    return new Date(a[0]) - new Date(b[0])
  })

  // reformat to fit chart
  for (const [key, value] of datesList) {
    // format date to month + year
    labelsList.push(dateFormatter.format(Date.parse(key)))
    numbersList.push(value)
  }

  const chartData = {
    labels: labelsList,
    datasets: [
      {
        label: 'Connections',
        data: numbersList,
        backgroundColor: "#4c51bf",
        borderColor: "#4c51bf",
      }
    ]
  }

  // TODO: fix config
  const config = {
    type: 'line',
    data: chartData,
    options: {
      title: {
        display: true,
        text: "New Connections",
        fontColor: "black"
      },
      legend: {
        labels: {
          fontColor: "white"
        },
        align: "end",
        position: "bottom"
      },
      tooltips: {
        mode: "index",
        intersect: false
      },
      hover: {
        mode: "nearest",
        intersect: true
      },
      scales: {
        xAxes: [
          {
            ticks: {
              fontColor: "rgba(255,255,255,.7)"
            },
            display: true,
            scaleLabel: {
              display: false,
              labelString: "Month",
              fontColor: "white"
            },
            gridLines: {
              display: false,
              borderDash: [2],
              borderDashOffset: [2],
              color: "rgba(33, 37, 41, 0.3)",
              zeroLineColor: "rgba(0, 0, 0, 0)",
              zeroLineBorderDash: [2],
              zeroLineBorderDashOffset: [2]
            }
          }
        ],
        yAxes: [
          {
            ticks: {
              fontColor: "rgba(255,255,255,.7)"
            },
            display: true,
            scaleLabel: {
              display: false,
              labelString: "Value",
              fontColor: "white"
            },
            gridLines: {
              borderDash: [3],
              borderDashOffset: [3],
              drawBorder: false,
              color: "rgba(255, 255, 255, 0.15)",
              zeroLineColor: "rgba(33, 37, 41, 0)",
              zeroLineBorderDash: [2],
              zeroLineBorderDashOffset: [2]
            }
          }
        ]
      }
    }
  }

  new Chart(
    document.getElementById('datesChart'),
    config
  );
}

function createCompaniesList(data) {
  const companies = {}

  for (const item of data) {
    const co = item['Company']
    // const co = item['Company'].toLowerCase()
    if (co === '') {
      continue
    }
    companies[co] ? companies[co] += 1 : companies[co] = 1;
  }

  // sort companies highest to lowest and take top 10
  const companiesList = Object.entries(companies).sort((a, b) => b[1] - a[1]).slice(0, 10)
  console.log('top 10 companies', companiesList)

  const table = document.querySelector('#companies-list')
  for (const co of companiesList) {
    const row = document.createElement('tr')
    const coName = document.createElement('td')
    coName.textContent = co[0]
    const coNum = document.createElement('td')
    coNum.textContent = co[1]
    coNum.classList.add('text-center')
    row.append(coName, coNum)
    table.append(row)
  }

  // TODO enable show more and show less buttons for top 25 and 100
}

// handle importing csv
document.querySelector("#import").addEventListener("change", (e) => {
  console.log("file selected");
  importConnections(e.target.files[0]);
});

/**
 *
 * @param {File} file The CSV file being imported
 */
function importConnections(file) {
  const startingString =
    'Notes:\n"When exporting your connection data, you may notice that some of the email addresses are missing. You will only see email addresses for connections who have allowed their connections to see or download their email address using this setting https://www.linkedin.com/psettings/privacy/email. You can learn more here https://www.linkedin.com/help/linkedin/answer/261"\n\n';
  Papa.parse(file, {
    header: true,
    beforeFirstChunk: (chunk) => {
      if (chunk.startsWith(startingString)) {
        return chunk.slice(startingString.length);
      }
    },
    complete: (results) => {
      console.log(results);

      supabaseClient.from('Connections')
        .insert(results.data)
        .then(res => {
          if (res.error) {
            console.error(res.error)
          } else {
            console.log('success', res.data)
          }
        })
    }
  });
}
