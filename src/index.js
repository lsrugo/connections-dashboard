/*global supabase, Chart, randomColor*/
import Papa from "papaparse";

const API_URL = import.meta.env.VITE_API_URL;
const ANON_KEY = import.meta.env.VITE_ANON_KEY;
const supabaseClient = supabase.createClient(API_URL, ANON_KEY);

supabaseClient.auth.onAuthStateChange((event) => {
  if (event === "SIGNED_IN") {
    loadConnections()
      .then(res => {
        populateCards(res.count)

        createPositionsChart()
        createDatesChart(res.data)
        createCompaniesList()
      })
      .then(() => document.querySelector('#message').textContent = '')
  }
})

// load connections for current user
async function loadConnections() {
  // * TODO use separate query for each chart
  // TODO make this more specific (filter dates)
  // supabase filters by user
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

function createPositionsChart() {
  supabaseClient
    .from('positions_count')
    .select('*')
    // .limit(1)
    .single()
    .then(res => {
      if (res.error) {
        console.error(res.error)
        document.querySelector('#message').textContent = res.error.message
        throw res.error.message
      }

      const positions = res.data

      const total = positions['total']
      delete positions['total']

      positions['Other'] = Object.values(positions).reduce((previous, current) => previous - current, total)

      const positionsSorted = Object.entries(positions).sort((a, b) => b[1] - a[1])
      // TODO add popup to expand 'other'

      const colors = randomColor({
        count: positionsSorted.length
      })

      const chartData = {
        labels: positionsSorted.map(pos => pos[0]),
        datasets: [
          {
            label: 'Positions',
            data: positionsSorted.map(pos => pos[1]),
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
    })
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

function createCompaniesList() {
  supabaseClient
    .from('companies_count')
    .select('*')
    .then(res => {
      if (res.error) {
        console.error(res.error)
        document.querySelector('#message').textContent = res.error.message
        throw res.error.message
      }

      const companies = res.data.sort((a, b) => b['count'] - a['count']).slice(0, 10)

      // sort companies highest to lowest and take top 10
      console.log('top 10 companies', companies)

      const table = document.querySelector('#companies-list')
      for (const co of companies) {
        const row = document.createElement('tr')
        const coName = document.createElement('td')
        coName.textContent = co['company']
        const coNum = document.createElement('td')
        coNum.textContent = co['count']
        coNum.classList.add('text-center')
        row.append(coName, coNum)
        table.append(row)
      }

      // TODO enable show more and show less buttons for top 25 and 100
    })
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
