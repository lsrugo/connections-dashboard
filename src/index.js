/*global supabase, Chart, randomColor*/
import Papa from "papaparse";

const API_URL = import.meta.env.VITE_API_URL;
const ANON_KEY = import.meta.env.VITE_ANON_KEY;
const supabaseClient = supabase.createClient(API_URL, ANON_KEY);

supabaseClient.auth.onAuthStateChange((event, session) => {
  console.log(event, session)
  if (event === "SIGNED_IN") {
    loadConnections()
      .then(res => {
        populateCards(res.count)

        createPositionsChart(res.data)
        createDatesChart(res.data)
        createCompaniesList(res.data)
      })
      .then(() => document.querySelector('#message').textContent = '')
  }
  if (event === "SIGNED_OUT") {
    // TODO change this to url of landing page
    window.location.href = '/login'
  }
})

if (!supabaseClient.auth.user()) {
  // TODO redirect when user is not logged in
  // window.location.href = '/login'
}

// load connections for current user
async function loadConnections() {
  // TODO make this more specific
  const res = await supabaseClient
    .from('connections')
    .select('position, company, connected_on', {
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
    if (!item['position']) {
      // skip item if position is not set
      continue
    }

    let position = item['position'].toLowerCase()
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

  // TODO add popup to expand 'other'
  console.log(positions)

  const labelsList = []
  const numbersList = []

  // reformat to fit chart
  for (const [key, value] of Object.entries(positions)) {
    // if (value < 2) {
    // skip positions with only 1 connection
    //   continue
    // }
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

  // const options = { month: 'long', timeZone: 'UTC' };
  // const dateFormatter = new Intl.DateTimeFormat('en-US', options);

  // count number of connections for each month
  for (const item of data) {
    const date = new Date(item['connected_on'])
    const year = date.getFullYear()
    const month = date.getUTCMonth()

    // create array for that year if it does not exist
    if (dates[year] === undefined) {
      dates[year] = []
    }

    dates[year][month] ? dates[year][month] += 1 : dates[year][month] = 1;
  }

  console.log('dates array', dates)

  const datasets = []

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  // reformat to fit chart
  for (const [year, yearList] of Object.entries(dates)) {
    // TODO use set colors
    const color = randomColor()
    datasets.push({
      label: String(year),
      data: yearList,
      backgroundColor: color,
      borderColor: color
    })
  }

  // TODO fix config
  const config = {
    type: 'line',
    data: {
      labels: months,
      datasets: datasets
    },
    options: {
      elements: {
        line: {
          tension: 0.4,
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          align: 'end'
        }
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
    const co = item['company']
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
      // TODO handle errors

      const user_id = supabaseClient.auth.user().id

      const data = results.data.map(val => {
        return {
          first_name: val['First Name'],
          last_name: val['Last Name'],
          email: val['Email Address'],
          company: val['Company'],
          position: val['Position'],
          connected_on: val['Connected On'],
          user_id: user_id
        }
      });

      supabaseClient.from('connections')
        .insert(data)
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
